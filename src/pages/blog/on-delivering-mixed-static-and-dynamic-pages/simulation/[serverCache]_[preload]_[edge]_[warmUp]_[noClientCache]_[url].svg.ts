import type { APIRoute } from "astro";
import type { Logger } from "./_common";
import { runSimulation, STATIC_PATHS } from "./_paths";
import { renderToSvg } from "./_renderToSvg";

export const partial = true;

export function getStaticPaths() {
  return structuredClone(STATIC_PATHS);
}

export const GET: APIRoute = ({ params }) => {
  const { serverCache, preload, edge, warmUp, noClientCache, url } = params;

  const logs: Logger = runSimulation({serverCache, preload, edge, warmUp, noClientCache, url});

  return new Response(
    renderToSvg({logs, slideMode: false, rightPadding: 50}), {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
};
