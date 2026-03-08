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
  network: INetwork;
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
  network: INetwork;
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

export class DevNullLogger extends Array<SimulationEvent> {
  push(): number {
    return 0;
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

export interface INetwork {
  sendRequest(request: Omit<NetworkRequest, "network">): void;
  sendResponse(response: Omit<NetworkResponseChunk, "network">): void;
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
  preload?: boolean;
  serverSideCache?: boolean;
  edgePageAssembly?: boolean;
  hydrationDuration: number;
}


export const FULL_PAGE_URL = "full-page";
export const STATIC_PAGE_URL = "split-page";
export const FULL_PAGE_WITH_DYNAMIC_JSON_URL = "page-with-dynamic-json";
export const DYNAMIC_PAGE_PART_URL = "dynamic-page-part";
export const SCRIPT_URL = "script.js";
export const SCRIPT_WITH_DATA_LOADING_URL = "script+load.js";
export const DYNAMIC_PAGE_DATA_JSON_URL = "dynamic-page-data.json";
export const STATIC_HTML_PART = "semi-static html part";
export const DYNAMIC_HTML_PART = "dynamic html part";
export const DYNAMIC_JSON_PART = "dynamic json part";
export const HEAD_PART = "head";

export const DB_STATIC_PART_QUERY = "db-static-part-query";
export const DB_DYNAMIC_PART_QUERY = "db-dynamic-part-query";

