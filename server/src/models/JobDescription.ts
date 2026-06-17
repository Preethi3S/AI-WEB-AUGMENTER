import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const jobDescriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: '' },
    company: { type: String, default: '' },
    url: { type: String, default: '' },
    content: { type: String, required: true },
    skills: { type: [String], default: [] },
    salaryRange: { type: String, default: '' },
    location: { type: String, default: '' },
    tags: { type: [String], default: [] }
  },
  { timestamps: true, versionKey: false }
);

export type JobDescription = InferSchemaType<typeof jobDescriptionSchema> & { userId: Types.ObjectId };
export const JobDescriptionModel = model('JobDescription', jobDescriptionSchema);