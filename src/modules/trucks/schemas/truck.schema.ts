import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum TruckStatus {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  IN_MAINTENANCE = 'IN_MAINTENANCE',
  INACTIVE = 'INACTIVE',
}

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'trucks',
})
export class Truck {
  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
    uppercase: true,
    maxlength: 20,
  })
  plate: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  model: string;

  @Prop({ required: true, trim: true, maxlength: 50 })
  color: string;

  @Prop({
    required: true,
    trim: true,
    minlength: 4,
    maxlength: 4,
    match: /^\d{4}$/,
    validate: {
      validator: (value: string) => Number(value) <= new Date().getFullYear(),
      message: 'Truck year cannot be greater than current year',
    },
  })
  year: string;

  @Prop({ type: Number, required: false, min: 0, default: null })
  capacityKg?: number | null;

  @Prop({
    required: true,
    enum: TruckStatus,
    default: TruckStatus.AVAILABLE,
    index: true,
  })
  status: TruckStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;
}

export type TruckDocument = HydratedDocument<Truck>;
export const TruckSchema = SchemaFactory.createForClass(Truck);
