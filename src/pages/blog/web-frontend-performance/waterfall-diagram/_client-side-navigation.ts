import {
  Connection,
  createMutex,
  createPromise,
  getRuntime,
  Logger,
  MPSC,
  RTMutex,
  RTPromise,
  Runtime,
  sleep,
  type Actor,
  type Log,
  type Message,
  type Task,
} from "./_common";

/* Unit: milliseconds */
const NETWORK_LATENCY = 50; // x2 = RTT of 100ms
const SERVER_FAST_RESPONSE_LATENCY = 10;
const SERVER_SLOW_RESPONSE_LATENCY = 250;
const BLOCKING_JS_EXEC_DURATION = 100;
const DATA_RENDERING_JS_EXEC_DURATION = 100;
const LAYOUT_DURATION = 100;
const HOVER_DURATION = 500;
/* Unit: bytes per millisecond, or KB per second */
const BANDWIDTH = 750;
/* Unit: bytes */
const SCRIPT_SIZE = 200_000;
const DATA_SIZE = 10_000;
const REQUEST_SIZE = 500;

class Client implements Actor {
  messageQueue = new MPSC<Message>();
  name = "client";

  constructor(
    public logger: Logger,
    public server: Server,
    private preloadData: boolean,
    private preloadCodeOnHover: boolean
  ) {}

  *navigateToPage(): Task {
    const { preloadData, preloadCodeOnHover } = this;
    const controller = new AbortController();
    const connection = new Connection({
      client: this,
      server: this.server,
      latency: NETWORK_LATENCY,
      upLinkBandwidth: BANDWIDTH,
      downLinkBandwidth: BANDWIDTH,
      abortSignal: controller.signal,
      logger: this.logger,
    });

    const runtime: Runtime = yield* getRuntime();
    runtime.spawn(function* () {
      yield* connection.deliveryLoop();
    });
    const { logger, messageQueue } = this;

    const startHover = runtime.getTime();
    messageQueue.send({ connection, object: "hover" });
    runtime.spawn(function* () {
      // logging the event ASAP to make it appear first
      const event = {
        actor: "client",
        object: "User events",
        event: "hover",
        startTime: startHover,
        endTime: 0,
      };
      logger.log(event);
      yield* sleep(HOVER_DURATION);
      const clickTime = runtime.getTime();
      event.endTime = clickTime;
      logger.log({
        actor: "client",
        object: "User events",
        event: "click",
        startTime: clickTime,
        endTime: clickTime,
      });
      messageQueue.send({ connection, object: "click" });
    });

    const jsExecutedPromise: RTPromise<undefined> = yield* createPromise();
    const cpuLock: RTMutex = yield* createMutex();

    function* layout() {
      yield* cpuLock.lock();
      const startTime = runtime.getTime();
      yield* sleep(LAYOUT_DURATION);
      cpuLock.unlock();
      logger.log({
        actor: "client",
        object: "Layout",
        event: "Layout",
        highlight: true,
        startTime,
        endTime: runtime.getTime(),
      });
    }

    while (true) {
      const { connection, object }: Message = yield* this.messageQueue.read();
      if (object === "done") {
        break;
      }
      if (object === "hover" && preloadCodeOnHover) {
        runtime.spawn(function* () {
          yield* connection.sendRequest({
            object: "script.js",
            segments: [{ size: REQUEST_SIZE }],
          });
        });
      }
      if (object === "click") {
        if (!preloadCodeOnHover) {
          runtime.spawn(function* () {
            yield* connection.sendRequest({
              object: "script.js",
              segments: [{ size: REQUEST_SIZE }],
            });
          });
        }
        if (preloadData) {
          runtime.spawn(function* () {
            yield* connection.sendRequest({
              object: "data.json",
              segments: [{ size: REQUEST_SIZE }],
            });
          });
        }
      }
      if (object === "script.js") {
        runtime.spawn(function* () {
          yield* cpuLock.lock();
          const startTime = runtime.getTime();
          yield* sleep(BLOCKING_JS_EXEC_DURATION);
          cpuLock.unlock();
          logger.log({
            actor: "client",
            object,
            event: "Execute JS",
            startTime,
            endTime: runtime.getTime(),
          });
          jsExecutedPromise.fulfill(undefined);
          if (!preloadData) {
            runtime.spawn(function* () {
              yield* connection.sendRequest({
                object: "data.json",
                segments: [{ size: REQUEST_SIZE }],
              });
            });
          }
        });
      } else if (object === "data.json") {
        runtime.spawn(function* () {
          yield* jsExecutedPromise.await();
          yield* cpuLock.lock();
          const startTime = runtime.getTime();
          yield* sleep(DATA_RENDERING_JS_EXEC_DURATION);
          cpuLock.unlock();
          logger.log({
            actor: "client",
            object: "script.js",
            event: "Render data",
            startTime,
            endTime: runtime.getTime(),
          });
          yield* layout();
          messageQueue.send({ connection, object: "done" });
        });
      }
    }
    controller.abort();
  }
}

class Server implements Actor {
  messageQueue = new MPSC<Message>();
  name = "server";

  constructor(public logger: Logger) {}

  *start() {
    const runtime: Runtime = yield* getRuntime();
    const logger = this.logger;
    const name = this.name;
    while (true) {
      const message: Message = yield* this.messageQueue.read();
      const { connection, object, segment } = message;
      if (object === "script.js") {
        runtime.spawn(function* () {
          const before = runtime.getTime();
          yield* sleep(SERVER_FAST_RESPONSE_LATENCY);
          const after = runtime.getTime();
          logger.log({
            actor: name,
            object,
            event: "Generate script.js",
            startTime: before,
            endTime: after,
          });
          yield* connection.sendResponse({
            object,
            segments: [{ size: SCRIPT_SIZE }],
          });
        });
      } else if (object === "data.json") {
        runtime.spawn(function* () {
          const beforeDataRetrieval = runtime.getTime();
          yield* sleep(SERVER_SLOW_RESPONSE_LATENCY);
          logger.log({
            actor: name,
            object,
            event: "Retrieve data",
            startTime: beforeDataRetrieval,
            endTime: runtime.getTime(),
          });
          yield* connection.sendResponse({
            object,
            segments: [{ size: DATA_SIZE }],
          });
        });
      }
    }
  }
}

export function main(preloadData: boolean, preloadCodeOnHover: boolean): Log[] {
  const runtime = new Runtime();
  const logger = new Logger();
  const server = new Server(logger);
  const client = new Client(logger, server, preloadData, preloadCodeOnHover);
  runtime.spawn(function* () {
    yield* server.start();
  });
  runtime.spawn(function* () {
    yield* client.navigateToPage();
  });
  runtime.runTasks();
  return logger.logs;
}
