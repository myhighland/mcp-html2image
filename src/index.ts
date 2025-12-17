#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  TextContent,
} from '@modelcontextprotocol/sdk/types.js';
import { captureHtmlToImage, captureUrlToImage } from './html-to-image.js';

const server = new Server(
  {
    name: 'html-to-image-mcp',
    version: '1.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const TOOLS: Tool[] = [
  {
    name: 'capture-html-to-image',
    description: 'Convert HTML string to image',
    inputSchema: {
      type: 'object',
      properties: {
        html: {
          type: 'string',
          description: 'HTML content to convert',
        },
        outputPath: {
          type: 'string',
          description: 'Output file path (optional, defaults to timestamped file)',
        },
        format: {
          type: 'string',
          enum: ['png', 'jpeg', 'webp'],
          description: 'Image format (default: png)',
        },
        width: {
          type: 'number',
          description: 'Viewport width (default: 1200)',
        },
        height: {
          type: 'number',
          description: 'Viewport height (default: 800)',
        },
        quality: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: 'Image quality for JPEG format (default: 90)',
        },
        fullPage: {
          type: 'boolean',
          description: 'Capture full page (default: false)',
        },
        selector: {
          type: 'string',
          description: 'CSS selector to capture specific element',
        },
        omitBackground: {
          type: 'boolean',
          description: 'Omit background for transparent PNG (default: false)',
        },
      },
      required: ['html'],
    },
  },
  {
    name: 'capture-url-to-image',
    description: 'Capture URL to image',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to capture',
        },
        outputPath: {
          type: 'string',
          description: 'Output file path (optional, defaults to timestamped file)',
        },
        format: {
          type: 'string',
          enum: ['png', 'jpeg', 'webp'],
          description: 'Image format (default: png)',
        },
        width: {
          type: 'number',
          description: 'Viewport width (default: 1200)',
        },
        height: {
          type: 'number',
          description: 'Viewport height (default: 800)',
        },
        quality: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: 'Image quality for JPEG format (default: 90)',
        },
        fullPage: {
          type: 'boolean',
          description: 'Capture full page (default: false)',
        },
        selector: {
          type: 'string',
          description: 'CSS selector to capture specific element',
        },
        omitBackground: {
          type: 'boolean',
          description: 'Omit background for transparent PNG (default: false)',
        },
        waitUntil: {
          type: 'string',
          enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
          description: 'When to consider navigation complete (default: networkidle2)',
        },
        timeout: {
          type: 'number',
          description: 'Navigation timeout in milliseconds (default: 30000)',
        },
      },
      required: ['url'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'capture-html-to-image') {
      const {
        html,
        outputPath,
        format = 'png',
        width = 1200,
        height = 800,
        quality = 90,
        fullPage = false,
        selector,
        omitBackground = false,
      } = args as any;

      const output = outputPath || `capture_${Date.now()}.${format}`;
      const imagePath = await captureHtmlToImage({
        html,
        outputPath: output,
        format,
        width,
        height,
        quality,
        fullPage,
        selector,
        omitBackground,
      });

      const result: CallToolResult = {
        content: [
          {
            type: 'text',
            text: `HTML captured successfully to: ${imagePath}`,
          } as TextContent,
        ],
      };
      
      return result;
    }

    if (name === 'capture-url-to-image') {
      const {
        url,
        outputPath,
        format = 'png',
        width = 1200,
        height = 800,
        quality = 90,
        fullPage = false,
        selector,
        omitBackground = false,
        waitUntil = 'networkidle2',
        timeout = 30000,
      } = args as any;

      const output = outputPath || `capture_${Date.now()}.${format}`;
      const imagePath = await captureUrlToImage({
        url,
        outputPath: output,
        format,
        width,
        height,
        quality,
        fullPage,
        selector,
        omitBackground,
        waitUntil,
        timeout,
      });

      const result: CallToolResult = {
        content: [
          {
            type: 'text',
            text: `URL captured successfully to: ${imagePath}`,
          } as TextContent,
        ],
      };
      
      return result;
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const result: CallToolResult = {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        } as TextContent,
      ],
      isError: true,
    };
    
    return result;
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('HTML to Image MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});