import { queryAll, execute } from '../database/connection.js';
import { generateEmbedding, cosineSimilarity } from './embedding.js';
import { logger } from '../utils/logger.js';

export interface RetrievedChunk {
  documentId: string;
  title: string;
  category: string;
  chunkIndex: number;
  chunkText: string;
  similarity: number;
}

// Split document text into chunks
export function chunkDocument(text: string, maxChunkLength = 500): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const p of paragraphs) {
    const trimmed = p.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length > maxChunkLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }

    currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text.trim()];
}

// Index a document's chunks into document_embeddings table
export async function indexDocument(documentId: string, text: string): Promise<number> {
  const chunks = chunkDocument(text);
  logger.info(`Indexing document ${documentId} into ${chunks.length} chunks...`);

  // Remove existing embeddings for this document
  execute('DELETE FROM document_embeddings WHERE document_id = ?', documentId);

  const now = new Date().toISOString();
  let count = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const embedding = await generateEmbedding(chunkText);

    execute(`
      INSERT INTO document_embeddings (document_id, chunk_index, chunk_text, embedding, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, documentId, i, chunkText, JSON.stringify(embedding), now);
    count++;
  }

  logger.info(`Successfully stored ${count} embeddings for document ${documentId}`);
  return count;
}

// Search vector store for relevant chunks
export async function searchVectorStore(
  query: string,
  topK = 5,
  similarityThreshold = 0.5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query);

  const rows = queryAll(`
    SELECT e.document_id, e.chunk_index, e.chunk_text, e.embedding,
           d.title, d.category, d.status
    FROM document_embeddings e
    JOIN knowledge_documents d ON e.document_id = d.document_id
    WHERE d.status = 'PUBLISHED'
  `) as any[];

  if (rows.length === 0) {
    return [];
  }

  const results: RetrievedChunk[] = [];

  for (const row of rows) {
    try {
      const embedding: number[] = JSON.parse(row.embedding);
      const similarity = cosineSimilarity(queryEmbedding, embedding);

      if (similarity >= similarityThreshold) {
        results.push({
          documentId: row.document_id,
          title: row.title,
          category: row.category,
          chunkIndex: row.chunk_index,
          chunkText: row.chunk_text,
          similarity,
        });
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}
