import {
  Clock,
  Client,
  Database,
  FrontendServer,
  Network,
  type SimulationConfig,
  type Logger,
  Edge,
} from "./_common";
import { FULL_PAGE_URL } from "./_common";

export default function main(): Logger {
  const config: SimulationConfig = {
    queryDuration: 50,
    queryResponseSize: 50000,
    renderToHtmlDuration: 50,
    renderFromHtmlDuration: 50,
    renderFromJsonDuration: 100,
    executeJsDuration: 200,
    requestSize: 250,
    headSize: 1000,
    staticHtmlChunkSize: 50000,
    dynamicHtmlChunkSize: 50000,
    scriptSize: 50000,
    dynamicDataSize: 50000,
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

  const edgeToServerNetwork = new Network(logger, clock, 150, 10_000, 10_000);
  const edge = new Edge(logger, clock, edgeToServerNetwork, server, config);

  const clientToEdgeNetwork = new Network(logger, clock, 50, 2500, 2500);
  const client = new Client(
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
    // Navigate a first time to warm the edge's cache
    client.navigate(FULL_PAGE_URL, () => {
      // Navigate a second time with the cache
      logger.length = 0;
      clock.reset();
      client.clearCache();
      client.navigate(FULL_PAGE_URL, () => {
        clock.stop();
      });
    });
  });

  return logger;
}
