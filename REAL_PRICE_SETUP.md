# Real Price Fetching - Free API Setup

## Overview

The price fetcher now uses a **three-tier approach** with real free APIs:

1. **🌧️ Real Price APIs** (Primary) - RainforestAPI for Amazon (100 free/month)
2. **🕷️ Web scraping** (Secondary) - Fallback for other platforms
3. **📊 Estimation** (Tertiary) - Final fallback

## Free API: RainforestAPI

**✅ Genuinely Free - 100 requests/month**  
**✅ No credit card required**  
**✅ Real Amazon India prices**

### Setup Instructions

1. **Sign up for free account**
   - Visit: https://www.rainforestapi.com/
   - Click "Start Free Trial" or "Get Started"
   - No credit card required!
   - Free tier: 100 API requests per month

2. **Get your API key**
   - After signup, go to dashboard
   - Copy your API key

3. **Add to .env file**
   Create or edit `.env` in project root:
   ```env
   RAINFOREST_API_KEY=your_actual_api_key_here
   ```

4. **Restart backend**
   ```bash
   npm run backend
   ```

That's it! The system will now use real Amazon prices via API.

## How It Works

### Priority Chain

```
Try RainforestAPI (Amazon only)
    ↓
    Success? → Return real price (85% confidence)
    ↓
    Failed? → Try Web Scraping (all platforms)
        ↓
        Success? → Return scraped price (30-80% confidence)
        ↓
        Failed? → Use Estimation (20% confidence)
```

### Platform Support

| Platform | API Support | Scraping | Estimation |
|----------|-------------|----------|------------|
| **Amazon** | ✅ RainforestAPI | ✅ Fallback | ✅ Final fallback |
| **Flipkart** | ❌ (scraping only) | ✅ Primary | ✅ Fallback |
| **BigBasket** | ❌ (scraping only) | ✅ Primary | ✅ Fallback |
| **JioMart** | ❌ (scraping only) | ✅ Primary | ✅ Fallback |
| **Blinkit** | ❌ (scraping only) | ✅ Primary | ✅ Fallback |

## Works Without API Key!

**Don't want to sign up?** No problem!  
The system automatically falls back to:
- Web scraping (tries to get real prices)
- Estimation (fallback if scraping fails)

## Benefits

### With RainforestAPI Key (Recommended)
- ⚡ **Super fast**: <1 second for Amazon prices
- ✅ **Real prices**: Direct from Amazon India
- 🎯 **High accuracy**: 85% confidence scores
- 💾 **Efficient**: Uses API first, saves scraping for backup

### Without API Key (Still Works)
- 🕷️ Web scraping for all platforms (8-15s)
- 📊 Estimation fallback
- ✅ 100% free, always works

## Console Output Examples

### With API Key (Amazon)
```
🔄 [FETCHING] Calculating real-time prices for "Organic Milk" (base: ₹50)
🌧️ [RainforestAPI] Searching Amazon India for "Organic Milk"
✅ [RainforestAPI] Found: ₹48.50 - "Amul Taaza Homogenised Toned Milk, 1 L"
✅ [Amazon] API: ₹48.50 (842ms, confidence: 85%)
🕷️ [Other platforms use web scraping...]
📊 [RESULTS] Calculated prices in 9234ms:
   📉 Amazon: ₹48.50 (-3.0%) [conf: 85%] [API]
   📈 Flipkart: ₹52.00 (+4.0%) [conf: 65%] [Scraped]
```

### Without API Key
```
🔄 [FETCHING] Calculating real-time prices for "Organic Milk"
🕷️ [Web scraping all platforms...]
✅ [Amazon] Scraped: ₹49.00 (8234ms, confidence: 75%)
📊 [RESULTS]:
   📉 Amazon: ₹49.00 (-2.0%) [conf: 75%] [Scraped]
```

## Rate Limits

**Free Tier (100 requests/month)**:
- ~3 requests per day
- Perfect for testing and light usage
- Cache (30 min TTL) reduces API calls significantly

**With caching**:
- First request: Uses API (counts toward limit)
- Next 30 minutes: Uses cache (free!)
- Same item: Only 1 API call needed per 30 min

## Cost Comparison

| Method | Speed | Accuracy | Monthly Limit | Setup |
|--------|-------|----------|---------------|-------|
| **RainforestAPI** | <1s | 85% | 100 requests | Free signup |
| **Web Scraping** | 8-15s | 30-80% | Unlimited | None |
| **Estimation** | Instant | 20% | Unlimited | None |
| **Cached** | <10ms | Same as source | Unlimited | None |

## Troubleshooting

### "Rate limit exceeded"
- Free tier: 100 requests/month used up
- Solution: Wait for next month or upgrade to paid tier
- Fallback: System automatically uses web scraping

### "Invalid API key"
- Check .env file has correct key format
- Ensure no extra spaces in RAINFOREST_API_KEY
- Restart backend after adding key

### "No API key configured"  
- Normal if you haven't set up RainforestAPI
- System uses web scraping instead
- Everything still works!

## Advanced: Paid Tier (Optional)

If you need more than 100 requests/month:
- **Starter**: $49/month for 5,000 requests
- **Growth**: $149/month for 20,000 requests
- Not required for most users!

## Summary

**Best setup**: Add free RainforestAPI key for fast, accurate Amazon prices  
**Still works without**: Web scraping + estimation as fallback  
**Recommended**: Set up the free tier, it takes 2 minutes!
