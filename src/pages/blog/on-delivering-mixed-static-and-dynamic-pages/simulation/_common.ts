export class Clock {
  time = 0;
  isStopped = true;
  private callbacks = new Map<number, (() => void)[]>();

  schedule(delay: number, callback: () => void) {
    if (!this.callbacks.has(this.time + delay)) {
      this.callbacks.set(this.time + delay, [callback]);
    } else {
      this.callbacks.get(this.time + delay)?.push(callback);
    }
  }

  start(callback: () => void) {
    this.isStopped = false;
    callback();
    while (this.callbacks.size > 0 && !this.isStopped) {
      const currentCallbacks = this.callbacks.get(this.time);
      if (currentCallbacks) {
        for (const cb of currentCallbacks) {
          cb();
        }
      }
      this.callbacks.delete(this.time);
      this.time += 1;
    }
  }

  stop() {
    this.isStopped = true;
  }
}

export interface Event {
  type: string;
  message: string;
  start: number;
  end: number;
  actor: string;
}

export interface NetworkRequest {
  id: number;
  size: number;
  url: string;
  network: Network;
  client: IClient;
  server: IServer;
  context?: unknown;
}

let requestId = 0;
export function makeRequestId() {
  return requestId++;
}

export interface NetworkResponseChunk {
  requestId: number;
  cacheHeader?: boolean;
  size: number;
  url: string;
  name: string;
  subResources?: string[];
  done?: boolean;
  network: Network;
  client: IClient;
  server: IServer;
  context?: unknown;
}

export type AnonymizedResponseChunk = Omit<
  NetworkResponseChunk,
  "network" | "client" | "server" | "requestId"
>;

export type Logger = Array<Event>;

// TODO refine this
export class DoneLogger extends Array<Event> {
  push(...items: Event[]): number {
    let count = 0;
    for (const i of items) {
      if ("done" in i && !!i.done) {
        super.push(i);
        count += 1;
      }
    }
    return count;
  }
}

export interface IClient {
  onResponse(response: NetworkResponseChunk): void;
}

export interface IServer {
  onRequest(request: NetworkRequest): void;
}

export interface SimulationConfig {
  queryDuration: number;
  queryResponseSize: number;
  renderToHtmlDuration: number;
  renderFromHtmlDuration: number;
  renderFromJsonDuration: number;
  executeJsDuration: number;
  requestSize: number;
  headSize: number;
  staticHtmlChunkSize: number;
  dynamicHtmlChunkSize: number;
  scriptSize: number;
  dynamicDataSize: number;
}

// TODO implement client caching
export class Client implements IClient {
  private processingQueue: Queue<AnonymizedResponseChunk> = new Queue();
  private busy = false;
  private renderedStaticPart = false;
  private renderedDynamicPart = false;
  private ranScript = false;
  private preloadDynamicPart = false;
  private loadedDynamicPart = false;
  private onFinish?: () => void;

  constructor(
    private logger: Logger,
    private clock: Clock,
    private network: Network,
    private server: IServer,
    private config: SimulationConfig
  ) {}

  navigate(url: string, onFinish: () => void) {
    this.network.sendRequest({
      client: this,
      server: this.server,
      size: this.config.requestSize,
      url,
      id: makeRequestId(),
    });
    this.onFinish = onFinish;
  }

