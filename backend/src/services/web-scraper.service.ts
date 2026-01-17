import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';

interface ScrapedPrice {
    price: number | null;
    available: boolean;
    productName?: string;
}

export class WebScraperService {
    private browser: Browser | null = null;

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
                    '--disable-gpu'
                ]
            });
        }
        return this.browser;
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
     * Scrape price from Amazon India
     */
    private async scrapeAmazon(itemName: string): Promise<ScrapedPrice> {
        try {
            const browser = await this.getBrowser();
            const page = await browser.newPage();

            // Set user agent to avoid detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            const searchUrl = `https://www.amazon.in/s?k=${encodeURIComponent(itemName)}`;
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 10000 });

            const html = await page.content();
            const $ = cheerio.load(html);

            // Amazon price selectors
            const priceWhole = $('.a-price-whole').first().text().replace(/[^0-9]/g, '');
            const priceFraction = $('.a-price-fraction').first().text();

            await page.close();

            if (priceWhole) {
                const price = parseFloat(`${priceWhole}.${priceFraction || '00'}`);
                return { price, available: true };
            }

            return { price: null, available: false };
        } catch (error) {
            console.error(`Amazon scraping error for "${itemName}":`, error);
            return { price: null, available: false };
        }
    }

    /**
     * Scrape price from Flipkart
     */
    private async scrapeFlipkart(itemName: string): Promise<ScrapedPrice> {
        try {
            const browser = await this.getBrowser();
            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            const searchUrl = `https://www.flipkart.com/search?q=${encodeURIComponent(itemName)}`;
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 10000 });

            const html = await page.content();
            const $ = cheerio.load(html);

            // Flipkart price selectors
            const priceText = $('._30jeq3').first().text() || $('._1_WHN1').first().text();
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

            await page.close();

            if (price && !isNaN(price)) {
                return { price, available: true };
            }

            return { price: null, available: false };
        } catch (error) {
            console.error(`Flipkart scraping error for "${itemName}":`, error);
            return { price: null, available: false };
        }
    }

    /**
     * Scrape price from BigBasket
     */
    private async scrapeBigBasket(itemName: string): Promise<ScrapedPrice> {
        try {
            const browser = await this.getBrowser();
            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            const searchUrl = `https://www.bigbasket.com/ps/?q=${encodeURIComponent(itemName)}`;
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 10000 });

            const html = await page.content();
            const $ = cheerio.load(html);

            // BigBasket price selectors
            const priceText = $('.discnt-price').first().text() || $('.price').first().text();
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

            await page.close();

            if (price && !isNaN(price)) {
                return { price, available: true };
            }

            return { price: null, available: false };
        } catch (error) {
            console.error(`BigBasket scraping error for "${itemName}":`, error);
            return { price: null, available: false };
        }
    }

    /**
     * Scrape price from JioMart
     */
    private async scrapeJioMart(itemName: string): Promise<ScrapedPrice> {
        try {
            const browser = await this.getBrowser();
            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            const searchUrl = `https://www.jiomart.com/search/${encodeURIComponent(itemName)}`;
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 10000 });

            const html = await page.content();
            const $ = cheerio.load(html);

            // JioMart price selectors
            const priceText = $('.jm-heading-xxs').first().text() || $('.price').first().text();
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

            await page.close();

            if (price && !isNaN(price)) {
                return { price, available: true };
            }

            return { price: null, available: false };
        } catch (error) {
            console.error(`JioMart scraping error for "${itemName}":`, error);
            return { price: null, available: false };
        }
    }

    /**
     * Scrape price from Blinkit
     */
    private async scrapeBlinkit(itemName: string): Promise<ScrapedPrice> {
        try {
            const browser = await this.getBrowser();
            const page = await browser.newPage();

            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            const searchUrl = `https://blinkit.com/s/?q=${encodeURIComponent(itemName)}`;
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 10000 });

            const html = await page.content();
            const $ = cheerio.load(html);

            // Blinkit price selectors
            const priceText = $('.Product__UpdatedPrice').first().text();
            const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

            await page.close();

            if (price && !isNaN(price)) {
                return { price, available: true };
            }

            return { price: null, available: false };
        } catch (error) {
            console.error(`Blinkit scraping error for "${itemName}":`, error);
            return { price: null, available: false };
        }
    }

    /**
     * Scrape price from a specific platform
     */
    async scrapePrice(platform: string, itemName: string): Promise<ScrapedPrice> {
        console.log(`\ud83d\udd0d [SCRAPER] Fetching real price for "${itemName}" from ${platform}`);

        let result: ScrapedPrice;

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
            console.log(`\u2705 [SCRAPER] Found price: \u20b9${result.price} on ${platform}`);
        } else {
            console.log(`\u274c [SCRAPER] No price found on ${platform}`);
        }

        return result;
    }
}

export const webScraperService = new WebScraperService();
