import { TruckDocument, TruckStatus } from '../schemas/truck.schema';

export interface CreateTruckRepositoryInput {
  plate: string;
  model: string;
  color: string;
  year: string;
  capacityKg?: number;
  status: TruckStatus;
  createdBy: string;
}

export interface ITruckRepository {
  create(input: CreateTruckRepositoryInput): Promise<TruckDocument>;
  findByPlate(plate: string): Promise<TruckDocument | null>;
  findAllByOwner(userId: string): Promise<TruckDocument[]>;
  findByIdAndOwner(id: string, userId: string): Promise<TruckDocument | null>;
  updateStatus(
    id: string,
    userId: string,
    status: TruckStatus,
  ): Promise<TruckDocument | null>;
}
