import type { PaginatedQueryResult } from '../../../common/interfaces/pagination.interface';
import { LocationDocument } from '../schemas/location.schema';

export interface CreateLocationRepositoryInput {
  name: string;
  address: string;
  place_id: string;
  createdBy: string;
  latitude: number;
  longitude: number;
}

export interface FindLocationsByOwnerRepositoryInput {
  userId: string;
  page: number;
  limit: number;
  name?: string;
}

export interface ILocationRepository {
  create(input: CreateLocationRepositoryInput): Promise<LocationDocument>;
  findByPlaceIdAndOwner(
    placeId: string,
    userId: string,
  ): Promise<LocationDocument | null>;
  findAllByOwner(
    input: FindLocationsByOwnerRepositoryInput,
  ): Promise<PaginatedQueryResult<LocationDocument>>;
  findByIdAndOwner(
    id: string,
    userId: string,
  ): Promise<LocationDocument | null>;
  updateNameByIdAndOwner(
    id: string,
    userId: string,
    name: string,
  ): Promise<LocationDocument | null>;
  deleteByIdAndOwner(
    id: string,
    userId: string,
  ): Promise<LocationDocument | null>;
}
