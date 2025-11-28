import { describe, it, expect } from "vitest";
import { getPresetBaseGap, computeLaneGap } from "../utils/laneHelpers";

//
// -------------------------------------------------------------
// Tests for getPresetBaseGap
// -------------------------------------------------------------
//

describe("getPresetBaseGap", () => {
  it("returns 40 for 'wide'", () => {
    expect(getPresetBaseGap("wide")).toBe(40);
  });

  it("returns 18 for 'narrow'", () => {
    expect(getPresetBaseGap("narrow")).toBe(18);
  });

  it("returns 28 for 'medium'", () => {
    expect(getPresetBaseGap("medium")).toBe(28);
  });

  it("returns 28 for unknown presets", () => {
    expect(getPresetBaseGap("unknown-preset")).toBe(28);
  });
});

//
// -------------------------------------------------------------
// Tests for computeLaneGap
// -------------------------------------------------------------
//

describe("computeLaneGap", () => {

  it("computes fixed mode using preset * laneScale", () => {
    const gap = computeLaneGap({
      laneMode: "fixed",
      lanePreset: "wide",
      laneScale: 2,
      nConnections: 3,
      span: 300
    });
    expect(gap).toBe(40 * 2);
  });

  it("computes flex mode using (span/(n+1))*0.9", () => {
    const gap = computeLaneGap({
      laneMode: "flex",
      lanePreset: "medium",
      laneScale: 1,
      nConnections: 3,
      span: 300
    });
    // 300 / 4 * 0.9 = 67.5
    expect(gap).toBeCloseTo(67.5);
  });

  it("flex mode falls back to preset when nConnections <= 1", () => {
    const gap = computeLaneGap({
      laneMode: "flex",
      lanePreset: "medium",
      laneScale: 1,
      nConnections: 1,
      span: 300
    });
    expect(gap).toBe(28);
  });

  it("flex mode falls back to preset on invalid span", () => {
    const gap = computeLaneGap({
      laneMode: "flex",
      lanePreset: "medium",
      laneScale: 1,
      nConnections: 3,
      span: -10
    });
    expect(gap).toBe(28);
  });

  it("adaptive mode picks the smaller of (preset vs flexGap)", () => {
    const gap = computeLaneGap({
      laneMode: "adaptive",
      lanePreset: "wide", // base gap = 40
      laneScale: 1,
      nConnections: 3,
      span: 100 // flexGap = (100/4)*0.9 = 22.5
    });
    // min(40, 22.5)
    expect(gap).toBeCloseTo(22.5);
  });

  it("adaptive returns preset when only one connection", () => {
    const gap = computeLaneGap({
      laneMode: "adaptive",
      lanePreset: "medium",
      laneScale: 1,
      nConnections: 1,
      span: 300
    });
    expect(gap).toBe(28);
  });

  it("adaptive returns preset when span invalid", () => {
    const gap = computeLaneGap({
      laneMode: "adaptive",
      lanePreset: "medium",
      laneScale: 1,
      nConnections: 3,
      span: 0
    });
    expect(gap).toBe(28);
  });

});
