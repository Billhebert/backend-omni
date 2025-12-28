export function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate() + days); return d; }
export function diffInDays(d1: Date, d2: Date) { return Math.ceil(Math.abs(d1.getTime() - d2.getTime()) / (1000*60*60*24)); }
