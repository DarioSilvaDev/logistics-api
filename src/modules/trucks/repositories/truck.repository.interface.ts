import type { PaginatedQueryResult } from '../../../common/interfaces/pagination.interface';
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

export interface FindTrucksByOwnerRepositoryInput {
  userId: string;
  page: number;
  limit: number;
  status?: TruckStatus;
}

export interface ITruckRepository {
  create(input: CreateTruckRepositoryInput): Promise<TruckDocument>;
  findByPlate(plate: string): Promise<TruckDocument | null>;
  findAllByOwner(
    input: FindTrucksByOwnerRepositoryInput,
  ): Promise<PaginatedQueryResult<TruckDocument>>;
  findByIdAndOwner(id: string, userId: string): Promise<TruckDocument | null>;
  updateStatus(
    id: string,
    userId: string,
    status: TruckStatus,
  ): Promise<TruckDocument | null>;
}
