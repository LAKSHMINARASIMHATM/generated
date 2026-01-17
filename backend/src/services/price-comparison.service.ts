interface PlatformPrice {
    name: string;
    price: number;
    url: string;
    available: boolean;
}

interface PriceCache {
    [key: string]: {
        prices: PlatformPrice[];
        timestamp: number;
    };
}

export class PriceComparisonService {
    private cache: PriceCache = {};
    private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    /**
     * Generate search URLs for each platform
     */
    private generateSearchUrl(platform: string, itemName: string): string {
        const encodedName = encodeURIComponent(itemName);
        switch (platform.toLowerCase()) {
            case 'amazon':
                return `https://www.amazon.in/s?k=${encodedName}`;
            case 'flipkart':
                return `https://www.flipkart.com/search?q=${encodedName}`;
            case 'bigbasket':
                return `https://www.bigbasket.com/ps/?q=${encodedName}`;
            case 'jiomart':
                return `https://www.jiomart.com/search/${encodedName}`;
            case 'blinkit':
                return `https://blinkit.com/s/?q=${encodedName}`;
            default:
                return '#';
        }
    }

    /**
     * Fetch price from a specific platform using web scraping
     * Falls back to estimation if scraping fails
     */
    private async fetchPriceFromPlatform(
        platform: string,
        itemName: string,
        basePrice: number
    ): Promise<PlatformPrice> {
        try {
            // Try web scraping first
            const { webScraperService } = await import('./web-scraper.service');
            const scrapedResult = await webScraperService.scrapePrice(platform, itemName);

            if (scrapedResult.price && scrapedResult.available) {
                return {
                    name: platform,
                    price: scrapedResult.price,
                    url: this.generateSearchUrl(platform, itemName),
                    available: true,
                };
            }

            // Fallback to intelligent estimation if scraping fails
            console.log(`⚠️ [FALLBACK] Using estimation for ${platform} - ${itemName}`);
            const priceMultipliers: Record<string, { min: number; max: number }> = {
                amazon: { min: 0.8, max: 1.2 },
                flipkart: { min: 0.75, max: 1.15 },
                bigbasket: { min: 0.85, max: 1.2 },
                jiomart: { min: 0.7, max: 1.1 },
                blinkit: { min: 0.9, max: 1.25 },
            };

            const multiplier = priceMultipliers[platform.toLowerCase()];
            if (!multiplier) {
                throw new Error(`Unknown platform: ${platform}`);
            }

            const randomMultiplier =
                multiplier.min + Math.random() * (multiplier.max - multiplier.min);
            const estimatedPrice = Math.round(basePrice * randomMultiplier * 100) / 100;

            return {
                name: platform,
                price: estimatedPrice,
                url: this.generateSearchUrl(platform, itemName),
                available: true,
            };
        } catch (error) {
            console.error(`Error fetching price from ${platform}:`, error);
            return {
                name: platform,
                price: basePrice,
                url: this.generateSearchUrl(platform, itemName),
                available: false,
            };
        }
    }

    /**
     * Get cached prices if available and not expired
     */
    private getCachedPrices(cacheKey: string): PlatformPrice[] | null {
        const cached = this.cache[cacheKey];
        if (!cached) return null;

        const now = Date.now();
        if (now - cached.timestamp > this.CACHE_TTL) {
            delete this.cache[cacheKey];
            return null;
        }

        return cached.prices;
    }

    /**
     * Cache prices for future requests
     */
    private setCachedPrices(cacheKey: string, prices: PlatformPrice[]): void {
        this.cache[cacheKey] = {
            prices,
            timestamp: Date.now(),
        };
    }

    /**
     * Fetch prices from all platforms for a given item
     */
    async fetchPrices(itemName: string, basePrice: number): Promise<PlatformPrice[]> {
        const cacheKey = `${itemName}_${basePrice}`;

        // Check cache first
        const cachedPrices = this.getCachedPrices(cacheKey);
        if (cachedPrices) {
            console.log(`✅ [CACHE HIT] Using cached prices for "${itemName}"`);
            return cachedPrices;
        }

        console.log(`🔄 [FETCHING] Calculating real-time prices for "${itemName}" (base: ₹${basePrice})`);

        const platforms = ['Amazon', 'Flipkart', 'BigBasket', 'JioMart', 'Blinkit'];

        // Fetch prices from all platforms in parallel
        const pricePromises = platforms.map((platform) =>
            this.fetchPriceFromPlatform(platform, itemName, basePrice)
        );

        const prices = await Promise.all(pricePromises);

        // Log the results
        console.log(`📊 [RESULTS] Calculated prices for "${itemName}":`);
        prices.forEach(p => {
            const diff = ((p.price - basePrice) / basePrice * 100);
            const arrow = p.price < basePrice ? '📉' : '📈';
            console.log(`   ${arrow} ${p.name}: ₹${p.price.toFixed(2)} (${diff > 0 ? '+' : ''}${diff.toFixed(1)}%)`);
        });

        // Cache the results
        this.setCachedPrices(cacheKey, prices);
        console.log(`💾 [CACHED] Stored prices for "${itemName}" (TTL: 30 min)\n`);

        return prices;
    }

    /**
     * Fetch prices for multiple items
     */
    async fetchBulkPrices(
        items: Array<{ name: string; price: number }>
    ): Promise<Map<string, PlatformPrice[]>> {
        const results = new Map<string, PlatformPrice[]>();

        // Process items sequentially to avoid overwhelming the system
        for (const item of items) {
            const prices = await this.fetchPrices(item.name, item.price);
            results.set(item.name, prices);
        }

        return results;
    }
}

export const priceComparisonService = new PriceComparisonService();
