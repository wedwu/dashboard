// src/types.ts
export interface RawDevice {
  id: string;
  status: "up" | "down" | "unknown";
  links: string[];
}

export interface DiagramConfig {
  devices: RawDevice[];
}

export interface PositionedDevice extends RawDevice {
  column: number;
  row: number;
  x: number;
  y: number;
}

export interface Connection {
  fromId: string;
  toId: string;
}
