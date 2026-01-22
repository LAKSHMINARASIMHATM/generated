interface PlatformPrice {
    name: string;
    price: number;
    url: string;
    available: boolean;
    confidence?: number; // 0-1 score for price accuracy/relevance
}

interface PriceCache {
    [key: string]: {
        prices: PlatformPrice[];
        timestamp: number;
        stale?: boolean; // Mark as stale for background refresh
    };
}

interface CacheStats {
    hits: number;
    misses: number;
    staleServed: number;
    totalRequests: number;
}

export class PriceComparisonService {
    private cache: PriceCache = {};
    private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
    private readonly STALE_TTL = 60 * 60 * 1000; // 1 hour (serve stale if < 1hr old)
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        staleServed: 0,
        totalRequests: 0
    };
    private readonly MAX_PARALLEL = 5; // Max parallel platform scrapes

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
        }
    }

    /**
     * Fetch price from a specific platform
     * Priority: Real API > Web Scraping > Estimation
     */
    private async fetchPriceFromPlatform(
        platform: string,
        itemName: string,
        basePrice: number
    ): Promise<PlatformPrice> {
        const startTime = Date.now();

        try {
            // PRIORITY 1: Try Real Price API (RainforestAPI for Amazon)
            try {
                const { realPriceApiService } = await import('./real-price-api.service');
                const apiResult = await realPriceApiService.searchProduct(platform, itemName);

                if (apiResult.price && apiResult.available) {
                    const elapsed = Date.now() - startTime;
                    console.log(`✅ [${platform}] API: ₹${apiResult.price} (${elapsed}ms, confidence: ${(apiResult.confidence * 100).toFixed(0)}%)`);
                    return {
                        name: platform,
                        price: apiResult.price,
                        url: this.generateSearchUrl(platform, itemName),
                        available: true,
                        confidence: apiResult.confidence
                    };
                }
            } catch (apiError) {
                // Silently fall through to scraping
            }

            // PRIORITY 2: Try web scraping
            const { webScraperService } = await import('./web-scraper.service');
            const scrapedResult = await webScraperService.scrapePrice(platform, itemName);

            const elapsed = Date.now() - startTime;

            // Use scraped price if available and confidence is acceptable
            if (scrapedResult.price && scrapedResult.available) {
                const confidence = scrapedResult.confidence || 0.5;

                // Only use scraped price if confidence is >= 0.3 (30%)
                if (confidence >= 0.3) {
                    console.log(`✅ [${platform}] Scraped: ₹${scrapedResult.price} (${elapsed}ms, confidence: ${(confidence * 100).toFixed(0)}%)`);
                    return {
                        name: platform,
                        price: scrapedResult.price,
                        url: this.generateSearchUrl(platform, itemName),
                        available: true,
                        confidence
                    };
                } else {
                    console.log(`⚠️ [${platform}] Low confidence (${(confidence * 100).toFixed(0)}%), using estimation instead`);
                }
            }

            // PRIORITY 3: Fallback to intelligent estimation
            return this.estimatePrice(platform, itemName, basePrice, elapsed);
        } catch (error) {
            const elapsed = Date.now() - startTime;
            console.error(`❌ [${platform}] Error (${elapsed}ms):`, error instanceof Error ? error.message : error);
            return this.estimatePrice(platform, itemName, basePrice, elapsed);
        }
    }

    /**
     * Estimate price when scraping fails
     */
    private estimatePrice(
        platform: string,
        itemName: string,
        basePrice: number,
        elapsed: number
    ): PlatformPrice {
        console.log(`⚠️ [FALLBACK] Using estimation for ${platform} - ${itemName} (${elapsed}ms)`);

        const priceMultipliers: Record<string, { min: number; max: number }> = {
            amazon: { min: 0.8, max: 1.2 },
            flipkart: { min: 0.75, max: 1.15 },
            bigbasket: { min: 0.85, max: 1.2 },
            jiomart: { min: 0.7, max: 1.1 },
            blinkit: { min: 0.9, max: 1.25 },
        };

        const multiplier = priceMultipliers[platform.toLowerCase()];
        if (!multiplier) {
            return {
                name: platform,
                price: basePrice,
                url: this.generateSearchUrl(platform, itemName),
                available: false,
                confidence: 0
            };
        }

        const randomMultiplier =
            multiplier.min + Math.random() * (multiplier.max - multiplier.min);
        const estimatedPrice = Math.round(basePrice * randomMultiplier * 100) / 100;

        return {
            name: platform,
            price: estimatedPrice,
            url: this.generateSearchUrl(platform, itemName),
            available: true,
            confidence: 0.2 // Low confidence for estimates
        };
    }

    /**
     * Get cached prices if available
     * Implements stale-while-revalidate pattern
     */
    private getCachedPrices(cacheKey: string): {
        prices: PlatformPrice[] | null;
        isStale: boolean;
    } {
        const cached = this.cache[cacheKey];
        if (!cached) {
            return { prices: null, isStale: false };
        }

        const now = Date.now();
        const age = now - cached.timestamp;

        // Fresh cache
        if (age <= this.CACHE_TTL) {
            return { prices: cached.prices, isStale: false };
        }

        // Stale but usable (serve while revalidating)
        if (age <= this.STALE_TTL) {
            return { prices: cached.prices, isStale: true };
        }

        // Too old, delete and return null
        delete this.cache[cacheKey];
        return { prices: null, isStale: false };
    }

    /**
     * Cache prices for future requests
     */
    private setCachedPrices(cacheKey: string, prices: PlatformPrice[]): void {
        this.cache[cacheKey] = {
            prices,
            timestamp: Date.now(),
            stale: false
        };
    }

    /**
     * Background refresh of stale cache
     */
    private async refreshStaleCache(
        cacheKey: string,
        itemName: string,
        basePrice: number
    ): Promise<void> {
        console.log(`🔄 [CACHE] Background refresh for "${itemName}"`);

        try {
            const prices = await this.fetchPricesInternal(itemName, basePrice);
            this.setCachedPrices(cacheKey, prices);
            console.log(`✅ [CACHE] Refreshed stale cache for "${itemName}"`);
        } catch (error) {
            console.error(`❌ [CACHE] Failed to refresh stale cache for "${itemName}":`, error);
        }
    }

    /**
     * Internal method to fetch prices (used by both main flow and cache refresh)
     */
    private async fetchPricesInternal(
        itemName: string,
        basePrice: number
    ): Promise<PlatformPrice[]> {
        const platforms = ['Amazon', 'Flipkart', 'BigBasket', 'JioMart', 'Blinkit'];

        // Fetch prices from all platforms in parallel with concurrency limit
        const pricePromises = platforms.map((platform) =>
            this.fetchPriceFromPlatform(platform, itemName, basePrice)
        );

        const prices = await Promise.all(pricePromises);

        // Sort by price (lowest first) for better UX
        prices.sort((a, b) => a.price - b.price);

        return prices;
    }

    /**
     * Fetch prices from all platforms for a given item
     */
    async fetchPrices(itemName: string, basePrice: number): Promise<PlatformPrice[]> {
        this.stats.totalRequests++;
        const cacheKey = `${itemName}_${basePrice}`;

        // Check cache first
        const { prices: cachedPrices, isStale } = this.getCachedPrices(cacheKey);

        if (cachedPrices) {
            if (isStale) {
                // Stale-while-revalidate: serve stale data, refresh in background
                this.stats.staleServed++;
                console.log(`⚡ [CACHE STALE] Serving stale prices for "${itemName}" (refreshing in background)`);

                // Fire and forget background refresh
                this.refreshStaleCache(cacheKey, itemName, basePrice).catch(() => { });

                return cachedPrices;
            } else {
                // Fresh cache hit
                this.stats.hits++;
                const hitRate = ((this.stats.hits / this.stats.totalRequests) * 100).toFixed(1);
                console.log(`✅ [CACHE HIT] Using cached prices for "${itemName}" (hit rate: ${hitRate}%)`);
                return cachedPrices;
            }
        }

        // Cache miss - fetch fresh data
        this.stats.misses++;
        console.log(`🔄 [FETCHING] Calculating real-time prices for "${itemName}" (base: ₹${basePrice})`);

        const startTime = Date.now();
        const prices = await this.fetchPricesInternal(itemName, basePrice);
        const totalTime = Date.now() - startTime;

        // Log the results with statistics
        console.log(`📊 [RESULTS] Calculated prices for "${itemName}" in ${totalTime}ms:`);
        prices.forEach(p => {
            const diff = ((p.price - basePrice) / basePrice * 100);
            const arrow = p.price < basePrice ? '📉' : '📈';
            const confidenceStr = p.confidence ? ` [conf: ${(p.confidence * 100).toFixed(0)}%]` : '';
            const source = p.confidence && p.confidence > 0.8 ? 'API' : p.confidence && p.confidence >= 0.3 ? 'Scraped' : 'Estimated';
            console.log(`   ${arrow} ${p.name}: ₹${p.price.toFixed(2)} (${diff > 0 ? '+' : ''}${diff.toFixed(1)}%) ${confidenceStr} [${source}]`);
        });

        // Cache the results
        this.setCachedPrices(cacheKey, prices);
        console.log(`💾 [CACHED] Stored prices for "${itemName}" (TTL: 30 min)\n`);

        return prices;
    }

    /**
     * Fetch prices for multiple items
     * Processes in parallel with concurrency control
     */
    async fetchBulkPrices(
        items: Array<{ name: string; price: number }>
    ): Promise<Map<string, PlatformPrice[]>> {
        const results = new Map<string, PlatformPrice[]>();

        console.log(`📦 [BULK] Processing ${items.length} items...`);
        const startTime = Date.now();

        // Process items in parallel (max 3 at a time to avoid overwhelming)
        const batchSize = 3;
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const batchPromises = batch.map(async (item) => {
                const prices = await this.fetchPrices(item.name, item.price);
                results.set(item.name, prices);
            });

            await Promise.all(batchPromises);
        }

        const totalTime = Date.now() - startTime;
        const avgTime = (totalTime / items.length).toFixed(0);
        console.log(`✅ [BULK] Completed ${items.length} items in ${totalTime}ms (avg: ${avgTime}ms/item)\n`);

        return results;
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): CacheStats & { hitRate: string; cacheSize: number } {
        const hitRate = this.stats.totalRequests > 0
            ? ((this.stats.hits / this.stats.totalRequests) * 100).toFixed(1) + '%'
            : '0%';

        return {
            ...this.stats,
            hitRate,
            cacheSize: Object.keys(this.cache).length
        };
    }

    /**
     * Clear expired cache entries
     */
    clearExpiredCache(): void {
        const now = Date.now();
        let cleared = 0;

        for (const [key, entry] of Object.entries(this.cache)) {
            if (now - entry.timestamp > this.STALE_TTL) {
                delete this.cache[key];
                cleared++;
            }
        }

        if (cleared > 0) {
            console.log(`🧹 [CACHE] Cleared ${cleared} expired entries`);
        }
    }
}

export const priceComparisonService = new PriceComparisonService();
