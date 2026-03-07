import { Client } from "./client";
import { Clock } from "./clock";
import {
  type SimulationConfig,
  type Logger,
  STATIC_PAGE_URL,
  FULL_PAGE_URL,
  DevNullLogger,
} from "./common";
import { Database } from "./database";
import { Edge } from "./edge";
import { Network } from "./network";
import { FrontendServer } from "./server";

export type SimulationArgs = {
  serverCache: boolean,
  preload: boolean,
  edge: boolean,
  edgePageAssembly: boolean,
  url: string,
  clientsCount: number,
  durationMs: number,
};

export const STATIC_PATHS: { params: Record<keyof SimulationArgs, string> }[] = [];

for (const serverCache of [false, true]) {
  for (const preload of [false, true]) {
    for (const edge of [false, true]) {
      for (const clientsCount of [1, 10, 20, 40]) {
        for (const url of [STATIC_PAGE_URL, FULL_PAGE_URL]) {
          for (const edgePageAssembly of [false, true]) {
            for (const durationMs of [10_000, 300_000]) {
              STATIC_PATHS.push({
                params: {
                  serverCache: serverCache + '',
                  preload: preload + '',
                  edge: edge + '',
                  url,
                  edgePageAssembly: edgePageAssembly + '',
                  durationMs: durationMs + '',
                  clientsCount: clientsCount + '',
                }
              });
            }
          }
        } 
      }
    } 
  }
}

export function runSimulation(args: Partial<Record<keyof SimulationArgs, string>>): number[] {
  let {
    serverCache,
    preload,
    edge,
    url,
    edgePageAssembly,
    durationMs,
    clientsCount,
  } = args;
  return main({
    serverCache: serverCache === 'true',
    preload: preload === 'true',
    edge: edge === 'true',
    url: url ?? "404",
    edgePageAssembly: edgePageAssembly === 'true',
    durationMs: parseInt(durationMs || '0') || 0,
    clientsCount: parseInt(clientsCount || '0') || 0
  });
}

export default function main(args: SimulationArgs): number[] {
  const config: SimulationConfig = {
    queryDuration: 50,
    queryResponseSize: 50000,
    renderToHtmlDuration: 50,
    renderFromHtmlDuration: 50,
    renderFromJsonDuration: 100,
    executeJsDuration: 200,
    hydrationDuration: 50,
    requestSize: 250,
    headSize: 1000,
    staticHtmlChunkSize: 50000,
    dynamicHtmlChunkSize: 50000,
    scriptSize: 50000,
    dynamicDataSize: 50000,
    serverSideCache: args.serverCache,
    preload: args.preload,
    edgePageAssembly: args.edgePageAssembly,
  };

  const logger: Logger = new DevNullLogger();
  const logger2: number[] = [];
  const clock = new Clock();

  const serverToDbNetwork = new Network(logger, clock, 5, 100_000, 100_000);
  const database = new Database(logger, clock, config);
  const server = new FrontendServer(
    logger,
    clock,
    serverToDbNetwork,
    database,
    config
  );

  const simulationFn = (clients: Client[]) => {
    clock.schedule(args.durationMs, () => {
      clock.stop();
    });
    for (const client of clients) {
      const navigate = () => {
        const start = clock.time;
        client.navigate(args.url, () => {
          client.clearCache();
          logger2.push(clock.time - start);
          navigate();
        });
      };
      navigate();
    }
  };

  if (args.edge) {
    // Splitting the latency 200 between edgeToServerNetwork and clientToEdgeNetwork
    const edgeToServerNetwork = new Network(logger, clock, 150, 10_000, 10_000);
    const edge = new Edge(logger, clock, edgeToServerNetwork, server, config);
  
    const clientToEdgeNetwork = new Network(logger, clock, 50, 2500, 2500);
    const clients: Client[] = Array.from(
      { length: args.clientsCount },
      () => new Client(
        logger,
        clock,
        clientToEdgeNetwork,
        edge,
        config
      )
    );

    clock.start(() => {
      clientToEdgeNetwork.processRequests();
      clientToEdgeNetwork.processResponses();
      edgeToServerNetwork.processRequests();
      edgeToServerNetwork.processResponses();
      serverToDbNetwork.processRequests();
      serverToDbNetwork.processResponses();

      simulationFn(clients);
     });

  } else {
    const clientToServerNetwork = new Network(logger, clock, 200, 2500, 2500);
    const clients: Client[] = Array.from(
      { length: args.clientsCount },
      () => new Client(
        logger,
        clock,
        clientToServerNetwork,
        server,
        config
      )
    );

    clock.start(() => {
      clientToServerNetwork.processRequests();
      clientToServerNetwork.processResponses();
      serverToDbNetwork.processRequests();
      serverToDbNetwork.processResponses();
      
      simulationFn(clients);
    });
  }

  return logger2;
}
