import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema,ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import bodyParser from 'body-parser';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HTMLToImageHttpServer {
  constructor() {
    this.app = express();
    this.app.use(bodyParser.json({ limit: '50mb' }));
    this.app.use('/images', express.static(path.join(__dirname, 'images')));
    
    // 确保图片目录存在
    if (!fs.existsSync(path.join(__dirname, 'images'))) {
      fs.mkdirSync(path.join(__dirname, 'images'), { recursive: true });
    }
    
    // 创建 MCP Server - 新版 SDK 方式
    this.server = new Server(
      {
        name: 'html-to-image-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );
    
    this.browser = null;
    this.setupHandlers();
    this.setupRoutes();
    this.initBrowser();
  }

  async initBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      console.log('✅ Puppeteer browser initialized');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
    }
  }

  setupHandlers() {
    // 新版 SDK 使用不同的方式注册处理器
    // 初始化处理器
    // this.server.setRequestHandler('initialize', async (request) => {
    //   console.log('MCP: Received initialize request');
    //   return {
    //     protocolVersion: request.params.protocolVersion,
    //     capabilities: {
    //       tools: {},
    //       resources: {},
    //       prompts: {},
    //     },
    //     serverInfo: {
    //       name: 'html-to-image-server',
    //       version: '1.0.0',
    //     },
    //   };
    // });

    // 工具列表处理器
    this.server.setRequestHandler(CallToolRequestSchema, async () => {
      console.log('MCP: Received tools/list request');
      return {
        tools: [
          {
            name: 'html_to_image',
            description: 'Convert HTML content or URL to PNG image',
            inputSchema: {
              type: 'object',
              properties: {
                html: {
                  type: 'string',
                  description: 'HTML content to convert to image'
                },
                url: {
                  type: 'string', 
                  description: 'URL to capture as image'
                },
                width: {
                  type: 'number',
                  default: 1200,
                  description: 'Viewport width in pixels'
                },
                height: {
                  type: 'number',
                  default: 800,
                  description: 'Viewport height in pixels'
                },
                returnType: {
                  type: 'string',
                  enum: ['base64', 'file_url'],
                  default: 'base64',
                  description: 'Return type: base64 string or file URL'
                },
                fileName: {
                  type: 'string',
                  description: 'Custom file name for saved image'
                }
              },
              anyOf: [
                { required: ['html'] },
                { required: ['url'] }
              ]
            }
          },
          {
            name: 'base64_to_image_file',
            description: 'Convert base64 string to image file',
            inputSchema: {
              type: 'object',
              properties: {
                base64Data: {
                  type: 'string',
                  description: 'Base64 encoded image data'
                },
                fileName: {
                  type: 'string',
                  description: 'Output file name'
                },
                mimeType: {
                  type: 'string',
                  enum: ['image/png', 'image/jpeg', 'image/gif'],
                  default: 'image/png'
                }
              },
              required: ['base64Data']
            }
          }
        ]
      };
    });

    // 工具调用处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      console.log(`MCP: Received tools/call for tool: ${name}`, args);
      
      try {
        switch (name) {
          case 'html_to_image':
            return await this.handleHTMLToImage(args);
          case 'base64_to_image_file':
            return await this.handleBase64ToImageFile(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error('MCP: Error in tools/call:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });

    // 设置错误处理
    this.server.onerror = (error) => {
      console.error('MCP Server error:', error);
    };

    this.server.onclose = () => {
      console.log('MCP Server connection closed');
    };
  }

  async handleHTMLToImage(args) {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    let page;
    try {
      page = await this.browser.newPage();
      const width = args.width || 1200;
      const height = args.height || 800;
      
      await page.setViewport({ width, height });

      if (args.html) {
        await page.setContent(args.html, {
          waitUntil: ['domcontentloaded', 'networkidle0']
        });
      } else if (args.url) {
        await page.goto(args.url, {
          waitUntil: ['domcontentloaded', 'networkidle0'],
          timeout: 30000
        });
      } else {
        throw new Error('Either html or url must be provided');
      }

      await page.waitForSelector('body', {
        timeout: 10000
      });

      // 修改截图选项，直接使用 base64 编码
      const base64Image = await page.screenshot({
        type: 'png',
        fullPage: false,
        encoding: 'base64'  // 直接获取 base64 格式
      });
      
      if (args.returnType === 'file_url') {
        const fileName = args.fileName || `image_${Date.now()}`;
        const filePath = await this.saveBase64ToFile(base64Image, fileName, 'image/png');
        const fileUrl = `/images/${path.basename(filePath)}`;
        
        return {
          content: [
            {
              type: 'text',
              text: `Image saved successfully: ${fileUrl}`
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: 'image',
              data: base64Image,  // 直接使用 base64 编码的图片数据
              mimeType: 'image/png'
            },
            {
              type: 'text',
              text: `Image generated successfully. Size: ${width}x${height}`
            }
          ]
        };
      }
    } catch (error) {
      console.error('Screenshot error:', error);
      throw new Error(`Failed to convert HTML to image: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async handleBase64ToImageFile(args) {
    const { base64Data, fileName, mimeType = 'image/png' } = args;
    
    if (!base64Data) {
      throw new Error('base64Data is required');
    }

    try {
      let cleanBase64 = base64Data;
      if (base64Data.includes('base64,')) {
        cleanBase64 = base64Data.split('base64,')[1];
      }

      const outputFileName = fileName || `converted_${Date.now()}`;
      const filePath = await this.saveBase64ToFile(cleanBase64, outputFileName, mimeType);

      return {
        content: [
          {
            type: 'text',
            text: `Base64 data converted to image file: /images/${path.basename(filePath)}`
          }
        ]
      };
    } catch (error) {
      throw new Error(`Failed to convert base64 to image file: ${error.message}`);
    }
  }

  async saveBase64ToFile(base64Data, fileName, mimeType) {
    const extension = this.getExtensionFromMimeType(mimeType);
    const fullFileName = `${fileName}${extension}`;
    const filePath = path.join(__dirname, 'images', fullFileName);
    
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    
    return filePath;
  }

  getExtensionFromMimeType(mimeType) {
    const extensions = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/gif': '.gif'
    };
    return extensions[mimeType] || '.png';
  }

  setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        browser: this.browser ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      });
    });

    // 直接转换 API
    this.app.post('/convert', async (req, res) => {
      try {
        const { html, url, width = 1200, height = 800 } = req.body;
        
        if (!html && !url) {
          return res.status(400).json({ error: 'Either html or url must be provided' });
        }

        const result = await this.handleHTMLToImage({ html, url, width, height });
        
        if (result.isError) {
          return res.status(500).json({ error: result.content[0].text });
        }

        const imageContent = result.content.find(c => c.type === 'image');
        if (imageContent) {
          const fileName = `converted_${Date.now()}`;
          const filePath = await this.saveBase64ToFile(imageContent.data, fileName, 'image/png');
          
          // 从保存的文件中读取数据
          const fileBuffer = fs.readFileSync(filePath);
          res.set({
            'Content-Type': 'image/png',
            'Content-Length': fileBuffer.length,
            'X-File-Path': `/images/${path.basename(filePath)}`
          });
    
          res.send(fileBuffer);
        } else {
          res.json(result);
        }
      } catch (error) {
        console.error('Convert error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // 根路径
    this.app.get('/', (req, res) => {
      res.json({
        name: 'HTML to Image MCP Server',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          convert: '/convert (POST)'
        }
      });
    });
  }

  // 启动 STDIO 模式（用于 MCP 客户端）
  async startStdio() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.log('✅ HTML to Image MCP Server running in STDIO mode...');
    } catch (error) {
      console.error('❌ Failed to start MCP Server:', error);
      process.exit(1);
    }
  }

  // 启动 HTTP 模式
  startHttp(port = 3000) {
    return new Promise((resolve) => {
      this.serverInstance = this.app.listen(port, () => {
        console.log(`✅ HTTP Server running on http://localhost:${port}`);
        console.log(`❤️ Health check: http://localhost:${port}/health`);
        console.log(`🖼️ Convert API: http://localhost:${port}/convert`);
        resolve();
      });
    });
  }

  async stop() {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.serverInstance) {
      this.serverInstance.close();
    }
  }
}

// 主函数
async function main() {
  const server = new HTMLToImageHttpServer();
  
  // 根据参数决定运行模式
  const mode = process.argv[2];
  
  if (mode === '--http') {
    await server.startHttp(process.env.PORT || 3000);
  } else {
    // 默认 STDIO 模式
    await server.startStdio();
  }
  
  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down server...');
    await server.stop();
    process.exit(0);
  });
}

// 启动服务器
main().catch(console.error);