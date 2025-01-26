type Command =
  | { cmd: "sleep"; duration: number }
  | { cmd: "park" }
  | { cmd: "getRuntime"; /* output param */ runtime?: Runtime };

export type Task<TReturn = unknown> = Iterator<Command, TReturn> &
  Iterable<Command>;

export class RTPromise<T> {
  #runtime: Runtime;
  #tasks: Task[] = [];
  #state: "new" | "fulfilled" = "new";
  value?: T;

  constructor(runtime: Runtime) {
    this.#runtime = runtime;
  }

  *await(): Task<T> {
    try {
      if (this.#state === "fulfilled") {
        return this.value;
      } else {
        this.#tasks.push(this.#runtime.currentTask!);
        yield { cmd: "park" };
        // unparked by fulfill
        return this.value;
      }
    } catch (cause) {
      console.error("Could not await promise", {
        cause,
      });
    }
  }

  fulfill(value: T) {
    try {
      this.value = value;
      this.#state = "fulfilled";
      if (this.#tasks.length) {
        for (const task of this.#tasks) {
          this.#runtime.unpark(task);
        }
        this.#tasks.length = 0;
      }
    } catch (cause) {
      console.error("Could not fulfill promise", {
        cause,
      });
    }
  }

  isFulfilled(): boolean {
    return this.#state === "new";
  }
}

export class RTMutex {
  #runtime: Runtime;
  #tasks: Task[] = [];
  #locked: boolean = false;

  constructor(runtime: Runtime) {
    this.#runtime = runtime;
  }

  *lock(): Task {
    while (this.#locked) {
      this.#tasks.push(this.#runtime.currentTask!);
      yield { cmd: "park" };
    }
    this.#locked = true;
  }

  unlock() {
    this.#locked = false;
    if (this.#tasks.length > 0) {
      const [task] = this.#tasks.splice(0, 1);
      this.#runtime.unpark(task);
    }
  }
}

export class Runtime {
  time = 0;
  scheduledTasks = new Map<number, Task[]>();
  running = false;
  currentTask?: Task;

  constructor() {}

  spawn<T>(taskFactory: () => Task<T>): RTPromise<T> {
    const promise = new RTPromise<T>(this);
    const task = (function* () {
      promise.fulfill(yield* taskFactory());
    })();
    this.scheduleTask(task, this.time);
    return promise;
  }

  unpark(task: Task) {
    this.scheduleTask(task, this.time);
  }

  getTime() {
    return this.time;
  }

