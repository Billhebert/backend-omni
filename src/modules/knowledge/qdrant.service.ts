import { QdrantClient } from '@qdrant/js-client-rest';

export class QdrantService {
  private client: QdrantClient;
  private collectionName = 'knowledge';

  constructor() {
    this.client = new QdrantClient({ url: process.env.QDRANT_URL });
  }

  async upsertVector(id: string, vector: number[], payload: any) {
    return this.client.upsert(this.collectionName, {
      wait: true,
      points: [{ id, vector, payload }]
    });
  }

  async search(vector: number[], companyId: string, limit = 10) {
    return this.client.search(this.collectionName, {
      vector,
      limit,
      filter: { must: [{ key: 'companyId', match: { value: companyId } }] }
    });
  }
}
