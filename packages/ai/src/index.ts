import Anthropic from '@anthropic-ai/sdk';
import {
  GAP_ANALYSIS_SYSTEM_PROMPT,
  buildGapAnalysisUserPrompt,
} from './prompts/gapAnalysis';
import {
  DIGEST_PERSONALIZATION_SYSTEM_PROMPT,
  buildDigestUserPrompt,
} from './prompts/digestPersonalization';
import {
  NUDGE_SYSTEM_PROMPT,
  buildNudgeUserPrompt,
} from './prompts/nudgeMessage';
import type {
  GapAnalysisResult,
  WeeklyDigestData,
  DigestMatch,
  LearningResource,
  SkillGapItem,
  LearningPlanMilestone,
  SkillCategoryBreakdown,
} from '@talentcircuit/shared-types';
import { z } from 'zod';

// ──────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  timeout: 30 * 1000,
  maxRetries: 0,
});

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

// ──────────────────────────────────────────
// Schema Validation (response parsing safety)
// ──────────────────────────────────────────

const LearningResourceSchema = z.object({
  title: z.string(),
  type: z.enum(['course', 'book', 'project', 'article', 'mentorship']),
  url: z.string().optional(),
  description: z.string(),
});

const LearningPlanMilestoneSchema = z.object({
  skillName: z.string(),
  milestone: z.string(),
  timeframe: z.string(),
  resources: z.array(LearningResourceSchema),
});

const SkillGapItemSchema = z.object({
  skillName: z.string(),
  currentProficiency: z.number(),
  requiredProficiency: z.number(),
  gap: z.number(),
});

const SkillCategoryBreakdownSchema = z.object({
  category: z.string(),
  score: z.number(),
  maxScore: z.number(),
});

const GapAnalysisResultSchema = z.object({
  matchScore: z.number().min(0).max(100),
  breakdown: z.array(SkillCategoryBreakdownSchema),
  strengths: z.array(SkillGapItemSchema),
  gaps: z.array(SkillGapItemSchema),
  learningPlan: z.array(LearningPlanMilestoneSchema),
  assessment: z.string(),
});

const NudgeResultSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

const DigestBlurbSchema = z.array(
  z.object({
    roleTitle: z.string(),
    personalizedBlurb: z.string(),
  })
);

// ──────────────────────────────────────────
// Helper: extract JSON from Claude response
// ──────────────────────────────────────────

function extractJson(text: string): string {
  // Markdown code block
  const mdBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdBlock) {
    const trimmed = mdBlock[1]!.trim();
    try { JSON.parse(trimmed); return trimmed; } catch {}
  }

  // Balanced braces
  const firstBrace = text.indexOf('{');
  if (firstBrace >= 0) {
    let depth = 0;
    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(firstBrace, i + 1);
          try { JSON.parse(candidate); return candidate; } catch { break; }
        }
      }
    }
  }

  // Balanced brackets
  const firstBracket = text.indexOf('[');
  if (firstBracket >= 0) {
    let depth = 0;
    for (let i = firstBracket; i < text.length; i++) {
      if (text[i] === '[') depth++;
      else if (text[i] === ']') {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(firstBracket, i + 1);
          try { JSON.parse(candidate); return candidate; } catch { break; }
        }
      }
    }
  }

  return text;
}

// ──────────────────────────────────────────
// Helper: safe Claude call with retry + parse
// ──────────────────────────────────────────

async function callClaude<T>(
  systemPrompt: string,
  userMessage: string,
  schema: z.ZodType<T>,
  maxRetries = 2
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const content = response.content[0];
      if (!content || content.type !== 'text') {
        throw new Error('Claude returned non-text response');
      }

      // Attempt to extract JSON from the response (handles markdown-wrapped JSON)
      const text = content.text.trim();
      const jsonStr = extractJson(text);
      const parsed = JSON.parse(jsonStr);
      return schema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('Claude call failed after retries');
}

// ──────────────────────────────────────────
// Public API
// ──────────────────────────────────────────

/**
 * Analyze the skill gap between an employee's profile and a job's requirements.
 * Returns structured gap analysis with learning plan.
 */
