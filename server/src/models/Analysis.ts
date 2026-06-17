import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const analysisSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: {
      type: String,
      enum: ['summary', 'qa', 'resume-match', 'skill-gap', 'interview-questions', 'roadmap', 'notes'],
      required: true,
      index: true
    },
    title: { type: String, required: true },
    pageUrl: { type: String, default: '' },
    score: { type: Number, default: 0 },
    inputContext: { type: Schema.Types.Mixed, default: {} },
    output: { type: Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] }
  },
  { timestamps: true, versionKey: false }
);

export type Analysis = InferSchemaType<typeof analysisSchema> & { userId: Types.ObjectId };
export const AnalysisModel = model('Analysis', analysisSchema);