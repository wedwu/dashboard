export const diagramConfig1 = {
  rootId: "kafka-broker",
  devices: [
    {
      id: "config-server",
      status: "up",
      links: ["kafka-broker"]
    },
    {
      id: "kafka-broker",
      status: "up",
      links: [
        "message-server-plc-relay-a",
        "message-server-cribl-b",
        "message-server-cribl-c"
      ]
    },

    // PLC upstream of kafka
    { id: "message-server-plc-c", status: "down", links: ["kafka-broker"] },
    { id: "message-server-plc-d", status: "down", links: ["kafka-broker"] },
    { id: "message-server-plc-e", status: "down", links: ["kafka-broker"] },
    { id: "message-server-plc-f", status: "down", links: ["kafka-broker"] },
    { id: "message-server-plc-g", status: "down", links: ["kafka-broker"] },
    { id: "message-server-plc-h", status: "down", links: ["kafka-broker"] },

    // timedoor chain
    {
      id: "message-server-timedoor-a",
      status: "up",
      links: ["message-server-plc-f"]
    },
    {
      id: "message-server-plc-redis-a",
      status: "down",
      links: ["message-server-timedoor-a"]
    },
    {
      id: "message-server-plc-redis-b",
      status: "down",
      links: ["message-server-timedoor-a"]
    },

    // OUTPUT SIDE (must point OUT of kafka)
    {
      id: "message-server-cribl-b",
      status: "down",
      links: ["message-server-dgn-a"]
    },
    {
      id: "message-server-dgn-a",
      status: "down",
      links: []
    },
    {
      id: "message-server-plc-relay-a",
      status: "down",
      links: [
        "message-client-a",
        "message-client-b",
        "trackmap-client-a",
        "trackmap-client-b",
        "message-client-c"
      ]
    },

    // clients receive from relay
    { id: "message-client-c", status: "down", links: [] },
    { id: "message-client-a", status: "up", links: [] },
    { id: "message-client-b", status: "down", links: [] },
    { id: "trackmap-client-a", status: "up", links: [] },
    { id: "trackmap-client-b", status: "down", links: [] },


    {
      id: "message-server-cribl-c",
      status: "up",
      links: ["message-server-dgn-b"]
    },
    {
      id: "message-server-dgn-b",
      status: "up",
      links: []
    },

  ]
};
