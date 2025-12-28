import axios from 'axios';

export class SageService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.SAGE_API_KEY || '';
    this.baseUrl = process.env.SAGE_URL || 'https://api.sage.com/v3.1';
  }

  async syncInvoice(invoice: any) {
    return axios.post(`${this.baseUrl}/sales_invoices`, {
      contact_id: invoice.contactId,
      date: invoice.date,
      total_amount: invoice.total,
      line_items: invoice.items
    }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
  }

  async syncExpense(expense: any) {
    return axios.post(`${this.baseUrl}/purchase_invoices`, {
      vendor_id: expense.vendorId,
      date: expense.date,
      total_amount: expense.amount
    }, { headers: { 'Authorization': `Bearer ${this.apiKey}` } });
  }
}
