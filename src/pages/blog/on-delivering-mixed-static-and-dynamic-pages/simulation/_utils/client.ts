import type { Clock } from "./clock";
import {
  type IClient,
  type AnonymizedResponseChunk,
  type NetworkResponseChunk,
  type Logger,
  type IServer,
  type SimulationConfig,
  makeRequestId,
  DYNAMIC_PAGE_DATA_JSON_URL,
  STATIC_HTML_PART,
  DYNAMIC_HTML_PART,
  SCRIPT_URL,
  SCRIPT_WITH_DATA_LOADING_URL,
  STATIC_PAGE_URL
} from "./common";
import type { Network } from "./network";
import { Queue } from "./queue";

export class Client implements IClient {
  name = "Client";
  private processingQueue: Queue<AnonymizedResponseChunk> = new Queue();
  private busy = false;
  private isStaticPartRendered = false;
  private isDynamicPartRendered = false;
  private isScriptExecuted = false;
  private isLoadingDynamicPart = false;
  private isDynamicPartLoaded = false;
  private isStaticPartInteractive = false;
  private isDynamicPartInteractive = false;
  private pageUrl = '';
  private isFirstByteReceived = false;
  private firstContentfulPaint = false;
  private onFinish?: () => void;
  private cache = new Map<string, AnonymizedResponseChunk[]>();
  private inProgressCacheEntries = new Map<string, NetworkResponseChunk[]>();

  constructor(
    private logger: Logger,
    private clock: Clock,
    private network: Network,
    private server: IServer,
    private config: SimulationConfig
  ) {}

  private sendRequest(url: string) {
    if (this.cache.has(url)) {
      this.logger.push({
        type: "Cache Hit",
        object: url,
        start: this.clock.time,
        end: this.clock.time,
        actor: this.name,
      });
      this.registerFirstByte();
      this.replayFromCache(url);
      return;
    }
    this.network.sendRequest({
      url,
      id: makeRequestId(),
      size: this.config.requestSize,
      client: this,
      server: this.server,
    });
  }

  private processSubResources(subResources: string[] | undefined) {
    if (subResources?.length) {
      for (const subResource of subResources) {
        this.sendRequest(subResource);
        if (subResource === DYNAMIC_PAGE_DATA_JSON_URL) {
          this.isLoadingDynamicPart = true;
        }
      }
    }
  }

  private replayFromCache(url: string) {
    const cachedChunks = this.cache.get(url)!;
    for (const chunk of cachedChunks) {
      this.processSubResources(chunk.subResources);
      this.processingQueue.add(chunk);
    }
    this.processQueue();
  }

  navigate(url: string, onFinish: () => void) {
    this.isStaticPartRendered = false;
    this.isDynamicPartRendered = false;
    this.isScriptExecuted = false;
    this.isLoadingDynamicPart = false;
    this.isDynamicPartLoaded = false;
    this.isStaticPartInteractive = false;
    this.isDynamicPartInteractive = false;
    this.isFirstByteReceived = false;
    this.firstContentfulPaint = false;
    this.pageUrl = url;
    this.onFinish = onFinish;

    this.sendRequest(url);
  }

  registerFirstByte() {
    if (!this.isFirstByteReceived) {
      this.isFirstByteReceived = true;
      this.logger.push({
        type: 'First Byte',
        object: this.pageUrl,
        start: this.clock.time,
        end: this.clock.time,
        actor: this.name
      })
    }
  }

  onResponse(response: NetworkResponseChunk) {
    this.registerFirstByte();
    this.processSubResources(response.subResources);

    if (response.cacheHeader) {
      if (!this.inProgressCacheEntries.has(response.url)) {
        this.inProgressCacheEntries.set(response.url, []);
      }
    }
    if (this.inProgressCacheEntries.has(response.url)) {
      const entries = this.inProgressCacheEntries.get(response.url)!;
      entries.push(response);

      if (response.done) {
        const anonymizedChunks = entries.map(
          ({ client, server, network, ...chunk }) =>
            chunk as AnonymizedResponseChunk
        );
        this.cache.set(response.url, anonymizedChunks);
        this.inProgressCacheEntries.delete(response.url);
      }
    }

    this.processingQueue.add(response);
    this.processQueue();
  }

