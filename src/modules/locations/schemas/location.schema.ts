import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'locations',
})
export class Location {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true, trim: true, maxlength: 255 })
  address: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 255,
  })
  place_id: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Number, required: true, min: -90, max: 90 })
  latitude: number;

  @Prop({ type: Number, required: true, min: -180, max: 180 })
  longitude: number;
}

export type LocationDocument = HydratedDocument<Location>;
export const LocationSchema = SchemaFactory.createForClass(Location);

LocationSchema.index({ createdBy: 1, place_id: 1 }, { unique: true });
