import { Schema, model, type InferSchemaType, Types } from 'mongoose';

const notesSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    sourceType: { type: String, default: 'article' },
    sourceUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    flashcards: { type: [Schema.Types.Mixed], default: [] },
    mcqs: { type: [Schema.Types.Mixed], default: [] },
    revisionMaterial: { type: [Schema.Types.Mixed], default: [] }
  },
  { timestamps: true, versionKey: false }
);

export type Notes = InferSchemaType<typeof notesSchema> & { userId: Types.ObjectId };
export const NotesModel = model('Notes', notesSchema);