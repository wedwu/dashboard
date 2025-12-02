import React, { useRef, useLayoutEffect, useState } from "react";

import { diagramConfig5 as diagramConfig } from "../config/diagramConfig5"

import AutoLayout from "./AutoLayout";
import Diagram from "./Diagram"
import MeshForceGraph from "./MeshForceGraph";
import Graph from './GROK'
import NetworkGraph from './networkGraph'
import NetworkGraphv1 from './NetworkGraphv1'
import NetworkGraphv2 from './NetworkGraphv2'

export interface DeviceNode {
  id: string;
  status: string;
  links: string[];
}

export default function DiagramAutoLayout() {

  const devices: DeviceNode[] = diagramConfig.devices

  return (<>
    <div style={{ padding: 20 }}>
      <NetworkGraphv2 />
    </div>    
    <div style={{ padding: 20 }}>
      <NetworkGraphv1 />
    </div>
    <div style={{ padding: 20 }}>
      <NetworkGraph />
    </div>
    <div style={{ padding: 20 }}>
      <MeshForceGraph devices={devices} />
    </div>
    <div style={{ padding: 20 }}>
      <AutoLayout devices={devices} />
    </div>
    <div style={{ padding: 20 }}>
      <Graph />
    </div>
    <div style={{ padding: 20 }}>
      <Diagram devices={devices} />
    </div>
  </>);
}
