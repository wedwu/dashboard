import React, { useState, useEffect } from 'react';

const diagramConfig5 = {
  devices: [
    { id: "plc-1-c", status: "up", links: ["timedoor"] },
    { id: "plc-1-m", status: "up", links: ["timedoor"] },
    { id: "plc-2-c", status: "up", links: ["timedoor"] },
    { id: "plc-2-m", status: "up", links: ["timedoor"] },
    { id: "gpc", status: "up", links: ["message-server-2"] },
    { id: "stamp", status: "up", links: ["kafka"] },
    { id: "timedoor", status: "up", links: ["redis", "config-server", "influx"] },
    { id: "redis", status: "up", links: ["message-server-1"] },
    { id: "message-server-1", status: "up", links: ["kafka", "config-server", "influx"] },
    { id: "message-server-2", status: "up", links: ["kafka", "config-server", "influx"] },
    { id: "message-server-3", status: "up", links: ["trackmap-client-2"] },
    { id: "influx", status: "up", links: ["cribl"] },
    { id: "kafka", status: "up", links: ["message-server-1", "message-server-2", "config-server", "cribl", "message-relay"] },
    { id: "config-server", status: "up", links: ["kafka", "system-map-client-1", "message-server-1", "message-server-2", "message-server-3", "timedoor", "cribl"] },
    { id: "message-relay", status: "up", links: ["kafka", "message-client-1", "message-client-2", "trackmap-client-1"] },
    { id: "dgn", status: "up", links: ["cribl"] },
    { id: "cribl", status: "up", links: ["dgn"] },
    { id: "message-client-1", status: "up", links: ["message-relay"] },
    { id: "message-client-2", status: "up", links: ["message-relay"] },
    { id: "trackmap-client-1", status: "up", links: ["message-relay"] },
    { id: "trackmap-client-2", status: "up", links: ["message-server-3"] },
    { id: "system-map-client-1", status: "up", links: ["config-server"] },
  ]
};

const Graph = () => {
  const width = 1200;
  const height = 800;
  const nodeRadius = 20;

  // Extract unique nodes and edges
  const nodesMap = new Map();
  const edgesSet = new Set();
  const edges = [];

  diagramConfig5.devices.forEach(device => {
    nodesMap.set(device.id, { id: device.id, status: device.status });
    device.links.forEach(link => {
      const edgeKey = `${device.id}->${link}`;
      if (!edgesSet.has(edgeKey)) {
        edgesSet.add(edgeKey);
        edges.push({ source: device.id, target: link });
      }
    });
  });

  const nodes = Array.from(nodesMap.values());

  // State for positions
  const [positions, setPositions] = useState(() => {
    return nodes.reduce((acc, node) => {
      acc[node.id] = { x: Math.random() * width, y: Math.random() * height, vx: 0, vy: 0 };
      return acc;
    }, {});
  });

  // Simple force simulation
  useEffect(() => {
    const alpha = 1;
    const alphaDecay = 0.05;
    const repulsionStrength = 2000;
    const attractionStrength = 0.02;
    const centerStrength = 0.001;
    const iterations = 300;

    let currentAlpha = alpha;
    const newPositions = { ...positions };

    for (let i = 0; i < iterations; i++) {
      // Repulsion
      nodes.forEach(nodeA => {
        nodes.forEach(nodeB => {
          if (nodeA.id === nodeB.id) return;
          const dx = newPositions[nodeA.id].x - newPositions[nodeB.id].x;
          const dy = newPositions[nodeA.id].y - newPositions[nodeB.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const force = (repulsionStrength * currentAlpha) / (dist * dist);
          newPositions[nodeA.id].vx += (dx / dist) * force;
          newPositions[nodeA.id].vy += (dy / dist) * force;
        });
      });

      // Attraction
      edges.forEach(edge => {
        const dx = newPositions[edge.target].x - newPositions[edge.source].x;
        const dy = newPositions[edge.target].y - newPositions[edge.source].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        const force = dist * attractionStrength * currentAlpha;
        newPositions[edge.source].vx += (dx / dist) * force;
        newPositions[edge.target].vx -= (dx / dist) * force;
        newPositions[edge.source].vy += (dy / dist) * force;
        newPositions[edge.target].vy -= (dy / dist) * force;
      });

      // Center
      nodes.forEach(node => {
        newPositions[node.id].vx += (width / 2 - newPositions[node.id].x) * centerStrength * currentAlpha;
        newPositions[node.id].vy += (height / 2 - newPositions[node.id].y) * centerStrength * currentAlpha;
      });

      // Update positions
      nodes.forEach(node => {
        newPositions[node.id].x += newPositions[node.id].vx * currentAlpha;
        newPositions[node.id].y += newPositions[node.id].vy * currentAlpha;
        newPositions[node.id].vx *= 0.9;
        newPositions[node.id].vy *= 0.9;

        // Bound within view
        newPositions[node.id].x = Math.max(nodeRadius, Math.min(width - nodeRadius, newPositions[node.id].x));
        newPositions[node.id].y = Math.max(nodeRadius, Math.min(height - nodeRadius, newPositions[node.id].y));
      });

      currentAlpha *= (1 - alphaDecay);
    }

    setPositions(newPositions);
  }, []); // Run once on mount

  // Check for bidirectional edges
  const edgeDirections = new Map();
  edges.forEach(edge => {
    const key = [edge.source, edge.target].sort().join('<->');
    if (!edgeDirections.has(key)) {
      edgeDirections.set(key, new Set());
    }
    edgeDirections.get(key).add(`${edge.source}->${edge.target}`);
  });

  return (
    <svg width={width} height={height} style={{ border: '1px solid black' }}>
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="black" />
        </marker>
      </defs>
      {/* Render edges */}
      {edges.map((edge, index) => {
        const posSource = positions[edge.source];
        const posTarget = positions[edge.target];
        if (!posSource || !posTarget) return null;

        const key = [edge.source, edge.target].sort().join('<->');
        const directions = edgeDirections.get(key);
        const isBidirectional = directions.size === 2;

        let markerStart = '';
        let markerEnd = 'url(#arrow)';
        if (isBidirectional) {
          markerStart = 'url(#arrow)';
        } else if (directions.has(`${edge.target}->${edge.source}`)) {
          // If this is the reverse, swap for rendering once
          return null; // Skip rendering reverse if already handled
        }

        // Slight curve for bidirectional to avoid overlap, but for simplicity, straight with both markers
        return (
          <line
            key={index}
            x1={posSource.x}
            y1={posSource.y}
            x2={posTarget.x}
            y2={posTarget.y}
            stroke="black"
            markerEnd={markerEnd}
            markerStart={markerStart}
          />
        );
      })}
      {/* Render nodes */}
      {nodes.map(node => {
        const pos = positions[node.id];
        if (!pos) return null;
        const fill = node.status === 'up' ? 'green' : 'red';
        return (
          <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
            <circle r={nodeRadius} fill={fill} />
            <text dy=".35em" textAnchor="middle" fill="white" fontSize="10">
              {node.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default Graph;