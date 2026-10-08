import OpenAI from 'openai';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!config.openai.apiKey || config.openai.apiKey === 'your-api-key') {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });
  }
  return openaiClient;
}

// Generate embedding for text
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  if (client) {
    try {
      const response = await client.embeddings.create({
        model: config.ai.embeddingModel,
        input: text.replace(/\n/g, ' '),
      });
      return response.data[0].embedding;
    } catch (err) {
      logger.warn('Failed calling OpenAI embeddings API, falling back to local deterministic vector:', {
        error: String(err),
      });
    }
  }

  // Deterministic 128-dimension feature hash embedding for local/test usage
  return generateLocalVector(text, 128);
}

// Deterministic bag-of-words / character ngram vector normalized to unit length
export function generateLocalVector(text: string, dimensions = 128): number[] {
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

  for (const word of words) {
    for (let i = 0; i < word.length; i++) {
      const code = word.charCodeAt(i);
      const idx = (code * (i + 1) * 31) % dimensions;
      vector[idx] += 1;
    }
    // Also hash whole word
    let h = 0;
    for (let i = 0; i < word.length; i++) {
      h = (Math.imul(31, h) + word.charCodeAt(i)) | 0;
    }
    const wordIdx = Math.abs(h) % dimensions;
    vector[wordIdx] += 2;
  }

  // Normalize vector to unit length (L2 norm)
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSq += vector[i] * vector[i];
  }

  const norm = Math.sqrt(sumSq) || 1;
  return vector.map((v) => v / norm);
}

// Cosine similarity between two float vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}
