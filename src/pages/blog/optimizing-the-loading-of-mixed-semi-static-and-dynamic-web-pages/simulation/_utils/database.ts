import type { Clock } from "./clock";
import {
    type IServer,
    type Logger,
    type NetworkRequest,
    type SimulationConfig,
    type SimulationEvent
} from "./common";
import { Queue } from "./queue";

export class Database implements IServer {
  name = "Database";
  requestQueue: Queue<NetworkRequest> = new Queue();

  constructor(
    private logger: Logger,
    private clock: Clock,
    private config: SimulationConfig
  ) {}

  onRequest(request: NetworkRequest) {
    this.requestQueue.add(request);
    if (this.requestQueue.size() === 1) {
      this.processQueuedRequest();
    }
  }

  processQueuedRequest() {
    const request = this.requestQueue.peek();
    if (!request) {
      return;
    }
    const event: SimulationEvent = {
      type: "DB processing",
      object: request.url,
      start: this.clock.time,
      end: -1,
      actor: this.name,
    };
    this.logger.push(event);
    this.clock.schedule(this.config.queryDuration, () => {
      event.end = this.clock.time;
      request.network.sendResponse({
        requestId: request.id,
        client: request.client,
        server: this,
        size: this.config.queryResponseSize,
        url: request.url,
        context: request.context,
      });
      this.requestQueue.pop();
      if (this.requestQueue.size()) {
        this.processQueuedRequest();
      }
    });
  }
}
