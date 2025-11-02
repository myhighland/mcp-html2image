# html2image-mcp-server

A standard MCP Server exposing an HTML/URL/DOC → Image tool.

## Install
```bash
pnpm install
```

## Run (stdio)
```bash
pnpm start
```

## Run (HTTP)
```bash
pnpm run start:http
```

## Environment
- `HTML2IMAGE_ENDPOINT`: API endpoint (default: https://api.example.com/html2image)
- `HTML2IMAGE_API_KEY`: API key if needed
- `MCP_MODE`: stdio or http
- `PORT`: port for HTTP mode (default 3000)



/Users/keith/Desktop/n8n/html2image-mcp-server/html2image-mcp-server.js


curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
          "name": "html2image",
          "arguments": { "html": "<h1>Hello HTTP MCP</h1>" }
        }
      }'
