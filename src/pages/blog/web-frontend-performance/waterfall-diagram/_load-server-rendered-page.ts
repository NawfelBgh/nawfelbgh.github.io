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
const JS_EXEC_DURATION = 200;
const BLOCKING_JS_EXEC_DURATION = 50;
const NON_BLOCKING_JS_EXEC_DURATION = 150;
const LAYOUT_DURATION = 100;
/* Unit: bytes per millisecond, or KB per second */
const BANDWIDTH = 750;
/* Unit: bytes */
const HEAD_SIZE = 2_000;
const BODY_SIZE = 50_000;
const STYLE_SIZE = 50_000;
const SCRIPT_SIZE = 100_000;
const BLOCKING_SCRIPT_SIZE = 25_000;
const NON_BLOCKING_SCRIPT_SIZE = 75_000;
const REQUEST_SIZE = 500;

class Client implements Actor {
  messageQueue = new MPSC<Message>();
  name = "client";

  constructor(
    public logger: Logger,
    public server: Server,
    private splitAsyncScript: boolean
  ) {}

  *navigateToPage(): Task {
    const { splitAsyncScript } = this;
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
    let pageBodyFullyReceived = false;
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
      const { messageQueue } = this;
      const { connection, object, segment }: Message =
        yield* this.messageQueue.read();
      if (object === "done") {
        break;
      }
      runtime.spawn(function* () {
        if (object === "page.html" && segment === "head") {
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
        } else if (object === "page.html" && segment === "body") {
          if (splitAsyncScript) {
            runtime.spawn(function* () {
              yield* connection.sendRequest({
                object: "async-script.js",
                segments: [{ size: REQUEST_SIZE }],
              });
            });
          }
          runtime.spawn(function* () {
            pageBodyFullyReceived = true;
            yield* jsExecutedPromise.await();
            yield* layout();
            if (!splitAsyncScript) {
              messageQueue.send({ connection, object: "done" });
            }
          });
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
            yield* sleep(
              splitAsyncScript ? BLOCKING_JS_EXEC_DURATION : JS_EXEC_DURATION
            );
            cpuLock.unlock();
            logger.log({
              actor: "client",
              object,
              event: "Execute JS",
              startTime,
              endTime: runtime.getTime(),
            });
            jsExecutedPromise.fulfill(undefined);
            if (!pageBodyFullyReceived) {
              yield* layout();
            }
          });
        } else if (object === "async-script.js") {
          runtime.spawn(function* () {
            yield* cssOmDonePromise.await();
            yield* jsExecutedPromise.await();
            yield* cpuLock.lock();
            const startTime = runtime.getTime();
            yield* sleep(NON_BLOCKING_JS_EXEC_DURATION);
            cpuLock.unlock();
            logger.log({
              actor: "client",
              object,
              event: "Execute JS",
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

  constructor(
    public logger: Logger,
    private splitAsyncScript: boolean,
    private streamHtml: boolean
  ) {}

  *start() {
    const { splitAsyncScript, streamHtml } = this;
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
            event: "Generate head",
            startTime: beforeHeadGeneration,
            endTime: afterHeadGeneration,
          });
          if (streamHtml) {
            runtime.spawn(function* () {
              yield* connection.sendResponse({
                object: "page.html",
                segments: [{ name: "head", size: HEAD_SIZE }],
              });
            });
          }
          const beforeBodyGeneration = runtime.getTime();
          yield* sleep(SERVER_SLOW_RESPONSE_LATENCY);
          const afterBodyGeneration = runtime.getTime();
          logger.log({
            actor: name,
            object,
            event: "Generate body",
            startTime: beforeBodyGeneration,
            endTime: afterBodyGeneration,
          });
          if (streamHtml) {
            yield* connection.sendResponse({
              object: "page.html",
              segments: [{ name: "body", size: BODY_SIZE }],
            });
          } else {
            yield* connection.sendResponse({
              object: "page.html",
              segments: [
                { name: "head", size: HEAD_SIZE },
                { name: "body", size: BODY_SIZE },
              ],
            });
          }
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
            segments: [
              { size: splitAsyncScript ? BLOCKING_SCRIPT_SIZE : SCRIPT_SIZE },
            ],
          });
        });
      } else if (object === "async-script.js") {
        runtime.spawn(function* () {
          const before = runtime.getTime();
          yield* sleep(SERVER_FAST_RESPONSE_LATENCY);
          const after = runtime.getTime();
          logger.log({
            actor: name,
            object,
            event: "Retrieve async-script.js",
            startTime: before,
            endTime: after,
          });
          yield* connection.sendResponse({
            object,
            segments: [{ size: NON_BLOCKING_SCRIPT_SIZE }],
          });
        });
      }
    }
  }
}

export function main(splitAsyncScript: boolean, streamHtml: boolean): Log[] {
  const runtime = new Runtime();
  const logger = new Logger();
  const server = new Server(logger, splitAsyncScript, streamHtml);
  const client = new Client(logger, server, splitAsyncScript);
  runtime.spawn(function* () {
    yield* server.start();
  });
  runtime.spawn(function* () {
    yield* client.navigateToPage();
  });
  runtime.runTasks();
  return logger.logs;
}
