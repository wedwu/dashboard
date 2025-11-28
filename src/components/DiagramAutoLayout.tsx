import React, { useRef, useLayoutEffect, useState } from "react";

import { diagramConfig4 as diagramConfig } from "../config/diagramConfig4"

import AutoLayout from "./AutoLayout";

export interface DeviceNode {
  id: string;
  status: string;
  links: string[];
}

export default function DiagramAutoLayout() {

  const devices: DeviceNode[] = diagramConfig.devices

  return (
    <AutoLayout devices={devices} />
  );
}
