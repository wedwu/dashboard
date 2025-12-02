// LeaderLinesOverlay.tsx
import React, { useLayoutEffect, useState, useEffect } from "react";

export interface Connection {
  fromId: string;
  toId: string;
}

interface Point {
  x: number;
  y: number;
}

interface LinePath {
  id: string;
  points: Point[];
}

interface Props {
  connections: Connection[];
  containerRef: React.RefObject<HTMLDivElement>;
}

const LeaderLinesOverlay: React.FC<Props> = ({ connections, containerRef }) => {
  const [lines, setLines] = useState<LinePath[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const recompute = () => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newLines: LinePath[] = [];

    connections.forEach(({ fromId, toId }) => {
      const fromEl = document.getElementById(`node-${fromId}`);
      const toEl = document.getElementById(`node-${toId}`);
      if (!fromEl || !toEl) return;

      const fr = fromEl.getBoundingClientRect();
      const tr = toEl.getBoundingClientRect();

      const start: Point = {
        x: fr.right - rect.left,
        y: fr.top + fr.height / 2 - rect.top,
      };

      const end: Point = {
        x: tr.left - rect.left,
        y: tr.top + tr.height / 2 - rect.top,
      };

      // Two elbows
      let midX = start.x <= end.x ? (start.x + end.x) / 2 : start.x + 40;

      const elbow1: Point = { x: midX, y: start.y };
      const elbow2: Point = { x: midX, y: end.y };

      newLines.push({
        id: `${fromId}->${toId}`,
        points: [start, elbow1, elbow2, end],
      });
    });

    setLines(newLines);
    setSize({
      width: container.clientWidth,
      height: container.clientHeight,
    });
  };

  useLayoutEffect(recompute, [connections]);
  useEffect(() => {
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  });

  if (!size.width || !size.height) return null;

  return (
    <svg
      width={size.width}
      height={size.height}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {lines.map((line) => (
        <polyline
          key={line.id}
          points={line.points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#444"
          strokeWidth={2}
        />
      ))}
    </svg>
  );
};

export default LeaderLinesOverlay;
