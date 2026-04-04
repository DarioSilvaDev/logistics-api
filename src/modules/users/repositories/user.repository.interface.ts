import { UserDocument } from '../schemas/user.schema';

export interface CreateUserRepositoryInput {
  email: string;
  firstName: string;
  lastName: string;
}

export interface UpdateUserRepositoryInput {
  firstName: string;
  lastName: string;
}

export interface IUserRepository {
  create(input: CreateUserRepositoryInput): Promise<UserDocument>;
  findByEmail(
    email: string,
    includeDeleted?: boolean,
  ): Promise<UserDocument | null>;
  findById(id: string, includeDeleted?: boolean): Promise<UserDocument | null>;
  updateById(
    id: string,
    input: UpdateUserRepositoryInput,
  ): Promise<UserDocument | null>;
  softDeleteById(id: string): Promise<UserDocument | null>;
  reactivateById(
    id: string,
    input: UpdateUserRepositoryInput,
  ): Promise<UserDocument | null>;
  deleteById(id: string): Promise<void>;
}
