import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'auth',
})
export class Auth {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: String, default: null, select: false })
  refreshToken: string | null;

  @Prop({ type: Date, default: null })
  refreshTokenExpiresAt: Date | null;

  @Prop({ default: 0, min: 0 })
  loginAttempts: number;

  @Prop({ default: 5, min: 1 })
  maxLoginAttempts: number;

  @Prop({ default: false })
  isBlocked: boolean;

  @Prop({ type: Date, default: null })
  blockedUntil: Date | null;

  @Prop({ type: Date, default: null })
  lastLogin: Date | null;
}

export type AuthDocument = HydratedDocument<Auth>;
export const AuthSchema = SchemaFactory.createForClass(Auth);

AuthSchema.index({ isBlocked: 1, blockedUntil: 1 });
AuthSchema.index({ refreshTokenExpiresAt: 1 });
