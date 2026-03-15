import type { Clock } from "./clock";
import {
  DB_DYNAMIC_PART_QUERY,
  DB_SEMI_STATIC_PART_QUERY,
  DYNAMIC_HTML_PART,
  DYNAMIC_JSON_PART,
  DYNAMIC_PAGE_DATA_JSON_URL,
  DYNAMIC_PAGE_PART_URL,
  FULL_PAGE_URL,
  FULL_PAGE_WITH_DYNAMIC_JSON_URL,
  HEAD_PART,
  makeRequestId,
  SCRIPT_URL,
  SCRIPT_WITH_DATA_LOADING_URL,
  STATIC_HTML_PART, 
  SEMI_STATIC_PAGE_URL,
  type AnonymizedResponseChunk,
  type IClient,
  type IServer,
  type Logger,
  type NetworkRequest,
  type NetworkResponseChunk,
  type SimulationConfig,
} from "./common";
import type { Database } from "./database";
import type { Network } from "./network";
import { Queue } from "./queue";

export class FrontendServer implements IServer, IClient {
  name = "Server";
  private taskQueue: Queue<(next: () => void) => void> = new Queue();
  private busy = false;
  private staticHTMLPartCached = false;

  constructor(
    private logger: Logger,
    private clock: Clock,
    private backendNetwork: Network,
    private database: Database,
    private config: SimulationConfig
  ) {}

  private getFullPageHeadChunk(): AnonymizedResponseChunk {
    return {
      url: FULL_PAGE_URL,
      size: this.config.headSize,
      part: HEAD_PART,
      subResources: [SCRIPT_URL],
    };
  }

  private getFullPageWithDynamicJsonHeadChunk(): AnonymizedResponseChunk {
    return {
      url: FULL_PAGE_WITH_DYNAMIC_JSON_URL,
      size: this.config.headSize,
      part: HEAD_PART,
      subResources: [SCRIPT_URL],
    };
  }

  private getStaticPageHeadChunk(): AnonymizedResponseChunk {
    return {
      url: SEMI_STATIC_PAGE_URL,
      size: this.config.headSize,
      part: "head",
      subResources: [
        SCRIPT_WITH_DATA_LOADING_URL,
        ...(this.config.preload ? [DYNAMIC_PAGE_DATA_JSON_URL] : []),
      ],
      cacheHeader: true,
    };
  }

  private getStaticHtmlChunk(url: string): AnonymizedResponseChunk {
    return {
      url,
      size: this.config.semiStaticHtmlChunkSize,
      part: STATIC_HTML_PART,
      done: url === SEMI_STATIC_PAGE_URL,
    };
  }

  private getDynamicHtmlChunk(): AnonymizedResponseChunk {
    return {
      url: FULL_PAGE_URL,
      size: this.config.dynamicHtmlChunkSize,
      part: DYNAMIC_HTML_PART,
      done: true,
    };
  }

  private getScriptChunk(): AnonymizedResponseChunk {
    return {
      url: SCRIPT_URL,
      size: this.config.scriptSize,
      done: true,
      cacheHeader: true,
    };
  }

  private getScriptWithDataLoadingChunk(): AnonymizedResponseChunk {
    return {
      url: SCRIPT_WITH_DATA_LOADING_URL,
      size: this.config.scriptSize,
      done: true,
      cacheHeader: true,
    };
  }

  private getDynamicPageDataChunk(url: string): AnonymizedResponseChunk {
    return {
      url,
      size: this.config.dynamicDataSize,
      done: true,
    };
  }

  onResponse(response: NetworkResponseChunk): void {
    this.taskQueue.add((next: () => void) => this.handleResponse(response, next));
    this.processTaskQueue();
  }

