import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function getModels() {
  const apiKey = process.env.GEMINI_API_KEY;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
  );

  const data = await res.json();
  console.log(data);
}

getModels().catch(console.error);
