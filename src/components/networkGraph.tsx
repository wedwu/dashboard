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
    { id: "system-map-client-1", status: "up", links: ["config-server"] }
  ]
};

const NetworkGraph = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    const width = 1200;
    const height = 800;
    
    // Create nodes with positions using a force-directed layout simulation
    const nodeMap = new Map();
    const devices = diagramConfig5.devices;
    
    // Initialize nodes with random positions
    devices.forEach((device, i) => {
      nodeMap.set(device.id, {
        id: device.id,
        status: device.status,
        x: Math.random() * (width - 100) + 50,
        y: Math.random() * (height - 100) + 50,
        vx: 0,
        vy: 0
      });
    });

    // Create edges
    const edgeList = [];
    devices.forEach(device => {
      device.links.forEach(targetId => {
        edgeList.push({
          source: device.id,
          target: targetId
        });
      });
    });

    // Simple force-directed layout simulation
    const simulate = () => {
      const iterations = 300;
      const repulsion = 5000;
      const attraction = 0.01;
      const damping = 0.8;

      for (let iter = 0; iter < iterations; iter++) {
        // Repulsion between all nodes
        const nodeArray = Array.from(nodeMap.values());
        for (let i = 0; i < nodeArray.length; i++) {
          for (let j = i + 1; j < nodeArray.length; j++) {
            const n1 = nodeArray[i];
            const n2 = nodeArray[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = repulsion / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }

        // Attraction along edges
        edgeList.forEach(edge => {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (source && target) {
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = dist * attraction;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            source.vx += fx;
            source.vy += fy;
            target.vx -= fx;
            target.vy -= fy;
          }
        });

        // Update positions with damping
        nodeArray.forEach(node => {
          node.vx *= damping;
          node.vy *= damping;
          node.x += node.vx;
          node.y += node.vy;
          
          // Keep within bounds
          node.x = Math.max(60, Math.min(width - 60, node.x));
          node.y = Math.max(60, Math.min(height - 60, node.y));
        });
      }
    };

    simulate();
    setNodes(Array.from(nodeMap.values()));
    setEdges(edgeList);
  }, []);

  const getNodePosition = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const drawArrow = (x1, y1, x2, y2) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 10;
    const arrowWidth = 6;
    
    // Shorten the line to account for node radius
    const nodeRadius = 30;
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const shortenedX2 = x2 - (nodeRadius / dist) * (x2 - x1);
    const shortenedY2 = y2 - (nodeRadius / dist) * (y2 - y1);
    
    const arrowPoint1X = shortenedX2 - arrowLength * Math.cos(angle - Math.PI / 6);
    const arrowPoint1Y = shortenedY2 - arrowLength * Math.sin(angle - Math.PI / 6);
    const arrowPoint2X = shortenedX2 - arrowLength * Math.cos(angle + Math.PI / 6);
    const arrowPoint2Y = shortenedY2 - arrowLength * Math.sin(angle + Math.PI / 6);
    
    return {
      line: { x1, y1, x2: shortenedX2, y2: shortenedY2 },
      arrow: `M ${shortenedX2} ${shortenedY2} L ${arrowPoint1X} ${arrowPoint1Y} L ${arrowPoint2X} ${arrowPoint2Y} Z`
    };
  };

  return (
    <div className="w-full h-screen bg-gray-900 p-4 overflow-auto">
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <h2 className="text-2xl font-bold text-white mb-2">Network Device Topology</h2>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-gray-300">Status: Up</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <span className="text-gray-300">Status: Down</span>
          </div>
          <span className="text-gray-400 ml-4">Total Devices: {nodes.length}</span>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <svg width="1200" height="800" className="w-full">
          {/* Draw edges */}
          <g>
            {edges.map((edge, i) => {
              const source = getNodePosition(edge.source);
              const target = getNodePosition(edge.target);
              const arrow = drawArrow(source.x, source.y, target.x, target.y);
              
              return (
                <g key={i}>
                  <line
                    x1={arrow.line.x1}
                    y1={arrow.line.y1}
                    x2={arrow.line.x2}
                    y2={arrow.line.y2}
                    stroke="#4B5563"
                    strokeWidth="2"
                    opacity="0.6"
                  />
                  <path
                    d={arrow.arrow}
                    fill="#4B5563"
                    opacity="0.6"
                  />
                </g>
              );
            })}
          </g>
          
          {/* Draw nodes */}
          <g>
            {nodes.map(node => (
              <g
                key={node.id}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="30"
                  fill={node.status === 'up' ? '#10B981' : '#EF4444'}
                  stroke={hoveredNode === node.id ? '#FBBF24' : '#1F2937'}
                  strokeWidth={hoveredNode === node.id ? '3' : '2'}
                  opacity="0.9"
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {node.id.length > 12 ? node.id.substring(0, 10) + '...' : node.id}
                </text>
                {hoveredNode === node.id && (
                  <text
                    x={node.x}
                    y={node.y - 45}
                    textAnchor="middle"
                    fill="#FBBF24"
                    fontSize="12"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {node.id}
                  </text>
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
};

export default NetworkGraph;