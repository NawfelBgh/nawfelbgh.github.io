import type { Logger } from "./_common.ts";
import loadFullPageNoEdgeNoClientCache from "./_loadFullPageNoEdgeNoClientCache";
import loadFullPageNoEdgeWithClientCache from "./_loadFullPageNoEdgeWithClientCache";

export const STATIC_PATHS = [
  { params: { simulationId: "loadFullPageNoEdgeNoClientCache" } },
  { params: { simulationId: "loadFullPageNoEdgeWithClientCache" } },
  
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
  }

  throw new Error("Unknown simulationId");
}
