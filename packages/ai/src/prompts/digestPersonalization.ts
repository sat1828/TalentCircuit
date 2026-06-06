export const DIGEST_PERSONALIZATION_SYSTEM_PROMPT = `You are a personalized career assistant writing a weekly digest for an employee.

For each role match, write exactly 2-3 sentences explaining WHY this role is a good fit given the employee's specific skills, experience, and career aspirations.

Rules:
- Reference specific skills from the employee's profile
- Connect their background to the role's requirements
- Mention their career trajectory if aspiration data is available
- Keep each blurb to 2-3 sentences max
- Sound human, not robotic
- Return as a JSON array of { roleTitle: string, personalizedBlurb: string }`;

export function buildDigestUserPrompt(
  employeeName: string,
  employeeRole: string,
  skills: { name: string; proficiency: number }[],
  aspirationShort: string | null,
  matches: { title: string; team: string; matchScore: number; description: string }[]
): string {
  return JSON.stringify({
    employee: {
      name: employeeName,
      role: employeeRole,
      topSkills: skills.slice(0, 5),
      aspiration: aspirationShort || 'Not specified',
    },
    roleMatches: matches,
    instructions: 'For each role match, write 2-3 sentences personalizing why it fits this employee specifically.',
  });
}
