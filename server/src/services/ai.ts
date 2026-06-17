import { env } from '../config/env.js';
import type {
    InterviewQuestionGroup,
    MatchResult,
    NotesResult,
    PageContext,
    QnAResult,
    RoadmapResult,
    SkillGapResult,
    SummaryResult
} from '../types/analysis.js';
import { compactText, extractSkills, scoreOverlap, splitSentences } from './heuristics.js';

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function extractJsonPayload(text: string): unknown | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callGemini(prompt: string): Promise<string | null> {
  if (!env.GEMINI_API_KEY) {
    return null;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as GeminiResponse;
  return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

function fallbackSummary(context: PageContext): SummaryResult {
  const sentences = splitSentences(context.text, 5);
  const takeaways = extractSkills(context.text).slice(0, 6);
  return {
    conciseSummary: sentences.slice(0, 2).join(' '),
    detailedSummary: compactText(context.text, 700),
    keyTakeaways: takeaways.length ? takeaways : sentences.slice(0, 3),
    actionItems: ['Review the page for role-specific requirements', 'Capture the main technologies and responsibilities', 'Save the result to your dashboard']
  };
}

function fallbackQna(context: PageContext, question: string): QnAResult {
  const skills = extractSkills(context.text);
  const answer = skills.length
    ? `The page prominently references ${skills.slice(0, 8).join(', ')}.`
    : `Based on the page text, the most relevant answer to "${question}" is not explicit, but the page appears to focus on ${splitSentences(context.text, 2).join(' ')}`;

  return {
    answer,
    evidence: splitSentences(context.text, 3),
    confidence: skills.length ? 78 : 42
  };
}

function fallbackMatch(resumeText: string, jobText: string): MatchResult {
  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobText);
  const normalizedResume = new Set(resumeSkills.map((skill) => skill.toLowerCase()));
  const matchingSkills = jobSkills.filter((skill) => normalizedResume.has(skill.toLowerCase()));
  const missingSkills = jobSkills.filter((skill) => !normalizedResume.has(skill.toLowerCase()));
  const matchScore = scoreOverlap(resumeSkills, jobSkills);

  return {
    matchScore,
    matchingSkills: matchingSkills.length ? matchingSkills : resumeSkills.slice(0, 4),
    missingSkills: missingSkills.length ? missingSkills : ['Advanced system design', 'Production deployment', 'Leadership communication'],
    improvementSuggestions: [
      'Add one project that demonstrates measurable product impact.',
      'Mirror the job description language in the skills section.',
      'Highlight cloud, testing, and deployment experience with concrete outcomes.'
    ]
  };
}

function fallbackSkillGap(resumeText: string, jobText: string): SkillGapResult {
  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobText);
  const normalizedResume = new Set(resumeSkills.map((skill) => skill.toLowerCase()));
  const missingSkills = jobSkills.filter((skill) => !normalizedResume.has(skill.toLowerCase()));

  return {
    missingSkills: missingSkills.length ? missingSkills : ['System design', 'Deployment pipelines', 'Interview storytelling'],
    learningRoadmap: [
      { phase: 'Week 1-2', goals: ['Study missing skill fundamentals', 'Build note summaries'], estimatedTime: '8-12 hours' },
      { phase: 'Week 3-4', goals: ['Build a focused project', 'Practice interview examples'], estimatedTime: '10-15 hours' },
      { phase: 'Week 5+', goals: ['Refine project portfolio', 'Apply skill in real applications'], estimatedTime: 'ongoing' }
    ],
    priorityRanking: missingSkills.slice(0, 5).map((skill, index) => ({
      skill,
      priority: index === 0 ? 'high' : index < 3 ? 'medium' : 'low',
      reason: 'This skill is directly referenced in the target job description.'
    })),
    estimatedLearningTime: '4-8 weeks'
  };
}

function fallbackInterviewQuestions(resumeText: string, jobText: string): InterviewQuestionGroup[] {
  const skills = Array.from(new Set([...extractSkills(resumeText), ...extractSkills(jobText)]));
  return [
    {
      category: 'Technical',
      difficulty: 'mixed',
      questions: skills.slice(0, 5).map((skill) => ({
        question: `How have you used ${skill} in a production environment?`,
        sampleAnswer: `Describe a project where you used ${skill} to solve a real problem and mention measurable impact.`,
        difficulty: 'medium'
      }))
    },
    {
      category: 'Behavioral',
      difficulty: 'mixed',
      questions: [
        {
          question: 'Tell me about a time you handled ambiguity on a project.',
          sampleAnswer: 'Use a concise STAR response that shows how you clarified requirements and reduced risk.',
          difficulty: 'medium'
        }
      ]
    }
  ];
}

function fallbackRoadmap(currentSkills: string[], targetRole: string): RoadmapResult {
  return {
    targetRole,
    timeline: '3-6 months',
    technologies: [...new Set([...currentSkills, 'System Design', 'AI-assisted workflows', 'Cloud deployment'])].slice(0, 8),
    courses: [
      { title: 'Role-based foundations', provider: 'Internal roadmap' },
      { title: 'Production project build', provider: 'Hands-on practice' }
    ],
    projects: [
      { title: 'Portfolio-grade web app', impact: 'Demonstrates end-to-end product delivery', difficulty: 'medium' },
      { title: 'AI-enhanced automation tool', impact: 'Shows applied AI integration', difficulty: 'hard' }
    ],
    milestones: [
      { month: 'Month 1', goals: ['Strengthen fundamentals', 'Review the target role requirements'] },
      { month: 'Month 2', goals: ['Build a project', 'Document learning outcomes'] },
      { month: 'Month 3+', goals: ['Iterate on feedback', 'Start interviewing with confidence'] }
    ]
  };
}

