import type { Log } from "./_common.ts";
import * as clientSideNavigation from "./_clientSideNavigation.ts";
import * as fontLoading from "./_fontLoading.ts";
import * as layoutThrashing from "./_layoutThrashing.ts";
import * as loadClientRenderedPage from "./_loadClientRenderedPage.ts";
import * as loadServerRenderedPage from "./_loadServerRenderedPage.ts";
import * as multiSectionsPage from "./_multiSectionsPage.ts";
import * as webWorker from "./_webWorker.ts";
import * as preloading from "./_preloading.ts";

export const STATIC_PATHS = [
  { params: { diagramId: "streaming-html" } },
  { params: { diagramId: "not-streaming-html" } },
  { params: { diagramId: "split-render-blocking-resources" } },
  { params: { diagramId: "spa-preload" } },
  { params: { diagramId: "spa-no-preload" } },
  { params: { diagramId: "client-side-navigation-no-preload" } },
  { params: { diagramId: "client-side-navigation-preload-data" } },
  { params: { diagramId: "client-side-navigation-preload-code-data" } },
  { params: { diagramId: "font-no-preload" } },
  { params: { diagramId: "font-preload" } },
  { params: { diagramId: "multi-sections-page-no-streaming" } },
  { params: { diagramId: "multi-sections-page-streaming" } },
  { params: { diagramId: "layout-thrashing" } },
  { params: { diagramId: "no-layout-thrashing" } },
  { params: { diagramId: "web-worker" } },
  { params: { diagramId: "no-web-worker" } },
  { params: { diagramId: "no-web-worker-split-long-task" } },
  { params: { diagramId: "preload-not" } },
  { params: { diagramId: "preload-link-tag" } },
  { params: { diagramId: "preload-link-header" } },
  { params: { diagramId: "preload-early-hints" } },
];

export function getModule(diagramId: string): {
  module: { main: (...args: boolean[]) => Log[] };
  args: boolean[];
} {
  if (
    [
      "streaming-html",
      "not-streaming-html",
      "split-render-blocking-resources",
    ].includes(diagramId)
  ) {
    return {
      module: loadServerRenderedPage,
      args: [
        diagramId === "split-render-blocking-resources",
        diagramId !== "not-streaming-html",
      ],
    };
  }
  if (["spa-preload", "spa-no-preload"].includes(diagramId)) {
    return {
      module: loadClientRenderedPage,
      args: [diagramId === "spa-preload"],
    };
  }
  if (
    [
      "client-side-navigation-no-preload",
      "client-side-navigation-preload-data",
      "client-side-navigation-preload-code-data",
    ].includes(diagramId)
  ) {
    return {
      module: clientSideNavigation,
      args: [
        diagramId !== "client-side-navigation-no-preload",
        diagramId === "client-side-navigation-preload-code-data",
      ],
    };
  }
  if (["font-preload", "font-no-preload"].includes(diagramId)) {
    return {
      module: fontLoading,
      args: [diagramId === "font-preload"],
    };
  }

  if (
    [
      "multi-sections-page-no-streaming",
      "multi-sections-page-streaming",
    ].includes(diagramId)
  ) {
    return {
      module: multiSectionsPage,
      args: [diagramId === "multi-sections-page-streaming"],
    };
  }

  if (["layout-thrashing", "no-layout-thrashing"].includes(diagramId)) {
    return {
      module: layoutThrashing,
      args: [diagramId === "layout-thrashing"],
    };
  }

  if (
    ["web-worker", "no-web-worker", "no-web-worker-split-long-task"].includes(
      diagramId
    )
  ) {
    return {
      module: webWorker,
      args: [diagramId === "web-worker", diagramId.includes("split-long-task")],
    };
  }

  if (diagramId.startsWith("preload-")) {
    return {
      module: preloading,
      args: [
        diagramId.endsWith("early-hints"),
        diagramId.endsWith("link-header"),
        diagramId.endsWith("link-tag"),
      ],
    };
  }

  throw new Error("Unknown diagramId");
}