export async function analyzeSkillGap(
  employeeProfile: {
    currentRole: string;
    skills: { name: string; category: string; proficiency: number; validated: boolean }[];
  },
  jobRequirements: {
    title: string;
    skills: { name: string; category: string; requiredProficiency: number; isRequired: boolean }[];
  }
): Promise<GapAnalysisResult> {
  const userPrompt = buildGapAnalysisUserPrompt(
    employeeProfile.skills,
    jobRequirements.skills,
    employeeProfile.currentRole,
    jobRequirements.title
  );

  const raw = await callClaude(GAP_ANALYSIS_SYSTEM_PROMPT, userPrompt, GapAnalysisResultSchema);
  return raw as unknown as GapAnalysisResult;
}

/**
 * Generate a personalized nudge message for an employee about a matching role.
 * Used by managers' "Send Personalized Nudge" feature.
 */
export async function generateNudgeMessage(
  employeeName: string,
  employeeSkills: string[],
  roleTitle: string,
  roleTeam: string,
  roleDescription: string
): Promise<{ subject: string; body: string }> {
  const userPrompt = buildNudgeUserPrompt(
    employeeName,
    employeeSkills,
    roleTitle,
    roleTeam,
    roleDescription
  );

  return callClaude(NUDGE_SYSTEM_PROMPT, userPrompt, NudgeResultSchema);
}

/**
 * Generate personalized digest blurbs for an employee's weekly digest email.
 * Batches all role matches into a single Claude call to save costs.
 */
export async function generateDigestPersonalization(
  employeeName: string,
  employeeRole: string,
  skills: { name: string; proficiency: number }[],
  aspirationShort: string | null,
  matches: { title: string; team: string; matchScore: number; description: string }[]
): Promise<{ roleTitle: string; personalizedBlurb: string }[]> {
  const userPrompt = buildDigestUserPrompt(
    employeeName,
    employeeRole,
    skills,
    aspirationShort,
    matches
  );

  return callClaude(DIGEST_PERSONALIZATION_SYSTEM_PROMPT, userPrompt, DigestBlurbSchema);
}

/**
 * Compute a match score breakdown locally using skill data.
 * This is a fallback / fast-path when Claude API is not needed.
 */
export function computeLocalMatchScore(
  employeeSkills: { skillId: string; proficiency: number; validated: boolean }[],
  roleRequirements: { skillId: string; requiredProficiency: number; isRequired: boolean }[],
  skillEmbeddings: Map<string, number[]>
): { matchScore: number; strengths: SkillGapItem[]; gaps: SkillGapItem[] } {
  let totalRequiredScore = 0;
  let achievedScore = 0;

  const strengths: SkillGapItem[] = [];
  const gaps: SkillGapItem[] = [];

  for (const req of roleRequirements) {
    const weight = req.isRequired ? 1.5 : 1.0;
    const requiredValue = req.requiredProficiency * weight;
    totalRequiredScore += requiredValue;

    const empSkill = employeeSkills.find((es) => es.skillId === req.skillId);
    if (empSkill) {
      const validatedMultiplier = empSkill.validated ? 1.3 : 1.0;
      const achievedValue = empSkill.proficiency * weight * validatedMultiplier;
      achievedScore += Math.min(achievedValue, requiredValue);

      const gap = req.requiredProficiency - empSkill.proficiency;
      if (gap <= 0) {
        strengths.push({
          skillName: req.skillId,
          currentProficiency: empSkill.proficiency,
          requiredProficiency: req.requiredProficiency,
          gap: Math.max(gap, 0),
        });
      } else {
        gaps.push({
          skillName: req.skillId,
          currentProficiency: empSkill.proficiency,
          requiredProficiency: req.requiredProficiency,
          gap,
        });
      }
    } else {
      gaps.push({
        skillName: req.skillId,
        currentProficiency: 0,
        requiredProficiency: req.requiredProficiency,
        gap: req.requiredProficiency,
      });
    }
  }

  const matchScore = totalRequiredScore > 0
    ? Math.round((achievedScore / totalRequiredScore) * 100)
    : 0;

  return { matchScore, strengths, gaps };
}
