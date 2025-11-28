import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import React from "react";

import SvgConnections from "../components/SvgConnections";

// ---------------------------------------------------------------------------
// 🔧 Mock lane + geometry helpers
// ---------------------------------------------------------------------------
vi.mock("../utils/laneHelpers", () => ({
  computeLaneGap: vi.fn(() => 20),
}));

vi.mock("../utils/geometry", () => ({
  getRelativePos: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 100,
    height: 40,
    right: 100,
    bottom: 40,
  })),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const devices = [
  { id: "A", status: "up" },
  { id: "B", status: "down" }, // should trigger error icon
];

const connections = [
  { from: "A", to: "B", color: "#ff0000" }
];

const columnIndexForDevice = { A: 0, B: 1 };

// ---------------------------------------------------------------------------
// Provide fake DOM nodes for measurement
// ---------------------------------------------------------------------------
function createFakeDOM() {
  const svg = document.createElement("svg");
  svg.id = "diagram-svg";
  document.body.appendChild(svg);

  const parent = svg.parentElement || document.body;

  const col0 = document.createElement("div");
  col0.className = "diagram-column";
  col0.setAttribute("data-col", "0");

  const col1 = document.createElement("div");
  col1.className = "diagram-column";
  col1.setAttribute("data-col", "1");

  parent.appendChild(col0);
  parent.appendChild(col1);

  const nodeA = document.createElement("div");
  nodeA.id = "node-A";
  document.body.appendChild(nodeA);

  const nodeB = document.createElement("div");
  nodeB.id = "node-B";
  document.body.appendChild(nodeB);
}

// ---------------------------------------------------------------------------
// TEST SUITE
// ---------------------------------------------------------------------------
describe("SvgConnections (Vitest)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";

    // 🔧 Fix: Make requestAnimationFrame run immediately so useLayoutEffect executes
    vi.stubGlobal("requestAnimationFrame", (cb) => {
      cb(0);
      return 1;
    });

    createFakeDOM();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // -----------------------------------------------------------------------
  // BASE TESTS
  // -----------------------------------------------------------------------

  it("renders an SVG element", () => {
    render(
      <SvgConnections
        devices={devices}
        connections={connections}
        columnIndexForDevice={columnIndexForDevice}
        laneMode="adaptive"
        lanePreset="medium"
        routingMode="spine"
        laneScale={1}
        rootColumnIndex={0}
      />
    );

    expect(document.getElementById("diagram-svg")).toBeInTheDocument();
  });

  it("renders a polyline for the connection", async () => {
    render(
      <SvgConnections
        devices={devices}
        connections={connections}
        columnIndexForDevice={columnIndexForDevice}
        laneMode="adaptive"
        lanePreset="medium"
        routingMode="spine"
        laneScale={1}
        rootColumnIndex={0}
      />
    );

    // RAF already runs; tiny delay for setState to flush
    await new Promise((resolve) => setTimeout(resolve, 5));

    const polyline = document.querySelector("polyline");
    expect(polyline).toBeInTheDocument();
    expect(polyline?.getAttribute("stroke")).toBe("#ff0000");
  });

  it("renders an error icon when target status is 'down'", async () => {
    render(
      <SvgConnections
        devices={devices}
        connections={connections}
        columnIndexForDevice={columnIndexForDevice}
        laneMode="adaptive"
        lanePreset="medium"
        routingMode="spine"
        laneScale={1}
        rootColumnIndex={0}
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 5));

    const errorGlyph = screen.getByText("error");
    expect(errorGlyph).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // FIXED VERSION OF — "calls getRelativePos for each device + column"
  // -----------------------------------------------------------------------

  it("calls getRelativePos for each device + each column", async () => {
    const { getRelativePos } = await import("../utils/geometry");

    render(
      <SvgConnections
        devices={devices}
        connections={connections}
        columnIndexForDevice={columnIndexForDevice}
        laneMode="adaptive"
        lanePreset="medium"
        routingMode="spine"
        laneScale={1}
        rootColumnIndex={0}
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(getRelativePos).toHaveBeenCalled();

    // 2 devices + 2 columns = at least 4 calls
    expect(getRelativePos.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it("uses computeLaneGap for lane offset logic", async () => {
    const { computeLaneGap } = await import("../utils/laneHelpers");

    render(
      <SvgConnections
        devices={devices}
        connections={connections}
        columnIndexForDevice={columnIndexForDevice}
        laneMode="adaptive"
        lanePreset="medium"
        routingMode="spine"
        laneScale={1}
        rootColumnIndex={0}
      />
    );

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(computeLaneGap).toHaveBeenCalled();
  });
});
