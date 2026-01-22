import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';

interface ScrapedPrice {
    price: number | null;
    available: boolean;
    productName?: string;
    confidence?: number; // 0-1 score indicating relevance/accuracy
}

interface RetryConfig {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}

interface PlatformConfig {
    timeout: number;
    retries: RetryConfig;
    selectors: string[];
}

// Custom error types
class ScrapingError extends Error {
    constructor(message: string, public platform: string, public itemName: string) {
        super(message);
        this.name = 'ScrapingError';
    }
}

class TimeoutError extends ScrapingError {
    constructor(platform: string, itemName: string) {
        super(`Timeout while scraping ${platform}`, platform, itemName);
        this.name = 'TimeoutError';
    }
}

// Request pool to manage concurrent browser instances
class RequestPool {
    private queue: Array<() => Promise<void>> = [];
    private activeCount = 0;
    private readonly maxConcurrent: number;

    constructor(maxConcurrent: number = 3) {
        this.maxConcurrent = maxConcurrent;
    }

    async add<T>(fn: () => Promise<T>): Promise<T> {
        while (this.activeCount >= this.maxConcurrent) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.activeCount++;
        try {
            return await fn();
        } finally {
            this.activeCount--;
        }
    }

    getActiveCount(): number {
        return this.activeCount;
    }
}

export class WebScraperService {
    private browser: Browser | null = null;
    private requestPool: RequestPool;
    private readonly userAgents: string[];
    private readonly platformConfigs: Record<string, PlatformConfig>;

    constructor() {
        this.requestPool = new RequestPool(3); // Max 3 concurrent scrapes

        // Rotating user agents to avoid detection
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
        ];

