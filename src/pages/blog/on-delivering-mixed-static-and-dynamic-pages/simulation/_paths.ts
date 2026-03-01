import type { Logger } from "./_common.ts";
import loadFullPageNoEdgeNoClientCache from "./_loadFullPageNoEdgeNoClientCache";
import loadFullPageNoEdgeWithClientCache from "./_loadFullPageNoEdgeWithClientCache";
import loadFullPageWithEdgeNoClientCache from "./_loadFullPageWithEdgeNoClientCache";

import loadSplitPageNoPreloadNoEdgeNoClientCache from "./_loadSplitPageNoPreloadNoEdgeNoClientCache.ts";

import loadSplitPageWithPreloadNoEdgeNoClientCache from "./_loadSplitPageWithPreloadNoEdgeNoClientCache.ts";


export const STATIC_PATHS = [
  { params: { simulationId: "loadFullPageNoEdgeNoClientCache" } },
  { params: { simulationId: "loadFullPageNoEdgeWithClientCache" } },
  { params: { simulationId: "loadFullPageWithEdgeNoClientCache" } },

  { params: { simulationId: "loadSplitPageNoPreloadNoEdgeNoClientCache" } },

  { params: { simulationId: "loadSplitPageWithPreloadNoEdgeNoClientCache" } },
];

export function getModule(simulationId: string): {
  module: () => Logger;
} {
  if (simulationId === "loadFullPageNoEdgeNoClientCache") {
    return {
      module: loadFullPageNoEdgeNoClientCache,
    };
  } else if (simulationId === "loadFullPageNoEdgeWithClientCache") {
    return {
      module: loadFullPageNoEdgeWithClientCache,
    };
  } else if (simulationId === "loadFullPageWithEdgeNoClientCache") {
    return {
      module: loadFullPageWithEdgeNoClientCache,
    };

  } else if (simulationId === "loadSplitPageNoPreloadNoEdgeNoClientCache") {
    return {
      module: loadSplitPageNoPreloadNoEdgeNoClientCache,
    };
  
  } else if (simulationId === "loadSplitPageWithPreloadNoEdgeNoClientCache") {
    return {
      module: loadSplitPageWithPreloadNoEdgeNoClientCache,
    };
  }

  throw new Error("Unknown simulationId");
}
