---

````md
# Understanding the Graph Layout Engine and Why Kosaraju’s Algorithm Was Chosen

---

# 1. What The JSON Structure Actually Is

The `devices` array represents a **directed graph (digraph)**:

```jsonc
devices: [
  {
    id: "plc-1-c",
    links: ["message-server-1"]
  },
  {
    id: "message-server-1",
    links: ["kafka", "influx"]
  },
  {
    id: "kafka",
    links: ["config-server", "message-relay"]
  }
]
````

This means:

```
node.id ==> node.links[]
```

is a **directed edge**:

```
id ======> link
```

So the JSON describes edges such as:

```
(plc-1-c ==> message-server-1)
(message-server-1 ==> kafka)
(kafka ==> config-server)
(config-server ==> kafka)
(timedoor ==> message-server-3)
(message-server-3 ==> influx)
```

These form a general directed graph with:

### Multiple roots

PLCs, gpc, stamp, cribl, config-server

### Multiple sinks

clients, dgn, influx

### Multiple converging points

kafka, influx

### A long dependency chain

redis ==> timedoor ==> message-server-3 ==> {kafka, influx}

### A disconnected subgraph

cribl ==> dgn

### A cycle

kafka <==> config-server

This is **not**:

* a tree
* a DAG (because of cycles)
* a single connected component

It is a **general digraph**.

---

# 2. Why Normal Layering Break

Standard graph layout algorithms assume:

### **A. The graph is a DAG** (no cycles): Directed Acyclic Graph

But the structure has:

```
kafka <==> config-server
```

This breaks:

* BFS-based layering
* topological sort
* Sugiyama-style layout
* any algorithm requiring acyclicity

### **B. One root**

You have many.

### **C. One sink**

You have many.

### **D. The graph is connected**

You have isolated chains.

### **E. Distance can be computed globally**

Your diagram requires **path-sensitive column alignment**, such as:

```
redis ==> column 1
timedoor ==> column 2
message-server-3 ==> column 3
kafka/influx/config-server ==> column 4
```

This cannot be computed via:

* shortest path
* longest path
* BFS distance
* incoming/outgoing edge counts

Your layout is defined by **flow chains AND cycles**, which requires deeper graph analysis.

---

# 3. Why Strongly Connected Components (SCCs) Are Required

Cycles must be detected and treated as *one unit*.

Example cycle:

```
kafka ==> config-server ==> kafka
```

### Without SCC detection, layouts become unstable:

* kafka gets column 3
* config-server gets column 2
* next render, the order reverses
* infinite oscillations
* non-deterministic results
* nodes jump columns
* edges flip direction
* diagrams misalign

### SCC detection solves this:

Kosaraju’s algorithm:

> “Group nodes that are mutually reachable into a single super-node.”

So:

```
[ kafka, config-server ]
```

becomes one **SCC block**, guaranteeing:

* same column
* stable layout
* no oscillation
* deterministic positioning

---

# 4. Why Kosaraju Specifically?

DFS (Depth-First Search) is a graph-traversal algorithm that explores each path as far as possible before backtracking.

There are multiple SCC algorithms:

| Algorithm      | Time     | Space      | Notes                     |
| -------------- | -------- | ---------- | ------------------------- |
| **Kosaraju**   | O(V + E) | simple     | 2 DFS passes              |
| Tarjan         | O(V + E) | low memory | harder to read / maintain |
| Gabow          | O(V + E) | optimized  | more complex              |
| Path-based SCC | O(V + E) | rare       | harder to maintain        |

### Kosaraju Advantages:

#### Extremely simple

Two DFS passes:

1. Forward DFS ==> ordering
2. Reverse DFS ==> SCC groups

#### Very readable in TypeScript

A critical requirement for maintainability.

#### Perfect for the graph size

The graph: ~25 nodes
Runtime: ~0.03ms

#### Produces deterministic results

Same SCC grouping every run — essential for stable diagrams.

#### Supports complex layout constraints

Because SCC reduces the graph into a DAG, enabling:

* deterministic longest-path layering
* multi-root support
* multi-sink support
* disconnected component alignment
* hub-cluster grouping
* chained alignment (redis ==> timedoor ==> message-server-3)
* stable debug overlays

---

# 5. Why NOT Tarjan?

Tarjan’s algorithm is also correct, but:

* much harder to debug
* stack bookkeeping can get tricky
* harder to annotate for SCC overlays
* more difficult to integrate with component-shifting logic
* unnecessary complexity for the graph size
* less intuitive for future modifications

Kosaraju is:

```
DFS1 ==> stack
DFS2 ==> groups
```

Which directly mirrors how you debug the layout.

---

# 6. Summary: Why Kosaraju Was Chosen

### Your JSON defines a general directed graph

Not a tree and not a DAG.

### You have cycles

(kafka <==> config-server)

### Kosaraju efficiently identifies SCCs and collapses cycles

This ensures:

* kafka + config-server always share a column
* no layout jitter
* stable column assignment
* predictable rendering

### Kosaraju converts the graph into a DAG

Which enables:

* longest-path layering
* correct multichain alignment
* deterministic hub grouping
* redis ==> timedoor ==> message-server-3 preserved
* multiple roots and sinks handled

### Completely deterministic

Each render gives identical results.

Ideal for a visualization engine.


