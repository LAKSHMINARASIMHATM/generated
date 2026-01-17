
import { GoogleGenAI, Type } from "@google/genai";
import { Bill, Category } from "./types.tsx";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractBillData = async (base64Image: string): Promise<Partial<Bill>> => {
  try {
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
            text: `Act as a professional forensic accountant and OCR expert. 
            Analyze this receipt image with extreme precision.
            
            1. STORE NAME: Identify the primary merchant or store name (usually at the very top).
            2. LINE ITEMS: Extract every single item purchased. 
               - Ensure prices are extracted as numbers.
               - If quantity isn't clearly stated, assume 1.
            3. CATEGORIZATION: Assign each item to one of: Dairy, Bakery, Fruits, Vegetables, Meat, Beverages, Snacks, Household, or Other.
            4. TOTAL: Identify the final total amount paid. Use mathematical validation (sum of items vs total) to resolve any OCR ambiguities.
            
            Return the data strictly in the requested JSON format.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            storeName: { 
              type: Type.STRING,
              description: "The name of the store or merchant."
            },
            totalAmount: { 
              type: Type.NUMBER,
              description: "The absolute final total amount paid."
            },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER, description: "Unit price of the item" },
                  quantity: { type: Type.NUMBER, description: "Quantity purchased" },
                  category: { 
                    type: Type.STRING,
                    description: "Strictly one of: Dairy, Bakery, Fruits, Vegetables, Meat, Beverages, Snacks, Household, Other"
                  },
                },
                required: ["name", "price", "quantity", "category"],
              },
            },
          },
          required: ["storeName", "totalAmount", "items"],
        },
      },
    });

    const jsonStr = response.text || '{}';
    const data = JSON.parse(jsonStr.trim());
    return {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw error;
  }
};
