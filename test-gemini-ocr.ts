import { GoogleGenAI, Type } from "@google/genai";
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

async function testGeminiOCR() {
    const imagePath = 'C:/Users/T M lakshmi narasimh/.gemini/antigravity/brain/7863cb4b-fe33-4a99-b84f-69baa54d190e/uploaded_image_1768414820025.jpg';

    console.log(`Testing Gemini OCR on bill: ${imagePath}`);

    try {
        if (!fs.existsSync(imagePath)) {
            console.error('Image file not found!');
            return;
        }

        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');

        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "Extract receipt data: store name, total amount, and items (name, price, quantity, category). Use categories: Dairy, Bakery, Fruits, Vegetables, Meat, Beverages, Snacks, Household, or Other. Return JSON.";

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        console.log('\n--- GEMINI RESPONSE ---');
        console.log(text);

    } catch (error) {
        console.error('Gemini OCR test failed:', error);
    }
}

testGeminiOCR();
