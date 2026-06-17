export type PageContext = {
  title: string;
  url: string;
  text: string;
  selectedText?: string;
  metadata?: Record<string, string | string[]>;
};

export type SummaryResult = {
  conciseSummary: string;
  detailedSummary: string;
  keyTakeaways: string[];
  actionItems: string[];
};

export type QnAResult = {
  answer: string;
  evidence: string[];
  confidence: number;
};

export type MatchResult = {
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  improvementSuggestions: string[];
};

export type SkillGapResult = {
  missingSkills: string[];
  learningRoadmap: { phase: string; goals: string[]; estimatedTime: string }[];
  priorityRanking: { skill: string; priority: 'high' | 'medium' | 'low'; reason: string }[];
  estimatedLearningTime: string;
};

export type InterviewQuestionGroup = {
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questions: { question: string; sampleAnswer: string; difficulty: string }[];
};

export type RoadmapResult = {
  targetRole: string;
  timeline: string;
  technologies: string[];
  courses: { title: string; provider: string; link?: string }[];
  projects: { title: string; impact: string; difficulty: string }[];
  milestones: { month: string; goals: string[] }[];
};

export type NotesResult = {
  notes: string;
  flashcards: { front: string; back: string }[];
  mcqs: { question: string; options: string[]; answer: string; explanation: string }[];
  revisionMaterial: string[];
};