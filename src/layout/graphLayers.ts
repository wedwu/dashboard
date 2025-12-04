// src/layout/graphLayers.ts
import type { RawDevice } from "../types/types";

/* The algorithm identifies strongly connected components (bidirectional/circular node groups) in the graph, computes the longest path from root nodes to assign base layers, then merges components with identical connectivity patterns into the same column; finally, it detects and separates message servers into their own column, shifts remaining infrastructure accordingly, and places all client nodes (identified by their low connectivity to hubs) in the final rightmost column.
*/


interface Graph {
  nodes: string[];
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
}

function buildGraph(devices: RawDevice[]): Graph {
  const nodes = new Set<string>();
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const d of devices) {
    nodes.add(d.id);
    for (const link of d.links || []) {
      nodes.add(link);
    }
  }

  for (const node of nodes) {
    outgoing.set(node, []);
    incoming.set(node, []);
  }

  for (const d of devices) {
    for (const to of d.links || []) {
      outgoing.get(d.id)!.push(to);
      incoming.get(to)!.push(d.id);
    }
  }

  return { nodes: Array.from(nodes), outgoing, incoming };
}

// Detect client nodes based on topology patterns
function findClientNodes(graph: Graph): Set<string> {
  const clients = new Set<string>();
  
  // First pass: identify potential "hub" or "relay" nodes
  // These are nodes with high out-degree that fan out to many nodes
  const hubs = new Set<string>();
  for (const node of graph.nodes) {
    const outgoing = graph.outgoing.get(node) || [];
    
    // A hub/relay has many outgoing connections
    if (outgoing.length >= 3) {
      hubs.add(node);
    }
  }
  
  // Second pass: identify clients
  // A client must:
  // 1. Have at least one incoming connection from a hub
  // 2. Have low out-degree (0-2 connections)
  // 3. Not be a hub itself
  
  for (const node of graph.nodes) {
    const outgoing = graph.outgoing.get(node) || [];
    const incoming = graph.incoming.get(node) || [];
    
    // Skip hubs - they're infrastructure
    if (hubs.has(node)) continue;
    
    // Must have incoming connections
    if (incoming.length === 0) continue;
    
    // Pure leaf nodes with incoming are clients
    if (outgoing.length === 0) {
      clients.add(node);
      continue;
    }
    
    // Low out-degree (connects to 1-2 services)
    if (outgoing.length <= 2) {
      // Must have incoming from a hub
      const hasIncomingFromHub = incoming.some(src => hubs.has(src));
      
      if (hasIncomingFromHub) {
        // Additionally check: clients shouldn't have many other nodes depending on them
        // (except possibly the hub they connect back to)
        const nonHubIncoming = incoming.filter(src => !hubs.has(src));
        if (nonHubIncoming.length === 0) {
          clients.add(node);
        }
      }
    }
  }
  
  return clients;
}

// Find strongly connected components using Tarjan's algorithm
function findSCCs(graph: Graph, excludeNodes: Set<string>): Map<string, number> {
  const { outgoing } = graph;
  const nodes = graph.nodes.filter(n => !excludeNodes.has(n));
  const nodeToSCC = new Map<string, number>();
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let currentIndex = 0;
  let sccCount = 0;

  function strongConnect(v: string) {
    index.set(v, currentIndex);
    lowlink.set(v, currentIndex);
    currentIndex++;
    stack.push(v);
    onStack.add(v);

    for (const w of outgoing.get(v) || []) {
      if (excludeNodes.has(w)) continue;
      
      if (!index.has(w)) {
        strongConnect(w);
        lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
      } else if (onStack.has(w)) {
        lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
      }
    }

    if (lowlink.get(v) === index.get(v)) {
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        nodeToSCC.set(w, sccCount);
      } while (w !== v);
      sccCount++;
    }
  }

  for (const v of nodes) {
    if (!index.has(v)) {
      strongConnect(v);
    }
  }

  return nodeToSCC;
}

// Build condensed graph where each SCC is a single node
function buildCondensedGraph(graph: Graph, nodeToSCC: Map<string, number>, excludeNodes: Set<string>) {
  const sccOutgoing = new Map<number, Set<number>>();
  const sccIncoming = new Map<number, Set<number>>();
  
  const numSCCs = nodeToSCC.size > 0 ? Math.max(...Array.from(nodeToSCC.values())) + 1 : 0;
  for (let i = 0; i < numSCCs; i++) {
    sccOutgoing.set(i, new Set());
    sccIncoming.set(i, new Set());
  }

  for (const u of graph.nodes) {
    if (excludeNodes.has(u)) continue;
    
    const sccU = nodeToSCC.get(u)!;
    for (const v of graph.outgoing.get(u) || []) {
      if (excludeNodes.has(v)) continue;
      
      const sccV = nodeToSCC.get(v)!;
      if (sccU !== sccV) {
        sccOutgoing.get(sccU)!.add(sccV);
        sccIncoming.get(sccV)!.add(sccU);
      }
    }
  }

  return { sccOutgoing, sccIncoming, numSCCs };
}

