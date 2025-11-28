/**
 * Computes the **position and size of an HTMLElement relative to an SVG container**.
 *
 * This is crucial for computing graph routing because SVG polyline coordinates
 * must be expressed **relative to the SVG viewport**, not the browser window.
 *
 * Internally:
 * - Uses `getBoundingClientRect()` on both elements.
 * - Subtracts the SVG's rect from the element's rect to normalize values.
 *
 * @param {HTMLElement} el - The DOM element whose position is being measured.
 * @param {SVGSVGElement} svg - The containing SVG element providing the coordinate system.
 * @returns {Object} A normalized bounding box relative to the SVG viewport:
 *   {
 *     left, right, top, bottom, width, height
 *   }
 *
 * @example
 * const rect = getRelativePos(nodeElement, svgElement);
 * console.log(rect.left);  // → x-position inside SVG
 */
export const getRelativePos = (el, svg) => {
  const a = el.getBoundingClientRect();
  const b = svg.getBoundingClientRect();

  return {
    left: a.left - b.left,
    right: a.right - b.left,
    top: a.top - b.top,
    bottom: a.bottom - b.top,
    width: a.width,
    height: a.height,
  };
};
