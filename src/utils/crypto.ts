import crypto from 'crypto';
export function generateToken(len = 32) { return crypto.randomBytes(len).toString('hex'); }
export function hashString(str: string) { return crypto.createHash('sha256').update(str).digest('hex'); }
