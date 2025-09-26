import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const API_URL = "https://api.jina.ai/v1/embeddings";
const API_KEY = process.env.JINA_API_KEY;
const MODEL = "jina-embeddings-v2-base-en";


export const generateEmbeddings = async (texts) => {
  try {
    if (!Array.isArray(texts)) {
      texts = [texts];
    }

    const safeTexts = texts;

    const response = await axios.post(
      API_URL,
      {
        model: MODEL,
        input: safeTexts, 
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const embeddings = response.data.data.map((item) => item.embedding);
    //console.log(embeddings)
    return embeddings;
  } catch (error) {
    console.error(
      " Error generating embeddings:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const generateSingleEmbedding = async (text) => {
  const embeddings = await generateEmbeddings([text]);
  return embeddings[0];
};

export const batchGenerateEmbeddings = async (texts, batchSize = 5) => {
  const results = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await generateEmbeddings(batch);
    results.push(...embeddings);

    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
};
