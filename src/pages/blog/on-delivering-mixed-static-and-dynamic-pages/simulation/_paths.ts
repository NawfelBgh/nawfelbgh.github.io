import type { Logger } from "./_common.ts";
import loadFullPageNoEdgeNoClientCache from "./_loadFullPageNoEdgeNoClientCache";
import loadFullPageNoEdgeWithClientCache from "./_loadFullPageNoEdgeWithClientCache";
import loadFullPageWithEdgeNoClientCache from "./_loadFullPageWithEdgeNoClientCache";


export const STATIC_PATHS = [
  { params: { simulationId: "loadFullPageNoEdgeNoClientCache" } },
  { params: { simulationId: "loadFullPageNoEdgeWithClientCache" } },
  { params: { simulationId: "loadFullPageWithEdgeNoClientCache" } },
  
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
  }

  throw new Error("Unknown simulationId");
}
