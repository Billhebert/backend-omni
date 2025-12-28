#!/bin/bash

# Este script cria TODOS os arquivos faltando do projeto

cd /home/claude/omni-complete-project

# ============================================
# UTILS
# ============================================

cat > src/utils/logger.ts << 'EOF'
import pino from 'pino';
export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
EOF

cat > src/utils/email.ts << 'EOF'
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});
export async function sendEmail(to: string, subject: string, html: string) {
  return transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
}
EOF

cat > src/utils/crypto.ts << 'EOF'
import crypto from 'crypto';
export function generateToken(len = 32) { return crypto.randomBytes(len).toString('hex'); }
export function hashString(str: string) { return crypto.createHash('sha256').update(str).digest('hex'); }
EOF

cat > src/utils/upload.ts << 'EOF'
import path from 'path';
export function getFileExtension(filename: string) { return path.extname(filename); }
export function sanitizeFilename(filename: string) { return filename.replace(/[^a-z0-9.-]/gi, '_'); }
EOF

cat > src/utils/validator.ts << 'EOF'
export function isEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
export function isUUID(id: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id); }
EOF

cat > src/utils/date.ts << 'EOF'
export function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
export function diffInDays(d1: Date, d2: Date) { return Math.ceil(Math.abs(d1.getTime() - d2.getTime()) / (1000*60*60*24)); }
EOF

echo "✅ Utils criados (6/6)"

# ============================================
# INTEGRAÇÕES
# ============================================

# CONFIRM8
cat > src/integrations/confirm8/confirm8.service.ts << 'EOF'
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
EOF

# RDSTATION
cat > src/integrations/rdstation/rdstation.service.ts << 'EOF'
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
EOF

# PIPEFY
cat > src/integrations/pipefy/pipefy.service.ts << 'EOF'
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
EOF

# EXCEL
cat > src/integrations/excel/excel.service.ts << 'EOF'
import XLSX from 'xlsx';

export class ExcelService {
  exportToExcel(data: any[], filename: string) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, filename);
  }

  importFromExcel(filepath: string) {
    const wb = XLSX.readFile(filepath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws);
  }

  async exportContactsToExcel(contacts: any[]) {
    const data = contacts.map(c => ({
      Name: c.name,
      Email: c.email,
      Phone: c.phone,
      Company: c.company,
      Status: c.status
    }));
    this.exportToExcel(data, 'contacts.xlsx');
  }
}
EOF

# SAGE
cat > src/integrations/sage/sage.service.ts << 'EOF'
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
EOF

echo "✅ Integrações criadas (5/5)"

