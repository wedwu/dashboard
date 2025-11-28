import { render, screen } from "@testing-library/react";
import React from "react";

import DiagramAutoLayout from "../components/DiagramAutoLayout";
import { vi } from "vitest";

// -------------------------------------------------------------
// Vitest Mocks
// -------------------------------------------------------------

vi.mock("../components/DeviceBox", () => ({
  default: (props: any) => (
    <div data-testid="device-box">{props.device.id}</div>
  )
}));

vi.mock("../components/SvgConnections", () => ({
  default: (props: any) => (
    <div data-testid="svg-connections" data-props={JSON.stringify(props)} />
  )
}));

vi.mock("../styles/diagramStyles", () => ({
  styles: {
    wrapper: { display: "flex" },
    column: { padding: 10 }
  },
  STATUS_COLORS: {
    up: "#00ff00",
    down: "#ff0000",
    unknown: "#888888"
  }
}));

// Mock computeDepths so layout becomes deterministic
vi.mock("../utils/graphHelpers", () => ({
  computeDepths: vi.fn(() => ({
    root: 0,
    a: 1,
    b: 1,
    upstream: -1
  }))
}));

// -------------------------------------------------------------
// Test Suite
// -------------------------------------------------------------

describe("DiagramAutoLayout (Vitest)", () => {
  const devices = [
    { id: "root", status: "up", links: ["a"] },
    { id: "a", status: "down", links: ["b"] },
    { id: "b", status: "up", links: [] },
    { id: "upstream", status: "unknown", links: [] }
  ];

  it("shows error when devices is not an array", () => {
    render(<DiagramAutoLayout devices={null as any} rootId="root" />);
    expect(screen.getByText("devices must be an array")).toBeInTheDocument();
  });

  it("renders correct number of DeviceBox components", () => {
    render(<DiagramAutoLayout devices={devices} rootId="root" />);
    const boxes = screen.getAllByTestId("device-box");
    expect(boxes.length).toBe(4);
  });

  it("renders correct number of columns (based on depthMap)", () => {
    render(<DiagramAutoLayout devices={devices} rootId="root" />);
    const columns = screen.getAllByTestId("diagram-column");
    // Depths: [-1, 0, 1] → 3 columns
    expect(columns.length).toBe(3);
  });

  it("renders SvgConnections with correct props", () => {
    render(<DiagramAutoLayout devices={devices} rootId="root" />);
    const svg = screen.getByTestId("svg-connections");

    const props = JSON.parse(svg.getAttribute("data-props")!);

    expect(props.routingMode).toBe("spine");
    expect(props.lanePreset).toBe("medium");
    expect(props.laneMode).toBe("adaptive");
  });

  it("computes connection colors correctly", () => {
    render(<DiagramAutoLayout devices={devices} rootId="root" />);
    const svg = screen.getByTestId("svg-connections");
    const props = JSON.parse(svg.getAttribute("data-props")!);

    expect(props.connections).toEqual(
      expect.arrayContaining([
        { from: "root", to: "a", color: "#ff0000" },
        { from: "a", to: "b", color: "#00ff00" }
      ])
    );
  });

  it("computes rootColumnIndex from depth 0", () => {
    render(<DiagramAutoLayout devices={devices} rootId="root" />);
    const svg = screen.getByTestId("svg-connections");
    const props = JSON.parse(svg.getAttribute("data-props")!);

    // depth 0 → middle column → index 1
    expect(props.rootColumnIndex).toBe(1);
  });

  it("computes columnIndexForDevice values correctly", () => {
    render(<DiagramAutoLayout devices={devices} rootId="root" />);
    const svg = screen.getByTestId("svg-connections");
    const props = JSON.parse(svg.getAttribute("data-props")!);

    expect(props.columnIndexForDevice).toEqual({
      upstream: 0,
      root: 1,
      a: 2,
      b: 2
    });
  });
});
