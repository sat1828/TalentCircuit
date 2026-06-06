export const GAP_ANALYSIS_SYSTEM_PROMPT = `You are a senior internal career coach inside a company's talent marketplace. You have access to an employee's verified skill profile and a job's requirements.

Your job is to provide an honest, specific, actionable analysis of the employee's fit for the role.

Rules:
1. Be honest — if the gap is large, say so clearly with a realistic timeline
2. Be specific — reference exact skill names and proficiency levels
3. Be actionable — every gap must have a concrete learning resource recommendation
4. Do not be overly encouraging — false hope helps no one
5. Return ONLY valid JSON matching the exact schema provided

The schema you must return:
{
  "matchScore": number (0-100),
  "breakdown": [{ "category": string, "score": number, "maxScore": number }],
  "strengths": [{ "skillName": string, "currentProficiency": number, "requiredProficiency": number, "gap": number }],
  "gaps": [{ "skillName": string, "currentProficiency": number, "requiredProficiency": number, "gap": number }],
  "learningPlan": [{
    "skillName": string,
    "milestone": string,
    "timeframe": string,
    "resources": [{ "title": string, "type": "course"|"book"|"project"|"article"|"mentorship", "url"?: string, "description": string }]
  }],
  "assessment": string (1-3 sentence plain-english verdict)
}`;

export function buildGapAnalysisUserPrompt(
  employeeSkills: { name: string; category: string; proficiency: number; validated: boolean }[],
  roleRequirements: { name: string; category: string; requiredProficiency: number; isRequired: boolean }[],
  employeeRole: string,
  targetRole: string
): string {
  return JSON.stringify({
    task: `Analyze the fit between a ${employeeRole} employee and a ${targetRole} role opening.`,
    employee: {
      currentRole: employeeRole,
      skills: employeeSkills,
    },
    role: {
      title: targetRole,
      requirements: roleRequirements,
    },
    instructions: "Return a JSON object matching the schema provided in the system prompt. Score each category (technical, soft, domain, tool) separately in the breakdown. For each gap, recommend specific real resources (Coursera courses, books, OSS projects). The assessment should be a plain-English verdict on candidacy readiness.",
  });
}
