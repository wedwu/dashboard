import React, { useState, useEffect } from 'react';

interface Device {
  id: string;
  status: 'up' | 'down';
  links: string[];
}

interface DiagramConfig {
  devices: Device[];
}

interface Node {
  id: string;
  status: 'up' | 'down';
  x: number;
  y: number;
  column: string;
}

interface Edge {
  source: string;
  target: string;
  isBidirectional: boolean;
}

interface ArrowPath {
  line: { x1: number; y1: number; x2: number; y2: number };
  endArrow: string;
  startArrow: string | null;
  midX: number;
  midY: number;
}

const diagramConfig5: DiagramConfig = {
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

const NetworkGraph: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    const width = 1200;
    const height = 800;
    
    const devices = diagramConfig5.devices;
    const nodeMap = new Map();
    
    // Dynamically create columns based on network topology analysis
    const createColumns = (devices: Device[]): Record<string, string[]> => {
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
      
      // Calculate minimum layer for each node using BFS
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
      
      // Post-process: Group similar nodes together by pattern
      const nodesByPattern = new Map();
      
      devices.forEach(device => {
        const parts = device.id.split('-');
        let pattern = 'other';
        
        // Extract common prefix pattern (everything except the last numeric part)
        if (parts.length >= 2 && /^\d+$/.test(parts[parts.length - 1])) {
          // If last part is a number, use everything before it as the pattern
          pattern = parts.slice(0, -1).join('-');
        } else {
          // Otherwise, use the full device ID as its own pattern
          pattern = device.id;
        }
        
        if (!nodesByPattern.has(pattern)) {
          nodesByPattern.set(pattern, []);
        }
        nodesByPattern.get(pattern).push({
          id: device.id,
          layer: layers.get(device.id),
          incomingCount: incomingCount.get(device.id) || 0,
          outgoingCount: outgoingCount.get(device.id) || 0
        });
      });
      
      // Analyze network structure to identify "gateway" and "hub" nodes
      // Gateway: node with many incoming connections from sources (layer 0)
      // Hub: node that connects to many other nodes
      const adjustedLayers = new Map();
      
      nodesByPattern.forEach((nodes, pattern) => {
        // Calculate average characteristics for this pattern group
        const avgIncoming = nodes.reduce((sum, n) => sum + n.incomingCount, 0) / nodes.length;
        const avgOutgoing = nodes.reduce((sum, n) => sum + n.outgoingCount, 0) / nodes.length;
        const minLayer = Math.min(...nodes.map(n => n.layer));
        
        // Identify gateway nodes (high incoming from layer 0, moderate outgoing)
        const isGateway = nodes.some(n => {
          const sourceLinks = devices
            .filter(d => layers.get(d.id) === 0 && d.links.includes(n.id))
            .length;
          return sourceLinks >= 3 && n.outgoingCount >= 2;
        });
        
        // If this is a gateway pattern, place it at layer 1
        let targetLayer = minLayer;
        if (isGateway && minLayer === 1) {
          targetLayer = 1;
        }
        
        // Assign all nodes in this pattern to the same layer
        nodes.forEach(node => {
          adjustedLayers.set(node.id, targetLayer);
        });
      });
      
      // Sort nodes within each layer by their connectivity patterns
      // This helps separate "hub" nodes from regular nodes at the same layer
      const layerGroups = new Map();
      devices.forEach(device => {
        const layer = adjustedLayers.get(device.id);
        if (!layerGroups.has(layer)) {
          layerGroups.set(layer, []);
        }
        layerGroups.get(layer).push(device.id);
      });
      
      // For each layer, sort by: incoming count (desc), then outgoing count (desc)
      layerGroups.forEach((deviceIds, layer) => {
        deviceIds.sort((a, b) => {
          const incomingA = incomingCount.get(a) || 0;
          const incomingB = incomingCount.get(b) || 0;
          if (incomingA !== incomingB) return incomingB - incomingA;
          
          const outgoingA = outgoingCount.get(a) || 0;
          const outgoingB = outgoingCount.get(b) || 0;
          return outgoingB - outgoingA;
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

  const getNodePosition = (nodeId: string): { x: number; y: number } => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const drawArrow = (x1: number, y1: number, x2: number, y2: number, isBidirectional: boolean = false, edgeIndex: number = 0, totalEdgesInGroup: number = 1): ArrowPath => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 12;
    
    // Shorten the line to account for node size (rectangle extends 50 wide, 20 tall from center)
    // Calculate the actual intersection point with the rectangle
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Rectangle dimensions
    const rectWidth = 100;
    const rectHeight = 40;
    const halfWidth = rectWidth / 2;
    const halfHeight = rectHeight / 2;
    
    // Stagger vertical or near-vertical lines to prevent overlap
    const isVertical = Math.abs(dx) < 50; // Consider lines vertical if horizontal distance is small
    let offsetMultiplier = 0;
    
    if (isVertical && totalEdgesInGroup > 1) {
      // Stagger the lines horizontally
      const spacing = 15; // pixels between staggered lines
      const totalOffset = (totalEdgesInGroup - 1) * spacing;
      offsetMultiplier = (edgeIndex * spacing) - (totalOffset / 2);
    }
    
    // Calculate intersection with target rectangle
    const tx = Math.abs(dx / dist);
    const ty = Math.abs(dy / dist);
    let offsetX2 = halfWidth;
    let offsetY2 = halfHeight;
    
    if (halfHeight * tx > halfWidth * ty) {
      offsetX2 = halfWidth;
      offsetY2 = halfWidth * ty / tx;
    } else {
      offsetY2 = halfHeight;
      offsetX2 = halfHeight * tx / ty;
    }
    
    // Apply the offset in the correct direction
    const shortenedX2 = x2 - Math.sign(dx) * offsetX2 - (arrowLength * Math.cos(angle)) + offsetMultiplier;
    const shortenedY2 = y2 - Math.sign(dy) * offsetY2 - (arrowLength * Math.sin(angle));
    
    // Calculate intersection with source rectangle for bidirectional
    let offsetX1 = halfWidth;
    let offsetY1 = halfHeight;
    
    if (halfHeight * tx > halfWidth * ty) {
      offsetX1 = halfWidth;
      offsetY1 = halfWidth * ty / tx;
    } else {
      offsetY1 = halfHeight;
      offsetX1 = halfHeight * tx / ty;
    }
    
    const shortenedX1 = x1 + Math.sign(dx) * offsetX1 + (arrowLength * Math.cos(angle)) + offsetMultiplier;
    const shortenedY1 = y1 + Math.sign(dy) * offsetY1 + (arrowLength * Math.sin(angle));
    
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
    const midX = (x1 + x2) / 2 + offsetMultiplier;
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
    <div className="network-graph">
      <div className="network-graph__header">
        <h2 className="network-graph__title">Network Device Topology</h2>
        <div className="network-graph__legend">
          <div className="legend-item">
            <div className="legend-icon legend-icon--up"></div>
            <span className="legend-text">Status: Up</span>
          </div>
          <div className="legend-item">
            <div className="legend-icon legend-icon--down"></div>
            <span className="legend-text">Status: Down</span>
          </div>
          <div className="legend-item">
            <div className="legend-line legend-line--bidirectional"></div>
            <span className="legend-text">Bidirectional</span>
          </div>
          <span className="legend-count">Total Devices: {nodes.length}</span>
        </div>
      </div>
      
      <div className="network-graph__canvas">
        <svg width="1200" height="800" className="network-graph__svg">
          {/* Draw edges */}
          <g>
            {edges.map((edge, i) => {
              const source = getNodePosition(edge.source);
              const target = getNodePosition(edge.target);
              
              // Group vertical lines to determine stagger offset
              const dx = target.x - source.x;
              const isVertical = Math.abs(dx) < 50;
              
              // Find all edges with similar vertical alignment
              let edgeIndex = 0;
              let totalEdgesInGroup = 1;
              
              if (isVertical) {
                const verticalEdges = edges.filter((e) => {
                  const s = getNodePosition(e.source);
                  const t = getNodePosition(e.target);
                  const edgeDx = t.x - s.x;
                  return Math.abs(edgeDx) < 50 && Math.abs(s.x - source.x) < 30;
                });
                totalEdgesInGroup = verticalEdges.length;
                edgeIndex = verticalEdges.findIndex(e => e.source === edge.source && e.target === edge.target);
              }
              
              const arrow = drawArrow(source.x, source.y, target.x, target.y, edge.isBidirectional, edgeIndex, totalEdgesInGroup);
              
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
                    opacity="1"
                  />
                  {arrow.startArrow && (
                    <path
                      d={arrow.startArrow}
                      fill={strokeColor}
                      opacity="1"
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
                className="network-graph__node"
              >
                <rect
                  x={node.x - 50}
                  y={node.y - 20}
                  width="100"
                  height="40"
                  rx="5"
                  className={`node-rect node-rect--${node.status} ${hoveredNode === node.id ? 'node-rect--hovered' : ''}`}
                />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="node-text"
                >
                  {node.id.length > 14 ? node.id.substring(0, 12) + '...' : node.id}
                </text>
                {hoveredNode === node.id && (
                  <text
                    x={node.x}
                    y={node.y - 35}
                    textAnchor="middle"
                    className="node-text--hover"
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