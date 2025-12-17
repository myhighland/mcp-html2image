export interface CaptureOptions {
    html?: string;
    url?: string;
    outputPath: string;
    format: 'png' | 'jpeg' | 'webp';
    width: number;
    height: number;
    quality: number;
    fullPage: boolean;
    selector?: string;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    timeout?: number;
    omitBackground?: boolean;
}
export declare function captureHtmlToImage(options: Omit<CaptureOptions, 'url' | 'waitUntil' | 'timeout'>): Promise<string>;
export declare function captureUrlToImage(options: Omit<CaptureOptions, 'html'>): Promise<string>;
export declare function closeBrowser(): Promise<void>;
//# sourceMappingURL=html-to-image.d.ts.map