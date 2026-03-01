import type { Logger } from "./_common.ts";
import loadFullPageNoEdgeNoClientCache from "./_loadFullPageNoEdgeNoClientCache";

export const STATIC_PATHS = [
  { params: { simulationId: "loadFullPageNoEdgeNoClientCache" } },
];

export function getModule(simulationId: string): {
  module: () => Logger;
} {
  if (simulationId === "loadFullPageNoEdgeNoClientCache") {
    return {
      module: loadFullPageNoEdgeNoClientCache,
    };
  }

  throw new Error("Unknown simulationId");
}
