// -------------------------------------------------------------
// utils/graphHelpers.js  (ES6 Version)
// -------------------------------------------------------------

/**
 * Builds directed adjacency lists for a graph of devices.
 *
 * - forward: outgoing edges (device → links[])
 * - reverse: incoming edges (each target → list of parents)
 *
 * @param {Array<{id:string, links?:string[]}>} devices
 * @returns {{forward: Object<string,string[]>, reverse: Object<string,string[]>}}
 */
export const buildAdjacency = (devices) => {
  const forward = {};
  const reverse = {};

  // Initialize forward + empty reverse
  devices.forEach((d) => {
    forward[d.id] = d.links || [];
    if (!reverse[d.id]) reverse[d.id] = [];
  });

  // Populate reverse adjacency
  devices.forEach((d) => {
    (d.links || []).forEach((t) => {
      if (!reverse[t]) reverse[t] = [];
      reverse[t].push(d.id);
    });
  });

  return { forward, reverse };
};

/**
 * Performs a forward BFS (following outgoing edges) from a root node.
 *
 * @param {Object<string,string[]>} forward
 * @param {string} rootId
 * @returns {Object<string,number>}
 */
export const bfsForward = (forward, rootId) => {
  const dist = {};
  const q = [rootId];

  dist[rootId] = 0;
  let head = 0;

  while (head < q.length) {
    const cur = q[head++];
    const d = dist[cur];

    (forward[cur] || []).forEach((n) => {
      if (dist[n] == null) {
        dist[n] = d + 1;
        q.push(n);
      }
    });
  }

  return dist;
};

/**
 * Performs a reverse BFS (following incoming edges) back toward the root node.
 *
 * @param {Object<string,string[]>} reverse
 * @param {string} rootId
 * @returns {Object<string,number>}
 */
export const bfsBackward = (reverse, rootId) => {
  const dist = {};
  const q = [rootId];

  dist[rootId] = 0;
  let head = 0;

  while (head < q.length) {
    const cur = q[head++];
    const d = dist[cur];

    (reverse[cur] || []).forEach((n) => {
      if (dist[n] == null) {
        dist[n] = d + 1;
        q.push(n);
      }
    });
  }

  return dist;
};

/**
 * Computes depth values for all graph nodes by combining:
 *
 * - Forward BFS distance (downstream)
 * - Reverse BFS distance (upstream)
 *
 * @param {Array<{id:string,links?:string[]}>} devices
 * @param {string} rootId
 * @returns {Object<string,number>}
 */
export const computeDepths = (devices, rootId) => {
  const ids = devices.map((d) => d.id);

  // Validate root or fallback
  if (!rootId || !ids.includes(rootId)) {
    rootId = ids[0];
  }

  const { forward, reverse } = buildAdjacency(devices);

  const down = bfsForward(forward, rootId);
  const up = bfsBackward(reverse, rootId);

  const depth = {};

  devices.forEach((d) => {
    const id = d.id;

    if (id === rootId) {
      depth[id] = 0;
      return;
    }

    const du = up[id];
    const dd = down[id];

    if (du == null && dd == null) depth[id] = 0;
    else if (du != null && dd == null) depth[id] = -du;
    else if (du == null && dd != null) depth[id] = dd;
    else depth[id] = du <= dd ? -du : dd;
  });

  return depth;
};
