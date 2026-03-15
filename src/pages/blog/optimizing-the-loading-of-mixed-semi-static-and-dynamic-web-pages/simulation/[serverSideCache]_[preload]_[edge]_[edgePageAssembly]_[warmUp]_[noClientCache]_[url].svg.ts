import type { APIRoute } from "astro";
import type { Logger } from "./_utils/common";
import { runSimulation, STATIC_PATHS } from "./_utils/page-load-simulation-charts";
import { renderToSvg } from "./_utils/renderToSvg";

export const partial = true;

export function getStaticPaths() {
  return structuredClone(STATIC_PATHS);
}

export const GET: APIRoute = ({ params }) => {
  const { serverSideCache, preload, edge, edgePageAssembly, warmUp, noClientCache, url } = params;

  const logs: Logger = runSimulation({serverSideCache, preload, edge, edgePageAssembly, warmUp, noClientCache, url});

  return new Response(
    renderToSvg({logs, slideMode: false, rightPadding: 50}), {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
};
