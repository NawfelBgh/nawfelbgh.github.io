export class Queue<T> {
  private stack: T[] = [];
  private queue: T[] = [];

  add(item: T) {
    this.stack.push(item);
  }

  size(): number {
    return this.stack.length + this.queue.length;
  }

  peek(): T | undefined {
    if (!this.queue.length) {
      if (!this.stack.length) {
        return undefined;
      }
      this.queue = this.stack.reverse();
      this.stack = [];
    }
    return this.queue[this.queue.length - 1];
  }

  pop() {
    this.peek();
    return this.queue.pop();
  }
}
