import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as gapAnalysisController from '../controllers/gapAnalysisController';

const router = Router();

router.use(authenticate);

router.get('/gap-analysis/:postingId', gapAnalysisController.getGapAnalysis);
router.get('/career-path', gapAnalysisController.getCareerPath);

export default router;
