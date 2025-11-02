import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

export default class Html2ImageMCPClient {
  constructor() {}

  /**
   * 渲染 HTML / URL / 文件到图片，并返回标准 Base64
   * @param {Object} options
   * @param {string} [options.html] HTML 字符串
   * @param {string} [options.url] 网页 URL
   * @param {string} [options.filePath] HTML 文件路径
   * @param {string} [options.format='png'] 输出格式 png/jpeg/webp
   * @param {number} [options.width] 页面宽度
   * @param {number} [options.height] 页面高度
   * @param {number|string} [options.waitFor] 等待时间或选择器
   */
  async render({ html, url, filePath, format = "png", width = 800, height = 600, waitFor }) {
    if (!html && !url && !filePath) {
      throw new Error("必须提供 html、url 或 filePath");
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height });

    // 加载内容
    if (html) {
      await page.setContent(html, { waitUntil: "networkidle0" });
    } else if (filePath) {
      const content = fs.readFileSync(path.resolve(filePath), "utf-8");
      await page.setContent(content, { waitUntil: "networkidle0" });
    } else if (url) {
      await page.goto(url, { waitUntil: "networkidle0" });
    }

    // 等待条件
    if (waitFor) {
      if (typeof waitFor === "number") {
        await page.waitForTimeout(waitFor);
      } else if (typeof waitFor === "string") {
        await page.waitForSelector(waitFor, { timeout: 10000 });
      }
    }

    // 截图生成 Buffer
    const buffer = await page.screenshot({
      type: format,      // png/jpeg/webp
      fullPage: true,
    });

    await browser.close();

    // 返回标准 Base64 字符串
    return buffer.toString("base64");
  }

  /**
   * 将 Base64 写入文件
   */
  static saveBase64ToFile(base64, filePath) {
    const buffer = Buffer.from(base64, "base64");
    fs.writeFileSync(filePath, buffer);
  }
}
