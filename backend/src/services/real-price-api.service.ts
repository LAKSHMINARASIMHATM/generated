import axios from 'axios';

interface ApiPriceResult {
    price: number | null;
    available: boolean;
    productName?: string;
    confidence: number;
    source: 'api' | 'estimate';
}

/**
 * Real Price API Service
 * Uses genuinely free APIs for fetching real e-commerce prices
 */
export class RealPriceApiService {
    // RainforestAPI - Free tier: 100 requests/month
    private readonly RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY || '';
    private readonly RAINFOREST_BASE_URL = 'https://api.rainforestapi.com/request';

    /**
     * Search Amazon India using RainforestAPI (Free tier available)
     * No credit card required for signup
     */
    async searchAmazonIndia(productName: string): Promise<ApiPriceResult> {
        try {
            if (!this.RAINFOREST_API_KEY) {
                return { price: null, available: false, confidence: 0, source: 'api' };
            }

            console.log(`🌧️ [RainforestAPI] Searching Amazon India for "${productName}"`);

            const response = await axios.get(this.RAINFOREST_BASE_URL, {
                params: {
                    api_key: this.RAINFOREST_API_KEY,
                    type: 'search',
                    amazon_domain: 'amazon.in',
                    search_term: productName,
                    sort_by: 'most_relevant'
                },
                timeout: 10000
            });

            if (response.data && response.data.search_results && response.data.search_results.length > 0) {
                const firstResult = response.data.search_results[0];

                // Extract price from the result
                const priceData = firstResult.price;
                let price: number | null = null;

                if (priceData) {
                    // Handle different price formats
                    if (typeof priceData.value === 'number') {
                        price = priceData.value;
                    } else if (typeof priceData === 'string') {
                        // Parse string price like "₹49.00" or "49.00"
                        price = parseFloat(priceData.replace(/[^0-9.]/g, ''));
                    }
                }

                if (price && !isNaN(price) && price > 0) {
                    console.log(`✅ [RainforestAPI] Found: ₹${price} - "${firstResult.title}"`);
                    return {
                        price,
                        available: true,
                        productName: firstResult.title,
                        confidence: 0.85, // High confidence for API data
                        source: 'api'
                    };
                }
            }

            return { price: null, available: false, confidence: 0, source: 'api' };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 429) {
                    console.log('⚠️ [RainforestAPI] Rate limit exceeded (100/month on free tier)');
                } else if (error.response?.status === 401) {
                    console.log('⚠️ [RainforestAPI] Invalid API key');
                } else {
                    console.log(`⚠️ [RainforestAPI] Error: ${error.message}`);
                }
            }
            return { price: null, available: false, confidence: 0, source: 'api' };
        }
    }

    /**
     * Search any platform for a product
     * Routes to appropriate API based on platform
     */
    async searchProduct(platform: string, productName: string): Promise<ApiPriceResult> {
        const platformLower = platform.toLowerCase();

        switch (platformLower) {
            case 'amazon':
                return this.searchAmazonIndia(productName);

            default:
                // No API available for this platform
                return { price: null, available: false, confidence: 0, source: 'api' };
        }
    }
}

export const realPriceApiService = new RealPriceApiService();
