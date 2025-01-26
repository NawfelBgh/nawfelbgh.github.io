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
const CSSOM_DURATION = 100;
const BLOCKING_JS_EXEC_DURATION = 100;
const DATA_RENDERING_JS_EXEC_DURATION = 100;
const LAYOUT_DURATION = 100;
/* Unit: bytes per millisecond, or KB per second */
const BANDWIDTH = 750;
/* Unit: bytes */
const HEAD_SIZE = 2_000;
const STYLE_SIZE = 50_000;
const SCRIPT_SIZE = 100_000;
const DATA_SIZE = 50_000;
const REQUEST_SIZE = 500;

class Client implements Actor {
  messageQueue = new MPSC<Message>();
  name = "client";

  constructor(
    public logger: Logger,
    public server: Server,
    private preloadData: boolean
  ) {}

  *navigateToPage(): Task {
    const { preloadData } = this;
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
    const { logger } = this;

    yield* connection.sendRequest({
      object: "page.html",
      segments: [{ size: REQUEST_SIZE }],
    });

    const cssOmDonePromise: RTPromise<undefined> = yield* createPromise();
    const jsExecutedPromise: RTPromise<undefined> = yield* createPromise();
    const cpuLock: RTMutex = yield* createMutex();

    function* layout(isShell: boolean = false) {
      yield* cpuLock.lock();
      const startTime = runtime.getTime();
      yield* sleep(LAYOUT_DURATION);
      cpuLock.unlock();
      logger.log({
        actor: "client",
        object: "Layout",
        event: isShell ? "Layout shell" : "Layout",
        highlight: true,
        startTime,
        endTime: runtime.getTime(),
      });
    }

    while (true) {
      const { messageQueue } = this;
      const { connection, object }: Message = yield* this.messageQueue.read();
      if (object === "done") {
        break;
      }
      runtime.spawn(function* () {
        if (object === "page.html") {
          runtime.spawn(function* () {
            yield* connection.sendRequest({
              object: "style.css",
              segments: [{ size: REQUEST_SIZE }],
            });
          });
          runtime.spawn(function* () {
            yield* connection.sendRequest({
              object: "script.js",
              segments: [{ size: REQUEST_SIZE }],
            });
          });
          if (preloadData) {
            runtime.spawn(function* () {
              yield* connection.sendRequest({
                object: "data.json",
                segments: [{ size: REQUEST_SIZE }],
              });
            });
          }
        } else if (object === "style.css") {
          runtime.spawn(function* () {
            const startTime = runtime.getTime();
            yield* cpuLock.lock();
            yield* sleep(CSSOM_DURATION);
            cpuLock.unlock();
            logger.log({
              actor: "client",
              object,
              event: "CSSOM",
              startTime,
              endTime: runtime.getTime(),
            });
            cssOmDonePromise.fulfill(undefined);
          });
        } else if (object === "script.js") {
          runtime.spawn(function* () {
            yield* cssOmDonePromise.await();
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
            yield* layout(true);
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
      });
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
      if (object === "page.html") {
        runtime.spawn(function* () {
          const beforeHeadGeneration = runtime.getTime();
          yield* sleep(SERVER_FAST_RESPONSE_LATENCY);
          const afterHeadGeneration = runtime.getTime();
          logger.log({
            actor: name,
            object,
            event: "Generate head + empty body",
            startTime: beforeHeadGeneration,
            endTime: afterHeadGeneration,
          });
          yield* connection.sendResponse({
            object: "page.html",
            segments: [{ size: HEAD_SIZE }],
          });
        });
      } else if (object === "style.css") {
        runtime.spawn(function* () {
          const before = runtime.getTime();
          yield* sleep(SERVER_FAST_RESPONSE_LATENCY);
          const after = runtime.getTime();
          logger.log({
            actor: name,
            object,
            event: "Retrieve style.css",
            startTime: before,
            endTime: after,
          });

          yield* connection.sendResponse({
            object,
            segments: [{ size: STYLE_SIZE }],
          });
        });
      } else if (object === "script.js") {
        runtime.spawn(function* () {
          const before = runtime.getTime();
          yield* sleep(SERVER_FAST_RESPONSE_LATENCY);
          const after = runtime.getTime();
          logger.log({
            actor: name,
            object,
            event: "Retrieve script.js",
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

export function main(preloadData: boolean): Log[] {
  const runtime = new Runtime();
  const logger = new Logger();
  const server = new Server(logger);
  const client = new Client(logger, server, preloadData);
  runtime.spawn(function* () {
    yield* server.start();
  });
  runtime.spawn(function* () {
    yield* client.navigateToPage();
  });
  runtime.runTasks();
  return logger.logs;
}
