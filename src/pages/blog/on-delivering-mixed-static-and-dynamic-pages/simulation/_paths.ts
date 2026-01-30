//import type { Log } from "./_common.ts";

export const STATIC_PATHS = [
  { params: { diagramId: "streaming-from-server" } },
  { params: { diagramId: "streaming-from-edge" } },
  { params: { diagramId: "no-optimization" } },
  { params: { diagramId: "preloading" } },
  { params: { diagramId: "caching" } },
  { params: { diagramId: "preloading+caching" } },
];

export function getModule(diagramId: string): {
  module: { main: (...args: boolean[]) => /*Log*/[] };
  args: boolean[];
} {
  if (diagramId.startsWith("preload-")) {
    return {
      module: { main: () => [] },
      args: [
        diagramId.endsWith("early-hints"),
        diagramId.endsWith("link-header"),
        diagramId.endsWith("link-tag"),
      ],
    };
  }

  throw new Error("Unknown diagramId");
}
