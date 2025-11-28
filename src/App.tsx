/**
 * Main application entry component.
 *
 * @module App
 */

import DiagramAutoLayout from "./components/DiagramAutoLayout";

import { diagramConfig } from "./config/diagramConfig";

/**
 * Renders the main diagram layout.
 *
 * @function App
 * @returns {JSX.Element} The rendered React app component.
 */
export default function App(): JSX.Element {
  return (
    <>
      {/**
       * Auto-layout diagram renderer.
       *
       * @component DiagramAutoLayout
       *
       * @prop {Array<Object>} devices - List of device objects with id, status, links, etc.
       * @prop {string} rootId - Id of the root node for BFS depth calculations.
       * @prop {"fixed" | "flex" | "adaptive"} laneMode - Lane spacing mode.
       * @prop {"wide" | "medium" | "narrow"} lanePreset - Preset spacing sizes.
       * @prop {"simple" | "spine" | "bundle"} routingMode - Connection routing algorithm.
       * @prop {number} laneScale - Multiplier applied to lane widths.
       */}
      <DiagramAutoLayout
        devices={diagramConfig.devices}
        rootId="kafka-broker"
        laneMode="adaptive"
        lanePreset="wide"
        routingMode="spine"
        laneScale={1.3}
      />
    </>
  );
}
