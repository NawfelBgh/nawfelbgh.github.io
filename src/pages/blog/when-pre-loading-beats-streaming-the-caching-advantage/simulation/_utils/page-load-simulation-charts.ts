import { FULL_PAGE_URL, FULL_PAGE_WITH_DYNAMIC_JSON_URL, SEMI_STATIC_PAGE_URL, type Logger, type SimulationConfig } from "./common.ts";
import simulation, { type SimulationArgs, type SimulationNetworkConfig } from "./page-load-simulation.ts";

export type SimulationChartArgs = Record<keyof SimulationArgs, string> & {
  serverSideCache: string;
  preload: string;
  edgePageAssembly: string;
};

export const STATIC_PATHS: { params: SimulationChartArgs }[] = [];

for (const serverSideCache of [false, true]) {
  for (const preload of [false, true]) {
    for (const edge of [false, true]) {
      for (const warmUp of [false, true]) {
        for (const noClientCache of [false, true]) {
          for (const url of [SEMI_STATIC_PAGE_URL, FULL_PAGE_URL, FULL_PAGE_WITH_DYNAMIC_JSON_URL]) {
            for (const edgePageAssembly of [false, true]) {
              STATIC_PATHS.push({
                params: {
                  serverSideCache: serverSideCache + '',
                  preload: preload + '',
                  edge: edge + '',
                  warmUp: warmUp + '',
                  noClientCache: noClientCache + '',
                  url,
                  edgePageAssembly: edgePageAssembly + '',
                }
              });
            }
          } 
        }
      } 
    }
  }
}

const commonSimulationConfig: SimulationConfig = {
  queryDuration: 50,
  queryResponseSize: 25_000,
  renderToHtmlDuration: 50,
  renderFromHtmlDuration: 50,
  renderFromJsonDuration: 100,
  executeJsDuration: 250,
  hydrationDuration: 50,
  requestSize: 250,
  headSize: 1000,
  semiStaticHtmlChunkSize: 25_000,
  dynamicHtmlChunkSize: 25_000,
  dynamicDataSize: 25_000,
  scriptSize: 250_000,
}

const simulationNetworkConfig: SimulationNetworkConfig = {
  serverToDbNetwork: {
    latency: 5, // ms
    upLinkBandwidth: 100_000, // KB/s
    downLinkBandwidth: 100_000, // KB/s
  },
  edgeToServerNetwork: {
    latency: 150, // ms
    upLinkBandwidth: 10_000, // KB/s
    downLinkBandwidth: 10_000, // KB/s
  },
  clientToEdgeNetwork: {
    latency: 50, // ms
    upLinkBandwidth: 2500, // KB/s
    downLinkBandwidth: 2500, // KB/s
  },
  clientToServerNetwork: {
    latency: 200, // ms
    upLinkBandwidth: 2500, // KB/s
    downLinkBandwidth: 2500, // KB/s
  },
};

export function runSimulation(args: Partial<SimulationChartArgs>): Logger {
  let {
    serverSideCache,
    preload,
    edge,
    warmUp,
    noClientCache,
    url,
    edgePageAssembly,
  } = args;
  return simulation(
    {
      edge: edge === 'true',
      warmUp: warmUp === 'true',
      noClientCache: noClientCache === 'true',
      url: url ?? "404",
    }, {
      ...commonSimulationConfig,
      serverSideCache: serverSideCache === 'true',
      preload: preload === 'true',
      edgePageAssembly: edgePageAssembly === 'true',
    },
    simulationNetworkConfig
);
}
