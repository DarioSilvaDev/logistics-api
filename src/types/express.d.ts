import type { RequestUser } from '../common/interfaces/request-user.interface';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: RequestUser;
    }
  }
}

export {};
