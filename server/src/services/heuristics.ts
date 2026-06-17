const skillVocabulary = [
  'javascript', 'typescript', 'react', 'redux', 'node', 'express', 'mongodb', 'mongoose', 'tailwind',
  'html', 'css', 'python', 'java', 'sql', 'aws', 'azure', 'docker', 'kubernetes', 'git', 'graphql',
  'rest', 'api', 'jwt', 'testing', 'jest', 'vitest', 'ci/cd', 'next.js', 'vite', 'linux', 'nosql', 'algorithms',
  'data structures', 'system design', 'machine learning', 'llm', 'ai', 'prompt engineering', 'gemini'
];

export function extractSkills(text: string): string[] {
  const normalized = text.toLowerCase();
  const matches = skillVocabulary.filter((skill) => normalized.includes(skill));
  return [...new Set(matches)].map((skill) => skill.replace(/\b\w/g, (letter) => letter.toUpperCase()));
}

export function compactText(text: string, limit = 14000): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit)}…`;
}

export function scoreOverlap(resumeSkills: string[], jobSkills: string[]): number {
  if (jobSkills.length === 0) return resumeSkills.length > 0 ? 55 : 0;
  const normalizedResume = new Set(resumeSkills.map((skill) => skill.toLowerCase()));
  const overlap = jobSkills.filter((skill) => normalizedResume.has(skill.toLowerCase())).length;
  return Math.max(5, Math.min(98, Math.round((overlap / jobSkills.length) * 100)));
}

export function splitSentences(text: string, max = 4): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, max);
}