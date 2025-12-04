// src/data/diagramConfig6.ts
// import type { DiagramConfig } from "../types/types";

export const diagramConfig6 = {
  devices: [
    { id: "plc-1-c", status: "down", links: ["message-server"] },

    { id: "message-server", status: "up", links: ["kafka"] },

    { id: "config-server", status: "up", links: ["kafka", "system-map-client", "config-client"] },

    { id: "kafka", status: "up", links: ["config-server", "message-relay", "cribl"] },

    { id: "message-relay", status: "down", links: ["message-client", "trackmap-client"]},

    { id: "cribl", status: "up", links: ["dgn"] },

    { id: "message-client", status: "up", links: [] },

    { id: "trackmap-client", status: "up", links: [] },

    { id: "system-map-client", status: "up", links: [] },

    { id: "config-client", status: "up", links: [] },

    { id: "dgn", status: "up", links: [] }

  ]
};
