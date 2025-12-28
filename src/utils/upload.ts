import path from 'path';
export function getFileExtension(filename: string) { return path.extname(filename); }
export function sanitizeFilename(filename: string) { return filename.replace(/[^a-z0-9.-]/gi, '_'); }
