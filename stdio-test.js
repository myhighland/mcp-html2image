import { spawn } from "child_process";

const server = spawn("node", ["html2image-mcp-server.js", "stdio"], {
  stdio: ["pipe", "pipe", "pipe"]
});

server.stdout.on("data", (data) => {
  console.log("Server stdout:", data.toString());
});

server.stderr.on("data", (data) => {
  console.error("Server stderr:", data.toString());
});

// 发送 JSON-RPC 请求
const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "html2image",
    arguments: { html: "<h1>Hello MCP</h1>" }
  }
};

server.stdin.write(JSON.stringify(request) + "\n");
