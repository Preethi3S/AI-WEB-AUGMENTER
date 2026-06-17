import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const resumeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    fileType: { type: String, default: 'application/pdf' },
    rawText: { type: String, required: true },
    summary: { type: String, default: '' },
    skills: { type: [String], default: [] },
    sourceUrl: { type: String, default: '' },
    tags: { type: [String], default: [] }
  },
  { timestamps: true, versionKey: false }
);

export type Resume = InferSchemaType<typeof resumeSchema> & { userId: Types.ObjectId };
export const ResumeModel = model('Resume', resumeSchema);