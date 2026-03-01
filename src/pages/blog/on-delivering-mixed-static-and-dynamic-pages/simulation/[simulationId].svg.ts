import type { APIRoute } from "astro";
import type { Logger } from "./_common";
import { getModule, STATIC_PATHS } from "./_paths";
import { renderToSvg } from "./_renderToSvg";

export const partial = true;

export function getStaticPaths() {
  return structuredClone(STATIC_PATHS);
}

export const GET: APIRoute = ({ params }) => {
  const { simulationId } = params;
  const { module } = getModule(simulationId as string);

  const logs: Logger = module();
  const rightPaddings : Record<string, number> = {
    "diagram": 75,
  }
  const rightPadding = rightPaddings[simulationId as string] ?? 50;

  return new Response(
    renderToSvg({logs, slideMode: false, rightPadding}), {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
};
