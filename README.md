# HTML 转图片 MCP 服务器

一个基于 Model Context Protocol (MCP) 的服务器，使用最新版本的 Puppeteer v24.33.0 将 HTML 内容或 URL 转换为图片，采用现代最佳实践和增强渲染能力。

## 功能特性

- 将 HTML 字符串转换为图片 (PNG, JPEG, WebP)
- 智能加载检测捕获 URL 截图
- 可自定义视口尺寸，支持高 DPI 渲染 (2x deviceScaleFactor)
- 使用 CSS 选择器精确捕获特定元素
- 全页面或视口捕获选项
- 可调节有损格式的图片质量
- 透明 PNG 支持，可省略背景
- 高级字体和图片加载优化
- 冻结动画和过渡效果，确保捕获一致性
- 基础认证支持
- 浏览器上下文隔离，保护隐私
- 增强的 iframe 处理
- 捕获期间改进滚动条隐藏
- 更好的资源超时管理

## 最新更新

- 升级至 MCP SDK v1.25.1，采用最新 API 和类型安全改进
- 更新至 Puppeteer v24.33.0 (最新稳定版本)
- 优化浏览器启动参数，提升性能
- 改进图片加载检测，采用基于事件的等待机制
- 高级元素捕获，优化 scrollIntoView
- 更好的错误处理，包含后备超时机制
- 增强 CSS 注入，冻结动画效果
- 改进跨域 iframe 处理
- 更好的内存管理，确保适当清理
- 添加高 DPI 渲染支持 (2x 缩放因子)
- 现代化 TypeScript 代码库，严格类型检查

## 安装

```bash
npm install
```

## 构建

```bash
npm run build
```

## 使用方法

### 运行服务器

```bash
npm start
```

### 可用工具

#### `capture-html-to-image`

将 HTML 内容转换为图片，具有增强渲染功能。

参数:
- `html` (必需): 要转换的 HTML 内容
- `outputPath` (可选): 输出文件路径
- `format` (可选): 图片格式 - "png", "jpeg", "webp" (默认: "png")
- `width` (可选): 视口宽度 (默认: 1200)
- `height` (可选): 视口高度 (默认: 800)
- `quality` (可选): JPEG/WebP 的图片质量 (1-100, 默认: 90)
- `fullPage` (可选): 捕获全页面 (默认: false)
- `selector` (可选): CSS 选择器，用于捕获特定元素
- `omitBackground` (可选): 省略背景以获得透明 PNG (默认: false)

#### `capture-url-to-image`

捕获 URL 作为图片，具有智能加载检测功能。

参数:
- `url` (必需): 要捕获的 URL
- `outputPath` (可选): 输出文件路径
- `format` (可选): 图片格式 - "png", "jpeg", "webp" (默认: "png")
- `width` (可选): 视口宽度 (默认: 1200)
- `height` (可选): 视口高度 (默认: 800)
- `quality` (可选): JPEG/WebP 的图片质量 (1-100, 默认: 90)
- `fullPage` (可选): 捕获全页面 (默认: false)
- `selector` (可选): CSS 选择器，用于捕获特定元素
- `omitBackground` (可选): 省略背景以获得透明 PNG (默认: false)
- `waitUntil` (可选): 导航完成条件 - "load", "domcontentloaded", "networkidle0", "networkidle2" (默认: "networkidle2")
- `timeout` (可选): 导航超时时间，毫秒 (默认: 30000)

## Claude Desktop 使用示例

添加到您的 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "html-to-image": {
      "command": "node",
      "args": ["C:/Users/shidingye/Desktop/autohome/mcp/build/index.js"],
      "cwd": "C:/Users/shidingye/Desktop/autohome/project"
    }
  }
}
```

## 开发

```bash
npm run dev
```

## 许可证

MIT