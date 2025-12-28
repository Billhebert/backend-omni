import axios from 'axios';

export class PipefyService {
  private apiKey: string;
  private baseUrl = 'https://api.pipefy.com/graphql';

  constructor() {
    this.apiKey = process.env.PIPEFY_API_KEY || '';
  }

  async createCard(pipeId: string, title: string, fields: any[]) {
    const mutation = `
      mutation {
        createCard(input: {
          pipe_id: "${pipeId}"
          title: "${title}"
          fields_attributes: ${JSON.stringify(fields)}
        }) {
          card { id title }
        }
      }
    `;
    const res = await axios.post(this.baseUrl, { query: mutation }, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return res.data;
  }

  async moveCard(cardId: string, phaseId: string) {
    const mutation = `
      mutation {
        moveCardToPhase(input: { card_id: "${cardId}" destination_phase_id: "${phaseId}" }) {
          card { id current_phase { name } }
        }
      }
    `;
    const res = await axios.post(this.baseUrl, { query: mutation }, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return res.data;
  }
}
