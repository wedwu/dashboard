// src/components/SvgConnections.tsx
import React from "react";
import type { PositionedDevice, Connection } from "../types/types";
import { BOX_WIDTH, BOX_HEIGHT } from "../layout/assignLayout";

interface SvgConnectionsProps {
  devices: PositionedDevice[];
  connections: Connection[];
  width: number;
  height: number;
}

const SvgConnections: React.FC<SvgConnectionsProps> = ({
  devices,
  connections,
  width,
  height,
}) => {
  const map = new Map<string, PositionedDevice>();
  devices.forEach((d) => map.set(d.id, d));

  return (
    <svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
      width={width}
      height={height}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 z" fill="#999" />
        </marker>
      </defs>
      {connections.map((conn, idx) => {
        const from = map.get(conn.fromId);
        const to = map.get(conn.toId);
        if (!from || !to) return null;

        const x1 = from.x + BOX_WIDTH;
        const y1 = from.y + BOX_HEIGHT / 2;
        const x2 = to.x;
        const y2 = to.y + BOX_HEIGHT / 2;

        return (
          <line
            key={idx}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#999"
            strokeWidth={1.5}
            markerEnd="url(#arrowhead)"
          />
        );
      })}
    </svg>
  );
};

export default SvgConnections;
