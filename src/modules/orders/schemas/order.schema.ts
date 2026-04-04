import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum OrderStatus {
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CREATED,
  OrderStatus.ASSIGNED,
  OrderStatus.IN_TRANSIT,
];

export const RESERVED_TRUCK_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.ASSIGNED,
  OrderStatus.IN_TRANSIT,
];

@Schema({ _id: false, versionKey: false })
export class OrderStatusHistoryEntry {
  @Prop({ required: true, enum: OrderStatus })
  status: OrderStatus;

  @Prop({ type: Date, required: true })
  changedAt: Date;
}

export const OrderStatusHistoryEntrySchema = SchemaFactory.createForClass(
  OrderStatusHistoryEntry,
);

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'orders',
})
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Truck', required: true })
  truckId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Location', required: true, index: true })
  pickupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Location', required: true, index: true })
  dropoffId: Types.ObjectId;

  @Prop({
    required: true,
    enum: OrderStatus,
    default: OrderStatus.CREATED,
    index: true,
  })
  status: OrderStatus;

  @Prop({ type: [OrderStatusHistoryEntrySchema], default: [] })
  statusHistory: OrderStatusHistoryEntry[];
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ createdBy: 1, createdAt: -1 });
OrderSchema.index(
  { truckId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: RESERVED_TRUCK_ORDER_STATUSES },
    },
  },
);
