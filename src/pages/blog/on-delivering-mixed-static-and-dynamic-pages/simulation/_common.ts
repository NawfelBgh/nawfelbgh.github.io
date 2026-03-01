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

export interface SimulationEvent {
  type: string;
  object: string;
  part?: string;
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
  part?: string;
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

export type Logger = Array<SimulationEvent>;

export class ConsoleLogger extends Array<SimulationEvent> {
  push(...xs: SimulationEvent[]): number {
    super.push(...xs);
    for (const x of xs) {
      console.log(x);
    }
    return xs.length;
  }
}

// TODO refine this
export class DoneLogger extends Array<SimulationEvent> {
  push(...items: SimulationEvent[]): number {
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
  name: string;
  onResponse(response: NetworkResponseChunk): void;
}

export interface IServer {
  name: string;
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

export class Client implements IClient {
  name = 'Client';
  private processingQueue: Queue<AnonymizedResponseChunk> = new Queue();
  private busy = false;
  private renderedStaticPart = false;
  private renderedDynamicPart = false;
  private ranScript = false;
  private loadingDynamicPart = false;
  private loadedDynamicPart = false;
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
          this.loadingDynamicPart = true;
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
    this.sendRequest(url);
    this.onFinish = onFinish;
  }

  onResponse(response: NetworkResponseChunk) {
    this.processSubResources(response.subResources);

    if (response.cacheHeader) {
      if (!this.inProgressCacheEntries.has(response.url)) {
        this.inProgressCacheEntries.set(response.url, []);
      }
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
    this.busy = true;
    const processingTime = responseChunk.part && ["static html part", "dynamic html part"].includes(
      responseChunk.part
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
        responseChunk.part && ["static html part", "dynamic html part"].includes(responseChunk.part)
      ) {
        this.logger.push({
          type: "Layout",
          object: responseChunk.url,
          part: responseChunk.part,
          start,
          end: this.clock.time,
          actor: this.name,
        });
        if (responseChunk.part == "static html part") {
          this.renderedStaticPart = true;
        } else {
          this.renderedDynamicPart = true;
        }
      } else if (responseChunk.url === SCRIPT_URL) {
        this.ranScript = true;
        this.logger.push({
          type: "Execute JS",
          object: responseChunk.url,
          part: responseChunk.part,
          start,
          end: this.clock.time,
          actor: this.name,
        });
      } else if (responseChunk.url === SCRIPT_WITH_DATA_LOADING_URL) {
        this.ranScript = true;
        this.logger.push({
          type: "Execute JS",
          object: responseChunk.url,
          start: start,
          end: start + this.config.executeJsDuration,
          actor: this.name,
        });
        if (this.loadedDynamicPart) {
          this.logger.push({
            type: "Layout",
            object: responseChunk.url,
            start: start + this.config.executeJsDuration,
            end: this.clock.time,
            actor: this.name,
          });
          this.renderedDynamicPart = true;
        } else if (!this.loadingDynamicPart) {
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
          object: 'navigation',
          start: this.clock.time,
          end: this.clock.time,
          actor: this.name,
        });
        this.onFinish?.();
      }
      this.processingQueue.pop();
      this.busy = false;
      this.processQueue();
    });
  }
}

export const FULL_PAGE_URL = "page (full)";
export const STATIC_PAGE_URL = "page (static)";
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
      if (!this.stack.length) {
        return undefined;
      }
      this.queue = this.stack.reverse();
      this.stack = [];
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
  name = "Database";
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
    const start = this.clock.time;
    this.clock.schedule(this.config.queryDuration, () => {
      this.logger.push({
        type: "DB processing",
        object: request.url,
        start,
        end: this.clock.time,
        actor: this.name,
      });
      request.network.sendResponse({
        requestId: request.id,
        client: request.client,
        server: this,
        size: this.config.queryResponseSize,
        url: request.url,
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
  name = 'Server';
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
      part: "head",
      subResources: [SCRIPT_URL],
    };
  }

  private getStaticPageHeadChunk(): AnonymizedResponseChunk {
    return {
      url: FULL_PAGE_URL,
      size: this.config.headSize,
      part: "head",
      subResources: [SCRIPT_WITH_DATA_LOADING_URL],
    };
  }

  private getStaticHtmlChunk(): AnonymizedResponseChunk {
    return {
      url: FULL_PAGE_URL,
      size: this.config.staticHtmlChunkSize,
      part: "static html part",
    };
  }

  private getDynamicHtmlChunk(): AnonymizedResponseChunk {
    return {
      url: FULL_PAGE_URL,
      size: this.config.dynamicHtmlChunkSize,
      part: "dynamic html part",
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
      url: SCRIPT_URL,
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
      this.rendering = false;
      this.logger.push({
        type: "SSR",
        object: request.url,
        part: request.responseChunk.part,
        start: this.clock.time - this.config.renderToHtmlDuration,
        end: this.clock.time,
        actor: this.name,
      });
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
            request.responseChunk.part === "static html part"
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
  name = 'Edge';
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
        object: request.url,
        start: this.clock.time - this.latency,
        end: this.clock.time,
        actor: request.client.name,// "Network",
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
        object: response.url,
        part: response.part,
        start: this.clock.time - this.latency,
        end: this.clock.time,
        actor: response.server.name, //"Network",
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
            object: request.request.url,
            start: request.start,
            end: this.clock.time,
            actor: request.request.client.name, //"Network",
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
    let downLinkBandwidthLeft = this.downLinkBandwidth;
    while (downLinkBandwidthLeft && this.inFlightResponses.size) {
      let bandwidthPart =
        downLinkBandwidthLeft / this.inFlightResponses.size;
      const deliveredChunks: Omit<NetworkResponseChunk, "network">[] = [];
      for (const [, chunks] of this.inFlightResponses) {
        while (downLinkBandwidthLeft > 0 && chunks.length > 0) {
          const bandwidthToUse = Math.min(chunks[0].bytesLeft, bandwidthPart)
          chunks[0].bytesLeft -= bandwidthToUse;
          downLinkBandwidthLeft -= bandwidthToUse;
          if (chunks[0].bytesLeft === 0) {
            this.logger.push({
              type: "Response transfer",
              object: chunks[0].chunk.url,
              part: chunks[0].chunk.part,
              start: chunks[0].start,
              end: this.clock.time,
              actor: chunks[0].chunk.client.name, //"Network",
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
