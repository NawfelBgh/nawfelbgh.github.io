export class Clock {
  time = 0;
  isStopped = true;
  private callbacks = new Map<number, (() => void)[]>();

  schedule(delay: number, callback: () => void) {
    if (!this.callbacks.has(this.time + delay)) {
      this.callbacks.set(this.time + delay, [callback]);
    } else {
      this.callbacks.get(this.time + delay)?.push(callback);
    }
  }

  start(callback: () => void) {
    this.isStopped = false;
    callback();
    while (this.callbacks.size > 0 && !this.isStopped) {
      const currentCallbacks = this.callbacks.get(this.time);
      if (currentCallbacks) {
        for (const cb of currentCallbacks) {
          cb();
        }
      }
      this.callbacks.delete(this.time);
      this.time += 1;
    }
  }

  stop() {
    this.isStopped = true;
  }

  reset() {
    this.callbacks.clear();
    this.time = 0;
  }
}