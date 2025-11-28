export const diagramConfig4 = {
  devices: [
    {
      id: "plc-1-c",
      status: "up",
      links: ["message-server-1"]
    },
    {
      id: "plc-1-m",
      status: "up",
      links: ["message-server-2"]
    },
    {
      id: "message-server-1",
      status: "up",
      links: ["kafka", "influx"]
    },
    {
      id: "message-server-2",
      status: "up",
      links: ["kafka", "influx"]
    },

    {
      id: "plc-2-c",
      status: "up",
      links: ["redis"]
    },
    {
      id: "plc-2-m",
      status: "up",
      links: ["redis"]
    },

    {
      id: "redis",
      status: "up",
      links: ["timedoor"]
    },

    {
      id: "timedoor",
      status: "up",
      links: ["message-server-3"]
    },

    {
      id: "gpc",
      status: "up",
      links: ["kafka"]
    },
    {
      id: "stamp",
      status: "up",
      links: ["kafka"]
    },

    {
      id: "message-server-3",
      status: "up",
      links: ["kafka", "influx"]
    },
    {
      id: "influx",
      status: "up",
      links: []
    },
    {
      id: "config-server",
      status: "up",
      links: ["kafka"]
    },

    {
      id: "kafka",
      status: "up",
      links: ["config-server", "message-relay", "cribl"]
    },

    {
      id: "message-relay",
      status: "up",
      links: [
        "message-client-1",
        "message-client-2",
        "trackmap-client-1",
        "trackmap-client-2",
        "system-map-client-1"
      ]
    },

    {
      id: "cribl",
      status: "up",
      links: ["dgn"]
    },

    {
      id: "message-client-1",
      status: "up",
      links: []
    },
    {
      id: "message-client-2",
      status: "up",
      links: []
    },
    {
      id: "trackmap-client-1",
      status: "up",
      links: []
    },
    {
      id: "trackmap-client-2",
      status: "up",
      links: []
    },

    {
      id: "system-map-client-1",
      status: "up",
      links: []
    },
    {
      id: "dgn",
      status: "up",
      links: []
    },
  ]
};
