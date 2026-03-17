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
  edge: boolean,
  warmUp: boolean,
  noClientCache: boolean,
  url: string,
};

export type NetworkConfig = {
  latency: number,
  upLinkBandwidth: number,
  downLinkBandwidth: number,
}

export type SimulationNetworkConfig = {
  serverToDbNetwork: NetworkConfig,
  edgeToServerNetwork: NetworkConfig,
  clientToEdgeNetwork: NetworkConfig,
  clientToServerNetwork: NetworkConfig,
}

export default function main(args: SimulationArgs, config: SimulationConfig, networkConfig: SimulationNetworkConfig): Logger {
  const logger: Logger = [];
  const clock = new Clock();

  const serverToDbNetwork = new Network(
    logger,
    clock,
    networkConfig.serverToDbNetwork.latency,
    networkConfig.serverToDbNetwork.upLinkBandwidth,
    networkConfig.serverToDbNetwork.downLinkBandwidth
  );
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
    const edgeToServerNetwork = new Network(
      logger,
      clock,
      networkConfig.edgeToServerNetwork.latency,
      networkConfig.edgeToServerNetwork.upLinkBandwidth,
      networkConfig.edgeToServerNetwork.downLinkBandwidth
    );
    const edge = new Edge(logger, clock, edgeToServerNetwork, server, config);
  
    const clientToEdgeNetwork = new Network(
      logger,
      clock,
      networkConfig.clientToEdgeNetwork.latency,
      networkConfig.clientToEdgeNetwork.upLinkBandwidth,
      networkConfig.clientToEdgeNetwork.downLinkBandwidth
    );
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
    const clientToServerNetwork = new Network(
      logger,
      clock,
      networkConfig.clientToServerNetwork.latency,
      networkConfig.clientToServerNetwork.upLinkBandwidth,
      networkConfig.clientToServerNetwork.downLinkBandwidth
    );
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
