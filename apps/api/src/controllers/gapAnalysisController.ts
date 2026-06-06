import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GapAnalysisService } from '../services/gapAnalysisService';
import { MatchingService } from '../services/matchingService';

const gapAnalysisService = new GapAnalysisService();
const matchingService = new MatchingService();

const postingIdSchema = z.object({
  postingId: z.string().uuid(),
});

export async function getGapAnalysis(req: Request, res: Response, next: NextFunction) {
  try {
    const { postingId } = postingIdSchema.parse(req.params);
    const result = await gapAnalysisService.getOrCreateGapAnalysis(
      req.user!.id,
      postingId,
      req.user!.companyId
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCareerPath(req: Request, res: Response, next: NextFunction) {
  try {
    const path = await matchingService.computeCareerPath(
      req.user!.id,
      req.user!.companyId
    );
    res.json(path);
  } catch (err) {
    next(err);
  }
}
