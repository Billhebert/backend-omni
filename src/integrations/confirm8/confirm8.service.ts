import axios from 'axios';

export class Confirm8Service {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.CONFIRM8_API_KEY || '';
    this.baseUrl = process.env.CONFIRM8_URL || 'https://api.confirm8.com';
  }

  async sendConfirmation(to: string, message: string) {
    return axios.post(`${this.baseUrl}/confirmations`, {
      recipient: to, message
    }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
  }

  async checkStatus(confirmationId: string) {
    const res = await axios.get(`${this.baseUrl}/confirmations/${confirmationId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return res.data;
  }
}