function fallbackNotes(context: PageContext): NotesResult {
  const sentences = splitSentences(context.text, 4);
  return {
    notes: sentences.join(' '),
    flashcards: sentences.slice(0, 4).map((sentence) => ({ front: sentence.slice(0, 90), back: 'Review the context, explain the concept, and connect it to an example.' })),
    mcqs: [
      {
        question: 'What is the main idea of the article?',
        options: ['Implementation details', 'Core concepts', 'Irrelevant filler', 'Personal opinion'],
        answer: 'Core concepts',
        explanation: 'The summary should focus on the main learning points.'
      }
    ],
    revisionMaterial: sentences
  };
}

export async function summarizePage(context: PageContext): Promise<SummaryResult> {
  const prompt = `You are a senior career assistant. Summarize the following webpage for a user in JSON with conciseSummary, detailedSummary, keyTakeaways (array of strings), and actionItems (array of strings). Keep the output strictly valid JSON.\n\nTitle: ${context.title}\nURL: ${context.url}\nContent:\n${compactText(context.text)}`;
  const aiText = await callGemini(prompt);
  const parsed = aiText ? extractJsonPayload(aiText) : null;
  if (parsed && typeof parsed === 'object') return parsed as SummaryResult;
  return fallbackSummary(context);
}

export async function answerQuestion(context: PageContext, question: string): Promise<QnAResult> {
  const prompt = `Answer the user question using only the webpage context. Respond strictly in JSON with answer, evidence (array of short quotes), and confidence from 0 to 100.\n\nQuestion: ${question}\nTitle: ${context.title}\nContent:\n${compactText(context.text)}`;
  const aiText = await callGemini(prompt);
  const parsed = aiText ? extractJsonPayload(aiText) : null;
  if (parsed && typeof parsed === 'object') return parsed as QnAResult;
  return fallbackQna(context, question);
}

export async function matchResumeToJob(resumeText: string, jobText: string): Promise<MatchResult> {
  const prompt = `Compare the resume to the job description and return strictly valid JSON with matchScore, matchingSkills (array), missingSkills (array), and improvementSuggestions (array).\n\nResume:\n${compactText(resumeText)}\n\nJob Description:\n${compactText(jobText)}`;
  const aiText = await callGemini(prompt);
  const parsed = aiText ? extractJsonPayload(aiText) : null;
  if (parsed && typeof parsed === 'object') return parsed as MatchResult;
  return fallbackMatch(resumeText, jobText);
}

export async function analyzeSkillGap(resumeText: string, currentSkills: string[], jobText: string): Promise<SkillGapResult> {
  const prompt = `Generate a career skill gap analysis in strictly valid JSON with missingSkills, learningRoadmap (array of objects with phase, goals, estimatedTime), priorityRanking (array of objects with skill, priority, reason), and estimatedLearningTime.\n\nCurrent Skills: ${currentSkills.join(', ')}\nResume:\n${compactText(resumeText)}\n\nJob Description:\n${compactText(jobText)}`;
  const aiText = await callGemini(prompt);
  const parsed = aiText ? extractJsonPayload(aiText) : null;
  if (parsed && typeof parsed === 'object') return parsed as SkillGapResult;
  return fallbackSkillGap(resumeText, jobText);
}

export async function generateInterviewQuestions(resumeText: string, jobText: string): Promise<InterviewQuestionGroup[]> {
  const prompt = `Create interview questions in strictly valid JSON as an array of groups. Each group should contain category, difficulty, and questions (each with question, sampleAnswer, difficulty). Cover technical, behavioral, system design, and project-based prompts.\n\nResume:\n${compactText(resumeText)}\n\nJob Description:\n${compactText(jobText)}`;
  const aiText = await callGemini(prompt);
  const parsed = aiText ? extractJsonPayload(aiText) : null;
  if (Array.isArray(parsed)) return parsed as InterviewQuestionGroup[];
  return fallbackInterviewQuestions(resumeText, jobText);
}

export async function generateRoadmap(currentSkills: string[], targetRole: string): Promise<RoadmapResult> {
  const prompt = `Generate a career roadmap in strictly valid JSON with targetRole, timeline, technologies, courses, projects, and milestones.\n\nCurrent Skills: ${currentSkills.join(', ')}\nTarget Role: ${targetRole}`;
  const aiText = await callGemini(prompt);
  const parsed = aiText ? extractJsonPayload(aiText) : null;
  if (parsed && typeof parsed === 'object') return parsed as RoadmapResult;
  return fallbackRoadmap(currentSkills, targetRole);
}

export async function generateNotes(context: PageContext): Promise<NotesResult> {
  const prompt = `Turn the content into notes, flashcards, MCQs, and revision material. Respond in strictly valid JSON with notes, flashcards, mcqs, and revisionMaterial.\n\nContent:\n${compactText(context.text)}`;
  const aiText = await callGemini(prompt);
  const parsed = aiText ? extractJsonPayload(aiText) : null;
  if (parsed && typeof parsed === 'object') return parsed as NotesResult;
  return fallbackNotes(context);
}