// Detect client nodes based on topology patterns
function findClientNodes(graph: Graph): Set<string> {
  const clients = new Set<string>();
  
  // First pass: identify potential "hub" or "relay" nodes
  // These are nodes with high out-degree that fan out to many nodes
  const hubs = new Set<string>();
  for (const node of graph.nodes) {
    const outgoing = graph.outgoing.get(node) || [];
    const incoming = graph.incoming.get(node) || [];
    
    // A hub/relay has many outgoing connections
    if (outgoing.length >= 3) {
      hubs.add(node);
    }
  }
  
  // Second pass: identify clients
  // A client is a node that:
  // 1. Connects to a hub/relay (or small set of services), AND
  // 2. Is not itself heavily connected to by others (low in-degree from non-hubs), AND
  // 3. Has low out-degree (connects to 1-2 services max)
  
  for (const node of graph.nodes) {
    const outgoing = graph.outgoing.get(node) || [];
    const incoming = graph.incoming.get(node) || [];
    
    // Skip if no connections at all
    if (outgoing.length === 0 && incoming.length === 0) continue;
    
    // Pure leaf nodes are clients
    if (outgoing.length === 0) {
      clients.add(node);
      continue;
    }
    
    // Low out-degree (connects to few services)
    if (outgoing.length <= 2) {
      // Check if it connects to a hub
      const connectsToHub = outgoing.some(target => hubs.has(target));
      
      if (connectsToHub) {
        // Check incoming connections from non-hub nodes
        const incomingFromNonHubs = incoming.filter(src => !hubs.has(src));
        
        // If very few non-hub nodes connect to this, it's likely a client
        if (incomingFromNonHubs.length <= 1) {
          clients.add(node);
        }
      }
    }
  }
  
  return clients;
}