  onResponse(response: NetworkResponseChunk) {
    if (response.subResources?.length) {
      for (const subResource of response.subResources) {
        this.network.sendRequest({
          url: subResource,
          id: makeRequestId(),
          size: this.config.requestSize,
          client: this,
          server: this.server,
        });
        if (subResource === DYNAMIC_PAGE_DATA_JSON_URL) {
          this.preloadDynamicPart = true;
        }
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
    this.busy = true;
    const processingTime = ["static html part", "dynamic html part"].includes(
      responseChunk.name
    )
      ? this.config.renderFromHtmlDuration
      : SCRIPT_URL === responseChunk.url ||
          (SCRIPT_WITH_DATA_LOADING_URL === responseChunk.url &&
            !this.loadedDynamicPart)
        ? this.config.executeJsDuration
        : SCRIPT_WITH_DATA_LOADING_URL === responseChunk.url &&
            this.loadedDynamicPart
          ? this.config.executeJsDuration + this.config.renderFromJsonDuration
          : responseChunk.url === DYNAMIC_PAGE_DATA_JSON_URL && this.ranScript
            ? this.config.renderFromJsonDuration
            : 0;
    const start = this.clock.time;
    this.clock.schedule(processingTime, () => {
      if (
        ["static html part", "dynamic html part"].includes(responseChunk.name)
      ) {
        this.logger.push({
          type: "Layout",
          message: "Render " + responseChunk.name,
          start,
          end: this.clock.time,
          actor: "Client",
        });
        if (responseChunk.name == "static html part") {
          this.renderedStaticPart = true;
        } else {
          this.renderedDynamicPart = true;
        }
      } else if (responseChunk.url === SCRIPT_URL) {
        this.ranScript = true;
        this.logger.push({
          type: "Execute JS",
          message: "Execute " + responseChunk.url,
          start,
          end: this.clock.time,
          actor: "Client",
        });
      } else if (responseChunk.url === SCRIPT_WITH_DATA_LOADING_URL) {
        this.ranScript = true;
        this.logger.push({
          type: "Execute JS",
          message: "Execute " + responseChunk.url,
          start: start,
          end: start + this.config.executeJsDuration,
          actor: "Client",
        });
        if (this.loadedDynamicPart) {
          this.logger.push({
            type: "Layout",
            message: "Render " + responseChunk.url,
            start: start + this.config.executeJsDuration,
            end: this.clock.time,
            actor: "Client",
          });
          this.renderedDynamicPart = true;
        } else if (!this.preloadDynamicPart) {
          this.network.sendRequest({
            client: this,
            server: this.server,
            size: this.config.requestSize,
            url: DYNAMIC_PAGE_DATA_JSON_URL,
            id: makeRequestId(),
          });
        }
      } else if (responseChunk.url === DYNAMIC_PAGE_DATA_JSON_URL) {
        this.loadedDynamicPart = true;
      }

      if (
        this.ranScript &&
        this.renderedDynamicPart &&
        this.renderedStaticPart
      ) {
        this.logger.push({
          type: "Done",
          message: "Done navigating",
          start: this.clock.time,
          end: this.clock.time,
          actor: "Client",
        });
        this.onFinish?.();
      }
      this.processingQueue.pop();
      this.busy = false;
      this.processQueue();
    });
  }
}

const FULL_PAGE_URL = "page (full)";
const STATIC_PAGE_URL = "page (static)";
const DYNAMIC_PAGE_PART_URL = "page part (dynamic)";
const SCRIPT_URL = "script.js";
const SCRIPT_WITH_DATA_LOADING_URL = "script-with-data-loading.js";
const DYNAMIC_PAGE_DATA_JSON_URL = "page-dynamic-data.json";

class Queue<T> {
  private stack: T[] = [];
  private queue: T[] = [];

  add(item: T) {
    this.stack.push(item);
  }

  size(): number {
    return this.stack.length + this.queue.length;
  }

  peek(): T | undefined {
    if (!this.queue.length) {
      if (this.stack.length) {
        this.queue = this.stack.reverse();
        this.stack = [];
      }
      return undefined;
    }
    return this.queue[this.queue.length - 1];
  }

  pop() {
    this.peek();
    return this.queue.pop();
  }
}

const DB_STATIC_PART_QUERY = "db-static-part-query";
const DB_DYNAMIC_PART_QUERY = "db-dynamic-part-query";

export class Database implements IServer {
  requestQueue: Queue<NetworkRequest> = new Queue();

  constructor(
    private logger: Logger,
    private clock: Clock,
    private config: SimulationConfig
  ) {}

  onRequest(request: NetworkRequest) {
    this.requestQueue.add(request);
    if (this.requestQueue.size() === 1) {
      this.processQueuedRequest();
    }
  }

  processQueuedRequest() {
    const request = this.requestQueue.peek();
    if (!request) {
      return;
    }
    this.clock.schedule(this.config.queryDuration, () => {
      request.network.sendResponse({
        requestId: request.id,
        client: request.client,
        server: this,
        size: this.config.queryResponseSize,
        url: request.url,
        name: "db response",
        context: request.context,
      });
      this.requestQueue.pop();
      if (this.requestQueue.size()) {
        this.processQueuedRequest();
      }
    });
  }
}

export class FrontendServer implements IServer, IClient {
  private renderingQueue: Queue<
    NetworkRequest & { responseChunk: AnonymizedResponseChunk }
  > = new Queue();
  private rendering = false;
  private staticPagePartCache?: AnonymizedResponseChunk;

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
      name: "head",
      subResources: [SCRIPT_URL],
    };
  }

