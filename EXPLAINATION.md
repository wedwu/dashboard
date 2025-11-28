# 1. **What this configuration represents**

Your `diagramConfig` is the **source-of-truth** for the diagram:

```js
export const diagramConfig = {
  rootId: "kafka-broker",
  devices: [ ... ]
};
```

It defines:

1. **rootId**
   The center of the graph layout (depth = 0).

2. **devices[]**
   Each device/node rendered in the grid.

3. **links[]**
   Directed connections (edges)
   → `id → links[]` = outgoing edges
   → connection color is based on the target’s status
   → SVG routes each `from → to`

Visually:
**Every entry becomes:**

* one `<DeviceBox />`
* potential one or more polylines drawn by `<SvgConnections />`.

---

# 2. **Where `diagramConfig` gets used**

You typically pass it into your diagram:

```tsx
<DiagramAutoLayout
  devices={diagramConfig.devices}
  rootId={diagramConfig.rootId}
/>
```

From there, everything flows through your components:

```
diagramConfig → DiagramAutoLayout → DeviceBox + SvgConnections
```

---

# 3. **How DiagramAutoLayout uses this config**

`DiagramAutoLayout` does **four major jobs**:

---

## (1) **Graph processing (depth + adjacency)**

It calls:

### `buildAdjacency(devices)`

Creates:

```js
forward = { device → outgoingLinks }
reverse = { device → incomingLinks }
```

### `bfsForward(forward, rootId)`

Downstream depth:

```
root=0
children of root = +1
children of children = +2
```

### `bfsBackward(reverse, rootId)`

Upstream depth:

```
parents of root = -1
parents of parents = -2
```

### `computeDepths(devices)`

Combines both distances and assigns each device a **signed depth**:

| Meaning            | Depth        |
| ------------------ | ------------ |
| Upstream of root   | **negative** |
| Root               | **0**        |
| Downstream of root | **positive** |

---

## (2) **Column grouping**

`depthOrder` → sorted depths
`columns = depthOrder.map(depth → devices with that depth)`

Example (illustrative):

```
depth -1: [plc-X, plc-Y, ...]
depth  0: [kafka-broker]
depth +1: [message-server-*]
depth +2: [client-*]
```

These depth buckets become actual `<div class="diagram-column" data-col="0..N">`.

---

## (3) **Placement of DeviceBox components**

For each depth-column:

```tsx
<DeviceBox key={dev.id} device={dev} />
```

Each DeviceBox:

* draws a box
* applies a status color dot
* injects a mini-menu
* sets `id="node-${device.id}"` ← used by SvgConnections

The ID is **critical** because SvgConnections queries:

```js
document.getElementById(`node-${id}`)
```

to get the DOM rect for each device.

---

## (4) **Building SVG Connection Objects**

For each device:

```js
connections.push({
  from: d.id,
  to: linkTarget,
  color: STATUS_COLORS[target.status] or fallback
});
```

Your `diagramConfig.links` is literally how <SvgConnections /> determines:

* which lines to draw
* which direction
* what color
* where error icons go

If the **target** of a link has:

```js
status: "down"
```

SvgConnections sets:

```js
showError = true
```

which makes the error marker appear on the elbow.

---

# 4. **How SvgConnections uses the config**

SvgConnections does:

1. **Measure DOM positions** of each DeviceBox
   using `getRelativePos(nodeEl, svgEl)`

2. **Determine lane assignment**
   using laneMode, lanePreset, laneScale, and `computeLaneGap()`

3. **Calculate elbow points**
   (x1, y1, laneX, elbowY, x2, y2)

4. **Draw `<polyline>`** for every `from → to` link

5. **Render error icons** for “down” targets

---

# Putting it together — Using your config example

Let’s look at a few entries:

---

### config-server

```js
{
  id: "config-server",
  status: "up",
  links: ["kafka-broker"]
}
```

### How it renders:

* Appears **upstream** of kafka-broker
* Depth = -1
* Draws one line **config-server → kafka-broker**
* No error icon because kafka-broker is `"up"`

---

### kafka-broker (root)

```js
{
  id: "kafka-broker",
  status: "up",
  links: [
    "message-server-plc-relay-a",
    "message-server-cribl-b",
    "message-server-cribl-c"
  ]
}
```

### How it renders:

* Depth = 0
* In root column
* 3 outgoing connections
* Routes to those three downstream nodes

---

### message-server-plc-redis-a

```js
{
  id: "message-server-plc-redis-a",
  status: "down",
  links: ["message-server-timedoor-a"]
}
```

Since it is **down**, any incoming link pointing **to it** will show:

* red line (STATUS_COLORS.down)
* error icon at second elbow

But its outgoing link to `message-server-timedoor-a`
uses the *target’s* status, not its own.

---

### message-server-plc-relay-a → many clients

```js
{
  id: "message-server-plc-relay-a",
  status: "down",
  links: [
    "message-client-a",
    "message-client-b",
    "trackmap-client-a",
    "trackmap-client-b",
    "message-client-c"
  ]
}
```

### How it renders:

* Relay node with 5 outgoing lines
* Lane distribution = `"adaptive"` or `"flex"` based on settings
* Error icons appear **ONLY** for clients where status is `"down"`

---

# Summary: How the object drives the whole UI

| Part of object | Consumed by                | Result                       |
| -------------- | -------------------------- | ---------------------------- |
| `rootId`       | computeDepths              | Defines middle column        |
| `devices[]`    | DiagramAutoLayout          | Creates DeviceBoxes          |
| `id`           | DeviceBox + SVG engine     | DOM node IDs for measurement |
| `status`       | DeviceBox + SvgConnections | Color + error overlays       |
| `links[]`      | SvgConnections             | Draws edges between nodes    |

The entire diagram is **data-driven** from this one config:
change the object → the whole layout rerenders automatically.

