import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../services/metricsService';
import { DigestService } from '../services/digestService';
import { MatchingService } from '../services/matchingService';
import { enqueueDigestJob } from '../jobs/digestScheduler';

const metricsService = new MetricsService();
const digestService = new DigestService();
const matchingService = new MatchingService();

export async function getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const metrics = await metricsService.getDashboardMetrics(req.user!.companyId);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
}

export async function getDepartmentMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const metrics = await metricsService.getDepartmentMetrics(
      req.user!.companyId,
      req.params.department!
    );
    res.json(metrics);
  } catch (err) {
    next(err);
  }
}

export async function getSkillDistribution(req: Request, res: Response, next: NextFunction) {
  try {
    const distribution = await metricsService.getSkillDistribution(req.user!.companyId);
    res.json(distribution);
  } catch (err) {
    next(err);
  }
}

export async function triggerDigest(req: Request, res: Response, next: NextFunction) {
  try {
    await enqueueDigestJob();
    res.json({ message: 'Digest job enqueued' });
  } catch (err) {
    next(err);
  }
}

export async function previewDigest(req: Request, res: Response, next: NextFunction) {
  try {
    const preview = await digestService.previewDigest(req.user!.id);
    res.json(preview);
  } catch (err) {
    next(err);
  }
}

export async function seedEmbeddings(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await matchingService.seedSkillEmbeddings();
    res.json({ message: `Embedded ${count} skills` });
  } catch (err) {
    next(err);
  }
}

export async function recomputeEmbeddings(req: Request, res: Response, next: NextFunction) {
  try {
    await matchingService.recomputeAllEmbeddings(req.user!.companyId);
    res.json({ message: 'Embeddings recomputed' });
  } catch (err) {
    next(err);
  }
}
