import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { extractPageContext, extractResumeFromUpload } from '../services/document.service.js';
import {
  answerQuestion,
  analyzeSkillGap,
  generateInterviewQuestions,
  generateNotes,
  generateRoadmap,
  matchResumeToJob,
  summarizePage
} from '../services/ai.js';
import { AnalysisModel } from '../models/Analysis.js';
import { ResumeModel } from '../models/Resume.js';
import { JobDescriptionModel } from '../models/JobDescription.js';
import { InterviewQuestionsModel } from '../models/InterviewQuestions.js';
import { RoadmapModel } from '../models/Roadmap.js';
import { NotesModel } from '../models/Notes.js';
import { extractSkills, compactText } from '../services/heuristics.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const pageSchema = z.object({
  title: z.string().default('Untitled Page'),
  url: z.string().default(''),
  text: z.string().min(1),
  selectedText: z.string().optional(),
  metadata: z.record(z.union([z.string(), z.array(z.string())])).optional()
});

const questionSchema = pageSchema.extend({ question: z.string().min(3) });
const matchSchema = z.object({ resumeText: z.string().min(1), jobText: z.string().min(1) });
const skillGapSchema = z.object({ resumeText: z.string().min(1), currentSkills: z.array(z.string()).default([]), jobText: z.string().min(1) });
const interviewSchema = z.object({ resumeText: z.string().min(1), jobText: z.string().min(1) });
const roadmapSchema = z.object({ currentSkills: z.array(z.string()).default([]), targetRole: z.string().min(2) });

export const analysisRouter = Router();

analysisRouter.post(
  '/summaries',
  requireAuth,
  validateBody(pageSchema),
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const context = extractPageContext(req.body as z.infer<typeof pageSchema>);
    const result = await summarizePage(context);

    const saved = await AnalysisModel.create({
      userId: authReq.user?.id,
      kind: 'summary',
      title: context.title,
      pageUrl: context.url,
      inputContext: context,
      output: result,
      tags: extractSkills(context.text)
    });

    res.json({ success: true, data: { result, analysisId: saved._id } });
  })
);

analysisRouter.post(
  '/questions',
  requireAuth,
  validateBody(questionSchema),
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { question, ...page } = req.body as z.infer<typeof questionSchema>;
    const context = extractPageContext(page);
    const result = await answerQuestion(context, question);

    await AnalysisModel.create({
      userId: authReq.user?.id,
      kind: 'qa',
      title: `Q&A: ${context.title}`,
      pageUrl: context.url,
      inputContext: { context, question },
      output: result,
      tags: extractSkills(compactText(context.text))
    });

    res.json({ success: true, data: { result } });
  })
);

analysisRouter.post(
  '/match-resume',
  requireAuth,
  validateBody(matchSchema),
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const { resumeText, jobText } = req.body as z.infer<typeof matchSchema>;
    const result = await matchResumeToJob(resumeText, jobText);

    const savedResume = await ResumeModel.create({
      userId: authReq.user?.id,
      fileName: 'Uploaded Resume',
      rawText: resumeText,
      summary: resumeText.slice(0, 500),
      skills: extractSkills(resumeText),
      tags: ['resume']
    });

    const savedJob = await JobDescriptionModel.create({
      userId: authReq.user?.id,
      title: 'Matched Job Description',
      content: jobText,
      skills: extractSkills(jobText),
      tags: ['job-description']
    });

    await AnalysisModel.create({
      userId: authReq.user?.id,
      kind: 'resume-match',
      title: 'Resume vs Job Match',
      inputContext: { resumeText, jobText },
      output: result,
      score: result.matchScore,
      tags: ['resume', 'job-match']
    });

    res.json({ success: true, data: { result, resumeId: savedResume._id, jobDescriptionId: savedJob._id } });
  })
);

