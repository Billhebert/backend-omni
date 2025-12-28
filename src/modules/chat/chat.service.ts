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
