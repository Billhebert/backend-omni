import { Queue, Worker } from 'bullmq';
import { sendEmail } from '../utils/email';

export const emailQueue = new Queue('emails', {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

const worker = new Worker('emails', async (job) => {
  const { to, subject, html } = job.data;
  await sendEmail(to, subject, html);
}, {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

export async function queueEmail(to: string, subject: string, html: string) {
  return emailQueue.add('send-email', { to, subject, html });
}
