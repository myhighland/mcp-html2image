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





curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<h1>Hello World</h1>",
    "fileName": "test_document"
  }'