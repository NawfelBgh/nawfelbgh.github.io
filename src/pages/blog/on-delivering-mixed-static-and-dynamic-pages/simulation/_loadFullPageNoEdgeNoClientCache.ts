import {
  Clock,
  Client,
  Database,
  FrontendServer,
  Network,
  type SimulationConfig,
  type Logger,
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

  const clientToServerNetwork = new Network(logger, clock, 200, 25_000, 25_000);
  const client = new Client(
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
    client.navigate(FULL_PAGE_URL, () => {
      clock.stop();
    });
  });

  return logger;
}
