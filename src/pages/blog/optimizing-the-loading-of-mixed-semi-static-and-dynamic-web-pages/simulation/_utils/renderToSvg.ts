import type { Logger } from "./common";

type Args = {
  logs: Logger;
  slideMode: boolean;
  rightPadding: number;
};

export function renderToSvg({ logs, slideMode, rightPadding }: Args): string {
  const grouped: {
    actor: string;
    objects: {
      object: string;
      part?: string;
      events: {
        type: string;
        event: string;
        start: number;
        end: number;
      }[];
    }[];
  }[] = [];

  for (const { type, actor, object: eventObject, part, start, end } of logs) {
    const object = eventObject ?? "unknown";
    const item = grouped.find((i) => i.actor === actor);
    if (!item) {
      grouped.push({
        actor,
        objects: [
          {
            object,
            part,
            events: [
              {
                type,
                event: type,
                start,
                end,
              },
            ],
          },
        ],
      });
      continue;
    }
    const o = item.objects.find((o) => o.object === object && o.part === part);
    if (!o) {
      item.objects.push({
        object,
        part,
        events: [{ type, event: type, start, end }],
      });
      continue;
    }
    o.events.push({
      type,
      event: type,
      start,
      end,
    });
  }

  const groupedSizes: {
    size: number;
    objects: number;
    objectsEvents: number[];
  }[] = [];
  for (const item of grouped) {
    const objects = item.objects.length;
    const objectsEvents = item.objects.map((o) => o.events.length);
    const size = 1 + objects * 2 + objectsEvents.reduce((acc, x) => acc + x, 0);
    groupedSizes.push({
      size,
      objects,
      objectsEvents,
    });
  }

  const pixelsPerMillisecond = 1;
  const endTime = logs[logs.length - 1].end;
  const padding = 20;
  const objectNameWidth = slideMode ? 200 : 200;
  const width = padding * 2 + objectNameWidth + endTime * pixelsPerMillisecond;
  const lineHeight = slideMode ? 32 : 20;
  const height =
    groupedSizes.reduce((acc, x) => acc + x.size, 0) * lineHeight + padding * 2;
  const fontSize = slideMode ? 28 : 16;
  const titleFontSize = slideMode ? fontSize + 4 : fontSize;
  const detailFontSize = slideMode ? fontSize - 8 : fontSize;
  const strokeWidth = slideMode ? 2 : 1;
  const latencyDasharray = "8,4";

  // Generate grid lines
  const gridLines = [];
  for (let index = 0; index < endTime; index++) {
    if (index % 100 === 0) {
      const x = padding + objectNameWidth + index * pixelsPerMillisecond;
      if (index % 200 === 0) {
        gridLines.push(
          `<text x="${x}" y="${detailFontSize}" font-size="${detailFontSize}" fill="black" text-anchor="middle">${index}ms</text>`
        );
      }
      gridLines.push(
        `<line x1="${x}" y1="${lineHeight}" x2="${x}" y2="${height}" stroke="#ddd" stroke-dasharray="10,10"/>`
      );
    }
  }

  // Generate actors and objects
  const actorElements = [];
  for (let index = 0; index < grouped.length; index++) {
    const item = grouped[index];
    const linesBefore =
      index === 0
        ? 0
        : groupedSizes.slice(0, index).reduce((acc, x) => acc + x.size, 0);
    const y = padding + linesBefore * lineHeight;

    actorElements.push(
      `<text x="${padding}" y="${y + fontSize}" font-size="${titleFontSize}" fill="black" style="font-weight: 600;">${item.actor}</text>`
    );

    for (let oIndex = 0; oIndex < item.objects.length; oIndex++) {
      const object = item.objects[oIndex];
      const linesBefore =
        (oIndex === 0
          ? 0
          : groupedSizes[index].objectsEvents
              .slice(0, oIndex)
              .reduce((acc, eventsCount) => acc + eventsCount, 0)) +
        1 +
        oIndex * 2;
      const oY = y + linesBefore * lineHeight;

      actorElements.push(
        `<text x="${padding}" y="${oY + fontSize}" font-size="${titleFontSize}" fill="black">${object.object}${object.part ? ` (${object.part})` : ""}</text>`
      );

      let shownEventLinesCount = 0;
      for (let eIndex = 0; eIndex < object.events.length; eIndex++) {
        const event = object.events[eIndex];
        const eY = oY + (1 + shownEventLinesCount) * lineHeight;
        const rectX =
          padding + objectNameWidth + event.start * pixelsPerMillisecond;
        const rectWidth = (event.end - event.start) * pixelsPerMillisecond;

        const isLatency = event.event.includes("latency");

        actorElements.push(
          `<rect x="${rectX}" y="${oY}" width="${Math.max(rectWidth, 1)}" height="${lineHeight}" stroke="black" stroke-dasharray="${isLatency && slideMode ? latencyDasharray : ""}" stroke-width="${strokeWidth}" fill="white" opacity="${isLatency ? "0.25" : "1"}"/>`
        );
        if (true) {
          actorElements.push(
            `<line x1="${rectX}" y1="${oY + lineHeight}" x2="${rectX}" y2="${eY + fontSize}" stroke="rgba(0,0,0,0.25)"/>`
          );
          actorElements.push(
            `<text x="${rectX}" y="${eY + fontSize}" font-size="${fontSize}" fill="black">${event.event}</text>`
          );

          shownEventLinesCount += 1;
        }
      }
    }
  }

  const totalWidth = width + (slideMode ? 40 : 0) + rightPadding;
  const svg = `<svg version="1.1" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${width + rightPadding}" height="${height}" stroke="none" fill="white"/>
  ${gridLines.join("\n  ")}
  ${actorElements.join("\n  ")}
</svg>`;

  return svg;
}
