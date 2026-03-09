import type { Clock } from "./clock";
import {
  type IServer,
  type IClient,
  type Logger,
  type SimulationConfig,
  type AnonymizedResponseChunk,
  type NetworkResponseChunk,
  type NetworkRequest,
  FULL_PAGE_URL,
  makeRequestId,
  DYNAMIC_PAGE_PART_URL,
  HEAD_PART,
  STATIC_HTML_PART,
  FULL_PAGE_WITH_DYNAMIC_JSON_URL,
  DYNAMIC_PAGE_DATA_JSON_URL,
  DYNAMIC_JSON_PART
} from "./common";
import type { Network } from "./network";

export class Edge implements IServer, IClient {
  name = "Edge";
  constructor(
    private logger: Logger,
    private clock: Clock,
    private originNetwork: Network,
    private origin: IServer,
    private config: SimulationConfig
  ) {}

  private cache = new Map<string, AnonymizedResponseChunk[]>();
  private inProgressCacheEntries = new Map<string, NetworkResponseChunk[]>();

  private fullPageCachedChunks?: AnonymizedResponseChunk[];
  private inProgressFullPageCachedChunks: NetworkResponseChunk[] = [];

  onRequest(request: NetworkRequest) {
    if (this.cache.has(request.url)) {
      this.logger.push({
        type: "Cache Hit",
        object: request.url,
        start: this.clock.time,
        end: this.clock.time,
        actor: this.name,
      });
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
    if (
      this.config.edgePageAssembly &&
      [FULL_PAGE_URL, FULL_PAGE_WITH_DYNAMIC_JSON_URL].includes(request.url) &&
      this.fullPageCachedChunks
    ) {
      this.logger.push({
        type: "Cache Hit (shared part)",
        object: request.url,
        start: this.clock.time,
        end: this.clock.time,
        actor: this.name,
      });
      for (const chunk of this.fullPageCachedChunks) {
        request.network.sendResponse({
          client: request.client,
          server: this,
          requestId: request.id,
          ...chunk,
          url: request.url,
        });
      }
      if (request.url === FULL_PAGE_URL) {
        this.originNetwork.sendRequest({
          id: makeRequestId(),
          client: this,
          server: this.origin,
          url: DYNAMIC_PAGE_PART_URL,
          size: this.config.requestSize,
          context: request,
        });
      } else if (request.url === FULL_PAGE_WITH_DYNAMIC_JSON_URL) {
        this.originNetwork.sendRequest({
          id: makeRequestId(),
          client: this,
          server: this.origin,
          url: DYNAMIC_PAGE_DATA_JSON_URL,
          size: this.config.requestSize,
          context: request,
        });
      }
      return;
    }
    this.logger.push({
      type: "Cache Miss",
      object: request.url,
      start: this.clock.time,
      end: this.clock.time,
      actor: this.name,
    });
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
        !this.cache.has(response.url)
      ) {
        this.inProgressCacheEntries.set(response.url, [response]);
      }
    }
    const originalRequest = response.context as NetworkRequest;

    if (this.inProgressCacheEntries.has(response.url)) {
      const chunks = this.inProgressCacheEntries.get(response.url)!;
      if (
        chunks[0].requestId === response.requestId &&
        response !== chunks[0]
      ) {
        chunks.push(response);
      }
      if (response.done) {
        this.cache.set(
          response.url,
          chunks.map(({ client, server, network, ...c }) => c)
        );
        this.inProgressCacheEntries.delete(response.url);
      }
    }

    if (
      this.config.edgePageAssembly &&
      [FULL_PAGE_URL, FULL_PAGE_WITH_DYNAMIC_JSON_URL].includes(originalRequest.url) &&
      !this.fullPageCachedChunks
    ) {
      if (
        this.inProgressFullPageCachedChunks.length === 0 &&
        response.part === HEAD_PART
      ) {
        this.inProgressFullPageCachedChunks.push(response);
      } else if (
        this.inProgressFullPageCachedChunks.length === 1 &&
        response.part === STATIC_HTML_PART
      ) {
        this.inProgressFullPageCachedChunks.push(response);
        this.fullPageCachedChunks = this.inProgressFullPageCachedChunks.map(
          ({ context, client, server, network, ...anonymized }) => anonymized
        );
        this.inProgressFullPageCachedChunks.length = 0;
      }
    }

    const { client, server, network, context, ...anonymizedResponseChunk } =
      response;

    originalRequest.network.sendResponse({
      ...anonymizedResponseChunk,
      client: originalRequest.client,
      server: this,
      // Reset url to that of the origin request to account for edgePageAssembly
      // which can replace FULL_PAGE_URL with DYNAMIC_PAGE_PART_URL and FULL_PAGE_WITH_DYNAMIC_JSON_URL with DYNAMIC_PAGE_DATA_JSON_URL
      url: originalRequest.url,
      part: originalRequest.url === FULL_PAGE_WITH_DYNAMIC_JSON_URL && response.url === DYNAMIC_PAGE_DATA_JSON_URL ? DYNAMIC_JSON_PART : response.part,
    });
  }
}