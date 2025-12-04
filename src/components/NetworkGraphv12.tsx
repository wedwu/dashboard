import React, { useState, useEffect } from 'react';

import './NetworkGraph.scss'


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
    { id: "message-server-3", status: "up", links: ["kafka", "config-server", "influx"] },
    { id: "influx", status: "down", links: ["cribl"] },
    { id: "kafka", status: "up", links: ["message-server-1", "message-server-2", "config-server", "cribl", "message-relay"] },
    { id: "config-server", status: "up", links: ["kafka", "system-map-client-1", "message-server-1", "message-server-2", "message-server-3", "timedoor", "cribl"] },
    { id: "message-relay", status: "down", links: ["kafka", "message-client-1", "message-client-2", "trackmap-client-1"] },
    { id: "dgn", status: "up", links: ["cribl"] },
    { id: "cribl", status: "up", links: ["dgn"] },
    { id: "message-client-1", status: "up", links: ["message-relay"] },
    { id: "message-client-2", status: "down", links: ["message-relay"] },
    { id: "trackmap-client-1", status: "up", links: ["message-relay"] },
    { id: "trackmap-client-2", status: "up", links: ["message-relay"] },
    { id: "system-map-client-1", status: "up", links: ["config-server"] }
  ]
};

const NetworkGraphv12: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [nodeHeights, setNodeHeights] = useState<Map<string, number>>(new Map());
  const [nodeWidths, setNodeWidths] = useState<Map<string, number>>(new Map());
  const [showDebug, setShowDebug] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const nodeRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

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
    
    // Increased column spacing for wider gutters (70px between columns)
    const columnGutter = 70;
    const totalGutterSpace = (columnOrder.length + 1) * columnGutter;
    const columnWidth = (width - totalGutterSpace) / columnOrder.length;
    
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
        x: columnGutter + (columnWidth / 2) + (columnIndex * (columnWidth + columnGutter)),
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
    
    // Generate debug information
    generateDebugInfo(devices, columns, columnOrder, edgeList);
  }, []);

  const generateDebugInfo = (devices: Device[], columns: Record<string, string[]>, columnOrder: string[], edgeList: Edge[]) => {
    // Find roots (nodes with no incoming edges)
    const incomingCount = new Map<string, number>();
    devices.forEach(device => {
      if (!incomingCount.has(device.id)) incomingCount.set(device.id, 0);
      device.links.forEach(target => {
        incomingCount.set(target, (incomingCount.get(target) || 0) + 1);
      });
    });
    
    const roots = devices.filter(d => incomingCount.get(d.id) === 0).map(d => d.id);
    
    // Find hubs (nodes with many connections)
    const connectionCount = new Map<string, number>();
    devices.forEach(device => {
      const incoming = incomingCount.get(device.id) || 0;
      const outgoing = device.links.length;
      connectionCount.set(device.id, incoming + outgoing);
    });
    
    const hubs = Array.from(connectionCount.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);
    
    // Find leaves (nodes with no outgoing edges)
    const leaves = devices.filter(d => d.links.length === 0).map(d => d.id);
    
    // Count bidirectional edges
    const bidirectionalCount = edgeList.filter(e => e.isBidirectional).length;
    
    // Detect cycles (strongly connected components)
    const hasCycles = detectCycles(devices);
    const cycleCount = hasCycles ? 1 : 0;
    
    // Validation warnings
    const validations: string[] = [];
    if (leaves.length === 0) {
      validations.push('No leaves detected. The graph has no end point.');
    }
    if (cycleCount > 0) {
      validations.push(`Large strongly-connected cycles detected (${cycleCount}). Layout may not be strictly left→right.`);
    }
    if (bidirectionalCount > 0) {
      validations.push(`Graph contains many bidirectional edges (${bidirectionalCount}). This may indicate a mesh.`);
    }
    if (hubs.length >= 9) {
      validations.push(`Graph has ${hubs.length} hub-like nodes (incoming ≥ 2). This might not be a simple flow.`);
    }
    
    setDebugInfo({
      roots,
      hubs: hubs.map(h => h[0]),
      leaves,
      sccCount: cycleCount,
      validations,
      columns: columnOrder.map((col, idx) => ({
        index: idx,
        nodes: columns[col]
      }))
    });
  };

  const detectCycles = (devices: Device[]): boolean => {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    
    const hasCycleDFS = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);
      
      const device = devices.find(d => d.id === nodeId);
      if (device) {
        for (const link of device.links) {
          if (!visited.has(link)) {
            if (hasCycleDFS(link)) return true;
          } else if (recStack.has(link)) {
            return true;
          }
        }
      }
      
      recStack.delete(nodeId);
      return false;
    };
    
    for (const device of devices) {
      if (!visited.has(device.id)) {
        if (hasCycleDFS(device.id)) return true;
      }
    }
    
    return false;
  };

  // Update node heights after nodes are rendered
  useEffect(() => {
    const updateDimensions = () => {
      const heights = new Map<string, number>();
      const widths = new Map<string, number>();
      nodeRefs.current.forEach((ref, id) => {
        if (ref) {
          heights.set(id, ref.offsetHeight);
          widths.set(id, ref.offsetWidth);
        }
      });
      setNodeHeights(heights);
      setNodeWidths(widths);
    };

    // Delay to ensure DOM is fully rendered
    const timer = setTimeout(updateDimensions, 100);
    return () => clearTimeout(timer);
  }, [nodes]);

  const getNodePosition = (nodeId: string): { x: number; y: number } => {
    const node = nodes.find(n => n.id === nodeId);
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
  };

  const getNodeHeight = (nodeId: string): number => {
    return nodeHeights.get(nodeId) || 40;
  };

  const getNodeWidth = (nodeId: string): number => {
    return nodeWidths.get(nodeId) || 100;
  };

  const drawArrow = (x1: number, y1: number, x2: number, y2: number, isBidirectional: boolean = false, edgeIndex: number = 0, totalEdgesInGroup: number = 1, sourceId: string = '', targetId: string = ''): ArrowPath => {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 12;
    
    // Get actual node dimensions
    const sourceHeight = getNodeHeight(sourceId);
    const targetHeight = getNodeHeight(targetId);
    const sourceWidth = getNodeWidth(sourceId);
    const targetWidth = getNodeWidth(targetId);
    
    // Calculate the actual intersection point with the rectangle
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Rectangle dimensions (half sizes for calculations)
    const halfWidthSource = sourceWidth / 2;
    const halfHeightSource = sourceHeight / 2;
    const halfWidthTarget = targetWidth / 2;
    const halfHeightTarget = targetHeight / 2;
    
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
    let offsetX2 = halfWidthTarget;
    let offsetY2 = halfHeightTarget;
    
    if (halfHeightTarget * tx > halfWidthTarget * ty) {
      offsetX2 = halfWidthTarget;
      offsetY2 = halfWidthTarget * ty / tx;
    } else {
      offsetY2 = halfHeightTarget;
      offsetX2 = halfHeightTarget * tx / ty;
    }
    
    // Apply the offset in the correct direction
    const shortenedX2 = x2 - Math.sign(dx) * offsetX2 - (arrowLength * Math.cos(angle)) + offsetMultiplier;
    const shortenedY2 = y2 - Math.sign(dy) * offsetY2 - (arrowLength * Math.sin(angle));
    
    // Calculate intersection with source rectangle for bidirectional
    let offsetX1 = halfWidthSource;
    let offsetY1 = halfHeightSource;
    
    if (halfHeightSource * tx > halfWidthSource * ty) {
      offsetX1 = halfWidthSource;
      offsetY1 = halfWidthSource * ty / tx;
    } else {
      offsetY1 = halfHeightSource;
      offsetX1 = halfHeightSource * tx / ty;
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 className="network-graph__title" style={{ marginBottom: 0, fontSize: '1.5rem', fontWeight: 700, color: '#ffffff' }}>Network Device Topology</h2>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            style={{
              backgroundColor: '#374151',
              color: '#ffffff',
              border: '1px solid #9ca3af',
              borderRadius: '0.25rem',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#111827'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#374151'}
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
        </div>
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
      
      {showDebug && debugInfo && (
        <div style={{
          backgroundColor: '#1f2937',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1rem',
          color: '#ffffff',
          fontSize: '0.875rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginTop: 0, marginBottom: '1rem', color: '#ffffff' }}>
            Graph Debug
          </h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, color: '#d1d5db', marginBottom: '0.25rem' }}>Roots:</div>
            <div style={{ color: '#ffffff', fontFamily: 'monospace' }}>{debugInfo.roots.join(', ') || '(none)'}</div>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, color: '#d1d5db', marginBottom: '0.25rem' }}>Hubs:</div>
            <div style={{ color: '#ffffff', fontFamily: 'monospace' }}>{debugInfo.hubs.join(', ') || '(none)'}</div>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, color: '#d1d5db', marginBottom: '0.25rem' }}>Leaves:</div>
            <div style={{ color: '#ffffff', fontFamily: 'monospace' }}>{debugInfo.leaves.join(', ') || '(none)'}</div>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, color: '#d1d5db', marginBottom: '0.25rem' }}>SCC Count:</div>
            <div style={{ color: '#ffffff', fontFamily: 'monospace' }}>{debugInfo.sccCount}</div>
          </div>
          
          {debugInfo.validations.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, color: '#d1d5db', marginBottom: '0.25rem' }}>Validation:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {debugInfo.validations.map((warning: string, idx: number) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: '#f87171', lineHeight: 1.5 }}>
                    <span style={{ flexShrink: 0, fontSize: '1rem' }}>⚠</span>
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div style={{ marginBottom: 0 }}>
            <div style={{ fontWeight: 600, color: '#d1d5db', marginBottom: '0.25rem' }}>Columns:</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {debugInfo.columns.map((col: any) => (
                <div key={col.index} style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                  <strong style={{ color: '#d1d5db' }}>col {col.index}:</strong> {col.nodes.join(', ')}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="network-graph__canvas">
        <div style={{ position: 'relative', width: '1200px', height: '800px' }}>
          {/* SVG for edges only */}
          <svg width="1200" height="800" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
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
                
                const arrow = drawArrow(source.x, source.y, target.x, target.y, edge.isBidirectional, edgeIndex, totalEdgesInGroup, edge.source, edge.target);
                
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
                    {/* Circle on start point if not bidirectional (no start arrow) */}
                    {!arrow.startArrow && (
                      <circle
                        cx={arrow.line.x1}
                        cy={arrow.line.y1}
                        r="4"
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
          </svg>
          
          {/* Draw nodes as DIVs */}
          {nodes.map(node => {
            const nodeWidth = getNodeWidth(node.id);
            const nodeHeight = getNodeHeight(node.id);
            
            return (
              <div
                key={node.id}
                ref={(el) => {
                  if (el) nodeRefs.current.set(node.id, el);
                }}
                className={`node-div node-div--${node.status} ${hoveredNode === node.id ? 'node-div--hovered' : ''}`}
                style={{
                  left: `${node.x - (nodeWidth / 2)}px`,
                  top: `${node.y - (nodeHeight / 2)}px`,
                }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <div className="node-div__content">
                  <span className="node-div__text">
                    {node.id.length > 14 ? node.id.substring(0, 12) + '...' : node.id}
                  </span>


                </div>
                {hoveredNode === node.id && (
                  <div className="node-div__tooltip">
                    {node.id}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NetworkGraphv12;

