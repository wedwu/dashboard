// src/layout/assignLayout.ts
import type { RawDevice, PositionedDevice, Connection } from "../types/types";
import computeLayers  from "./graphLayers";

export const COL_WIDTH = 220;
export const BOX_WIDTH = 160;
export const BOX_HEIGHT = 60;
export const ROW_GAP = 30;
export const LEFT_PADDING = 40;
export const TOP_PADDING = 40;

interface LayoutResult {
  devices: PositionedDevice[];
  connections: Connection[];
  width: number;
  height: number;
}

export function assignLayout(devices: RawDevice[]): LayoutResult {
  // 1) Compute column (layer) for each node using the DAG + longest-path logic
  const layerMap = computeLayers(devices);

  // 2) Group devices into columns
  const columns: Record<number, RawDevice[]> = {};
  devices.forEach((d) => {
    const col = layerMap.get(d.id) ?? 0;
    if (!columns[col]) columns[col] = [];
    columns[col].push(d);
  });

  const allColumnIndices = Object.keys(columns)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b);

  const positioned: PositionedDevice[] = [];
  let maxRows = 0;

  allColumnIndices.forEach((colIndex) => {
    const colDevices = columns[colIndex];

    // You can choose different row ordering strategies:
    //  - original JSON order
    //  - sort by id
    // Here we keep the original array order.
    colDevices.forEach((d, rowIndex) => {
      maxRows = Math.max(maxRows, rowIndex + 1);

      const x =
        LEFT_PADDING + colIndex * COL_WIDTH + (COL_WIDTH - BOX_WIDTH) / 2;
      const y = TOP_PADDING + rowIndex * (BOX_HEIGHT + ROW_GAP);

      positioned.push({
        ...d,
        column: colIndex,
        row: rowIndex,
        x,
        y,
      });
    });
  });

  // 3) Build connections using the original links
  const idToPositioned = new Map<string, PositionedDevice>();
  positioned.forEach((p) => idToPositioned.set(p.id, p));

  const connections: Connection[] = [];
  positioned.forEach((d) => {
    d.links.forEach((toId) => {
      if (idToPositioned.has(toId)) {
        connections.push({ fromId: d.id, toId });
      }
    });
  });

  const width =
    LEFT_PADDING +
    (allColumnIndices.length > 0
      ? (allColumnIndices[allColumnIndices.length - 1] + 1) * COL_WIDTH
      : 0) +
    LEFT_PADDING;

  const height =
    TOP_PADDING +
    (maxRows > 0 ? maxRows * (BOX_HEIGHT + ROW_GAP) : 0) +
    TOP_PADDING;

  return { devices: positioned, connections, width, height };
}
