import React, { useState, useEffect } from 'react';

const diagramConfig5 = {
  devices: [
    { id: "plc-1-c", status: "down", links: ["timedoor"] },
    { id: "plc-1-m", status: "down", links: ["timedoor"] },
    { id: "plc-2-c", status: "up", links: ["timedoor"] },
    { id: "plc-2-m", status: "down", links: ["timedoor"] },
    { id: "gpc", status: "up", links: ["message-server-2"] },
    { id: "stamp", status: "up", links: ["kafka"] },
    { id: "timedoor", status: "up", links: ["redis", "config-server", "influx"] },
    { id: "redis", status: "up", links: ["message-server-1"] },
    { id: "message-server-1", status: "up", links: ["kafka", "config-server", "influx"] },
    { id: "message-server-2", status: "up", links: ["kafka", "config-server", "influx"] },
    { id: "message-server-3", status: "up", links: ["trackmap-client-2"] },
    { id: "influx", status: "down", links: ["cribl"] },
    { id: "kafka", status: "up", links: ["message-server-1", "message-server-2", "config-server", "cribl", "message-relay"] },
    { id: "config-server", status: "up", links: ["kafka", "system-map-client-1", "message-server-1", "message-server-2", "message-server-3", "timedoor", "cribl"] },
    { id: "message-relay", status: "down", links: ["kafka", "message-client-1", "message-client-2", "trackmap-client-1"] },
    { id: "dgn", status: "up", links: ["cribl"] },
    { id: "cribl", status: "up", links: ["dgn"] },
    { id: "message-client-1", status: "up", links: ["message-relay"] },
    { id: "message-client-2", status: "down", links: ["message-relay"] },
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
      
      // Calculate layer for each node using longest path from sources
      const layers = new Map();
      const visited = new Set();
      
      const calculateLayer = (deviceId, currentLayer = 0) => {
        if (visited.has(deviceId)) return layers.get(deviceId) || 0;
        visited.add(deviceId);
        
        const device = devices.find(d => d.id === deviceId);
        if (!device) return currentLayer;
        
        let maxLayer = currentLayer;
        device.links.forEach(targetId => {
          const targetLayer = calculateLayer(targetId, currentLayer + 1);
          maxLayer = Math.max(maxLayer, targetLayer);
        });
        
        layers.set(deviceId, Math.max(layers.get(deviceId) || 0, currentLayer));
        return maxLayer;
      };
      
      // Start from nodes with no incoming edges (sources)
      devices.forEach(device => {
        if (incomingCount.get(device.id) === 0) {
          calculateLayer(device.id, 0);
        }
      });
      
      // Calculate layers for remaining nodes
      devices.forEach(device => {
        if (!layers.has(device.id)) {
          calculateLayer(device.id, 0);
        }
      });
      
      // Group devices by layer
      const columns = {};
      devices.forEach(device => {
        const layer = layers.get(device.id) || 0;
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

    // Create edges and detect bidirectional connections
    const edgeList = [];
    const edgeMap = new Map();
    
    devices.forEach(device => {
      device.links.forEach(targetId => {
        const key1 = `${device.id}->${targetId}`;
        const key2 = `${targetId}->${device.id}`;
        
        edgeList.push({
          source: device.id,
          target: targetId,
          isBidirectional: edgeMap.has(key2)
        });
        
        edgeMap.set(key1, true);
      });
    });

    setNodes(Array.from(nodeMap.values()));
    setEdges(edgeList);
  }, []);

  const getNodePosition = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const drawArrow = (x1, y1, x2, y2, isBidirectional = false) => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 10;
    
    // Shorten the line to account for node size (rectangle extends 50 wide, 30 tall from center)
    const nodeOffset = 35;
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    
    const shortenedX1 = x1 + (nodeOffset / dist) * (x2 - x1);
    const shortenedY1 = y1 + (nodeOffset / dist) * (y2 - y1);
    const shortenedX2 = x2 - (nodeOffset / dist) * (x2 - x1);
    const shortenedY2 = y2 - (nodeOffset / dist) * (y2 - y1);
    
    // Arrow at end (pointing to target)
    const arrowPoint1X = shortenedX2 - arrowLength * Math.cos(angle - Math.PI / 6);
    const arrowPoint1Y = shortenedY2 - arrowLength * Math.sin(angle - Math.PI / 6);
    const arrowPoint2X = shortenedX2 - arrowLength * Math.cos(angle + Math.PI / 6);
    const arrowPoint2Y = shortenedY2 - arrowLength * Math.sin(angle + Math.PI / 6);
    
    const endArrow = `M ${shortenedX2} ${shortenedY2} L ${arrowPoint1X} ${arrowPoint1Y} L ${arrowPoint2X} ${arrowPoint2Y} Z`;
    
    // Arrow at start (pointing from source) for bidirectional
    let startArrow = null;
    if (isBidirectional) {
      const reverseAngle = angle + Math.PI;
      const arrowPoint3X = shortenedX1 - arrowLength * Math.cos(reverseAngle - Math.PI / 6);
      const arrowPoint3Y = shortenedY1 - arrowLength * Math.sin(reverseAngle - Math.PI / 6);
      const arrowPoint4X = shortenedX1 - arrowLength * Math.cos(reverseAngle + Math.PI / 6);
      const arrowPoint4Y = shortenedY1 - arrowLength * Math.sin(reverseAngle + Math.PI / 6);
      startArrow = `M ${shortenedX1} ${shortenedY1} L ${arrowPoint3X} ${arrowPoint3Y} L ${arrowPoint4X} ${arrowPoint4Y} Z`;
    }
    
    // Calculate midpoint for warning icon
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    
    return {
      line: { x1: shortenedX1, y1: shortenedY1, x2: shortenedX2, y2: shortenedY2 },
      endArrow,
      startArrow,
      midX,
      midY
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 bg-purple-500"></div>
            <span className="text-gray-300">Bidirectional</span>
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
              const arrow = drawArrow(source.x, source.y, target.x, target.y, edge.isBidirectional);
              
              const sourceDevice = diagramConfig5.devices.find(d => d.id === edge.source);
              const targetDevice = diagramConfig5.devices.find(d => d.id === edge.target);
              const isSourceDown = sourceDevice?.status === 'down';
              const isTargetDown = targetDevice?.status === 'down';
              const isConnectionDown = isSourceDown || isTargetDown;
              
              const strokeColor = edge.isBidirectional ? '#A855F7' : '#4B5563';
              const strokeWidth = edge.isBidirectional ? '3' : '2';
              
              return (
                <g key={i}>
                  <line
                    x1={arrow.line.x1}
                    y1={arrow.line.y1}
                    x2={arrow.line.x2}
                    y2={arrow.line.y2}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    opacity="0.6"
                  />
                  <path
                    d={arrow.endArrow}
                    fill={strokeColor}
                    opacity="0.8"
                  />
                  {arrow.startArrow && (
                    <path
                      d={arrow.startArrow}
                      fill={strokeColor}
                      opacity="0.8"
                    />
                  )}
                  {/* Warning icon at midpoint if connection is down */}
                  {isConnectionDown && (
                    <g transform={`translate(${arrow.midX - 10}, ${arrow.midY - 10})`}>
                      <circle cx="10" cy="10" r="10" fill="#EF4444" />
                      <text
                        x="10"
                        y="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="14"
                        fontWeight="bold"
                      >
                        !
                      </text>
                    </g>
                  )}
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
                <rect
                  x={node.x - 50}
                  y={node.y - 20}
                  width="100"
                  height="40"
                  rx="5"
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
                  fontSize="11"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {node.id.length > 14 ? node.id.substring(0, 12) + '...' : node.id}
                </text>
                {hoveredNode === node.id && (
                  <text
                    x={node.x}
                    y={node.y - 35}
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