analysisRouter.post(
  '/skill-gap',
  requireAuth,
  validateBody(skillGapSchema),
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const payload = req.body as z.infer<typeof skillGapSchema>;
    const result = await analyzeSkillGap(payload.resumeText, payload.currentSkills, payload.jobText);

    await AnalysisModel.create({
      userId: authReq.user?.id,
      kind: 'skill-gap',
      title: 'Skill Gap Analysis',
      inputContext: payload,
      output: result,
      tags: result.missingSkills
    });

    res.json({ success: true, data: { result } });
  })
);

analysisRouter.post(
  '/interview-questions',
  requireAuth,
  validateBody(interviewSchema),
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const payload = req.body as z.infer<typeof interviewSchema>;
    const result = await generateInterviewQuestions(payload.resumeText, payload.jobText);

    const saved = await InterviewQuestionsModel.create({
      userId: authReq.user?.id,
      title: 'Interview Questions',
      questions: result,
      difficulty: 'mixed'
    });

    res.json({ success: true, data: { result, interviewQuestionsId: saved._id } });
  })
);

analysisRouter.post(
  '/roadmap',
  requireAuth,
  validateBody(roadmapSchema),
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const payload = req.body as z.infer<typeof roadmapSchema>;
    const result = await generateRoadmap(payload.currentSkills, payload.targetRole);

    const saved = await RoadmapModel.create({
      userId: authReq.user?.id,
      targetRole: payload.targetRole,
      currentSkills: payload.currentSkills,
      timeline: result.timeline,
      milestones: result.milestones,
      projects: result.projects,
      resources: result.courses
    });

    res.json({ success: true, data: { result, roadmapId: saved._id } });
  })
);

analysisRouter.post(
  '/notes',
  requireAuth,
  validateBody(pageSchema),
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const context = extractPageContext(req.body as z.infer<typeof pageSchema>);
    const result = await generateNotes(context);

    const saved = await NotesModel.create({
      userId: authReq.user?.id,
      title: context.title,
      sourceType: 'article',
      sourceUrl: context.url,
      notes: result.notes,
      flashcards: result.flashcards,
      mcqs: result.mcqs,
      revisionMaterial: result.revisionMaterial
    });

    await AnalysisModel.create({
      userId: authReq.user?.id,
      kind: 'notes',
      title: `Notes: ${context.title}`,
      pageUrl: context.url,
      inputContext: context,
      output: result,
      tags: ['notes']
    });

    res.json({ success: true, data: { result, notesId: saved._id } });
  })
);

analysisRouter.post(
  '/resumes/upload',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    if (!req.file) {
      throw new AppError('Resume PDF file is required', 400);
    }

    const extracted = await extractResumeFromUpload(req.file);
    const resume = await ResumeModel.create({
      userId: authReq.user?.id,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      rawText: extracted.rawText,
      summary: extracted.summary,
      skills: extracted.skills,
      tags: ['uploaded', 'pdf']
    });

    res.status(201).json({ success: true, data: { resume } });
  })
);

analysisRouter.get(
  '/resumes',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const resumes = await ResumeModel.find({ userId: authReq.user?.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: { resumes } });
  })
);

analysisRouter.get(
  '/saved',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const [analyses, resumes, jobs, interviews, roadmaps, notes] = await Promise.all([
      AnalysisModel.find({ userId: authReq.user?.id }).sort({ createdAt: -1 }).limit(20).lean(),
      ResumeModel.find({ userId: authReq.user?.id }).sort({ createdAt: -1 }).limit(10).lean(),
      JobDescriptionModel.find({ userId: authReq.user?.id }).sort({ createdAt: -1 }).limit(10).lean(),
      InterviewQuestionsModel.find({ userId: authReq.user?.id }).sort({ createdAt: -1 }).limit(10).lean(),
      RoadmapModel.find({ userId: authReq.user?.id }).sort({ createdAt: -1 }).limit(10).lean(),
      NotesModel.find({ userId: authReq.user?.id }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    res.json({ success: true, data: { analyses, resumes, jobs, interviews, roadmaps, notes } });
  })
);