        // Platform-specific configurations
        this.platformConfigs = {
            amazon: {
                timeout: 15000,
                retries: { maxRetries: 3, initialDelay: 1000, maxDelay: 5000, backoffMultiplier: 2 },
                selectors: ['.a-price-whole', '.a-offscreen', '.apexPriceToPay']
            },
            flipkart: {
                timeout: 12000,
                retries: { maxRetries: 3, initialDelay: 1000, maxDelay: 5000, backoffMultiplier: 2 },
                selectors: ['._30jeq3', '._1_WHN1', '._3I9_wc']
            },
            bigbasket: {
                timeout: 12000,
                retries: { maxRetries: 2, initialDelay: 1000, maxDelay: 4000, backoffMultiplier: 2 },
                selectors: ['.discnt-price', '.price', '.selling-price']
            },
            jiomart: {
                timeout: 12000,
                retries: { maxRetries: 2, initialDelay: 1000, maxDelay: 4000, backoffMultiplier: 2 },
                selectors: ['.jm-heading-xxs', '.sp', '.price']
            },
            blinkit: {
                timeout: 10000,
                retries: { maxRetries: 2, initialDelay: 1000, maxDelay: 4000, backoffMultiplier: 2 },
                selectors: ['.Product__UpdatedPrice', '.css-1b0ac2c', '.PriceAndAtc__PriceText']
            }
        };
    }

    /**
     * Initialize Puppeteer browser
     */
    private async getBrowser(): Promise<Browser> {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080'
                ]
            });
        }
        return this.browser;
    }

    /**
     * Get a random user agent
     */
    private getRandomUserAgent(): string {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    /**
     * Retry with exponential backoff
     */
    private async retryWithBackoff<T>(
        fn: () => Promise<T>,
        config: RetryConfig,
        context: string
    ): Promise<T> {
        let lastError: Error | null = null;
        let delay = config.initialDelay;

        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    console.log(`🔄 [RETRY ${attempt}/${config.maxRetries}] ${context} - waiting ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                return await fn();
            } catch (error) {
                lastError = error as Error;
                if (attempt < config.maxRetries) {
                    delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
                }
            }
        }

        throw lastError || new Error(`Failed after ${config.maxRetries} retries: ${context}`);
    }

    /**
     * Close browser when done
     */
    async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    /**
     * Extract price with multiple selector fallbacks
     */
    private extractPriceFromHtml(html: string, selectors: string[]): number | null {
        const $ = cheerio.load(html);

        for (const selector of selectors) {
            try {
                const priceText = $(selector).first().text();
                if (priceText) {
                    // Handle both "₹100" and "100.00" formats
                    const cleanPrice = priceText.replace(/[^0-9.]/g, '');
                    const price = parseFloat(cleanPrice);
                    if (price && !isNaN(price) && price > 0) {
                        return price;
                    }
                }
            } catch (error) {
                // Continue to next selector
                continue;
            }
        }

        return null;
    }

    /**
     * Calculate relevance score based on item name matching
     */
    private calculateRelevance(itemName: string, foundName: string): number {
        if (!foundName) return 0.5;

        const itemWords = itemName.toLowerCase().split(/\s+/);
        const foundWords = foundName.toLowerCase().split(/\s+/);

        let matches = 0;
        for (const word of itemWords) {
            if (word.length > 2 && foundWords.some(fw => fw.includes(word) || word.includes(fw))) {
                matches++;
            }
        }

        return Math.min(matches / itemWords.length, 1.0);
    }

    /**
     * Scrape price from Amazon India
     */
    private async scrapeAmazon(itemName: string): Promise<ScrapedPrice> {
        const config = this.platformConfigs.amazon;

        return this.requestPool.add(async () => {
            return this.retryWithBackoff(async () => {
                const browser = await this.getBrowser();
                const page = await browser.newPage();

                try {
                    // Anti-detection measures
                    await page.setUserAgent(this.getRandomUserAgent());
                    await page.setViewport({ width: 1920, height: 1080 });
                    await page.evaluateOnNewDocument(() => {
                        Object.defineProperty(navigator, 'webdriver', { get: () => false });
                    });

                    const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(itemName)}`;
                    await page.goto(searchUrl, {
                        waitUntil: 'networkidle2',
                        timeout: config.timeout
                    });

                    // Random delay to mimic human behavior
                    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

                    const html = await page.content();
                    await page.close();

                    const $ = cheerio.load(html);

                    // Try multiple price selectors
                    let price: number | null = null;

                    // Method 1: Standard price structure
                    const priceWhole = $('.a-price-whole').first().text().replace(/[^0-9]/g, '');
                    const priceFraction = $('.a-price-fraction').first().text();
                    if (priceWhole) {
                        price = parseFloat(`${priceWhole}.${priceFraction || '00'}`);
                    }

                    // Method 2: Fallback selectors
                    if (!price || isNaN(price)) {
                        price = this.extractPriceFromHtml(html, config.selectors);
                    }

                    // Extract product name for relevance
                    const productName = $('h2.a-size-mini').first().text().trim() ||
                        $('.a-size-base-plus').first().text().trim();

                    if (price && !isNaN(price) && price > 0) {
                        const confidence = this.calculateRelevance(itemName, productName);
                        return { price, available: true, productName, confidence };
                    }

                    return { price: null, available: false };
                } catch (error) {
                    await page.close();
                    if (error instanceof Error && error.message.includes('timeout')) {
                        throw new TimeoutError('Amazon', itemName);
                    }
                    throw error;
                }
            }, config.retries, `Amazon: ${itemName}`);
        });
    }

    /**
     * Scrape price from Flipkart
     */
    private async scrapeFlipkart(itemName: string): Promise<ScrapedPrice> {
        const config = this.platformConfigs.flipkart;

        return this.requestPool.add(async () => {
            return this.retryWithBackoff(async () => {
                const browser = await this.getBrowser();
                const page = await browser.newPage();

                try {
                    await page.setUserAgent(this.getRandomUserAgent());
                    await page.setViewport({ width: 1920, height: 1080 });

                    const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(itemName)}`;
                    await page.goto(searchUrl, {
                        waitUntil: 'networkidle2',
                        timeout: config.timeout
                    });

                    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

                    const html = await page.content();
                    await page.close();

                    const price = this.extractPriceFromHtml(html, config.selectors);
                    const $ = cheerio.load(html);
                    const productName = $('._4rR01T').first().text().trim() ||
                        $('.s1Q9rs').first().text().trim();

                    if (price && !isNaN(price) && price > 0) {
                        const confidence = this.calculateRelevance(itemName, productName);
                        return { price, available: true, productName, confidence };
                    }

                    return { price: null, available: false };
                } catch (error) {
                    await page.close();
                    if (error instanceof Error && error.message.includes('timeout')) {
                        throw new TimeoutError('Flipkart', itemName);
                    }
                    throw error;
                }
            }, config.retries, `Flipkart: ${itemName}`);
        });
    }

    /**
     * Scrape price from BigBasket
     */
    private async scrapeBigBasket(itemName: string): Promise<ScrapedPrice> {
        const config = this.platformConfigs.bigbasket;

        return this.requestPool.add(async () => {
            return this.retryWithBackoff(async () => {
                const browser = await this.getBrowser();
                const page = await browser.newPage();

                try {
                    await page.setUserAgent(this.getRandomUserAgent());
                    await page.setViewport({ width: 1920, height: 1080 });

                    const searchUrl = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(itemName)}`;
                    await page.goto(searchUrl, {
                        waitUntil: 'networkidle2',
                        timeout: config.timeout
                    });

                    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

                    const html = await page.content();
                    await page.close();

                    const price = this.extractPriceFromHtml(html, config.selectors);
                    const $ = cheerio.load(html);
                    const productName = $('.prod-name').first().text().trim();

                    if (price && !isNaN(price) && price > 0) {
                        const confidence = this.calculateRelevance(itemName, productName);
                        return { price, available: true, productName, confidence };
                    }

                    return { price: null, available: false };
                } catch (error) {
                    await page.close();
                    if (error instanceof Error && error.message.includes('timeout')) {
                        throw new TimeoutError('BigBasket', itemName);
                    }
                    throw error;
                }
            }, config.retries, `BigBasket: ${itemName}`);
        });
    }

    /**
     * Scrape price from JioMart
     */
    private async scrapeJioMart(itemName: string): Promise<ScrapedPrice> {
        const config = this.platformConfigs.jiomart;

        return this.requestPool.add(async () => {
            return this.retryWithBackoff(async () => {
                const browser = await this.getBrowser();
                const page = await browser.newPage();

                try {
                    await page.setUserAgent(this.getRandomUserAgent());
                    await page.setViewport({ width: 1920, height: 1080 });

                    const searchUrl = `https://www.jiomart.com/search/${encodeURIComponent(itemName)}`;
                    await page.goto(searchUrl, {
                        waitUntil: 'networkidle2',
                        timeout: config.timeout
                    });

                    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

                    const html = await page.content();
                    await page.close();

                    const price = this.extractPriceFromHtml(html, config.selectors);
                    const $ = cheerio.load(html);
                    const productName = $('.jm-body-xs').first().text().trim();

                    if (price && !isNaN(price) && price > 0) {
                        const confidence = this.calculateRelevance(itemName, productName);
                        return { price, available: true, productName, confidence };
                    }

                    return { price: null, available: false };
                } catch (error) {
                    await page.close();
                    if (error instanceof Error && error.message.includes('timeout')) {
                        throw new TimeoutError('JioMart', itemName);
                    }
                    throw error;
                }
            }, config.retries, `JioMart: ${itemName}`);
        });
    }

    /**
     * Scrape price from Blinkit
     */
    private async scrapeBlinkit(itemName: string): Promise<ScrapedPrice> {
        const config = this.platformConfigs.blinkit;

        return this.requestPool.add(async () => {
            return this.retryWithBackoff(async () => {
                const browser = await this.getBrowser();
                const page = await browser.newPage();

                try {
                    await page.setUserAgent(this.getRandomUserAgent());
                    await page.setViewport({ width: 1920, height: 1080 });

                    const searchUrl = `https://blinkit.com/s/?q=${encodeURIComponent(itemName)}`;
                    await page.goto(searchUrl, {
                        waitUntil: 'networkidle2',
                        timeout: config.timeout
                    });

                    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

                    const html = await page.content();
                    await page.close();

                    const price = this.extractPriceFromHtml(html, config.selectors);
                    const $ = cheerio.load(html);
                    const productName = $('.Product__ProductName').first().text().trim();

                    if (price && !isNaN(price) && price > 0) {
                        const confidence = this.calculateRelevance(itemName, productName);
                        return { price, available: true, productName, confidence };
                    }

                    return { price: null, available: false };
                } catch (error) {
                    await page.close();
                    if (error instanceof Error && error.message.includes('timeout')) {
                        throw new TimeoutError('Blinkit', itemName);
                    }
                    throw error;
                }
            }, config.retries, `Blinkit: ${itemName}`);
        });
    }

    /**
     * Scrape price from a specific platform
     */
    async scrapePrice(platform: string, itemName: string): Promise<ScrapedPrice> {
        console.log(`🔍 [SCRAPER] Fetching real price for "${itemName}" from ${platform} (pool: ${this.requestPool.getActiveCount()}/3 active)`);

        let result: ScrapedPrice;

        try {
            switch (platform.toLowerCase()) {
                case 'amazon':
                    result = await this.scrapeAmazon(itemName);
                    break;
                case 'flipkart':
                    result = await this.scrapeFlipkart(itemName);
                    break;
                case 'bigbasket':
                    result = await this.scrapeBigBasket(itemName);
                    break;
                case 'jiomart':
                    result = await this.scrapeJioMart(itemName);
                    break;
                case 'blinkit':
                    result = await this.scrapeBlinkit(itemName);
                    break;
                default:
                    result = { price: null, available: false };
            }

            if (result.price) {
                const confidenceStr = result.confidence ? ` (confidence: ${(result.confidence * 100).toFixed(0)}%)` : '';
                console.log(`✅ [SCRAPER] Found price: ₹${result.price} on ${platform}${confidenceStr}`);
            } else {
                console.log(`❌ [SCRAPER] No price found on ${platform}`);
            }

            return result;
        } catch (error) {
            if (error instanceof ScrapingError) {
                console.error(`⚠️ [SCRAPER] ${error.name}: ${error.message}`);
            } else {
                console.error(`⚠️ [SCRAPER] Error scraping ${platform}:`, error);
            }
            return { price: null, available: false };
        }
    }
}

export const webScraperService = new WebScraperService();
