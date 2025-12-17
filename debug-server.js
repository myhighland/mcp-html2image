#!/usr/bin/env node

// 调试脚本，用于测试 MCP 服务器连接
console.error('=== MCP Server Debug Mode ===');
console.error('Node.js version:', process.version);
console.error('Working directory:', process.cwd());
console.error('Script path:', __filename);

// 模拟 MCP 协议通信
process.stdin.on('data', (data) => {
  console.error('Received data:', data.toString());
  
  try {
    const request = JSON.parse(data.toString());
    console.error('Parsed request:', request);
    
    if (request.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'capture-html-to-image',
              description: 'Convert HTML string to image',
              inputSchema: {
                type: 'object',
                properties: {
                  html: { type: 'string', description: 'HTML content to convert' },
                  outputPath: { type: 'string', description: 'Output file path' },
                  format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                  width: { type: 'number' },
                  height: { type: 'number' },
                  quality: { type: 'number', minimum: 1, maximum: 100 },
                  fullPage: { type: 'boolean' },
                  selector: { type: 'string' },
                  omitBackground: { type: 'boolean' }
                },
                required: ['html']
              }
            },
            {
              name: 'capture-url-to-image',
              description: 'Capture URL to image',
              inputSchema: {
                type: 'object',
                properties: {
                  url: { type: 'string', description: 'URL to capture' },
                  outputPath: { type: 'string', description: 'Output file path' },
                  format: { type: 'string', enum: ['png', 'jpeg', 'webp'] },
                  width: { type: 'number' },
                  height: { type: 'number' },
                  quality: { type: 'number', minimum: 1, maximum: 100 },
                  fullPage: { type: 'boolean' },
                  selector: { type: 'string' },
                  omitBackground: { type: 'boolean' },
                  waitUntil: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'] },
                  timeout: { type: 'number' }
                },
                required: ['url']
              }
            }
          ]
        }
      };
      
      console.log(JSON.stringify(response));
      console.error('Sent tools/list response');
    } else {
      // 处理其他请求
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: { message: 'Request processed' }
      };
      console.log(JSON.stringify(response));
    }
  } catch (error) {
    console.error('Error processing request:', error);
    const errorResponse = {
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    };
    console.log(JSON.stringify(errorResponse));
  }
});

process.stdin.on('end', () => {
  console.error('Client disconnected');
});

// 发送就绪信号
console.error('MCP Server ready to accept connections');