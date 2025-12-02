import { computeSCCs } from "./kosaraju";

const result = computeSCCs(devices);

console.log("SCC Count:", result.sccCount);
console.log("SCCs:", result.sccs);
console.log("nodeToComp:", [...result.nodeToComp.entries()]);