import { Schema, model, type HydratedDocument, type InferSchemaType } from 'mongoose';
import { ROLES } from '../types/domain';

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // Stored lower-cased so "A@x.com" and "a@x.com" are the same account.
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    // Never returned by queries unless explicitly requested with .select('+passwordHash').
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
  },
  { timestamps: true },
);

export type UserFields = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserFields>;
export const User = model('User', userSchema);
