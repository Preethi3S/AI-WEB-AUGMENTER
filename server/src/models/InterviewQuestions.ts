import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const interviewQuestionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume' },
    jobDescriptionId: { type: Schema.Types.ObjectId, ref: 'JobDescription' },
    title: { type: String, required: true },
    questions: { type: [Schema.Types.Mixed], default: [] },
    difficulty: { type: String, default: 'mixed' },
    notes: { type: String, default: '' }
  },
  { timestamps: true, versionKey: false }
);

export type InterviewQuestions = InferSchemaType<typeof interviewQuestionSchema> & { userId: Types.ObjectId };
export const InterviewQuestionsModel = model('InterviewQuestions', interviewQuestionSchema);