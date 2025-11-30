import type { APIRoute } from "astro";
import type { Log } from "./_common";
import { getModule, STATIC_PATHS } from "./_paths";
import { renderToSvg } from "./_renderToSvg";

export const partial = true;

export function getStaticPaths() {
  return structuredClone(STATIC_PATHS);
}

export const GET: APIRoute = ({ params }) => {
  const { diagramId } = params;
  const { module, args } = getModule(diagramId as string);

  const logs: Log[] = module.main(...args);
  const rightPaddings : Record<string, number> = {
    "multi-sections-page-ooo-streaming": 75,
    "multi-sections-page-in-order-streaming": 100,
    "not-streaming-html": 25,
  }
  const rightPadding = rightPaddings[diagramId as string] ?? 0;
  return new Response(
    renderToSvg({logs, slideMode: true, rightPadding, showLatencyLines: true}), {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
};
