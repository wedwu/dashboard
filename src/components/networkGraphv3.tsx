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

const NetworkGraphv3 = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    const width = 1200;
    const height = 800;
    
    const devices = diagramConfig5.devices;
    const nodeMap = new Map();
    
    // Dynamically create columns based on network topology analysis
    const createColumns = (devices) => {
      // Build dependency graph
      const incomingCount = new Map();
      const outgoingCount = new Map();
      const allIds = new Set(devices.map(d => d.id));
      
      devices.forEach(device => {
        if (!incomingCount.has(device.id)) incomingCount.set(device.id, 0);
        if (!outgoingCount.has(device.id)) outgoingCount.set(device.id, 0);
        
        outgoingCount.set(device.id, device.links.length);
        
        device.links.forEach(target => {
          if (allIds.has(target)) {
            incomingCount.set(target, (incomingCount.get(target) || 0) + 1);
          }
        });
      });
      
      // Calculate minimum layer for each node (shortest path from sources)
      const layers = new Map();
      const queue = [];
      
      // Start with nodes that have no incoming edges (sources)
      devices.forEach(device => {
        if (incomingCount.get(device.id) === 0) {
          layers.set(device.id, 0);
          queue.push(device.id);
        }
      });
      
      // BFS to assign minimum layers
      while (queue.length > 0) {
        const currentId = queue.shift();
        const currentLayer = layers.get(currentId);
        const device = devices.find(d => d.id === currentId);
        
        if (device) {
          device.links.forEach(targetId => {
            if (allIds.has(targetId)) {
              const newLayer = currentLayer + 1;
              if (!layers.has(targetId) || layers.get(targetId) > newLayer) {
                layers.set(targetId, newLayer);
                queue.push(targetId);
              }
            }
          });
        }
      }
      
      // Handle any remaining unassigned nodes
      devices.forEach(device => {
        if (!layers.has(device.id)) {
          layers.set(device.id, 0);
        }
      });
      
      // Post-process: Group similar nodes together
      // Find common prefixes and patterns to group related nodes
      const nodesByPattern = new Map();
      
      devices.forEach(device => {
        const parts = device.id.split('-');
        let pattern = 'other';
        
        // Group by common prefix patterns
        if (parts.length >= 2) {
          // Extract pattern (e.g., "message-server" from "message-server-1")
          pattern = parts.slice(0, -1).join('-');
          
          // If it's just a number at the end, use the full prefix
          if (/^\d+$/.test(parts[parts.length - 1])) {
            pattern = parts.slice(0, -1).join('-');
          } else {
            pattern = device.id;
          }
        } else {
          pattern = device.id;
        }
        
        if (!nodesByPattern.has(pattern)) {
          nodesByPattern.set(pattern, []);
        }
        nodesByPattern.get(pattern).push({
          id: device.id,
          layer: layers.get(device.id)
        });
      });
      
      // Assign adjusted layers: nodes with same pattern get same layer
      const adjustedLayers = new Map();
      nodesByPattern.forEach((nodes, pattern) => {
        // Use the minimum layer among all nodes with this pattern
        const minLayer = Math.min(...nodes.map(n => n.layer));
        nodes.forEach(node => {
          adjustedLayers.set(node.id, minLayer);
        });
      });
      
      // Group devices by adjusted layer
      const columns = {};
      devices.forEach(device => {
        const layer = adjustedLayers.get(device.id) || layers.get(device.id) || 0;
        const columnKey = `layer-${layer}`;
        if (!columns[columnKey]) {
          columns[columnKey] = [];
        }
        columns[columnKey].push(device.id);
      });
      
      return columns;
    };
    
    const columns = createColumns(devices);
    const columnOrder = Object.keys(columns).sort((a, b) => {
      const layerA = parseInt(a.split('-')[1]);
      const layerB = parseInt(b.split('-')[1]);
      return layerA - layerB;
    });
    const columnWidth = width / (columnOrder.length + 1);
    
    // Position nodes in columns
    devices.forEach(device => {
      let columnIndex = 0;
      let rowIndex = 0;
      
      // Find which column this device belongs to
      for (let i = 0; i < columnOrder.length; i++) {
        const columnKey = columnOrder[i];
        const columnDevices = columns[columnKey];
        const deviceIndex = columnDevices.indexOf(device.id);
        
        if (deviceIndex !== -1) {
          columnIndex = i;
          rowIndex = deviceIndex;
          break;
        }
      }
      
      const column = columnOrder[columnIndex];
      const devicesInColumn = columns[column].length;
      const verticalSpacing = height / (devicesInColumn + 1);
      
      nodeMap.set(device.id, {
        id: device.id,
        status: device.status,
        x: columnWidth * (columnIndex + 1),
        y: verticalSpacing * (rowIndex + 1),
        column: column
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

    setNodes(Array.from(nodeMap.values()));
    setEdges(edgeList);
  }, []);

  const getNodePosition = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const drawOrthogonalPath = (x1, y1, x2, y2) => {
    const nodeRadius = 30;
    const arrowLength = 10;
    
    // Adjust start and end points for node radius
    const startX = x1 + nodeRadius;
    const endX = x2 - nodeRadius;
    
    // Calculate bend points
    const midX = (startX + endX) / 2;
    
    // Create path with two 90-degree bends
    const path = `M ${startX} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${endX} ${y2}`;
    
    // Arrow at the end pointing left (towards target node)
    const arrowPath = `M ${endX} ${y2} L ${endX + arrowLength} ${y2 - 6} L ${endX + arrowLength} ${y2 + 6} Z`;
    
    return { path, arrowPath };
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
              const { path, arrowPath } = drawOrthogonalPath(source.x, source.y, target.x, target.y);
              
              return (
                <g key={i}>
                  <path
                    d={path}
                    stroke="#4B5563"
                    strokeWidth="2"
                    fill="none"
                    opacity="0.6"
                  />
                  <path
                    d={arrowPath}
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

export default NetworkGraphv3;