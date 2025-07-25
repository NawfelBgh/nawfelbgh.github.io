import type { APIRoute } from "astro";
import { getModule, STATIC_PATHS } from "./_paths";

export function getStaticPaths() {
  return STATIC_PATHS;
}

export const GET: APIRoute = async ({ params, request }) => {
  const { diagramId } = params;

  const { module, args } = getModule(diagramId!);

  return new Response(JSON.stringify(module.main(...args)), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
