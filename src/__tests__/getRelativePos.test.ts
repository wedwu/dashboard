import { describe, it, expect, beforeEach } from "vitest";
import { getRelativePos } from "../utils/geometry";

describe("getRelativePos", () => {
  let el: HTMLElement;
  let svg: SVGSVGElement;

  beforeEach(() => {
    document.body.innerHTML = "";

    el = document.createElement("div");
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    document.body.appendChild(svg);
    document.body.appendChild(el);
  });

  it("computes element position relative to SVG container", () => {
    // Mock SVG bounding box
    svg.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 200,
        right: 500,
        bottom: 600,
        width: 400,
        height: 400,
      } as DOMRect);

    // Mock element bounding box
    el.getBoundingClientRect = () =>
      ({
        left: 150,
        top: 250,
        right: 250,
        bottom: 350,
        width: 100,
        height: 100,
      } as DOMRect);

    const rect = getRelativePos(el, svg);

    expect(rect).toEqual({
      left: 50,      // 150 - 100
      right: 150,    // 250 - 100
      top: 50,       // 250 - 200
      bottom: 150,   // 350 - 200
      width: 100,
      height: 100,
    });
  });

  it("returns zero offsets when element and SVG have identical rects", () => {
    const mockRect = {
      left: 300,
      top: 400,
      right: 500,
      bottom: 600,
      width: 200,
      height: 200,
    } as DOMRect;

    svg.getBoundingClientRect = () => mockRect;
    el.getBoundingClientRect = () => mockRect;

    const rect = getRelativePos(el, svg);

    expect(rect.left).toBe(0);
    expect(rect.top).toBe(0);
    expect(rect.right).toBe(200);
    expect(rect.bottom).toBe(200);
    expect(rect.width).toBe(200);
    expect(rect.height).toBe(200);
  });

  it("handles negative coordinate offsets", () => {
    svg.getBoundingClientRect = () =>
      ({
        left: 300,
        top: 300,
        right: 600,
        bottom: 600,
        width: 300,
        height: 300,
      } as DOMRect);

    el.getBoundingClientRect = () =>
      ({
        left: 250,  // element left is left of SVG
        top: 250,   // above SVG
        right: 300,
        bottom: 300,
        width: 50,
        height: 50,
      } as DOMRect);

    const rect = getRelativePos(el, svg);

    expect(rect).toEqual({
      left: -50,
      right: 0,
      top: -50,
      bottom: 0,
      width: 50,
      height: 50,
    });
  });
});
