export const diagramConfig5 = {
  devices: [

 // directional to timedoor
  {
    id: "plc-1-c",
    status: "up",
    links: ["timedoor"],
  },
  {
    id: "plc-1-m",
    status: "up",
    links: ["timedoor"],
  },
  {
    id: "plc-2-c",
    status: "up",
    links: ["timedoor"],
  },
  {
    id: "plc-2-m",
    status: "up",
    links: ["timedoor"],
  },

  // directional to message-server-2
  {
    id: "gpc",
    status: "up",
    links: ["message-server-2"],
  },

  // directional to kafka
  {
    id: "stamp",
    status: "up",
    links: ["kafka"],
  },

  // directional to redis / config-server / influx
  {
    id: "timedoor",
    status: "up",
    links: ["redis", "config-server", "influx"],
  },

  // directional to message-server-1
  {
    id: "redis",
    status: "up",
    links: ["message-server-1"],
  },

  // directional to config-server / influx
  // bidirectional to/from kafka
  {
    id: "message-server-1",
    status: "up",
    links: ["kafka", "config-server", "influx"],
  },
  {
    id: "message-server-2",
    status: "up",
    links: ["kafka", "config-server", "influx"],
  },

  // bidirectional to/from message-server-3
  {
    id: "message-server-3",
    status: "up",
    links: ["trackmap-client-2"],
  },

  // directional to cribl 
  {
    id: "influx",
    status: "up",
    links: ["cribl"],
  },

  // bidirectional to/from message-server-1 / message-server-2 / config-server / cribl / message-relay
  {
    id: "kafka",
    status: "up",
    links: ["message-server-1", "message-server-2", "config-server", "cribl", "message-relay"],
  },

  // directional from timedoor / message-server-1 / message-server-2 / message-server-3
  // bidirectional to/from kafka / system-map-client-1
  {
    id: "config-server",
    status: "up",
    links: ["kafka", "system-map-client-1", "message-server-1", "message-server-2", "message-server-3", "timedoor", "cribl"],
  },

  // bidirectional to/from kafka / message-client-1 / message-client-2 / trackmap-client-1
  {
    id: "message-relay",
    status: "up",
    links: ["kafka", "message-client-1", "message-client-2", "trackmap-client-1"],
  },

  // bidirectional to/from kafka / influx
  {
    id: "dgn",
    status: "up",
    links: ["cribl"],
  },

  // directional from kafka / influx
  // bidirectional to/from cribl
  {
    id: "cribl",
    status: "up",
    links: ["dgn"],
  },

  // bidirectional to/from message-relay
  {
    id: "message-client-1",
    status: "up",
    links: ["message-relay"],
  },
  {
    id: "message-client-2",
    status: "up",
    links: ["message-relay"],
  },
  {
    id: "trackmap-client-1",
    status: "up",
    links: ["message-relay"],
  },

  // bidirectional to/from message-server-3
  {
    id: "trackmap-client-2",
    status: "up",
    links: ["message-server-3"],
  },

  // bidirectional to/from config-server
  {
    id: "system-map-client-1",
    status: "up",
    links: ["config-server"],
  },

  ]
};
