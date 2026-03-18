import type { Clock } from "./clock";
import type { INetwork, Logger, NetworkRequest, NetworkResponseChunk, SimulationEvent } from "./common";

export class Network implements INetwork {
  private inFlightRequests: {
    request: Omit<NetworkRequest, "network">;
    bytesLeft: number;
    event: SimulationEvent;
  }[] = [];
  private inFlightResponses: Map<
    number,
    {
      chunk: Omit<NetworkResponseChunk, "network">;
      bytesLeft: number;
      event: SimulationEvent;
    }[]
  > = new Map();

  constructor(
    private logger: Logger,
    private clock: Clock,
    private latency: number,
    private upLinkBandwidth: number, // Bytes per millisecond (KB/s)
    private downLinkBandwidth: number // Bytes per millisecond (KB/s)
  ) {}

  sendRequest(request: Omit<NetworkRequest, "network">) {
    const latencyEvent: SimulationEvent = {
      type: "Request latency",
      object: request.url,
      start: this.clock.time,
      end: -1,
      actor: request.client.name,
    };
    this.logger.push(latencyEvent);
    this.clock.schedule(this.latency, () => {
      latencyEvent.end = this.clock.time;
      const transferEvent: SimulationEvent = {
        type: "Request transfer",
        object: request.url,
        start: this.clock.time,
        end: -1,
        actor: request.client.name,
      };
      this.logger.push(transferEvent);
      this.inFlightRequests.push({
        request,
        bytesLeft: request.size,
        event: transferEvent,
      });
    });
  }

  sendResponse(response: Omit<NetworkResponseChunk, "network">) {
    const start = this.clock.time;
    const latencyEvent: SimulationEvent = {
      type: "Response latency",
      object: response.url,
      part: response.part,
      start,
      end: -1,
      actor: response.server.name,
    };
    this.logger.push(latencyEvent);
    this.clock.schedule(this.latency, () => {
      latencyEvent.end = this.clock.time;
      const transferEvent: SimulationEvent = {
        type: "Response transfer",
        object: response.url,
        part: response.part,
        start: -1,
        end: -1,
        actor: response.server.name,
      };
      const existing = this.inFlightResponses.get(response.requestId);
      this.inFlightResponses.set(response.requestId, [
        ...(existing ?? []),
        {
          chunk: response,
          bytesLeft: response.size,
          event: transferEvent,
        },
      ]);
    });
  }

  processRequests() {
    let upLinkBandwidthLeft = this.upLinkBandwidth;
    while (upLinkBandwidthLeft && this.inFlightRequests.length) {
      let bandwidthPart =
        Math.ceil(upLinkBandwidthLeft / this.inFlightRequests.length);
      const deliveredRequests: Omit<NetworkRequest, "network">[] = [];
      for (const request of this.inFlightRequests) {
        const bandwidthUsed = Math.min(request.bytesLeft, bandwidthPart);
        request.bytesLeft -= bandwidthUsed;
        upLinkBandwidthLeft -= bandwidthUsed;
        if (request.bytesLeft === 0) {
          request.event.end = this.clock.time;
          deliveredRequests.push(request.request);
        }
      }
      for (const request of deliveredRequests) {
        request.server.onRequest({
          ...request,
          network: this,
        });
      }
      this.inFlightRequests = this.inFlightRequests.filter(
        ({ request }) => !deliveredRequests.includes(request)
      );
    }
    this.clock.schedule(1, () => this.processRequests());
  }

  processResponses() {
    let downLinkBandwidthLeft = this.downLinkBandwidth;
    while (downLinkBandwidthLeft > 0 && this.inFlightResponses.size) {
      let bandwidthPart = Math.ceil(downLinkBandwidthLeft / this.inFlightResponses.size);
      const deliveredChunks: Omit<NetworkResponseChunk, "network">[] = [];
      for (const [, chunks] of this.inFlightResponses) {
        if (downLinkBandwidthLeft <= 0) {
          break;
        }
        if (chunks[0].event.start === -1) {
          chunks[0].event.start = this.clock.time;
          this.logger.push(chunks[0].event);
        }
        const bandwidthToUse = Math.min(chunks[0].bytesLeft, bandwidthPart);
        chunks[0].bytesLeft -= bandwidthToUse;
        downLinkBandwidthLeft -= bandwidthToUse;
        if (chunks[0].bytesLeft === 0) {
          chunks[0].event.end = this.clock.time;
          deliveredChunks.push(chunks[0].chunk);
          chunks.splice(0, 1);
        }
      }
      for (const chunk of deliveredChunks) {
        chunk.client.onResponse({
          ...chunk,
          network: this,
        });
        if (this.inFlightResponses.get(chunk.requestId)?.length === 0) {
          this.inFlightResponses.delete(chunk.requestId);
        }
      }
    }
    this.clock.schedule(1, () => this.processResponses());
  }
}
