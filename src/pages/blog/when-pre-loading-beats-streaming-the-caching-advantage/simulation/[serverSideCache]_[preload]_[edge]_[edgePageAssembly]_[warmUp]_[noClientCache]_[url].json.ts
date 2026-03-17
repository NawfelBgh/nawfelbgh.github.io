import type { APIRoute } from "astro";
import { runSimulation, STATIC_PATHS } from "./_utils/page-load-simulation-charts";

export function getStaticPaths() {
  return structuredClone(STATIC_PATHS);
}

export const GET: APIRoute = async ({ params }) => {
  const { serverSideCache, preload, edge, edgePageAssembly, warmUp, noClientCache, url } = params;
  return new Response(JSON.stringify(
    runSimulation({serverSideCache, preload, edge, edgePageAssembly, warmUp, noClientCache, url})
  ), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