  runTasks() {
    if (this.running) {
      throw new Error("Runtime is already running");
    }
    this.running = true;
    while (this.scheduledTasks.size !== 0) {
      this.time = Math.min(...this.scheduledTasks.keys());
      const tasks = this.scheduledTasks.get(this.time);
      while (tasks?.length) {
        const [task] = tasks.splice(0, 1);
        this.currentTask = task;
        // Give control to the task
        try {
          while (true) {
            const command = task.next();
            if (command.done) {
              break;
            }
            if (command.value.cmd === "sleep") {
              this.scheduleTask(task, this.time + command.value.duration);
              break;
            } else if (command.value.cmd === "park") {
              break;
            } else if (command.value.cmd === "getRuntime") {
              command.value.runtime = this;
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
      this.scheduledTasks.delete(this.time);
    }
    this.running = false;
    this.currentTask = undefined;
  }

  scheduleTask(task: Task, time: number) {
    if (this.scheduledTasks.get(time)) {
      this.scheduledTasks.get(time)?.push(task);
    } else {
      this.scheduledTasks.set(time, [task]);
    }
  }
}

export function* sleep(duration: number): Task {
  yield { cmd: "sleep", duration };
}

export function* getRuntime(): Task<Runtime> {
  const cmd: Command = { cmd: "getRuntime" };
  yield cmd;
  return cmd.runtime;
}

export function* createPromise<T>(): Task<RTPromise<T>> {
  const runtime = yield* getRuntime();
  return new RTPromise(runtime);
}

export function* createMutex(): Task<RTMutex> {
  const runtime = yield* getRuntime();
  return new RTMutex(runtime);
}

export type Message = {
  connection: Connection;
  object: string;
  segment?: string;
};

/**
 * MPSR:  Multiple Producers Single Consumer
 */
export class MPSC<T> {
  #queue: T[] = [];
  #promise?: RTPromise<T>;

  send(value: T) {
    //console.log('send', value, this.#queue);
    if (this.#promise) {
      const promise = this.#promise;
      this.#promise = undefined;
      promise.fulfill(value);
    } else {
      this.#queue.push(value);
    }
  }

  *read(): Task<T> {
    if (this.#queue.length === 0) {
      const promise = yield* createPromise();
      this.#promise = promise;
      return yield* promise.await();
    }
    const [first] = this.#queue.splice(0, 1);
    return first;
  }
}

export interface Actor {
  name: string;
  messageQueue: MPSC<Message>;
}

interface Segment {
  name?: string;
  size: number;
  deliveryStartTime?: number;
}

type InFlightMessage = {
  object: string;
  segments: Segment[];
};

type DeliveredMessage = {
  object: string;
  segment?: string;
  deliveryStartTime: number;
};

interface ConnectionParams {
  client: Actor;
  server: Actor;
  latency: number;
  upLinkBandwidth: number;
  downLinkBandwidth: number;
  abortSignal: AbortSignal;
  logger: Logger;
}

export class Connection {
  client: Actor;
  server: Actor;
  /**
   * latency is ms
   */
  latency: number;
  /**
   * bandwidth in Bytes per ms, or KB per second
   */
  upLinkBandwidth: number;
  downLinkBandwidth: number;

  abortSignal: AbortSignal;
  logger: Logger;

  constructor({
    client,
    server,
    latency,
    upLinkBandwidth,
    downLinkBandwidth,
    abortSignal,
    logger,
  }: ConnectionParams) {
    this.client = client;
    this.server = server;
    this.latency = latency;
    this.upLinkBandwidth = upLinkBandwidth;
    this.downLinkBandwidth = downLinkBandwidth;
    this.abortSignal = abortSignal;
    this.logger = logger;
  }

  inFlightRequests = new Set<InFlightMessage>();
  inFlightResponses = new Set<InFlightMessage>();

  *sendRequest(message: InFlightMessage) {
    const runtime = yield* getRuntime();
    const beforeDelay = runtime.getTime();
    yield* sleep(this.latency);
    const afterDelay = runtime.getTime();
    this.logger.log({
      actor: this.client.name,
      object: message.object,
      event: "Request latency",
      startTime: beforeDelay,
      endTime: afterDelay,
    });
    this.inFlightRequests.add(message);
  }

  *sendResponse(message: InFlightMessage) {
    const runtime = yield* getRuntime();
    const beforeDelay = runtime.getTime();
    yield* sleep(this.latency);
    const afterDelay = runtime.getTime();
    this.logger.log({
      actor: this.client.name,
      object: message.object,
      event: "Response latency",
      startTime: beforeDelay,
      endTime: afterDelay,
    });
    this.inFlightResponses.add(message);
  }

  *deliveryLoop(): Task {
    const runtime = yield* getRuntime();
    while (!this.abortSignal.aborted) {
      yield* sleep(1);
      const time = runtime.getTime();
      const deliveredClientMessages = this.deliverItems(
        this.inFlightRequests,
        time,
        this.upLinkBandwidth
      );
      for (const {
        object,
        segment,
        deliveryStartTime,
      } of deliveredClientMessages) {
        this.logger.log({
          actor: this.client.name,
          object,
          segment,
          event: "Request transfer",
          startTime: deliveryStartTime,
          endTime: time,
        });
        this.server.messageQueue.send({
          connection: this,
          object,
          segment,
        });
      }
      const deliveredServerMessages = this.deliverItems(
        this.inFlightResponses,
        time,
        this.downLinkBandwidth
      );
      for (const {
        object,
        segment,
        deliveryStartTime,
      } of deliveredServerMessages) {
        this.logger.log({
          actor: this.client.name,
          object,
          segment,
          event: "Response transfer",
          startTime: deliveryStartTime,
          endTime: time,
        });
        this.client.messageQueue.send({
          connection: this,
          object,
          segment,
        });
      }
    }
  }

  deliverItems(
    messages: Set<InFlightMessage>,
    time: number,
    bandwidth: number
  ): DeliveredMessage[] {
    const deliveredMessages: DeliveredMessage[] = [];
    let remainingBandwidth = bandwidth;
    while (remainingBandwidth > 0 && messages.size) {
      // Math.ceil -> tolerating eventual transfer of a few extra bytes for simplicity :P
      const bandwidthPerStream = Math.ceil(remainingBandwidth / messages.size);
      const messagesCompletelyDelivered: InFlightMessage[] = [];

      remainingBandwidth = 0;
      for (const message of messages.values()) {
        let remainingBandwidthForStream = bandwidthPerStream;
        while (remainingBandwidthForStream > 0 && message.segments.length > 0) {
          const [segment] = message.segments;
          if (segment.deliveryStartTime === undefined) {
            segment.deliveryStartTime = time;
          }
          const amount = Math.min(remainingBandwidthForStream, segment.size);
          remainingBandwidthForStream -= amount;
          segment.size -= amount;
          if (segment.size === 0) {
            deliveredMessages.push({
              object: message.object,
              segment: segment.name,
              deliveryStartTime: segment.deliveryStartTime,
            });
            message.segments.splice(0, 1);
            if (message.segments.length === 0) {
              messagesCompletelyDelivered.push(message);
            }
          }
        }
        remainingBandwidth += remainingBandwidthForStream;
      }
      for (const item of messagesCompletelyDelivered) {
        messages.delete(item);
      }
    }
    return deliveredMessages;
  }
}

export type Log = {
  actor: string;
  object: string;
  segment?: string;
  event: string;
  highlight?: boolean;
  startTime: number;
  endTime: number;
};

export class Logger {
  logs: Log[] = [];

  log(log: Log) {
    this.logs.push(log);
  }
}
