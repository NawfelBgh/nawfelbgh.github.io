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
const SERVER_SLOW_RESPONSE_LATENCIES = [1200, 400, 800];
const CSSOM_DURATION = 100;
const JS_EXEC_DURATION = 200;
const LAYOUT_DURATION = 100;
/* Unit: bytes per millisecond, or KB per second */
const BANDWIDTH = 750;
/* Unit: bytes */
const HEAD_SIZE = 2_000;
const SECTION_SIZE = 20_000;
const STYLE_SIZE = 50_000;
const SCRIPT_SIZE = 100_000;
const REQUEST_SIZE = 500;

class Client implements Actor {
  messageQueue = new MPSC<Message>();
  name = "client";

  constructor(
    public logger: Logger,
    public server: Server
  ) {}

  *navigateToPage(): Task {
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
    let layoutProgrammed = false;
    const sectionsReceived: string[] = [];
    const cpuLock: RTMutex = yield* createMutex();

    function* layout() {
      if (layoutProgrammed) {
        return;
      } else {
        layoutProgrammed = true;
      }
      yield* cpuLock.lock();
      const received = [...sectionsReceived];
      layoutProgrammed = false;
      const startTime = runtime.getTime();
      yield* sleep(LAYOUT_DURATION);
      cpuLock.unlock();
      logger.log({
        actor: "client",
        object: "Layout",
        highlight: true,
        event:
          received.length === 0
            ? "Layout empty shell"
            : (received.length === 1 ? "Section" : "Sections ") +
              received.join(", "),
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
        } else if (object === "page.html" && segment?.startsWith("section")) {
          runtime.spawn(function* () {
            const sectionNumber = /section (.)/.exec(segment);
            sectionsReceived.push(sectionNumber?.[1] ?? "?");
            yield* cssOmDonePromise.await();
            yield* layout();
            if (sectionsReceived.length === 3) {
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
            yield* sleep(JS_EXEC_DURATION);
            cpuLock.unlock();
            logger.log({
              actor: "client",
              object,
              event: "Execute JS",
              startTime,
              endTime: runtime.getTime(),
            });
            jsExecutedPromise.fulfill(undefined);
            yield* layout();
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
    private streamHtml: boolean
  ) {}

  *start() {
    const { streamHtml } = this;
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

          runtime.spawn(function* () {
            yield* connection.sendResponse({
              object: "page.html",
              segments: [{ name: "head", size: HEAD_SIZE }],
            });
          });

          let generatedSectionsCount = 0;
          for (const section of [1, 2, 3]) {
            runtime.spawn(function* () {
              const beforeSectionGeneration = runtime.getTime();
              const event = {
                actor: name,
                object: "thread " + section,
                event: "Generate section " + section,
                startTime: beforeSectionGeneration,
                endTime: 0,
              };
              logger.log(event);
              yield* sleep(SERVER_SLOW_RESPONSE_LATENCIES[section - 1]);
              const afterSectionGeneration = runtime.getTime();
              event.endTime = afterSectionGeneration;
              generatedSectionsCount += 1;

              if (streamHtml) {
                yield* connection.sendResponse({
                  object: "page.html",
                  segments: [
                    { name: "section " + section, size: SECTION_SIZE },
                  ],
                });
              } else if (generatedSectionsCount === 3) {
                yield* connection.sendResponse({
                  object: "page.html",
                  segments: [
                    { name: "section 1", size: SECTION_SIZE },
                    { name: "section 2", size: SECTION_SIZE },
                    { name: "section 3", size: SECTION_SIZE },
                  ],
                });
              }
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
            segments: [{ size: SCRIPT_SIZE }],
          });
        });
      }
    }
  }
}

export function main(streamHtml: boolean): Log[] {
  const runtime = new Runtime();
  const logger = new Logger();
  const server = new Server(logger, streamHtml);
  const client = new Client(logger, server);
  runtime.spawn(function* () {
    yield* server.start();
  });
  runtime.spawn(function* () {
    yield* client.navigateToPage();
  });
  runtime.runTasks();
  return logger.logs;
}
