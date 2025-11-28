export const diagramConfig = {
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


    {
      id: "kafka-broker-a",
      status: "up",
      links: [
        "message-server-plc-relay-a",
        "message-server-cribl-b",
        "message-server-cribl-c"
      ]
    },
    {
      id: "message-server-cribl-aa",
      status: "down",
      links: ["kafka-broker-a"]
    },
    {
      id: "message-server-dgn-aa",
      status: "down",
      links: []
    },


  ]
};
