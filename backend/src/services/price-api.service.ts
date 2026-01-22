import axios from 'axios';

interface ApiPriceResult {
    price: number | null;
    available: boolean;
    productName?: string;
    confidence: number;
    source: 'api' | 'scraper' | 'estimate';
}

export class PriceApiService {
    private readonly DATAYUGE_BASE_URL = 'https://api.datayuge.com/v1';
    private readonly API_KEY = process.env.DATAYUGE_API_KEY || ''; // Optional: Users can add their own key

    /**
     * Search for product price using DataYuge API
     * Free tier: 100 requests/day
     */
    async searchProductPrice(productName: string, platform: string): Promise<ApiPriceResult> {
        try {
            if (!this.API_KEY) {
                console.log('ℹ️ [API] No DataYuge API key configured, using scraper fallback');
                return { price: null, available: false, confidence: 0, source: 'api' };
            }

            const platformMapping: Record<string, string> = {
                'amazon': 'amazon',
                'flipkart': 'flipkart',
                'bigbasket': 'bigbasket',
                'jiomart': 'reliance',
                'blinkit': 'blinkit'
            };

            const apiPlatform = platformMapping[platform.toLowerCase()];
            if (!apiPlatform) {
                return { price: null, available: false, confidence: 0, source: 'api' };
            }

            console.log(`🌐 [API] Fetching price for "${productName}" from ${platform} via DataYuge`);

            const response = await axios.get(`${this.DATAYUGE_BASE_URL}/products/search`, {
                params: {
                    q: productName,
                    store: apiPlatform,
                    country: 'in'
                },
                headers: {
                    'Authorization': `Bearer ${this.API_KEY}`,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });

            if (response.data && response.data.products && response.data.products.length > 0) {
                const product = response.data.products[0];
                const price = parseFloat(product.price);

                if (price && !isNaN(price) && price > 0) {
                    console.log(`✅ [API] Found price via API: ₹${price}`);
                    return {
                        price,
                        available: true,
                        productName: product.title || product.name,
                        confidence: 0.9, // High confidence for API results
                        source: 'api'
                    };
                }
            }

            return { price: null, available: false, confidence: 0, source: 'api' };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 429) {
                    console.log('⚠️ [API] Rate limit exceeded (100 requests/day)');
                } else if (error.response?.status === 401) {
                    console.log('⚠️ [API] Invalid API key');
                } else {
                    console.log(`⚠️ [API] Request failed: ${error.message}`);
                }
            } else {
                console.log('⚠️ [API] Unexpected error:', error);
            }
            return { price: null, available: false, confidence: 0, source: 'api' };
        }
    }

    /**
     * Alternative: Use quick.in API (free tier available)
     */
    async searchQuickApi(productName: string): Promise<ApiPriceResult> {
        try {
            console.log(`🌐 [QUICK.IN] Searching for "${productName}"`);

            const response = await axios.get('https://api.quick.in/v1/search', {
                params: {
                    query: productName,
                    location: 'india'
                },
                timeout: 5000
            });

            if (response.data && response.data.results && response.data.results.length > 0) {
                const result = response.data.results[0];
                const price = parseFloat(result.price);

                if (price && !isNaN(price) && price > 0) {
                    console.log(`✅ [QUICK.IN] Found price: ₹${price}`);
                    return {
                        price,
                        available: true,
                        productName: result.name,
                        confidence: 0.85,
                        source: 'api'
                    };
                }
            }

            return { price: null, available: false, confidence: 0, source: 'api' };
        } catch (error) {
            console.log('⚠️ [QUICK.IN] API request failed');
            return { price: null, available: false, confidence: 0, source: 'api' };
        }
    }
}

export const priceApiService = new PriceApiService();
