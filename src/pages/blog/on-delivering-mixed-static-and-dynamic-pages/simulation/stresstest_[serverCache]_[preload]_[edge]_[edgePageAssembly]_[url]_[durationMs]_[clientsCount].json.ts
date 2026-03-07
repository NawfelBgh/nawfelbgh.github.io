import type { APIRoute } from "astro";
import { runSimulation, STATIC_PATHS } from "./_utils/server-load-simulation";

export function getStaticPaths() {
  return structuredClone(STATIC_PATHS);
}

export const GET: APIRoute = async ({ params }) => {
  const { serverCache, preload, edge, edgePageAssembly, url, durationMs, clientsCount } = params;
  const logs = runSimulation({serverCache, preload, edge, edgePageAssembly, url, durationMs, clientsCount});
  const pageLoadTimeDistribution: number[] = Array.from({length: 100}, () => 0);
  const sorted = logs.toSorted((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const partitionSize = sorted.length / 100;
  for (let i = 0; i < 100; ++i) {
    const start = Math.floor(partitionSize * i);
    const end = Math.min(Math.floor(partitionSize * (i + 1)), sorted.length);
    const centile = sorted.slice(start, end);
    pageLoadTimeDistribution[i] = centile.reduce((a, b) => a + b, 0) / centile.length;
  }
  return new Response(JSON.stringify({
    pageLoadPerSecond: logs.length / parseInt(durationMs || '0') * 1000,
    averagePageLoadTime: logs.reduce((acc, v) => acc + v) / logs.length,
    pageLoadTimeDistribution,
  }), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
