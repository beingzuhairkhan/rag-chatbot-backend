import { Pinecone } from "@pinecone-database/pinecone";
import dotenv from "dotenv";
dotenv.config();

const indexName = "chatbot-rag";
let pinecone = null;
let index = null;

export const initializePinecone = async () => {
  try {
    pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    index = pinecone.index(indexName);
    console.log(` Connected to Pinecone index: ${indexName}`);
  } catch (error) {
    console.error(" Failed to initialize Pinecone:", error);
    throw error;
  }
};

export const upsertVectors = async (vectors) => {
  if (!index) throw new Error("Pinecone not initialized");

  try {
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
      console.log(`Upserted batch of ${batch.length} vectors`);
    }
    return vectors.length;
  } catch (error) {
    console.error(" Failed to upsert vectors:", error);
    throw error;
  }
};

export const queryVectors = async (queryVector, topK = 5, includeMetadata = true) => {
  if (!index) throw new Error("Pinecone not initialized");

  try {
    const queryResponse = await index.query({
      vector: queryVector,
      topK,
      includeMetadata,
      includeValues: false,
    });
    return queryResponse.matches || [];
  } catch (error) {
    console.error("Failed to query vectors:", error);
    throw error;
  }
};

export const getIndexStats = async () => {
  if (!index) throw new Error("Pinecone not initialized");

  try {
    const stats = await index.describeIndexStats();
    return stats.namespaces?.[""]?.vectorCount || 0;
  } catch (error) {
    console.error(" Failed to get index stats:", error);
    return 0;
  }
};

export const deleteAllVectors = async () => {
  if (!index) throw new Error("Pinecone not initialized");

  try {
    await index.deleteAll();
    console.log(" All vectors deleted from index");
  } catch (error) {
    console.error(" Failed to delete all vectors:", error);
    throw error;
  }
};
