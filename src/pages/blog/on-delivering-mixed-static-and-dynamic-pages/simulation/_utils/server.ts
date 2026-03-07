import type { Clock } from "./clock";
import {
  DB_DYNAMIC_PART_QUERY,
  DB_STATIC_PART_QUERY,
  DYNAMIC_HTML_PART,
  DYNAMIC_PAGE_DATA_JSON_URL,
  DYNAMIC_PAGE_PART_URL,
  FULL_PAGE_URL,
  HEAD_PART,
  makeRequestId,
  SCRIPT_URL,
  SCRIPT_WITH_DATA_LOADING_URL,
  STATIC_HTML_PART, 
  STATIC_PAGE_URL,
  type AnonymizedResponseChunk,
  type IClient,
  type IServer,
  type Logger,
  type NetworkRequest,
  type NetworkResponseChunk,
  type SimulationConfig,
  type SimulationEvent
} from "./common";
import type { Database } from "./database";
import type { Network } from "./network";
import { Queue } from "./queue";

export class FrontendServer implements IServer, IClient {
  name = "Server";
  private renderingQueue: Queue<
    NetworkRequest & { responseChunk: AnonymizedResponseChunk }
  > = new Queue();
  private rendering = false;
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

  private getStaticPageHeadChunk(): AnonymizedResponseChunk {
    return {
      url: STATIC_PAGE_URL,
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
      size: this.config.staticHtmlChunkSize,
      part: STATIC_HTML_PART,
      done: url === STATIC_PAGE_URL,
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

  private getDynamicPageDataChunk(): AnonymizedResponseChunk {
    return {
      url: DYNAMIC_PAGE_DATA_JSON_URL,
      size: this.config.dynamicDataSize,
      done: true,
    };
  }

  onResponse(response: NetworkResponseChunk): void {
    const clientRequest = response.context as NetworkRequest;
    switch (clientRequest.url) {
      case FULL_PAGE_URL: {
        if (response.url === DB_STATIC_PART_QUERY) {
          this.renderingQueue.add({
            ...clientRequest,
            responseChunk: this.getStaticHtmlChunk(clientRequest.url),
          });
          this.processRenderingQueue();
        } else if (response.url === DB_DYNAMIC_PART_QUERY) {
          this.renderingQueue.add({
            ...clientRequest,
            responseChunk: this.getDynamicHtmlChunk(),
          });
          this.processRenderingQueue();
        }
        break;
      }
      case STATIC_PAGE_URL: {
        this.renderingQueue.add({
          ...clientRequest,
          responseChunk: this.getStaticHtmlChunk(clientRequest.url),
        });
        this.processRenderingQueue();
        break;
      }
      case DYNAMIC_PAGE_PART_URL: {
        this.renderingQueue.add({
          ...clientRequest,
          responseChunk: this.getDynamicHtmlChunk(),
        });
        this.processRenderingQueue();
        break;
      }
      case DYNAMIC_PAGE_DATA_JSON_URL: {
        clientRequest.network.sendResponse({
          ...this.getDynamicPageDataChunk(),
          requestId: clientRequest.id,
          client: clientRequest.client,
          server: this,
          context: clientRequest.context,
        });
        break;
      }
    }
  }

  processRenderingQueue() {
    if (this.rendering) {
      return;
    }
    const request = this.renderingQueue.peek();
    if (!request) {
      return;
    }
    this.rendering = true;
    const start = this.clock.time;
    const event: SimulationEvent = {
      type: "SSR",
      object: request.url,
      part: request.responseChunk.part,
      start,
      end: -1,
      actor: this.name,
    };
    this.logger.push(event);
    this.clock.schedule(this.config.renderToHtmlDuration, () => {
      this.rendering = false;
      event.end = this.clock.time;
      request.network.sendResponse({
        ...request.responseChunk,
        requestId: request.id,
        client: request.client,
        server: this,
        context: request.context,
      });
      if (request.responseChunk.part === STATIC_HTML_PART) {
        this.staticHTMLPartCached = true;
      }
      this.renderingQueue.pop();
      this.processRenderingQueue();
    });
  }

  onRequest(request: NetworkRequest) {
    const sendStaticQuery = [FULL_PAGE_URL, STATIC_PAGE_URL].includes(
      request.url
    );
    const sendDynamicQuery = [
      FULL_PAGE_URL,
      DYNAMIC_PAGE_PART_URL,
      DYNAMIC_PAGE_DATA_JSON_URL,
    ].includes(request.url);

    if (request.url === FULL_PAGE_URL) {
      request.network.sendResponse({
        ...this.getFullPageHeadChunk(),
        requestId: request.id,
        client: request.client,
        server: this,
        context: request.context,
      });
    } else if (request.url === STATIC_PAGE_URL) {
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
          url: DB_STATIC_PART_QUERY,
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