  handleResponse(response: NetworkResponseChunk, next: () => void): void {
    const clientRequest = response.context as NetworkRequest;
    let responseChunkToRender: AnonymizedResponseChunk | undefined = undefined;
    switch (clientRequest.url) {
      case FULL_PAGE_URL: {
        if (response.url === DB_SEMI_STATIC_PART_QUERY) {
          responseChunkToRender = this.getStaticHtmlChunk(clientRequest.url);
        } else if (response.url === DB_DYNAMIC_PART_QUERY) {
          responseChunkToRender = this.getDynamicHtmlChunk();
        }
        break;
      }
      case FULL_PAGE_WITH_DYNAMIC_JSON_URL: {
        if (response.url === DB_SEMI_STATIC_PART_QUERY) {
          responseChunkToRender = this.getStaticHtmlChunk(clientRequest.url);
        } else if (response.url === DB_DYNAMIC_PART_QUERY) {
          clientRequest.network.sendResponse({
            ...this.getDynamicPageDataChunk(clientRequest.url),
            part: DYNAMIC_JSON_PART,
            requestId: clientRequest.id,
            client: clientRequest.client,
            server: this,
            context: clientRequest.context,
          });
        }
        break;
      }
      case SEMI_STATIC_PAGE_URL: {
        responseChunkToRender = this.getStaticHtmlChunk(clientRequest.url);
        break;
      }
      case DYNAMIC_PAGE_PART_URL: {
        responseChunkToRender = this.getDynamicHtmlChunk();
        break;
      }
      case DYNAMIC_PAGE_DATA_JSON_URL: {
        clientRequest.network.sendResponse({
          ...this.getDynamicPageDataChunk(clientRequest.url),
          requestId: clientRequest.id,
          client: clientRequest.client,
          server: this,
          context: clientRequest.context,
        });
        break;
      }
    }
    if (responseChunkToRender) {
      const start = this.clock.time;
      this.logger.push({
        type: "SSR",
        object: clientRequest.url,
        part: responseChunkToRender.part,
        start,
        end: start + this.config.renderToHtmlDuration,
        actor: this.name,
      });
      this.clock.schedule(this.config.renderToHtmlDuration, () => {
        clientRequest.network.sendResponse({
          ...responseChunkToRender,
          requestId: clientRequest.id,
          client: clientRequest.client,
          server: this,
          context: clientRequest.context,
        });
        if (responseChunkToRender.part === STATIC_HTML_PART) {
          this.staticHTMLPartCached = true;
        }
        next();
      });
    } else {
      next();
    }
  }

  processTaskQueue() {
    if (this.busy) {
      return;
    }
    const task = this.taskQueue.pop();
    if (!task) {
      return;
    }
    this.busy = true;
    task(() => {
      this.busy = false;
      this.clock.schedule(0, () => this.processTaskQueue());
    });
  }

  onRequest(request: NetworkRequest) {
    this.taskQueue.add((next: () => void) => {
      // handleRequest finishes instantly, so no need to pass next
      this.handleRequest(request);
      next();
    });
    this.processTaskQueue();
  }

  private handleRequest(request: NetworkRequest) {
    const sendStaticQuery = [FULL_PAGE_URL, SEMI_STATIC_PAGE_URL, FULL_PAGE_WITH_DYNAMIC_JSON_URL].includes(
      request.url
    );
    const sendDynamicQuery = [
      FULL_PAGE_URL,
      DYNAMIC_PAGE_PART_URL,
      DYNAMIC_PAGE_DATA_JSON_URL,
      FULL_PAGE_WITH_DYNAMIC_JSON_URL,
    ].includes(request.url);

    if ([FULL_PAGE_URL, FULL_PAGE_WITH_DYNAMIC_JSON_URL].includes(request.url)) {
      request.network.sendResponse({
        ...(request.url === FULL_PAGE_URL ? this.getFullPageHeadChunk() : this.getFullPageWithDynamicJsonHeadChunk()),
        requestId: request.id,
        client: request.client,
        server: this,
        context: request.context,
      });
    } else if (request.url === SEMI_STATIC_PAGE_URL) {
      request.network.sendResponse({
        ...this.getStaticPageHeadChunk(),
        requestId: request.id,
        client: request.client,
        server: this,
        context: request.context,
        cacheHeader: true,
      });
    }
    if (sendStaticQuery) {
      if (this.config.serverSideCache && this.staticHTMLPartCached) {
        this.logger.push({
          type: "Cache Hit",
          object: request.url,
          part: STATIC_HTML_PART,
          start: this.clock.time,
          end: this.clock.time,
          actor: this.name,
        });
        request.network.sendResponse({
          ...this.getStaticHtmlChunk(request.url),
          requestId: request.id,
          client: request.client,
          server: this,
          context: request.context,
        });
      } else {
        this.backendNetwork.sendRequest({
          size: this.config.requestSize,
          url: DB_SEMI_STATIC_PART_QUERY,
          client: this,
          server: this.database,
          id: makeRequestId(),
          context: request,
        });
      }
    }
    if (sendDynamicQuery) {
      this.backendNetwork.sendRequest({
        size: this.config.requestSize,
        url: DB_DYNAMIC_PART_QUERY,
        client: this,
        server: this.database,
        id: makeRequestId(),
        context: request,
      });
    }

    if (request.url === SCRIPT_URL) {
      request.network.sendResponse({
        ...this.getScriptChunk(),
        requestId: request.id,
        client: request.client,
        server: this,
        context: request.context,
      });
    } else if (request.url === SCRIPT_WITH_DATA_LOADING_URL) {
      request.network.sendResponse({
        ...this.getScriptWithDataLoadingChunk(),
        requestId: request.id,
        client: request.client,
        server: this,
        context: request.context,
      });
    }
  }

  clearCache() {
    this.staticHTMLPartCached = false;
  }
}