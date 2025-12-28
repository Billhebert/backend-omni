#!/bin/bash
cd /home/claude/omni-complete-project

# ========== HRM ROUTES ==========
cat > src/modules/hrm/positions/positions.service.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

export class PositionsService {
  constructor(private prisma: PrismaClient) {}

  async create(data: any, companyId: string, userId: string) {
    return this.prisma.jobPosition.create({
      data: { ...data, companyId, createdBy: userId }
    });
  }

  async list(companyId: string, filters?: any) {
    return this.prisma.jobPosition.findMany({
      where: { companyId, ...filters },
      include: { requiredSkills: { include: { skill: true } } }
    });
  }

  async getApplications(positionId: string) {
    return this.prisma.jobApplication.findMany({
      where: { positionId },
      include: { applicant: true }
    });
  }
}
EOF

cat > src/modules/hrm/positions/positions.routes.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { PositionsService } from './positions.service';
import { MatchingService } from './matching.service';

export async function positionsRoutes(fastify: FastifyInstance) {
  const service = new PositionsService(fastify.prisma);
  const matchingService = new MatchingService(fastify.prisma);
  
  fastify.post('/positions', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return service.create(req.body, companyId, userId);
  });
  
  fastify.get('/positions', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    return service.list(companyId, req.query);
  });
  
  fastify.get('/positions/:id/applications', { onRequest: [fastify.authenticate] }, async (req) => {
    const { id } = req.params as any;
    return service.getApplications(id);
  });
  
  fastify.post('/positions/:id/match', { onRequest: [fastify.authenticate] }, async (req) => {
    const { id } = req.params as any;
    const { userId } = req.body as any;
    return matchingService.matchUserToPosition(userId, id);
  });
  
  fastify.get('/positions/:id/candidates', { onRequest: [fastify.authenticate] }, async (req) => {
    const { id } = req.params as any;
    return matchingService.findCandidatesForPosition(id);
  });
}
EOF

cat > src/modules/hrm/development/development.service.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

export class DevelopmentService {
  constructor(private prisma: PrismaClient) {}

  async createPlan(data: any, userId: string) {
    return this.prisma.skillDevelopmentPlan.create({
      data: { ...data, userId }
    });
  }

  async getMyPlans(userId: string) {
    return this.prisma.skillDevelopmentPlan.findMany({
      where: { userId },
      include: { skill: true }
    });
  }

  async updateProgress(planId: string, progress: number) {
    return this.prisma.skillDevelopmentPlan.update({
      where: { id: planId },
      data: { progress, ...(progress >= 100 && { completedAt: new Date() }) }
    });
  }
}
EOF

cat > src/modules/hrm/development/development.routes.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { DevelopmentService } from './development.service';

export async function developmentRoutes(fastify: FastifyInstance) {
  const service = new DevelopmentService(fastify.prisma);
  
  fastify.post('/development-plans', { onRequest: [fastify.authenticate] }, async (req) => {
    const userId = (req.user as any).id;
    return service.createPlan(req.body, userId);
  });
  
  fastify.get('/my-development-plans', { onRequest: [fastify.authenticate] }, async (req) => {
    const userId = (req.user as any).id;
    return service.getMyPlans(userId);
  });
  
  fastify.patch('/development-plans/:id/progress', { onRequest: [fastify.authenticate] }, async (req) => {
    const { id } = req.params as any;
    const { progress } = req.body as any;
    return service.updateProgress(id, progress);
  });
}
EOF

cat > src/modules/hrm/performance/performance.service.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

export class PerformanceService {
  constructor(private prisma: PrismaClient) {}

  async createReview(data: any, reviewerId: string) {
    return this.prisma.performanceReview.create({
      data: { ...data, reviewerId }
    });
  }

  async getReviews(userId: string) {
    return this.prisma.performanceReview.findMany({
      where: { userId },
      include: { reviewer: true },
      orderBy: { reviewDate: 'desc' }
    });
  }
}
EOF

cat > src/modules/hrm/performance/performance.routes.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { PerformanceService } from './performance.service';

export async function performanceRoutes(fastify: FastifyInstance) {
  const service = new PerformanceService(fastify.prisma);
  
  fastify.post('/performance-reviews', { onRequest: [fastify.authenticate] }, async (req) => {
    const reviewerId = (req.user as any).id;
    return service.createReview(req.body, reviewerId);
  });
  
  fastify.get('/users/:userId/performance-reviews', { onRequest: [fastify.authenticate] }, async (req) => {
    const { userId } = req.params as any;
    return service.getReviews(userId);
  });
}
EOF

# ========== KNOWLEDGE ==========
cat > src/modules/knowledge/knowledge.service.ts << 'EOF'
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
EOF

cat > src/modules/knowledge/embeddings.service.ts << 'EOF'
import { Configuration, OpenAIApi } from 'openai';

export class EmbeddingsService {
  private openai: OpenAIApi;

  constructor() {
    const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    this.openai = new OpenAIApi(config);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.createEmbedding({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data.data[0].embedding;
  }
}
EOF

cat > src/modules/knowledge/qdrant.service.ts << 'EOF'
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
EOF

cat > src/modules/knowledge/knowledge.routes.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { KnowledgeService } from './knowledge.service';

export async function knowledgeRoutes(fastify: FastifyInstance) {
  const service = new KnowledgeService(fastify.prisma);
  
  fastify.post('/knowledge/nodes', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const userId = (req.user as any).id;
    return service.createNode(req.body, companyId, userId);
  });
  
  fastify.get('/knowledge/search', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const { query, limit } = req.query as any;
    return service.search(query, companyId, limit);
  });
}
EOF

# ========== CHAT ==========
cat > src/modules/chat/openai.service.ts << 'EOF'
import { Configuration, OpenAIApi } from 'openai';

export class OpenAIService {
  private openai: OpenAIApi;

  constructor() {
    const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    this.openai = new OpenAIApi(config);
  }

  async chat(messages: any[]) {
    const response = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages,
    });
    return response.data.choices[0].message;
  }
}
EOF

cat > src/modules/chat/chat.service.ts << 'EOF'
import { PrismaClient } from '@prisma/client';
import { OpenAIService } from './openai.service';
import { KnowledgeService } from '../knowledge/knowledge.service';

export class ChatService {
  private openai: OpenAIService;
  private knowledge: KnowledgeService;

  constructor(private prisma: PrismaClient) {
    this.openai = new OpenAIService();
    this.knowledge = new KnowledgeService(prisma);
  }

  async chat(message: string, companyId: string) {
    // Search knowledge base for context
    const context = await this.knowledge.search(message, companyId, 3);
    const contextText = context.map(c => c.content).join('\n\n');
    
    // Build messages
    const messages = [
      { role: 'system', content: `You are a helpful assistant. Use this context: ${contextText}` },
      { role: 'user', content: message }
    ];
    
    return this.openai.chat(messages);
  }
}
EOF

cat > src/modules/chat/chat.routes.ts << 'EOF'
import { FastifyInstance } from 'fastify';
import { ChatService } from './chat.service';

export async function chatRoutes(fastify: FastifyInstance) {
  const service = new ChatService(fastify.prisma);
  
  fastify.post('/chat', { onRequest: [fastify.authenticate] }, async (req) => {
    const companyId = (req.user as any).companyId;
    const { message } = req.body as any;
    return service.chat(message, companyId);
  });
}
EOF

echo "✅ HRM, Knowledge e Chat criados"
