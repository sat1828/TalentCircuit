import { Router } from 'express';
import { authenticate, checkRole } from '../middleware/auth';
import * as adminController from '../controllers/adminController';
import { UserRole } from '@talentcircuit/shared-types';

const router = Router();

router.use(authenticate);
router.use(checkRole(UserRole.HrAdmin, UserRole.SuperAdmin));

router.get('/metrics', adminController.getDashboardMetrics);
router.get('/metrics/department/:department', adminController.getDepartmentMetrics);
router.get('/metrics/skills', adminController.getSkillDistribution);
router.post('/digest/trigger', adminController.triggerDigest);
router.post('/embeddings/seed', adminController.seedEmbeddings);
router.post('/embeddings/recompute', adminController.recomputeEmbeddings);

export default router;
