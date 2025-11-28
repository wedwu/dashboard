export const diagramConfig2 = {
  devices: [

    {
      id: "message-server-plc-a",
      status: "up",
      links: ["kafka-broker"]
    },
    {
      id: "message-server-plc-b",
      status: "up",
      links: ["kafka-broker"]
    },
    {
      id: "message-server-plc-c",
      status: "up",
      links: ["kafka-broker"]
    },
    {
      id: "message-server-plc-d",
      status: "up",
      links: ["kafka-broker"]
    },
    {
      id: "message-server-plc-e",
      status: "up",
      links: ["kafka-broker"]
    },
    {
      id: "message-server-plc-f",
      status: "up",
      links: ["kafka-broker"]
    },
    // timedoor chain
    {
      id: "message-server-timedoor-a",
      status: "up",
      links: ["message-server-plc-d"]
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
    {
      id: "config-server",
      status: "up",
      links: ["kafka-broker"]
    },
    {
      id: "kafka-broker",
      status: "up",
      links: [
        "message-server-cribl-b",
        "message-server-plc-relay-c"
      ]
    },
    {
      id: "message-server-plc-relay-c",
      status: "up",
      links: [
        "message-client-a",
        "message-client-b",
        "trackmap-client-a",
        "trackmap-client-b"
      ]
    },
    {
      id: "message-client-a",
      status: "up",
      links: []
    },
    {
      id: "message-client-b",
      status: "up",
      links: []
    },
    {
      id: "trackmap-client-a",
      status: "up",
      links: []
    },
    {
      id: "trackmap-client-b",
      status: "up",
      links: []
    },
// 
    {
      id: "config-server-aa",
      status: "up",
      links: ["kafka-broker-aa"]
    },
    {
      id: "kafka-broker-aa",
      status: "up",
      links: [
        "message-server-cribl-aa"
      ]
    },
    {
      id: "message-server-cribl-aa",
      status: "down",
      links: ["message-server-dgn-aa"]
    },
    {
      id: "message-server-dgn-aa",
      status: "down",
      links: []
    },
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
      id: "message-server-plc-aa",
      status: "up",
      links: ["kafka-broker-aa"]
    },
    {
      id: "message-server-timedoor-aa",
      status: "up",
      links: ["message-server-plc-aa"]
    },
  ]
};
