import { Router } from 'express';
import { authenticate, checkRole } from '../middleware/auth';
import { sanitizeJobListings, anonymizeInterestData } from '../middleware/privacy';
import * as jobController from '../controllers/jobController';
import { UserRole } from '@talentcircuit/shared-types';

const router = Router();

router.use(authenticate);

// Employee-facing
router.get('/', sanitizeJobListings, jobController.listJobs);
router.get('/:id', jobController.getJob);
router.post('/:id/interest', jobController.expressInterest);
router.post('/:id/apply', jobController.apply);
router.get('/:id/interest-count', anonymizeInterestData, jobController.getInterestCount);

// Manager-facing
router.post('/', checkRole(UserRole.Manager, UserRole.HrAdmin, UserRole.SuperAdmin), jobController.createPosting);
router.get('/:id/hidden-talent', checkRole(UserRole.Manager, UserRole.HrAdmin, UserRole.SuperAdmin), jobController.getHiddenTalent);
router.put('/:postingId/applications/:applicantId/status', checkRole(UserRole.Manager, UserRole.HrAdmin, UserRole.SuperAdmin), jobController.updateApplicationStatus);

// Applications
router.get('/applications/mine', jobController.getApplications);

export default router;
