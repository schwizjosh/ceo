import pool from '../database/db';
import { aiService } from './aiService';

export interface VectorDocumentInput {
  sourceType: string;
  sourceId?: string;
  content: string;
  summary?: string;
  metadata?: Record<string, any>;
}

export interface VectorMatch {
  id: string;
  content: string;
  summary?: string;
  metadata: Record<string, any>;
  sourceType: string;
  sourceId?: string;
  score: number;
}

class BrandVectorStore {
  async upsertDocuments(brandId: string, documents: VectorDocumentInput[]): Promise<void> {
    if (!documents.length) return;

    const embeddings = await aiService.createEmbeddings(documents.map(doc => doc.content));

    await Promise.all(
      documents.map(async (doc, index) => {
        const embedding = embeddings[index];
        if (!embedding) return;

        const hasSourceId = typeof doc.sourceId === 'string' && doc.sourceId.length > 0;
        const query = hasSourceId
          ? `INSERT INTO brand_knowledge_vectors
               (brand_id, source_type, source_id, content, summary, metadata, embedding)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (brand_id, source_type, source_id)
             DO UPDATE SET
               content = EXCLUDED.content,
               summary = EXCLUDED.summary,
               metadata = EXCLUDED.metadata,
               embedding = EXCLUDED.embedding,
               updated_at = CURRENT_TIMESTAMP`
          : `INSERT INTO brand_knowledge_vectors
               (brand_id, source_type, content, summary, metadata, embedding)
             VALUES ($1, $2, $3, $4, $5, $6)`;

        const params = hasSourceId
          ? [
              brandId,
              doc.sourceType,
              doc.sourceId,
              doc.content,
              doc.summary || null,
              JSON.stringify(doc.metadata || {}),
              JSON.stringify(embedding)
            ]
          : [
              brandId,
              doc.sourceType,
              doc.content,
              doc.summary || null,
              JSON.stringify(doc.metadata || {}),
              JSON.stringify(embedding)
            ];

        try {
          await pool.query(query, params);
        } catch (error: any) {
          if (error?.code === '42P01') {
            console.warn('Vector store table missing; skipping document upsert.');
            return;
          }
          throw error;
        }
      })
    );
  }

  async query(
    brandId: string,
    queryText: string,
    options?: { topK?: number; minScore?: number; sourceTypes?: string[] }
  ): Promise<VectorMatch[]> {
    if (!queryText || !brandId) return [];

    const topK = options?.topK ?? 5;
    const minScore = options?.minScore ?? 0.2;
    const sourceTypes = options?.sourceTypes;

    let rows: any[] = [];
    try {
      const result = await pool.query(
        `SELECT id, source_type, source_id, content, summary, metadata, embedding
         FROM brand_knowledge_vectors
         WHERE brand_id = $1 ${sourceTypes?.length ? 'AND source_type = ANY($2)' : ''}
         ORDER BY updated_at DESC
         LIMIT 200`,
        sourceTypes?.length ? [brandId, sourceTypes] : [brandId]
      );
      rows = result.rows;
    } catch (error: any) {
      if (error?.code === '42P01') {
        return [];
      }
      throw error;
    }

    if (!rows.length) return [];

    const [queryEmbedding] = await aiService.createEmbeddings([queryText]);
    if (!queryEmbedding) return [];

    const matches: VectorMatch[] = rows
      .map(row => {
        let embedding: number[] = [];
        if (Array.isArray(row.embedding)) {
          embedding = row.embedding.map((value: any) => Number(value) || 0);
        } else if (typeof row.embedding === 'string') {
          try {
            const parsed = JSON.parse(row.embedding);
            if (Array.isArray(parsed)) {
              embedding = parsed.map((value: any) => Number(value) || 0);
            }
          } catch {
            embedding = [];
          }
        } else if (row.embedding && typeof row.embedding === 'object') {
          const arr = Object.values(row.embedding);
          embedding = arr.map((value: any) => Number(value) || 0);
        }

        if (!embedding.length) return null;

        const score = this.cosineSimilarity(queryEmbedding, embedding);
        if (Number.isNaN(score) || score < minScore) return null;

        let metadata: Record<string, any> = {};
        if (row.metadata) {
          if (typeof row.metadata === 'string') {
            try {
              metadata = JSON.parse(row.metadata);
            } catch {
              metadata = {};
            }
          } else if (typeof row.metadata === 'object') {
            metadata = row.metadata;
          }
        }

        return {
          id: row.id,
          content: row.content,
          summary: row.summary || undefined,
          metadata,
          sourceType: row.source_type,
          sourceId: row.source_id || undefined,
          score
        } as VectorMatch;
      })
      .filter((match): match is VectorMatch => Boolean(match))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return matches;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length || a.length !== b.length) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const brandVectorStore = new BrandVectorStore();
