import { UserDocument } from '../schemas/user.schema';

export interface CreateUserRepositoryInput {
  email: string;
  firstName: string;
  lastName: string;
}

export interface IUserRepository {
  create(input: CreateUserRepositoryInput): Promise<UserDocument>;
  findByEmail(email: string): Promise<UserDocument | null>;
  findById(id: string): Promise<UserDocument | null>;
  deleteById(id: string): Promise<void>;
}
