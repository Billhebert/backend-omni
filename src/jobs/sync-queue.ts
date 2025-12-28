import { Queue, Worker } from 'bullmq';
import { SageService } from '../integrations/sage/sage.service';

export const syncQueue = new Queue('sync', {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

const sageService = new SageService();

const worker = new Worker('sync', async (job) => {
  const { type, data } = job.data;
  
  if (type === 'invoice') {
    await sageService.syncInvoice(data);
  } else if (type === 'expense') {
    await sageService.syncExpense(data);
  }
}, {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) }
});

export async function queueSync(type: string, data: any) {
  return syncQueue.add('sync-data', { type, data });
}
