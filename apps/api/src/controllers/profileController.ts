import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profileService';
import { z } from 'zod';

const profileService = new ProfileService();

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  aspirationShort: z.string().max(500).nullable().optional(),
  aspirationLong: z.string().max(2000).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const addSkillSchema = z.object({
  skillName: z.string().min(1).max(255),
  proficiencyLevel: z.number().int().min(1).max(5),
});

const updateSkillSchema = z.object({
  proficiencyLevel: z.number().int().min(1).max(5),
});

const validateSkillSchema = z.object({
  employeeSkillId: z.string().uuid(),
  proficiencyLevel: z.number().int().min(1).max(5),
});

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await profileService.getProfile(req.user!.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateProfileSchema.parse(req.body);
    const profile = await profileService.updateProfile(req.user!.id, data);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}

export async function getSkills(req: Request, res: Response, next: NextFunction) {
  try {
    const skills = await profileService.getSkills(req.user!.id);
    res.json(skills);
  } catch (err) {
    next(err);
  }
}

export async function addSkill(req: Request, res: Response, next: NextFunction) {
  try {
    const data = addSkillSchema.parse(req.body);
    const skill = await profileService.addSkill(req.user!.id, data.skillName, data.proficiencyLevel);
    res.status(201).json(skill);
  } catch (err) {
    next(err);
  }
}

export async function updateSkill(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSkillSchema.parse(req.body);
    const skills = await profileService.updateSkill(req.user!.id, req.params.skillId!, data.proficiencyLevel);
    res.json(skills);
  } catch (err) {
    next(err);
  }
}

export async function removeSkill(req: Request, res: Response, next: NextFunction) {
  try {
    await profileService.removeSkill(req.user!.id, req.params.skillId!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function validateSkill(req: Request, res: Response, next: NextFunction) {
  try {
    const data = validateSkillSchema.parse(req.body);
    const result = await profileService.requestSkillValidation(req.user!.id, data.employeeSkillId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
