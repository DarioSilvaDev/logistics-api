import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'users',
})
export class User {
  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
    maxlength: 255,
  })
  email: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  firstName: string;

  @Prop({ required: true, trim: true, maxlength: 100 })
  lastName: string;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
