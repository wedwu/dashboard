import React, { useRef, useLayoutEffect, useState } from "react";

// import { diagramConfig5 } from "../config/diagramConfig5"
import { diagramConfig6 } from "../config/diagramConfig7"

// import AutoLayout from "./AutoLayout";
// import Diagram from "./Diagram"
// import MeshForceGraph from "./MeshForceGraph";
// import Graph from './GROK'
// import NetworkGraph from './networkGraph'
// import NetworkGraphv1 from './NetworkGraphv1'
// import NetworkGraphv2 from './NetworkGraphv2'
// import NetworkGraphv3 from './NetworkGraphv3'
// import NetworkGraphv4 from './NetworkGraphv4'
// import NetworkGraphv6 from './NetworkGraphv6'

// import NetworkGraphv12 from './NetworkGraphv12'
// import NetworkGraph from './NetworkGraphv13'

// import buildColumnsFromLinks from '../layout/buildColumnsFromLinks'
import computeLayers  from '../layout/graphLayers'
// import { computeLayers } from "../layout/graphLayers";

export interface DeviceNode {
  id: string;
  status: string;
  links: string[];
}

export default function DiagramAutoLayout() {

  const devices: DeviceNode[] = diagramConfig6.devices
  const layerMap = computeLayers(devices);

  console.log("=== COLUMN GROUPS ===");
  const groups = new Map<number, string[]>();

  layerMap.forEach((col, id) => {
    if (!groups.has(col)) groups.set(col, []);
    groups.get(col)!.push(id);
  });

  Array.from(groups.keys())
    .sort((a, b) => a - b)
    .forEach((col) => {
      console.log(`Column ${col}:`, groups.get(col));
    });

  return (<>
    {/*<div style={{ padding: 20 }}>
      <NetworkGraph />
    </div>
   <div style={{ padding: 20 }}>
      <NetworkGraphv6 />
    </div>
    <div style={{ padding: 20 }}>
      <NetworkGraphv4 />
    </div>
    <div style={{ padding: 20 }}>
      <NetworkGraphv3 />
    </div>  
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
    </div>*/}
  </>);
}