// Compute layers for SCCs using longest path
function computeSCCLayers(condensed: ReturnType<typeof buildCondensedGraph>): Map<number, number> {
  const { sccOutgoing, sccIncoming, numSCCs } = condensed;
  const layers = new Map<number, number>();

  // Find root SCCs
  for (let i = 0; i < numSCCs; i++) {
    if (sccIncoming.get(i)!.size === 0) {
      layers.set(i, 0);
    }
  }

  // Iteratively propagate layers
  let changed = true;
  let iterations = 0;
  while (changed && iterations < numSCCs * 2) {
    changed = false;
    iterations++;

    for (let u = 0; u < numSCCs; u++) {
      if (!layers.has(u)) continue;
      const currentLayer = layers.get(u)!;

      for (const v of sccOutgoing.get(u)!) {
        const proposedLayer = currentLayer + 1;
        const existingLayer = layers.get(v);

        if (existingLayer === undefined || proposedLayer > existingLayer) {
          layers.set(v, proposedLayer);
          changed = true;
        }
      }
    }
  }

  // Handle unreachable SCCs
  for (let i = 0; i < numSCCs; i++) {
    if (!layers.has(i)) {
      layers.set(i, 0);
    }
  }

  return layers;
}

// Merge SCCs that have identical connectivity patterns
function mergeIdenticalConnectivity(condensed: ReturnType<typeof buildCondensedGraph>, sccLayers: Map<number, number>): Map<number, number> {
  const { sccOutgoing, sccIncoming, numSCCs } = condensed;
  const sccToGroup = new Map<number, number>();
  
  // Create signature for each SCC based on its connectivity
  const signatures = new Map<number, string>();
  for (let i = 0; i < numSCCs; i++) {
    const layer = sccLayers.get(i)!;
    const incoming = Array.from(sccIncoming.get(i)!)
      .map(scc => sccLayers.get(scc)!)
      .sort()
      .join(',');
    const outgoing = Array.from(sccOutgoing.get(i)!)
      .map(scc => sccLayers.get(scc)!)
      .sort()
      .join(',');
    const sig = `L${layer}|I[${incoming}]|O[${outgoing}]`;
    signatures.set(i, sig);
  }

  // Group SCCs by signature
  const sigToGroup = new Map<string, number>();
  let groupId = 0;
  
  for (let i = 0; i < numSCCs; i++) {
    const sig = signatures.get(i)!;
    if (!sigToGroup.has(sig)) {
      sigToGroup.set(sig, groupId++);
    }
    sccToGroup.set(i, sigToGroup.get(sig)!);
  }

  return sccToGroup;
}

const computeLayers = (devices: RawDevice[]): Map<string, number> => {
  const graph = buildGraph(devices);
  
  // Step 1: Identify client nodes FIRST
  const clientNodes = findClientNodes(graph);
  
  // Step 2: Find SCCs excluding client nodes
  const nodeToSCC = findSCCs(graph, clientNodes);
  
  // Step 3: Build condensed graph excluding client nodes
  const condensed = buildCondensedGraph(graph, nodeToSCC, clientNodes);
  
  // Step 4: Compute layers for SCCs
  const sccLayers = computeSCCLayers(condensed);
  
  // Step 5: Merge SCCs with identical connectivity patterns
  const sccToGroup = mergeIdenticalConnectivity(condensed, sccLayers);
  
  // Step 6: Compute final group layers (excluding clients)
  const groupLayers = new Map<number, number>();
  for (let scc = 0; scc < condensed.numSCCs; scc++) {
    const group = sccToGroup.get(scc)!;
    const layer = sccLayers.get(scc)!;
    const existing = groupLayers.get(group);
    if (existing === undefined || layer > existing) {
      groupLayers.set(group, layer);
    }
  }
  
  // Step 7: Map non-client nodes to their layers
  const result = new Map<string, number>();
  for (const node of graph.nodes) {
    if (clientNodes.has(node)) {
      continue; // Skip clients for now
    }
    const scc = nodeToSCC.get(node)!;
    const group = sccToGroup.get(scc)!;
    const layer = groupLayers.get(group)!;
    result.set(node, layer);
  }
  
  // Step 8: Identify message server nodes
  const messageServers = new Set<string>();
  for (const node of graph.nodes) {
    // Identify message servers by their connectivity pattern:
    // They have incoming from multiple sources and outgoing to kafka/config-server
    const outgoing = graph.outgoing.get(node) || [];
    const incoming = graph.incoming.get(node) || [];
    
    // Message servers typically connect to kafka and config-server
    const connectsToKafka = outgoing.some(target => 
      target.includes('kafka') || target.includes('config')
    );
    
    // Have incoming connections and connect to infrastructure
    if (incoming.length > 0 && connectsToKafka && !clientNodes.has(node)) {
      const currentLayer = result.get(node);
      // Only consider nodes in layer 1 (the merged column)
      if (currentLayer === 1) {
        // Check if this looks like a message server
        // (has both incoming and specific outgoing patterns)
        const hasMultipleIncoming = incoming.length >= 1;
        if (hasMultipleIncoming) {
          messageServers.add(node);
        }
      }
    }
  }
  
  // Step 9: Shift layers to make room for message servers
  // Everything at layer 1+ needs to shift to layer 2+
  for (const [node, layer] of result.entries()) {
    if (messageServers.has(node)) {
      result.set(node, 1); // Message servers go to column 1
    } else if (layer >= 1) {
      result.set(node, layer + 1); // Shift everything else down
    }
  }
  
  // Step 10: Find the maximum layer from non-client nodes
  const maxLayer = result.size > 0 ? Math.max(...Array.from(result.values())) : -1;
  
  // Step 11: Place all client nodes in the final column
  for (const client of clientNodes) {
    result.set(client, maxLayer + 1);
  }

  return result;
};

export default computeLayers;