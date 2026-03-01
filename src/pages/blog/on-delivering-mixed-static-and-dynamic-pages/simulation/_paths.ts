import type { Logger } from "./_common.ts";
import loadFullPageNoEdgeNoClientCache from "./_loadFullPageNoEdgeNoClientCache";
import loadFullPageNoEdgeWithClientCache from "./_loadFullPageNoEdgeWithClientCache";
import loadFullPageWithEdgeNoClientCache from "./_loadFullPageWithEdgeNoClientCache";

import loadSplitPageNoPreloadNoEdgeNoClientCache from "./_loadSplitPageNoPreloadNoEdgeNoClientCache.ts";
import loadSplitPageNoPreloadNoEdgeWithClientCache from "./_loadSplitPageNoPreloadNoEdgeWithClientCache.ts";
import loadSplitPageNoPreloadWithEdgeNoClientCache from "./_loadSplitPageNoPreloadWithEdgeNoClientCache.ts";

import loadSplitPageWithPreloadNoEdgeNoClientCache from "./_loadSplitPageWithPreloadNoEdgeNoClientCache.ts";
import loadSplitPageWithPreloadNoEdgeWithClientCache from "./_loadSplitPageWithPreloadNoEdgeWithClientCache.ts";
import loadSplitPageWithPreloadWithEdgeNoClientCache from "./_loadSplitPageWithPreloadWithEdgeNoClientCache.ts";

export const STATIC_PATHS = [
  { params: { simulationId: "loadFullPageNoEdgeNoClientCache" } },
  { params: { simulationId: "loadFullPageNoEdgeWithClientCache" } },
  { params: { simulationId: "loadFullPageWithEdgeNoClientCache" } },

  { params: { simulationId: "loadSplitPageNoPreloadNoEdgeNoClientCache" } },
  { params: { simulationId: "loadSplitPageNoPreloadNoEdgeWithClientCache" } },
  { params: { simulationId: "loadSplitPageNoPreloadWithEdgeNoClientCache" } },

  { params: { simulationId: "loadSplitPageWithPreloadNoEdgeNoClientCache" } },
  { params: { simulationId: "loadSplitPageWithPreloadNoEdgeWithClientCache" } },
  { params: { simulationId: "loadSplitPageWithPreloadWithEdgeNoClientCache" } },
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
  } else if (simulationId === "loadSplitPageNoPreloadNoEdgeWithClientCache") {
    return {
      module: loadSplitPageNoPreloadNoEdgeWithClientCache,
    };
  } else if (simulationId === "loadSplitPageNoPreloadWithEdgeNoClientCache") {
    return {
      module: loadSplitPageNoPreloadWithEdgeNoClientCache,
    };
  } else if (simulationId === "loadSplitPageWithPreloadNoEdgeNoClientCache") {
    return {
      module: loadSplitPageWithPreloadNoEdgeNoClientCache,
    };
  } else if (simulationId === "loadSplitPageWithPreloadNoEdgeWithClientCache") {
    return {
      module: loadSplitPageWithPreloadNoEdgeWithClientCache,
    };
  } else if (simulationId === "loadSplitPageWithPreloadWithEdgeNoClientCache") {
    return {
      module: loadSplitPageWithPreloadWithEdgeNoClientCache,
    };
  }

  throw new Error("Unknown simulationId");
}
