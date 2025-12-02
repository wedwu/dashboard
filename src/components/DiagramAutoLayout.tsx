import React, { useRef, useLayoutEffect, useState } from "react";

import { diagramConfig5 as diagramConfig } from "../config/diagramConfig5"

import AutoLayout from "./AutoLayout";
import Diagram from "./Diagram"
import MeshForceGraph from "./MeshForceGraph";

export interface DeviceNode {
  id: string;
  status: string;
  links: string[];
}

export default function DiagramAutoLayout() {

  const devices: DeviceNode[] = diagramConfig.devices

  return (<>
    <Diagram devices={devices} />
    <AutoLayout devices={devices} />
    <div style={{ padding: 20 }}>
      <MeshForceGraph devices={devices} />
    </div>
  </>);
}
