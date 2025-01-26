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
const FONT_FILE_SIZE = 25_000;
const REQUEST_SIZE = 500;

class Client implements Actor {
  messageQueue = new MPSC<Message>();
  name = "client";

  constructor(
    public logger: Logger,
    public server: Server,
    private preloadFonts: boolean
  ) {}

  *navigateToPage(): Task {
    const { preloadFonts } = this;
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
    let fontsLoadedCount = 0;
    const fontsLoadedPromise: RTPromise<undefined> = yield* createPromise();
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
          if (preloadFonts) {
            for (const fontFile of ["font-regular.woff2", "font-bold.woff2"]) {
              runtime.spawn(function* () {
                yield* connection.sendRequest({
                  object: fontFile,
                  segments: [{ size: REQUEST_SIZE }],
                });
              });
            }
          }
        } else if (object === "page.html" && segment === "body") {
          runtime.spawn(function* () {
            pageBodyFullyReceived = true;
            yield* cssOmDonePromise.await();
            const fontsLoaded = fontsLoadedCount;
            yield* layout();
            if (fontsLoaded === 2) {
              messageQueue.send({ connection, object: "done" });
            } else {
              yield* fontsLoadedPromise.await();
              yield* layout();
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
            if (!preloadFonts) {
              for (const fontFile of [
                "font-regular.woff2",
                "font-bold.woff2",
              ]) {
                runtime.spawn(function* () {
                  yield* connection.sendRequest({
                    object: fontFile,
                    segments: [{ size: REQUEST_SIZE }],
                  });
                });
              }
            }
          });
        } else if (object.startsWith("font")) {
          runtime.spawn(function* () {
            fontsLoadedCount += 1;
            if (fontsLoadedCount === 2) {
              fontsLoadedPromise.fulfill(undefined);
            }
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
      const { connection, object } = message;
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
          runtime.spawn(function* () {
            yield* connection.sendResponse({
              object: "page.html",
              segments: [{ name: "head", size: HEAD_SIZE }],
            });
          });
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
          yield* connection.sendResponse({
            object: "page.html",
            segments: [{ name: "body", size: BODY_SIZE }],
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
      } else if (object.startsWith("font")) {
        runtime.spawn(function* () {
          const before = runtime.getTime();
          yield* sleep(SERVER_FAST_RESPONSE_LATENCY);
          const after = runtime.getTime();
          logger.log({
            actor: name,
            object,
            event: "Retrieve " + object,
            startTime: before,
            endTime: after,
          });
          yield* connection.sendResponse({
            object,
            segments: [{ size: FONT_FILE_SIZE }],
          });
        });
      }
    }
  }
}

export function main(preloadFonts: boolean): Log[] {
  const runtime = new Runtime();
  const logger = new Logger();
  const server = new Server(logger);
  const client = new Client(logger, server, preloadFonts);
  runtime.spawn(function* () {
    yield* server.start();
  });
  runtime.spawn(function* () {
    yield* client.navigateToPage();
  });
  runtime.runTasks();
  return logger.logs;
}
