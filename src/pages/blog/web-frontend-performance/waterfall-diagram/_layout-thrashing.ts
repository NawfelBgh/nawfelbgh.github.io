import { Logger, Runtime, sleep, type Log } from "./_common";

/* Unit: milliseconds */
const LAYOUT_DURATION = 100;
const READ_DURATION = 5;
const WRITE_DURATION = 5;

export function main(thrash: boolean): Log[] {
  const runtime = new Runtime();
  const logger = new Logger();

  runtime.spawn(function* () {
    yield* sleep(1);
    logger.log({
      actor: "",
      object: "User events",
      event: "Click",
      startTime: 0,
      endTime: 1,
    });
    if (thrash) {
      for (let i = 0; i < 20; ++i) {
        const startTime = runtime.getTime();
        yield* sleep(
          i % 2 === 0
            ? READ_DURATION + (i === 0 ? 0 : LAYOUT_DURATION)
            : WRITE_DURATION
        );
        logger.log({
          actor: "",
          object: "CPU",
          event:
            i % 2 === 0
              ? "Read DOM" + (i === 0 ? "" : " (Requiring layout)")
              : "Write to DOM",
          highlight: i % 2 === 0 && i !== 0,
          startTime,
          endTime: runtime.getTime(),
        });
      }
    } else {
      for (let i = 0; i < 2; ++i) {
        const startTime = runtime.getTime();
        yield* sleep((i === 0 ? READ_DURATION : WRITE_DURATION) * 10);
        logger.log({
          actor: "",
          object: "CPU",
          event: i === 0 ? "All DOM reads" : "All DOM writes",
          startTime,
          endTime: runtime.getTime(),
        });
        // for (let j = 0; j < 10; ++j) {
        //   const startTime = runtime.getTime();
        //   yield* sleep(i === 0 ? READ_DURATION : WRITE_DURATION);
        //   logger.log({
        //     actor: "",
        //     object: "CPU",
        //     event: i === 0 ? "Read DOM" : "Write to DOM",
        //     startTime,
        //     endTime: runtime.getTime(),
        //   });
        // }
      }
    }
    const startTime = runtime.getTime();
    yield* sleep(LAYOUT_DURATION);
    logger.log({
      actor: "",
      object: "CPU",
      event: "Layout",
      highlight: true,
      startTime,
      endTime: runtime.getTime(),
    });
  });
  runtime.runTasks();
  return logger.logs;
}
