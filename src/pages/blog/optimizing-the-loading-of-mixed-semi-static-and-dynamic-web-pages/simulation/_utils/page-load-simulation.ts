import { Client } from "./client";
import { Clock } from "./clock";
import {
  type SimulationConfig,
  type Logger,
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
  warmUp: boolean,
  noClientCache: boolean,
  url: string,
};

export default function main(args: SimulationArgs): Logger {
  const config: SimulationConfig = {
    queryDuration: 50,
    queryResponseSize: 25_000,
    renderToHtmlDuration: 50,
    renderFromHtmlDuration: 50,
    renderFromJsonDuration: 100,
    executeJsDuration: 250,
    hydrationDuration: 50,
    requestSize: 250,
    headSize: 1000,
    semiStaticHtmlChunkSize: 25_000,
    dynamicHtmlChunkSize: 25_000,
    dynamicDataSize: 25_000,
    scriptSize: 250_000,
    serverSideCache: args.serverCache,
    preload: args.preload,
    edgePageAssembly: args.edgePageAssembly,
  };

  const logger: Logger = [];
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
  let client: Client;

  const simulationFn = () => {
    client.navigate(args.url, () => {
      if (!args.warmUp) {
        clock.stop();
      } else {
        logger.length = 0;
        clock.reset();
        if (args.noClientCache) {
          client.clearCache();
        }
        client.navigate(args.url, () => {
          clock.stop();
        });
      }
    });
  };

  if (args.edge) {
    // Splitting the latency 200 between edgeToServerNetwork and clientToEdgeNetwork
    const edgeToServerNetwork = new Network(logger, clock, 150, 10_000, 10_000);
    const edge = new Edge(logger, clock, edgeToServerNetwork, server, config);
  
    const clientToEdgeNetwork = new Network(logger, clock, 50, 2500, 2500);
    client = new Client(
      logger,
      clock,
      clientToEdgeNetwork,
      edge,
      config
    );

    clock.start(() => {
      clientToEdgeNetwork.processRequests();
      clientToEdgeNetwork.processResponses();
      edgeToServerNetwork.processRequests();
      edgeToServerNetwork.processResponses();
      serverToDbNetwork.processRequests();
      serverToDbNetwork.processResponses();

      simulationFn();
     });

  } else {
    const clientToServerNetwork = new Network(logger, clock, 200, 2500, 2500);
    client = new Client(
      logger,
      clock,
      clientToServerNetwork,
      server,
      config
    );

    clock.start(() => {
      clientToServerNetwork.processRequests();
      clientToServerNetwork.processResponses();
      serverToDbNetwork.processRequests();
      serverToDbNetwork.processResponses();
      
      simulationFn();
    });
  }

  return logger;
}
