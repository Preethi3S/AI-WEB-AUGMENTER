import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const roadmapSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetRole: { type: String, required: true },
    currentSkills: { type: [String], default: [] },
    timeline: { type: String, default: '' },
    milestones: { type: [Schema.Types.Mixed], default: [] },
    resources: { type: [Schema.Types.Mixed], default: [] },
    projects: { type: [Schema.Types.Mixed], default: [] }
  },
  { timestamps: true, versionKey: false }
);

export type Roadmap = InferSchemaType<typeof roadmapSchema> & { userId: Types.ObjectId };
export const RoadmapModel = model('Roadmap', roadmapSchema);