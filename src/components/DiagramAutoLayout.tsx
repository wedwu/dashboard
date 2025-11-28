import React, { useRef, useLayoutEffect, useState } from "react";

import { diagramConfig3 as diagramConfig } from "../config/diagramConfig3"

import AutoLayout from "./AutoLayout";

export default function DiagramAutoLayout() {
  return (
    <AutoLayout devices={diagramConfig.devices} />
  );
}
