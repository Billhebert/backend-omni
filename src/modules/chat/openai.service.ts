import OpenAI from "openai";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export class OpenAIService {
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

    // ajuste se seu projeto usar outro modelo por padrão
    this.model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
  }

  /**
   * Gera resposta de chat.
   * Mantive assinatura simples (messages -> string) pra encaixar em vários projetos.
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    const resp = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7,
    });

    const text = resp.choices?.[0]?.message?.content ?? "";
    return text;
  }
}
