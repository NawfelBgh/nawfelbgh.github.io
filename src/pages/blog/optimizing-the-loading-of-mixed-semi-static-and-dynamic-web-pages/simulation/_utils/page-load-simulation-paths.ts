import { FULL_PAGE_URL, FULL_PAGE_WITH_DYNAMIC_JSON_URL, STATIC_PAGE_URL, type Logger } from "./common.ts";
import simulation, { type SimulationArgs } from "./page-load-simulation.ts";

export const STATIC_PATHS: { params: Record<keyof SimulationArgs, string> }[] = [];

for (const serverCache of [false, true]) {
  for (const preload of [false, true]) {
    for (const edge of [false, true]) {
      for (const warmUp of [false, true]) {
        for (const noClientCache of [false, true]) {
          for (const url of [STATIC_PAGE_URL, FULL_PAGE_URL, FULL_PAGE_WITH_DYNAMIC_JSON_URL]) {
            for (const edgePageAssembly of [false, true]) {
              STATIC_PATHS.push({
                params: {
                  serverCache: serverCache + '',
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

export function runSimulation(args: Partial<Record<keyof SimulationArgs, string>>): Logger {
  let {
    serverCache,
    preload,
    edge,
    warmUp,
    noClientCache,
    url,
    edgePageAssembly,
  } = args;
  return simulation({
    serverCache: serverCache === 'true',
    preload: preload === 'true',
    edge: edge === 'true',
    warmUp: warmUp === 'true',
    noClientCache: noClientCache === 'true',
    url: url ?? "404",
    edgePageAssembly: edgePageAssembly === 'true',
  });
}
