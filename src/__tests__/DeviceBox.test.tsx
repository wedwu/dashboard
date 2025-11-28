import { render, screen } from "@testing-library/react";
import DeviceBox from "../components/DeviceBox";

// Mock styles + constants from diagramStyles
vi.mock("../styles/diagramStyles", () => ({
  styles: {
    device: { padding: 10 },
    dot: { width: 8, height: 8, borderRadius: "50%" },
    menuIconWrapper: { marginLeft: "auto" },
    menuIconContainer: { padding: 4 },
  },
  STATUS_COLORS: {
    up: "#2ecc71",
    down: "#e74c3c",
    unknown: "#7f8c8d",
  },
}));

describe("DeviceBox", () => {

  it("renders the device ID", () => {
    render(<DeviceBox device={{ id: "server01", status: "up" }} />);
    expect(screen.getByText("server01")).toBeInTheDocument();
  });

  it("applies the correct DOM ID", () => {
    render(<DeviceBox device={{ id: "server01", status: "up" }} />);
    const el = document.getElementById("node-server01");
    expect(el).not.toBeNull();
  });

  it("renders status dot with correct color", () => {
    render(<DeviceBox device={{ id: "server01", status: "up" }} />);
    const dot = screen.getByTestId("status-dot");
    expect(dot).toHaveStyle("background: #2ecc71");
  });

  it("falls back to 'unknown' color when status missing", () => {
    render(<DeviceBox device={{ id: "mystery" }} />);
    const dot = screen.getByTestId("status-dot");
    expect(dot).toHaveStyle("background: #7f8c8d");
  });

  it("sets border color based on status", () => {
    render(<DeviceBox device={{ id: "downer", status: "down" }} />);
    const box = screen.getByTestId("device-box");
    expect(box.style.border.includes("4px solid")).toBe(true);
  });

  it("renders the UIMiniMenu when device has an ID", () => {
    render(<DeviceBox device={{ id: "server01", status: "up" }} />);
    expect(screen.getByText("menu")).toBeInTheDocument();
  });

});
