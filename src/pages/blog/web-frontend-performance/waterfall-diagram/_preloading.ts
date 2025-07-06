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
const STATUS_CODE_LATENCY = 250;
const HEAD_RESPONSE_LATENCY = 100;
const SERVER_FAST_RESPONSE_LATENCY = 10;
const BODY_RESPONSE_LATENCY = 150;
const CSSOM_DURATION = 100;
const LAYOUT_DURATION = 100;
/* Unit: bytes per millisecond, or KB per second */
const BANDWIDTH = 750;
/* Unit: bytes */
const HTTP_HEADERS_SIZE = 500;
const HEAD_SIZE = 2_000;
const BODY_SIZE = 50_000;
const STYLE_SIZE = 50_000;
const REQUEST_SIZE = 500;

type Preload = "Early Hints" | "Link Header" | "Link Tag" | "None";

class Client implements Actor {
  messageQueue = new MPSC<Message>();
  name = "client";

  constructor(
    public logger: Logger,
    public server: Server,
    private preload: Preload
  ) {}

  *navigateToPage(): Task {
    const { preload } = this;
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

    const style1LoadedPromise: RTPromise<undefined> = yield* createPromise();
    const cssOmDonePromise: RTPromise<undefined> = yield* createPromise();
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
        if (
          object === "page.html" &&
          (segment === "Early Hints" || segment === "Link Header")
        ) {
          for (const styleFile of ["style.css", "style-dependency.css"]) {
            runtime.spawn(function* () {
              yield* connection.sendRequest({
                object: styleFile,
                segments: [{ size: REQUEST_SIZE }],
              });
            });
          }
        } else if (object === "page.html" && segment === "head") {
          runtime.spawn(function* () {
            yield* connection.sendRequest({
              object: "style.css",
              segments: [{ size: REQUEST_SIZE }],
            });
          });
          if (preload === "Link Tag") {
            runtime.spawn(function* () {
              yield* connection.sendRequest({
                object: "style-dependency.css",
                segments: [{ size: REQUEST_SIZE }],
              });
            });
          }
        } else if (object === "page.html" && segment === "body") {
          runtime.spawn(function* () {
            yield* cssOmDonePromise.await();
            yield* layout();
            messageQueue.send({ connection, object: "done" });
          });
        } else if (object === "style.css") {
          runtime.spawn(function* () {
            style1LoadedPromise.fulfill(undefined);
            if (preload === "None") {
              runtime.spawn(function* () {
                yield* connection.sendRequest({
                  object: "style-dependency.css",
                  segments: [{ size: REQUEST_SIZE }],
                });
              });
            }
          });
        } else if (object.startsWith("style-dependency.css")) {
          runtime.spawn(function* () {
            yield* style1LoadedPromise.await();
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
    public preload: Preload
  ) {}

  *start() {
    const { preload } = this;
    const runtime: Runtime = yield* getRuntime();
    const logger = this.logger;
    const name = this.name;
    while (true) {
      const message: Message = yield* this.messageQueue.read();
      const { connection, object } = message;
      if (object === "page.html") {
        runtime.spawn(function* () {
          if (preload === "Early Hints") {
            const beforeEarlyHints = runtime.getTime();
            yield* sleep(1);
            const afterEarlyHints = runtime.getTime();
            logger.log({
              actor: name,
              object,
              event: "Send 103 Early Hints with Link headers",
              startTime: beforeEarlyHints,
              endTime: afterEarlyHints,
            });
            runtime.spawn(function* () {
              yield* connection.sendResponse({
                object: "page.html",
                segments: [{ name: "Early Hints", size: HTTP_HEADERS_SIZE }],
              });
            });
          }
          const beforeStatusCodeGeneration = runtime.getTime();
          yield* sleep(STATUS_CODE_LATENCY);
          const afterStatusCodeGeneration = runtime.getTime();
          logger.log({
            actor: name,
            object,
            event: "Determine status code",
            startTime: beforeStatusCodeGeneration,
            endTime: afterStatusCodeGeneration,
          });
          runtime.spawn(function* () {
            yield* connection.sendResponse({
              object: "page.html",
              segments: [{ name: "status code", size: HTTP_HEADERS_SIZE }],
            });
          });
          if (preload === "Link Header") {
            const beforeSendLinkHeader = runtime.getTime();
            yield* sleep(1);
            const afterSendLinkHeader = runtime.getTime();
            logger.log({
              actor: name,
              object,
              event: "Send Link header",
              startTime: beforeSendLinkHeader,
              endTime: afterSendLinkHeader,
            });
            runtime.spawn(function* () {
              yield* connection.sendResponse({
                object: "page.html",
                segments: [{ name: "Link Header", size: HTTP_HEADERS_SIZE }],
              });
            });
          }
          const beforeHeadGeneration = runtime.getTime();
          yield* sleep(HEAD_RESPONSE_LATENCY);
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
          yield* sleep(BODY_RESPONSE_LATENCY);
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
      } else if (object.endsWith(".css")) {
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
            segments: [{ size: STYLE_SIZE }],
          });
        });
      }
    }
  }
}

export function main(
  earlyHints: boolean,
  linkHeader: boolean,
  linkTag: boolean
): Log[] {
  const preload: Preload = earlyHints
    ? "Early Hints"
    : linkHeader
      ? "Link Header"
      : linkTag
        ? "Link Tag"
        : "None";
  const runtime = new Runtime();
  const logger = new Logger();
  const server = new Server(logger, preload);
  const client = new Client(logger, server, preload);
  runtime.spawn(function* () {
    yield* server.start();
  });
  runtime.spawn(function* () {
    yield* client.navigateToPage();
  });
  runtime.runTasks();
  return logger.logs;
}
