import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
let browser = null;
async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-extensions',
                '--disable-plugins',
                '--disable-default-apps',
                '--disable-translate',
                '--disable-sync',
                '--metrics-recording-only',
                '--no-default-browser-check',
                '--no-first-run',
                '--no-experiments',
                '--no-pings',
                '--no-report-upload',
                '--safebrowsing-disable-auto-update',
            ],
        });
    }
    return browser;
}
export async function captureHtmlToImage(options) {
    const browser = await getBrowser();
    const context = await browser.createBrowserContext({});
    const page = await context.newPage();
    try {
        // Set viewport with device pixel ratio for better quality
        await page.setViewport({
            width: options.width,
            height: options.height,
            deviceScaleFactor: 2, // Higher DPI for better quality
        });
        // Set background color for transparent PNGs if needed
        if (options.omitBackground && options.format === 'png') {
            await page.addStyleTag({
                content: 'html, body { background: transparent !important; }'
            });
        }
        // Set content with enhanced waiting
        await page.setContent(options.html || '', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });
        // Wait for additional resources to load using proper waitUntil
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for initial render
        // Wait for fonts to be loaded
        await page.evaluate(async () => {
            try {
                await document.fonts.ready;
            }
            catch (e) {
                // Ignore font loading errors
            }
        });
        // Wait for images to load with improved detection
        await page.evaluate(() => {
            return new Promise((resolve) => {
                const images = Array.from(document.querySelectorAll('img'));
                if (images.length === 0) {
                    resolve(true);
                    return;
                }
                let loadedCount = 0;
                const checkImage = (img) => {
                    if (img.complete && img.naturalHeight !== 0) {
                        loadedCount++;
                        if (loadedCount === images.length) {
                            resolve(true);
                        }
                    }
                };
                images.forEach(img => {
                    if (img.complete && img.naturalHeight !== 0) {
                        loadedCount++;
                    }
                    else {
                        img.addEventListener('load', () => checkImage(img), { once: true });
                        img.addEventListener('error', () => {
                            loadedCount++; // Count error as "loaded"
                            if (loadedCount === images.length) {
                                resolve(true);
                            }
                        }, { once: true });
                    }
                });
                // Resolve after max 5 seconds even if images don't load
                setTimeout(resolve, 5000);
            });
        }).catch(() => {
            // Continue if image loading check fails
        });
        return await captureToImage(page, options);
    }
    finally {
        await context.close();
    }
}
export async function captureUrlToImage(options) {
    if (!options.url) {
        throw new Error('URL is required for captureUrlToImage');
    }
    const browser = await getBrowser();
    const context = await browser.createBrowserContext({});
    const page = await context.newPage();
    try {
        await page.setViewport({
            width: options.width,
            height: options.height,
            deviceScaleFactor: 1,
        });
        // Handle authentication for basic auth if needed
        const targetUrl = options.url;
        const parsedUrl = new URL(targetUrl);
        let finalUrl = targetUrl;
        if (parsedUrl.username && parsedUrl.password) {
            await page.authenticate({
                username: decodeURIComponent(parsedUrl.username),
                password: decodeURIComponent(parsedUrl.password),
            });
            // Remove credentials from URL
            finalUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
        }
        // Navigate with enhanced waiting
        await page.goto(finalUrl, {
            waitUntil: 'domcontentloaded',
            timeout: options.timeout || 30000,
        });
        // Wait for additional resources to load using proper waitUntil
        await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }),
            new Promise(resolve => setTimeout(resolve, 2000)) // Fallback timeout
        ]).catch(() => {
            // Continue if waiting fails
        });
        // Wait for fonts to be loaded
        await page.evaluate(async () => {
            try {
                await document.fonts.ready;
            }
            catch (e) {
                // Ignore font loading errors
            }
        });
        // Wait for images to load with improved detection
        await page.evaluate(() => {
            return new Promise((resolve) => {
                const images = Array.from(document.querySelectorAll('img'));
                if (images.length === 0) {
                    resolve(true);
                    return;
                }
                let loadedCount = 0;
                const checkImage = (img) => {
                    if (img.complete && img.naturalHeight !== 0) {
                        loadedCount++;
                        if (loadedCount === images.length) {
                            resolve(true);
                        }
                    }
                };
                images.forEach(img => {
                    if (img.complete && img.naturalHeight !== 0) {
                        loadedCount++;
                    }
                    else {
                        img.addEventListener('load', () => checkImage(img), { once: true });
                        img.addEventListener('error', () => {
                            loadedCount++; // Count error as "loaded"
                            if (loadedCount === images.length) {
                                resolve(true);
                            }
                        }, { once: true });
                    }
                });
                // Resolve after max 5 seconds even if images don't load
                setTimeout(resolve, 5000);
            });
        }).catch(() => {
            // Continue if image loading check fails
        });
        return await captureToImage(page, options);
    }
    finally {
        await context.close();
    }
}
async function captureToImage(page, options) {
    let screenshot;
    const screenshotOptions = {
        type: options.format,
        fullPage: options.fullPage,
        omitBackground: options.omitBackground,
    };
    if (options.format === 'jpeg' || options.format === 'webp') {
        screenshotOptions.quality = options.quality;
    }
    // Enhanced animations and transitions handling
    await page.addStyleTag({
        content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        animation-iteration-count: 1 !important;
        transition-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
      
      /* Force layout completion */
      body {
        position: relative;
      }
      
      /* Hide scrollbars during capture */
      body::-webkit-scrollbar {
        display: none;
      }
      body {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
    `,
    });
    // Force layout recalculation
    await page.evaluate(() => {
        document.body.offsetHeight; // Force reflow
    });
    if (options.selector) {
        const element = await page.waitForSelector(options.selector, { timeout: 5000 });
        if (!element) {
            throw new Error(`Element not found: ${options.selector}`);
        }
        // Get element's bounding box with improved calculation
        const boundingBox = await element.evaluate((el) => {
            const rect = el.getBoundingClientRect();
            return {
                x: Math.floor(rect.left),
                y: Math.floor(rect.top),
                width: Math.ceil(rect.width),
                height: Math.ceil(rect.height),
            };
        });
        if (!boundingBox || boundingBox.width === 0 || boundingBox.height === 0) {
            throw new Error(`Element has no visible dimensions: ${options.selector}`);
        }
        // Scroll element into view if needed
        await page.evaluate((selector) => {
            const el = document.querySelector(selector);
            if (el) {
                el.scrollIntoView({
                    block: 'center',
                    inline: 'center',
                    behavior: 'instant'
                });
            }
        }, options.selector);
        // Wait a bit for scroll to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        const elementScreenshot = await element.screenshot({
            type: options.format,
            quality: options.format === 'jpeg' || options.format === 'webp' ? options.quality : undefined,
            omitBackground: options.omitBackground,
        });
        screenshot = Buffer.from(elementScreenshot);
    }
    else {
        const pageScreenshot = await page.screenshot(screenshotOptions);
        screenshot = Buffer.from(pageScreenshot);
    }
    const outputPath = path.resolve(options.outputPath);
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, screenshot);
    return outputPath;
}
export async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
    }
}
process.on('SIGINT', closeBrowser);
process.on('SIGTERM', closeBrowser);
//# sourceMappingURL=html-to-image.js.map