
/**
 * Main application entry component.
 *
 * @module App
 */

import DeviceDiagram from './components/DeviceDiagram';
import { diagramConfig7 } from './config/diagramConfig7';

export default function App() {
  return (
    <div>
      <h1>Network Diagram</h1>
      <DeviceDiagram devices={diagramConfig7.devices} />
    </div>
  );
}