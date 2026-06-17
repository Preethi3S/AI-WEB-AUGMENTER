import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AnalysisModel } from '../models/Analysis.js';
import { ResumeModel } from '../models/Resume.js';
import { JobDescriptionModel } from '../models/JobDescription.js';
import { InterviewQuestionsModel } from '../models/InterviewQuestions.js';
import { RoadmapModel } from '../models/Roadmap.js';
import { NotesModel } from '../models/Notes.js';

export const dashboardRouter = Router();

dashboardRouter.get(
  '/overview',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const [analysisCount, resumeCount, jobCount, interviewCount, roadmapCount, notesCount] = await Promise.all([
      AnalysisModel.countDocuments({ userId: authReq.user?.id }),
      ResumeModel.countDocuments({ userId: authReq.user?.id }),
      JobDescriptionModel.countDocuments({ userId: authReq.user?.id }),
      InterviewQuestionsModel.countDocuments({ userId: authReq.user?.id }),
      RoadmapModel.countDocuments({ userId: authReq.user?.id }),
      NotesModel.countDocuments({ userId: authReq.user?.id })
    ]);

    res.json({
      success: true,
      data: {
        metrics: {
          analyses: analysisCount,
          resumes: resumeCount,
          jobDescriptions: jobCount,
          interviewQuestionSets: interviewCount,
          roadmaps: roadmapCount,
          notes: notesCount
        }
      }
    });
  })
);

dashboardRouter.get(
  '/search',
  requireAuth,
  asyncHandler(async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const query = String(req.query.q ?? '').trim();

    if (!query) {
      res.json({ success: true, data: { results: [] } });
      return;
    }

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [analyses, resumes, jobs, interviews, roadmaps, notes] = await Promise.all([
      AnalysisModel.find({ userId: authReq.user?.id, title: regex }).sort({ createdAt: -1 }).limit(10).lean(),
      ResumeModel.find({ userId: authReq.user?.id, fileName: regex }).sort({ createdAt: -1 }).limit(10).lean(),
      JobDescriptionModel.find({ userId: authReq.user?.id, title: regex }).sort({ createdAt: -1 }).limit(10).lean(),
      InterviewQuestionsModel.find({ userId: authReq.user?.id, title: regex }).sort({ createdAt: -1 }).limit(10).lean(),
      RoadmapModel.find({ userId: authReq.user?.id, targetRole: regex }).sort({ createdAt: -1 }).limit(10).lean(),
      NotesModel.find({ userId: authReq.user?.id, title: regex }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    res.json({ success: true, data: { results: { analyses, resumes, jobs, interviews, roadmaps, notes } } });
  })
);