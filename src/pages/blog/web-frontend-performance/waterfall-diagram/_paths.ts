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
];

export function getModule(diagramId: string): {
  modulePath: string;
  args: unknown[];
} {
  if (
    [
      "streaming-html",
      "not-streaming-html",
      "split-render-blocking-resources",
    ].includes(diagramId)
  ) {
    return {
      modulePath: "./_load-server-rendered-page.ts",
      args: [
        diagramId === "split-render-blocking-resources",
        diagramId !== "not-streaming-html",
      ],
    };
  }
  if (["spa-preload", "spa-no-preload"].includes(diagramId)) {
    return {
      modulePath: "./_load-client-rendered-page.ts",
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
      modulePath: "./_client-side-navigation.ts",
      args: [
        diagramId !== "client-side-navigation-no-preload",
        diagramId === "client-side-navigation-preload-code-data",
      ],
    };
  }
  if (["font-preload", "font-no-preload"].includes(diagramId)) {
    return {
      modulePath: "./_font-loading.ts",
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
      modulePath: "./_multi-sections-page.ts",
      args: [diagramId === "multi-sections-page-streaming"],
    };
  }

  if (["layout-thrashing", "no-layout-thrashing"].includes(diagramId)) {
    return {
      modulePath: "./_layout-thrashing.ts",
      args: [diagramId === "layout-thrashing"],
    };
  }

  if (["web-worker", "no-web-worker"].includes(diagramId)) {
    return {
      modulePath: "./_web-worker.ts",
      args: [diagramId === "web-worker"],
    };
  }

  throw new Error("Unknown diagramId");
}
