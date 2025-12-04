// src/data/diagramConfig6.ts
// import type { DiagramConfig } from "../types/types";

export const diagramConfig6 = {
  devices: [
    { id: "plc-1-c", status: "down", links: ["timedoor"] },
    { id: "plc-1-m", status: "down", links: ["timedoor"] },
    { id: "plc-2-c", status: "up", links: ["timedoor"] },
    { id: "plc-2-m", status: "down", links: ["timedoor"] },
    { id: "gpc", status: "up", links: ["message-server-2"] },
    { id: "stamp", status: "up", links: ["kafka"] },
    { id: "timedoor", status: "up", links: ["redis", "config-server", "influx"] },
    { id: "redis", status: "up", links: ["message-server-1"] },
    { id: "message-server-1", status: "up", links: ["kafka", "config-server", "influx"] },
    { id: "message-server-2", status: "up", links: ["kafka", "config-server", "influx"] },
    { id: "message-server-3", status: "up", links: ["trackmap-client-2"] },
    { id: "influx", status: "down", links: ["cribl"] },
    {
      id: "kafka",
      status: "up",
      links: [
        "message-server-1",
        "message-server-2",
        "config-server",
        "cribl",
        "message-relay",
      ],
    },
    {
      id: "config-server",
      status: "up",
      links: [
        "kafka",
        "system-map-client-1",
        "message-server-1",
        "message-server-2",
        "message-server-3",
        "timedoor",
        "cribl",
      ],
    },
    {
      id: "message-relay",
      status: "down",
      links: ["kafka", "message-client-1", "message-client-2", "trackmap-client-1", "trackmap-client-2"],
    },
    { id: "dgn", status: "up", links: ["cribl"] },
    { id: "cribl", status: "up", links: ["dgn"] },
    { id: "message-client-1", status: "up", links: ["message-relay"] },
    { id: "message-client-2", status: "down", links: ["message-relay"] },
    { id: "trackmap-client-1", status: "up", links: ["message-relay"] },
    { id: "trackmap-client-2", status: "up", links: ["message-relay"] },
    // { id: "system-map-client-1", status: "up", links: ["config-server"] },
  ],
};