  private getStaticPageHeadChunk(): AnonymizedResponseChunk {
    return {
      url: FULL_PAGE_URL,
      size: this.config.headSize,
      name: "head",
      subResources: [SCRIPT_WITH_DATA_LOADING_URL],
    };
  }

  private getStaticHtmlChunk(): AnonymizedResponseChunk {
    return {
      url: FULL_PAGE_URL,
      size: this.config.staticHtmlChunkSize,
      name: "static html part",
    };
  }

  private getDynamicHtmlChunk(): AnonymizedResponseChunk {
    return {
      url: FULL_PAGE_URL,
      size: this.config.dynamicHtmlChunkSize,
      name: "dynamic html part",
    };
  }

  private getScriptChunk(): AnonymizedResponseChunk {
    return {
      url: SCRIPT_URL,
      size: this.config.scriptSize,
      name: "",
      done: true,
      cacheHeader: true,
    };
  }

  private getScriptWithDataLoadingChunk(): AnonymizedResponseChunk {
    return {
      url: SCRIPT_URL,
      size: this.config.scriptSize,
      name: "",
      done: true,
      cacheHeader: true,
    };
  }

  private getDynamicPageDataChunk(): AnonymizedResponseChunk {
    return {
      url: DYNAMIC_PAGE_DATA_JSON_URL,
      size: this.config.dynamicDataSize,
      name: "",
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
            responseChunk: this.getStaticHtmlChunk(),
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
          responseChunk: this.getStaticHtmlChunk(),
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
    this.clock.schedule(this.config.renderToHtmlDuration, () => {
      request.network.sendResponse({
        ...request.responseChunk,
        requestId: request.id,
        client: request.client,
        server: this,
        context: request.context,
        done:
          request.responseChunk?.done ??
          !(
            request.url === FULL_PAGE_URL &&
            request.responseChunk.name === "static html part"
          ),
      });
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
      if (!this.staticPagePartCache) {
        this.backendNetwork.sendRequest({
          size: this.config.requestSize,
          url: DB_STATIC_PART_QUERY,
          client: this,
          server: this.database,
          id: makeRequestId(),
          context: request,
        });
      } else {
        request.network.sendResponse({
          ...this.getStaticHtmlChunk(),
          requestId: request.id,
          client: request.client,
          server: this,
          context: request.context,
          done: request.url === STATIC_PAGE_URL,
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
}

export class Edge implements IServer, IClient {
  constructor(
    private logger: Logger,
    private clock: Clock,
    private originNetwork: Network,
    private origin: IServer,
    private config: SimulationConfig,
    private cache = new Map<string, AnonymizedResponseChunk[]>()
  ) {}

  private inProgressCacheEntries = new Map<string, NetworkResponseChunk[]>();

  onRequest(request: NetworkRequest) {
    if (this.cache.has(request.url)) {
      const response = this.cache.get(request.url)!;
      for (const chunk of response) {
        request.network.sendResponse({
          ...chunk,
          requestId: request.id,
          client: request.client,
          server: this,
        });
      }
      return;
    }
    this.originNetwork.sendRequest({
      id: makeRequestId(),
      client: this,
      server: this.origin,
      url: request.url,
      size: this.config.headSize,
      context: request,
    });
  }

  onResponse(response: NetworkResponseChunk) {
    if (response.cacheHeader) {
      if (
        !this.inProgressCacheEntries.has(response.url) &&
        !this.cache.get(response.url)
      ) {
        this.inProgressCacheEntries.set(response.url, [response]);
      }
    }
    const originalRequest = response.context as NetworkRequest;

    // Add to chunks
    if (this.inProgressCacheEntries.has(response.url)) {
      const chunks = this.inProgressCacheEntries.get(response.url)!;
      if (
        (chunks[0].context as NetworkRequest).id === originalRequest.id &&
        response !== chunks[0]
      ) {
        chunks.push(response);
        if (response.done) {
          this.cache.set(
            response.url,
            chunks.map(({ client, server, network, ...c }) => c)
          );
          this.inProgressCacheEntries.delete(response.url);
        }
      }
    }

    const { client, server, network, ...anonymizedResponseChunk } = response;

    originalRequest.network.sendResponse({
      ...anonymizedResponseChunk,
      client: originalRequest.client,
      server: this,
    });
  }
}

export class Network {
  inFlightRequests: {
    request: Omit<NetworkRequest, "network">;
    bytesLeft: number;
    start: number;
  }[] = [];
  inFlightResponses: Map<
    number,
    {
      chunk: Omit<NetworkResponseChunk, "network">;
      bytesLeft: number;
      start: number;
    }[]
  > = new Map();

  upLinkBandwidthLeft = 0;
  downLinkBandwidthLeft = 0;

  constructor(
    private logger: Logger,
    private clock: Clock,
    private latency: number,
    private upLinkBandwidth: number, // Bytes per millisecond (KB/s)
    private downLinkBandwidth: number // Bytes per millisecond (KB/s)
  ) {}

  sendRequest(request: Omit<NetworkRequest, "network">) {
    this.clock.schedule(this.latency, () => {
      this.logger.push({
        type: "Request latency",
        message: request.url,
        start: this.clock.time - this.latency,
        end: this.clock.time,
        actor: "Network",
      });
      this.inFlightRequests.push({
        request,
        start: this.clock.time,
        bytesLeft: request.size,
      });
    });
  }

  sendResponse(response: Omit<NetworkResponseChunk, "network">) {
    this.clock.schedule(this.latency, () => {
      this.logger.push({
        type: "Response latency",
        message: response.url,
        start: this.clock.time - this.latency,
        end: this.clock.time,
        actor: "Network",
      });
      const existing = this.inFlightResponses.get(response.requestId);
      this.inFlightResponses.set(response.requestId, [
        ...(existing ?? []),
        {
          chunk: response,
          start: this.clock.time,
          bytesLeft: response.size,
        },
      ]);
    });
  }

  processRequests() {
    this.upLinkBandwidthLeft = this.upLinkBandwidth;
    while (this.upLinkBandwidthLeft && this.inFlightRequests.length) {
      let bandwidthPart =
        this.upLinkBandwidthLeft / this.inFlightRequests.length;
      const deliveredRequests: Omit<NetworkRequest, "network">[] = [];
      for (const request of this.inFlightRequests) {
        const bandwidthUsed = Math.min(request.bytesLeft, bandwidthPart);
        request.bytesLeft -= bandwidthUsed;
        this.upLinkBandwidthLeft -= bandwidthUsed;
        if (request.bytesLeft === 0) {
          this.logger.push({
            type: "Request transfer",
            message: request.request.url,
            start: request.start,
            end: this.clock.time,
            actor: "Network",
          });
          deliveredRequests.push(request.request);
        }
      }
      for (const request of deliveredRequests) {
        request.server.onRequest({
          ...request,
          network: this,
        });
      }
      this.inFlightRequests = this.inFlightRequests.filter(
        ({ request }) => !deliveredRequests.includes(request)
      );
    }
    this.clock.schedule(1, () => this.processRequests());
  }

  processResponses() {
    this.downLinkBandwidthLeft = this.downLinkBandwidth;
    while (this.downLinkBandwidthLeft && this.inFlightResponses.size) {
      let bandwidthPart =
        this.downLinkBandwidthLeft / this.inFlightResponses.size;
      const deliveredChunks: Omit<NetworkResponseChunk, "network">[] = [];
      for (const [, chunks] of this.inFlightResponses) {
        for (
          let bandwidthToUse = Math.min(chunks[0].bytesLeft, bandwidthPart);
          bandwidthToUse > 0;
          bandwidthToUse = Math.min(chunks[0].bytesLeft, bandwidthToUse)
        ) {
          chunks[0].bytesLeft -= bandwidthToUse;
          this.downLinkBandwidthLeft -= bandwidthToUse;
          if (chunks[0].bytesLeft === 0) {
            this.logger.push({
              type: "Response transfer",
              message: chunks[0].chunk.url,
              start: chunks[0].start,
              end: this.clock.time,
              actor: "Network",
            });
            deliveredChunks.push(chunks[0].chunk);
            chunks.splice(0, 1);
            if (chunks.length) {
              chunks[0].start = this.clock.time;
            }
          }
        }
      }
      for (const chunk of deliveredChunks) {
        chunk.client.onResponse({
          ...chunk,
          network: this,
        });
        if (this.inFlightResponses.get(chunk.requestId)?.length === 0) {
          this.inFlightResponses.delete(chunk.requestId);
        }
      }
    }
    this.clock.schedule(1, () => this.processResponses());
  }
}