  processQueue() {
    if (this.busy) {
      return;
    }
    const responseChunk = this.processingQueue.peek();
    if (!responseChunk) {
      return;
    }
    const finalizeProcessingStep = () => {
      if (this.isStaticPartInteractive && this.isDynamicPartInteractive) {
        this.logger.push({
          type: "Loaded",
          object: this.pageUrl,
          start: this.clock.time,
          end: this.clock.time,
          actor: this.name,
        });
        this.onFinish?.();
      }
      this.processingQueue.pop();
      this.busy = false;
      this.processQueue();
    };

    this.busy = true;
    if (
      responseChunk.part &&
      [STATIC_HTML_PART, DYNAMIC_HTML_PART].includes(responseChunk.part)
    ) {
      this.renderHTMLChunk(responseChunk, finalizeProcessingStep);
    } else if ([SCRIPT_URL, SCRIPT_WITH_DATA_LOADING_URL].includes(responseChunk.url)) {
      this.executeJS(responseChunk, finalizeProcessingStep);
    } else if (responseChunk.url === DYNAMIC_PAGE_DATA_JSON_URL) {
      this.isDynamicPartLoaded = true;
      if (this.isScriptExecuted) {
        this.renderDynamicPartJSON(finalizeProcessingStep);
      } else {
        finalizeProcessingStep();
      }
    } else {
      finalizeProcessingStep();
    }
  }

  renderHTMLChunk(responseChunk: AnonymizedResponseChunk, next: () => void) {
    this.logger.push({
      type: "Render",
      object: responseChunk.url,
      part: responseChunk.part,
      start: this.clock.time,
      end: this.clock.time + this.config.renderFromHtmlDuration,
      actor: this.name,
    });
    this.clock.schedule(this.config.renderFromHtmlDuration, () => {
      if (!this.firstContentfulPaint) {
        this.firstContentfulPaint = true;
        this.logger.push({
          type: "First Contentful Paint",
          object: this.pageUrl,
          start: this.clock.time,
          end: this.clock.time,
          actor: this.name,
        });
      }
      if (responseChunk.part === STATIC_HTML_PART) {
        this.isStaticPartRendered = true;
        if (this.isScriptExecuted) {
          this.hydrateStaticChunk(next);
        } else {
          next();
        }
      } else if (responseChunk.part === DYNAMIC_HTML_PART) {
        this.isDynamicPartRendered = true;
        if (this.isScriptExecuted) {
          this.hydrateDynamicChunk(next);
        } else {
          next();
        }
      } else {
        next();
      }
    });
  }

  renderDynamicPartJSON(next: () => void) {
    this.logger.push({
      type: "Render",
      object: DYNAMIC_PAGE_DATA_JSON_URL,
      start: this.clock.time,
      end: this.clock.time + this.config.renderFromJsonDuration,
      actor: this.name,
    });
    this.clock.schedule(this.config.renderFromJsonDuration, () => {
      this.isDynamicPartRendered = true;
      this.isDynamicPartInteractive = true;
      next();
    });
  }

  hydrateStaticChunk(next: () => void) {
    this.logger.push({
      type: "Hydration",
      object: this.pageUrl,
      part: STATIC_HTML_PART,
      start: this.clock.time,
      end: this.clock.time + this.config.hydrationDuration,
      actor: this.name,
    });
    this.clock.schedule(this.config.hydrationDuration, () => {
      this.isStaticPartInteractive = true;
      next();
    });
  }

  hydrateDynamicChunk(next: () => void) {
    this.logger.push({
      type: "Hydration",
      object: this.pageUrl === STATIC_PAGE_URL ? DYNAMIC_PAGE_DATA_JSON_URL : this.pageUrl,
      part: this.pageUrl === STATIC_PAGE_URL ? undefined : DYNAMIC_HTML_PART,
      start: this.clock.time,
      end: this.clock.time + this.config.hydrationDuration,
      actor: this.name,
    });
    this.clock.schedule(this.config.hydrationDuration, () => {
      this.isDynamicPartInteractive = true;
      next();
    });
  }

  executeJS(responseChunk: AnonymizedResponseChunk, next: () => void) {
    this.logger.push({
      type: "Execute JS",
      object: responseChunk.url,
      part: responseChunk.part,
      start: this.clock.time,
      end: this.clock.time + this.config.executeJsDuration,
      actor: this.name,
    });
    this.clock.schedule(this.config.executeJsDuration, () => {
      this.isScriptExecuted = true;

      if (responseChunk.url === SCRIPT_WITH_DATA_LOADING_URL && !this.isLoadingDynamicPart) {
        this.network.sendRequest({
          client: this,
          server: this.server,
          size: this.config.requestSize,
          url: DYNAMIC_PAGE_DATA_JSON_URL,
          id: makeRequestId(),
        });
      }
      const afterStaticProcessing = () => {
        const afterDynamicPartRendering = () => {
          if (responseChunk.url === SCRIPT_URL && this.isDynamicPartRendered) {
            this.hydrateDynamicChunk(next);
          } else {
            next();
          }
        };

        if (this.isDynamicPartRendered) {
          afterDynamicPartRendering();
        } else if (this.isDynamicPartLoaded) {
          this.renderDynamicPartJSON(afterDynamicPartRendering);
        } else {
          next();
        }
      };
      
      if (this.isStaticPartRendered) {
        this.hydrateStaticChunk(afterStaticProcessing);
      } else {
        afterStaticProcessing();
      }
    });
  }

  clearCache() {
    this.cache.clear();
  }
}
