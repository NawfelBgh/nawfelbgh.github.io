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
const SHORT_TASK_DURATION = 50;
const LONG_TASK_DURATION = 800;
/* Unit: bytes per millisecond, or KB per second */
const BANDWIDTH = 750;
/* Unit: bytes */
const HEAD_SIZE = 2_000;
const SECTION_SIZE = 20_000;
const STYLE_SIZE = 50_000;
const SCRIPT_SIZE = 100_000;
const REQUEST_SIZE = 600;

export function main(useWorker: boolean, splitLongTask: boolean): Log[] {
  const runtime = new Runtime();
  const logger = new Logger();

  runtime.spawn(function* () {
    const mainThreadLock: RTMutex = yield* createMutex();

    yield* sleep(1);
    logger.log({
      actor: "",
      object: "User events",
      event: "Click #1",
      startTime: 0,
      endTime: 1,
    });

    runtime.spawn(function* () {
      yield* sleep(500);
      let startTime = runtime.getTime();
      yield* sleep(1);
      logger.log({
        actor: "",
        object: "User events",
        event: "Click #2",
        startTime,
        endTime: runtime.getTime(),
      });

      yield* mainThreadLock.lock();
      startTime = runtime.getTime();
      yield* sleep(SHORT_TASK_DURATION);
      logger.log({
        actor: "",
        object: "Main thread",
        event: "Handle click #2",
        startTime,
        endTime: runtime.getTime(),
      });

      startTime = runtime.getTime();
      yield* sleep(LAYOUT_DURATION);
      logger.log({
        actor: "",
        object: "Main thread",
        event: "Layout",
        highlight: true,
        startTime,
        endTime: runtime.getTime(),
      });
      mainThreadLock.unlock();
    });

    yield* mainThreadLock.lock();
    let startTime = runtime.getTime();
    yield* sleep(SHORT_TASK_DURATION);
    logger.log({
      actor: "",
      object: "Main thread",
      event: "Handle click #1",
      startTime,
      endTime: runtime.getTime(),
    });

    mainThreadLock.unlock();

    function* longTask() {
      const workChunkSize = splitLongTask ? 100 : LONG_TASK_DURATION;
      let timeSpent = 0;
      while (timeSpent < LONG_TASK_DURATION) {
        if (!useWorker) {
          yield* mainThreadLock.lock();
        }
        timeSpent += workChunkSize;
        let startTime = runtime.getTime();
        yield* sleep(workChunkSize);
        logger.log({
          actor: "",
          object: useWorker ? "Worker thread" : "Main thread",
          event: "Long task" + (splitLongTask ? " (chunk)" : ""),
          startTime,
          endTime: runtime.getTime(),
        });
        if (!useWorker) {
          mainThreadLock.unlock();
        }
        yield* sleep(5);
      }
    }

    runtime.spawn(function* () {
      yield* longTask();
    });
  });
  runtime.runTasks();
  return logger.logs;
}
