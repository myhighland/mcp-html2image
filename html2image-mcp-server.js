#!/usr/bin/env node
import http from "http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import Html2ImageMCPClient from "./html2image-mcp-client.js";
import { EventEmitter } from "events";
import fs from "fs";

const html2img = new Html2ImageMCPClient();
const sseEmitter = new EventEmitter();

// 输入 schema
const html2imageSchema = z.object({
  html: z.string().optional(),
  url: z.string().optional(),
  filePath: z.string().optional(),
  format: z.enum(["png", "jpeg", "webp"]).default("png"),
  width: z.number().optional(),
  height: z.number().optional(),
  waitFor: z.union([z.string(), z.number()]).optional(),
});

// ---------------- MCP Server ----------------
const server = new Server(
  { name: "html2image-mcp-server", version: "2.6.0" },
  { capabilities: { tools: {} } }
);

// 保存 handler 引用，方便 HTTP 调用
const listToolsHandler = async () => ({
  tools: [
    { name: "html2image", description: "Convert HTML/URL/.doc/.docx to image", inputSchema: html2imageSchema }
  ]
});

const callToolHandler = async ({ name, arguments: args }) => {
  if (name !== "html2image") throw new Error(`Unknown tool: ${name}`);
  const parsed = html2imageSchema.parse(args);

  // SSE 事件通知开始
  sseEmitter.emit("progress", { step: "start", tool: name });

  const result = await html2img.render(parsed);

  // SSE 事件通知完成
  sseEmitter.emit("progress", { step: "done", tool: name });

  return { content_type: `image/${parsed.format || "png"}`, data: result.toString("base64") };
};

// 注册 MCP handler
server.setRequestHandler(ListToolsRequestSchema, listToolsHandler);
server.setRequestHandler(CallToolRequestSchema, callToolHandler);

// 启动 stdioTransport
const transport = new StdioServerTransport();
await server.connect(transport);
console.log("✅ MCP Server running in stdio mode");

// ---------------- HTTP + SSE ----------------
const port = process.env.PORT || 3000;

const httpServer = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/rpc") {
    // HTTP JSON-RPC
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      try {
        const rpc = JSON.parse(body);
        let result;

        if (rpc.method === "tools/list") {
          result = await listToolsHandler();  // 直接调用 handler
        } else if (rpc.method === "tools/call") {
          result = await callToolHandler(rpc.params); // { name, arguments }
            // Html2ImageMCPClient.saveBase64ToFile(result, "output.png");
          fs.writeFileSync(`output_image.${rpc.params.arguments.format || "png"}`, Buffer.from(result.data, 'base64'));
        } else {
          throw new Error(`Unknown RPC method: ${rpc.method}`);
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", id: rpc.id, result }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ jsonrpc: "2.0", id: rpc?.id || null, error: { code: -32000, message: err.message } })
        );
      }
    });
  } else if (req.url === "/sse") {
    // SSE 接口
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });
    res.write("\n");

    const onProgress = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    sseEmitter.on("progress", onProgress);

    req.on("close", () => sseEmitter.off("progress", onProgress));
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

httpServer.listen(port, () => {
  console.log(`🌐 HTTP MCP Server running on port ${port}`);
  console.log(`🔗 SSE endpoint: http://localhost:${port}/sse`);
});
