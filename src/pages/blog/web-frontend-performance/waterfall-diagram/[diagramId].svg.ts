import type { APIRoute } from "astro";
import type { Log } from "./_common";
import { getModule, STATIC_PATHS } from "./_paths";

export const partial = true;

export function getStaticPaths() {
  return STATIC_PATHS;
}

export const GET: APIRoute = ({ params }) => {
  const { diagramId } = params;
  const { module, args } = getModule(diagramId as string);

  const logs: Log[] = module.main(...args);

  const grouped: {
    actor: string;
    objects: {
      object: string;
      events: {
        event: string;
        segment?: string;
        highlight?: boolean;
        startTime: number;
        endTime: number;
      }[];
    }[];
  }[] = [];

  for (const {
    actor,
    object,
    segment,
    event,
    startTime,
    endTime,
    highlight,
  } of logs) {
    const item = grouped.find((i) => i.actor === actor);
    if (!item) {
      grouped.push({
        actor,
        objects: [
          {
            object,
            events: [{ event, segment, startTime, endTime, highlight }],
          },
        ],
      });
      continue;
    }
    const o = item.objects.find((o) => o.object === object);
    if (!o) {
      item.objects.push({
        object,
        events: [{ segment, event, startTime, endTime, highlight }],
      });
      continue;
    }
    o.events.push({
      event,
      segment,
      startTime,
      endTime,
      highlight,
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
  const endTime = logs[logs.length - 1].endTime;
  const padding = 20;
  const objectNameWidth = 100;
  const width = padding * 2 + objectNameWidth + endTime * pixelsPerMillisecond;
  const lineHeight = 20;
  const height =
    groupedSizes.reduce((acc, x) => acc + x.size, 0) * lineHeight + padding * 2;
  const fontSize = 16;

  // Generate grid lines
  const gridLines = [];
  for (let index = 0; index < endTime; index++) {
    if (index % 100 === 0) {
      const x = padding + objectNameWidth + index * pixelsPerMillisecond;
      if (index % 200 === 0) {
        gridLines.push(
          `<text x="${x}" y="${fontSize}" font-size="16" fill="black" text-anchor="middle">${index}ms</text>`
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
      `<text x="${padding}" y="${y + fontSize}" font-size="16" fill="black" style="font-weight: 600;">${item.actor}</text>`
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
        `<text x="${padding}" y="${oY + fontSize}" font-size="16" fill="black">${object.object}</text>`
      );

      for (let eIndex = 0; eIndex < object.events.length; eIndex++) {
        const event = object.events[eIndex];
        const eY = oY + (1 + eIndex) * lineHeight;
        const rectX =
          padding + objectNameWidth + event.startTime * pixelsPerMillisecond;
        const rectWidth =
          (event.endTime - event.startTime) * pixelsPerMillisecond;

        actorElements.push(
          `<rect x="${rectX}" y="${oY}" width="${rectWidth}" height="${lineHeight}" stroke="black" fill="${event.highlight ? "#e5eeff" : "white"}"/>`
        );
        actorElements.push(
          `<line x1="${rectX}" y1="${oY + lineHeight}" x2="${rectX}" y2="${eY + fontSize}" stroke="rgba(0,0,0,0.25)"/>`
        );
        actorElements.push(
          `<text x="${rectX}" y="${eY + fontSize}" font-size="16" fill="black">${event.event}${event.segment ? ` (${event.segment})` : ""}</text>`
        );
      }
    }
  }

  const svg = `<svg version="1.1" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${width}" height="${height}" stroke="none" fill="white"/>
  ${gridLines.join("\n  ")}
  ${actorElements.join("\n  ")}
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
    },
  });
};
