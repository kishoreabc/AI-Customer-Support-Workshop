import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  nodeEnv: process.env.NODE_ENV || 'development',

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },

  ai: {
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1024', 10),
    ragTopK: parseInt(process.env.RAG_TOP_K || '5', 10),
    ragSimilarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.7'),
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  },

  database: {
    path: process.env.DATABASE_PATH || path.resolve(__dirname, '../data/database.sqlite'),
  },
} as const;
