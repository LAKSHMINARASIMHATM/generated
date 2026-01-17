
import { GoogleGenAI, Type } from "@google/genai";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export class OCRService {
  static async extractFromImage(base64Image: string) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          {
            text: "Extract receipt data: store name, total amount, and items (name, price, quantity, category). Use categories: Dairy, Bakery, Fruits, Vegetables, Meat, Beverages, Snacks, Household, or Other.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storeName: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER },
                  category: { type: Type.STRING },
                },
                required: ["name", "price", "quantity", "category"],
              },
            },
          },
          required: ["storeName", "totalAmount", "items"],
        },
      },
    });

    return JSON.parse(response.text || '{}');
  }
}
