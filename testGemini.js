import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGemini() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const start = Date.now();

    const result = await model.generateContent("Respond with: OK");

    const latency = Date.now() - start;

    console.log("Response:", result.response.text());
    console.log("Latency:", latency, "ms");

  } catch (err) {
    console.error("Gemini test failed:", err);
  }
}

testGemini();
