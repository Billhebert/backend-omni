import OpenAI from "openai";

export class EmbeddingsService {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY não configurada. Defina no .env (ex: OPENAI_API_KEY=...)"
      );
    }

    this.client = new OpenAI({ apiKey });

    // Você pode trocar por text-embedding-3-large se quiser mais qualidade
    this.model = process.env.OPENAI_EMBEDDINGS_MODEL ?? "text-embedding-3-small";
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const input = String(text ?? "").replace(/\s+/g, " ").trim();

    if (!input) return [];

    const resp = await this.client.embeddings.create({
      model: this.model,
      input,
    });

    const embedding = resp.data?.[0]?.embedding;

    if (!embedding) {
      throw new Error("Falha ao gerar embedding (resposta vazia do OpenAI).");
    }

    return embedding;
  }
}
