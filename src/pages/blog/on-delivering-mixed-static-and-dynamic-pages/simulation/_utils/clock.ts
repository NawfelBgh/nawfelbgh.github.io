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
      let currentCallbacks = this.callbacks.get(this.time);
      while (currentCallbacks) {
        this.callbacks.delete(this.time);
        for (const cb of currentCallbacks) {
          cb();
        }
        currentCallbacks = this.callbacks.get(this.time);
      }
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