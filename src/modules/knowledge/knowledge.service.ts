import { PrismaClient } from '@prisma/client';
import { QdrantService } from './qdrant.service';
import { EmbeddingsService } from './embeddings.service';

export class KnowledgeService {
  private qdrant: QdrantService;
  private embeddings: EmbeddingsService;

  constructor(private prisma: PrismaClient) {
    this.qdrant = new QdrantService();
    this.embeddings = new EmbeddingsService();
  }

  async createNode(data: any, companyId: string, userId: string) {
    const node = await this.prisma.knowledgeNode.create({
      data: { ...data, companyId, createdBy: userId }
    });
    
    // Generate embeddings and store in Qdrant
    const embedding = await this.embeddings.generateEmbedding(data.content);
    await this.qdrant.upsertVector(node.id, embedding, { nodeId: node.id, companyId });
    
    return node;
  }

  async search(query: string, companyId: string, limit = 10) {
    const embedding = await this.embeddings.generateEmbedding(query);
    const results = await this.qdrant.search(embedding, companyId, limit);
    
    const nodeIds = results.map(r => r.payload.nodeId);
    return this.prisma.knowledgeNode.findMany({
      where: { id: { in: nodeIds }, companyId }
    });
  }
}
