import { Queue, Worker } from 'bullmq';

export const notificationQueue = new Queue('notifications', {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

const worker = new Worker('notifications', async (job) => {
  console.log('Processing notification:', job.data);
  // Implementar lógica de notificação (push, in-app, etc)
}, {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

export async function queueNotification(userId: string, message: string, type: string) {
  return notificationQueue.add('send-notification', { userId, message, type });
}
