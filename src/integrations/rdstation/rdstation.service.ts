import axios from 'axios';

export class RDStationService {
  private apiKey: string;
  private baseUrl = 'https://api.rd.services/platform';

  constructor() {
    this.apiKey = process.env.RDSTATION_API_KEY || '';
  }

  async createLead(email: string, name: string, data?: any) {
    return axios.post(`${this.baseUrl}/conversions`, {
      event_type: 'CONVERSION',
      event_family: 'CDP',
      payload: { conversion_identifier: 'omni-lead', email, name, ...data }
    }, { headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' } });
  }

  async updateContact(email: string, data: any) {
    return axios.patch(`${this.baseUrl}/contacts/email:${email}`, data, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
  }
}
