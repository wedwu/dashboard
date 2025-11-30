import React, { useRef, useLayoutEffect, useState } from "react";

import { diagramConfig3 as diagramConfig } from "../config/diagramConfig3"

import AutoLayout from "./AutoLayout";

export interface DeviceNode {
  id: string;
  status: string;
  links: string[];
}

export default function DiagramAutoLayout() {

  const devices: DeviceNode[] = diagramConfig.devices

  return (<>hgghg
    <AutoLayout devices={devices} />
  </>);
}
