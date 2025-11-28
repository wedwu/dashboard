import { describe, it, expect } from "vitest";
import {
  buildAdjacency,
  bfsForward,
  bfsBackward,
  computeDepths,
} from "../utils/graphHelpers";

//
// -------------------------------------------------------------
// buildAdjacency
// -------------------------------------------------------------
//

describe("buildAdjacency", () => {
  it("builds correct forward + reverse adjacency", () => {
    const devices = [
      { id: "A", links: ["B", "C"] },
      { id: "B", links: ["D"] },
      { id: "C", links: [] },
      { id: "D", links: [] },
    ];

    const { forward, reverse } = buildAdjacency(devices);

    expect(forward).toEqual({
      A: ["B", "C"],
      B: ["D"],
      C: [],
      D: [],
    });

    expect(reverse).toEqual({
      A: [],
      B: ["A"],
      C: ["A"],
      D: ["B"],
    });
  });

  it("handles devices with no links", () => {
    const { forward, reverse } = buildAdjacency([{ id: "X" }]);
    expect(forward).toEqual({ X: [] });
    expect(reverse).toEqual({ X: [] });
  });
});

//
// -------------------------------------------------------------
// bfsForward
// -------------------------------------------------------------
//

describe("bfsForward", () => {
  it("computes forward BFS distances", () => {
    const forward = {
      A: ["B", "C"],
      B: ["D"],
      C: ["D"],
      D: [],
    };

    const dist = bfsForward(forward, "A");

    expect(dist).toEqual({
      A: 0,
      B: 1,
      C: 1,
      D: 2,
    });
  });

  it("handles unreachable nodes", () => {
    const forward = {
      A: ["B"],
      B: [],
      Z: [], // unreachable
    };

    const dist = bfsForward(forward, "A");
    expect(dist).toEqual({ A: 0, B: 1 });
    expect(dist["Z"]).toBeUndefined();
  });
});

//
// -------------------------------------------------------------
// bfsBackward
// -------------------------------------------------------------
//

describe("bfsBackward", () => {
  it("computes reverse BFS distances from a sink node", () => {
    const reverse = {
      A: [],
      B: ["A"],
      C: ["A"],
      D: ["B", "C"],
    };

    // Reverse BFS starting from D:
    // D <- B <- A
    // D <- C <- A
    const dist = bfsBackward(reverse, "D");

    expect(dist).toEqual({
      D: 0,
      B: 1,
      C: 1,
      A: 2,
    });
  });

  it("handles unreachable nodes", () => {
    const reverse = {
      A: [],
      B: ["A"],
      X: [], // unreachable relative to A
    };

    const dist = bfsBackward(reverse, "A");

    expect(dist).toEqual({ A: 0 });
  });
});

//
// -------------------------------------------------------------
// computeDepths
// -------------------------------------------------------------
//

describe("computeDepths", () => {
  it("returns 0 depth for root", () => {
    const devices = [
      { id: "root", links: ["A"] },
      { id: "A", links: [] },
    ];

    const depth = computeDepths(devices, "root");
    expect(depth.root).toBe(0);
  });

  it("computes downstream positive depths", () => {
    const devices = [
      { id: "R", links: ["A"] },
      { id: "A", links: ["B"] },
      { id: "B", links: [] },
    ];

    const depth = computeDepths(devices, "R");

    expect(depth).toEqual({
      R: 0,
      A: 1,
      B: 2,
    });
  });

  it("computes upstream negative depths", () => {
    const devices = [
      { id: "R", links: [] },
      { id: "A", links: ["R"] },
    ];

    const depth = computeDepths(devices, "R");

    expect(depth).toEqual({
      R: 0,
      A: -1,
    });
  });

  it("chooses negative upstream depth when up <= down", () => {
    const devices = [
      { id: "A", links: ["root"] },
      { id: "B", links: ["root"] },
      { id: "root", links: ["C"] },
      { id: "C", links: [] },
    ];

    const depth = computeDepths(devices, "root");

    expect(depth).toEqual({
      root: 0,
      C: 1,
      A: -1,
      B: -1,
    });
  });

  it("falls back to first device if given invalid root", () => {
    const devices = [
      { id: "X", links: ["Y"] },
      { id: "Y", links: [] },
    ];

    const depth = computeDepths(devices, "invalid-root");

    expect(depth).toEqual({
      X: 0,
      Y: 1,
    });
  });

  it("sets depth = 0 when node unreachable in both directions", () => {
    const devices = [
      { id: "R", links: [] },
      { id: "A", links: [] },
    ];

    const depth = computeDepths(devices, "R");

    expect(depth).toEqual({
      R: 0,
      A: 0,
    });
  });

  //
  // THE FIXED TEST — this now reflects actual BFS logic
  //
  it("uses downstream depth when a node is not truly upstream of root", () => {
    const devices = [
      { id: "root", links: ["A"] },
      { id: "A", links: ["B"] },
      { id: "X", links: ["A"] }, // creates a cycle but not upstream from root
      { id: "B", links: ["X"] },
    ];

    const depth = computeDepths(devices, "root");

    // upstream BFS cannot reach X
    // so depth = forward distance = 3
    expect(depth.X).toBe(3);
  });
});
