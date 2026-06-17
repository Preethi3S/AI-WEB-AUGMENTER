import { Schema, model, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    avatarUrl: { type: String, default: '' },
    lastLoginAt: { type: Date }
  },
  { timestamps: true, versionKey: false }
);

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);