import { Queue, Worker } from 'bullmq';
import { env } from '../config/env';
import { DigestService } from '../services/digestService';
import { query } from '../config/database';

const QUEUE_NAME = 'digest';

let digestQueue: Queue;
let digestWorker: Worker;

export async function setupDigestScheduler() {
  const connection = { url: env.REDIS_URL };

  digestQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: 100,
    },
  });

  digestWorker = new Worker(
    QUEUE_NAME,
    async () => {
      const digestService = new DigestService();
      const companies = await query<{ id: string }>('SELECT id FROM companies');
      for (const company of companies) {
        await digestService.generateWeeklyDigests(company.id);
      }
    },
    {
      connection,
      concurrency: 1,
    }
  );

  digestWorker.on('completed', (job) => {
    console.log(`[Digest] Job ${job.id} completed`);
  });

  digestWorker.on('failed', (job, err) => {
    console.error(`[Digest] Job ${job?.id} failed:`, err);
  });

  // Register a weekly repeating job (every Monday at 9 AM)
  await digestQueue.add(
    'weekly-digest',
    {},
    {
      repeat: { pattern: '0 9 * * 1' },
      jobId: 'weekly-digest',
    }
  );

  console.log('[Digest] Scheduler initialized (weekly, Mon 9 AM)');
}

export async function enqueueDigestJob() {
  if (!digestQueue) throw new Error('Digest scheduler not initialized');
  await digestQueue.add('manual-digest', {}, { jobId: `manual-${Date.now()}` });
}

export async function shutdownDigestScheduler() {
  if (digestWorker) await digestWorker.close();
  if (digestQueue) await digestQueue.close();
}
