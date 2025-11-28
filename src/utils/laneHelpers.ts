// -------------------------------------------------------------
// utils/laneHelpers.js
// -------------------------------------------------------------

/**
 * Returns the base spacing value (in pixels) for a lane preset.
 *
 * @param {"wide"|"medium"|"narrow"} preset - The preset type.
 * @returns {number} The base pixel gap before scaling.
 *
 * @example
 * getPresetBaseGap("wide");   // → 40
 * getPresetBaseGap("narrow"); // → 18
 */
export const getPresetBaseGap = (preset) => {
  switch (preset) {
    case "wide":
      return 40;
    case "narrow":
      return 18;
    case "medium":
    default:
      return 28;
  }
};

/**
 * Computes spacing between routing lanes for multi-connection layouts.
 *
 * Logic:
 * - `"fixed"`: always uses preset * laneScale
 * - `"flex"`: uses 90% of `span / (n+1)` for fully distributed lanes
 * - `"adaptive"`: uses `min(flexGap, presetGap)` for smart compression
 *
 * @param {Object} args
 * @param {"fixed"|"flex"|"adaptive"} args.laneMode
 * @param {"wide"|"medium"|"narrow"} args.lanePreset
 * @param {number} args.laneScale
 * @param {number} args.nConnections
 * @param {number} args.span - Horizontal distance between columns
 *
 * @returns {number} Lane spacing in pixels.
 *
 * @example
 * computeLaneGap({
 *   laneMode: "fixed",
 *   lanePreset: "medium",
 *   laneScale: 1,
 *   nConnections: 4,
 *   span: 300
 * });
 *
 * @example
 * computeLaneGap({
 *   laneMode: "adaptive",
 *   lanePreset: "wide",
 *   laneScale: 1.2,
 *   nConnections: 3,
 *   span: 200
 * });
 */
export const computeLaneGap = ({
  laneMode,
  lanePreset,
  laneScale,
  nConnections,
  span,
}) => {
  const baseGap = getPresetBaseGap(lanePreset) * (laneScale || 1);

  // Fixed spacing
  if (laneMode === "fixed") return baseGap;

  // Flexible lane spacing strictly based on available distance
  if (laneMode === "flex") {
    if (nConnections <= 1 || !isFinite(span) || span <= 0) return baseGap;
    return (span / (nConnections + 1)) * 0.9;
  }

  // Adaptive (smart minimum of both systems)
  if (nConnections <= 1 || !isFinite(span) || span <= 0) return baseGap;

  const flexGap = (span / (nConnections + 1)) * 0.9;
  return Math.min(baseGap, flexGap);
};
