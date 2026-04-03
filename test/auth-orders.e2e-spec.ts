import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { AUTH_REPOSITORY } from '../src/modules/auth/repositories/auth.repository.token';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';
import { USER_REPOSITORY } from '../src/modules/users/repositories/user.repository.token';
import { TrucksController } from '../src/modules/trucks/trucks.controller';
import { TrucksService } from '../src/modules/trucks/trucks.service';
import { TRUCK_REPOSITORY } from '../src/modules/trucks/repositories/truck.repository.token';
import { TruckStatus } from '../src/modules/trucks/schemas/truck.schema';
import { LocationsController } from '../src/modules/locations/locations.controller';
import { LocationsService } from '../src/modules/locations/locations.service';
import { LOCATION_REPOSITORY } from '../src/modules/locations/repositories/location.repository.token';
import { GooglePlacesService } from '../src/modules/locations/google-places.service';
import { OrdersController } from '../src/modules/orders/orders.controller';
import { OrdersService } from '../src/modules/orders/orders.service';
import { ORDER_REPOSITORY } from '../src/modules/orders/repositories/order.repository.token';
import { OrderStatus } from '../src/modules/orders/schemas/order.schema';

type ObjectIdLike = { toString(): string };

interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthRecord {
  userId: string;
  password: string;
  maxLoginAttempts: number;
  loginAttempts: number;
  isBlocked: boolean;
  blockedUntil: Date | null;
  lastLogin: Date | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: Date | null;
}

interface TruckRecord {
  id: string;
  plate: string;
  model: string;
  color: string;
  year: string;
  capacityKg?: number | null;
  status: TruckStatus;
  createdBy: string;
  createdAt: Date;
}

interface LocationRecord {
  id: string;
  name: string;
  address: string;
  place_id: string;
  createdBy: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
}

interface StatusHistoryEntry {
  status: OrderStatus;
  changedAt: Date;
}

interface OrderRecord {
  id: string;
  createdBy: string;
  truckId: string;
  pickupId: string;
  dropoffId: string;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
}

const ACTIVE_ORDER_STATUSES = new Set<OrderStatus>([
  OrderStatus.CREATED,
  OrderStatus.ASSIGNED,
  OrderStatus.IN_TRANSIT,
]);

const toObjectId = (id: string): ObjectIdLike => ({
  toString: () => id,
});

class InMemoryUserRepository {
  private readonly users = new Map<string, UserRecord>();

  constructor(private readonly nextId: () => string) {}

  async create(input: {
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<any> {
    const duplicatedEmail = Array.from(this.users.values()).some(
      (user) => user.email === input.email,
    );
    if (duplicatedEmail) {
      throw { code: 11000 };
    }

    const record: UserRecord = {
      id: this.nextId(),
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
    };

    this.users.set(record.id, record);
    return this.toDocument(record);
  }

  async findByEmail(email: string): Promise<any | null> {
    const record = Array.from(this.users.values()).find(
      (user) => user.email === email,
    );

    return record ? this.toDocument(record) : null;
  }

  async findById(id: string): Promise<any | null> {
    const record = this.users.get(id);
    return record ? this.toDocument(record) : null;
  }

  async deleteById(id: string): Promise<void> {
    this.users.delete(id);
  }

  private toDocument(record: UserRecord): any {
    return {
      _id: toObjectId(record.id),
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
    };
  }
}

class InMemoryAuthRepository {
  private readonly authByUserId = new Map<string, AuthRecord>();

  async create(input: {
    userId: string;
    password: string;
    maxLoginAttempts: number;
  }): Promise<any> {
    if (this.authByUserId.has(input.userId)) {
      throw { code: 11000 };
    }

    const record: AuthRecord = {
      userId: input.userId,
      password: input.password,
      maxLoginAttempts: input.maxLoginAttempts,
      loginAttempts: 0,
      isBlocked: false,
      blockedUntil: null,
      lastLogin: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
    };

    this.authByUserId.set(input.userId, record);
    return this.toDocument(record);
  }

  async findByUserId(userId: string): Promise<any | null> {
    const record = this.authByUserId.get(userId);
    return record ? this.toDocument(record) : null;
  }

  async incrementLoginAttempts(
    userId: string,
    blockDurationMinutes: number,
  ): Promise<any | null> {
    const record = this.authByUserId.get(userId);
    if (!record) {
      return null;
    }

    record.loginAttempts += 1;
    if (record.loginAttempts >= record.maxLoginAttempts) {
      record.isBlocked = true;
      record.blockedUntil = new Date(Date.now() + blockDurationMinutes * 60 * 1000);
    }

    return this.toDocument(record);
  }

  async resetLoginAttempts(userId: string): Promise<any | null> {
    const record = this.authByUserId.get(userId);
    if (!record) {
      return null;
    }

    record.loginAttempts = 0;
    record.isBlocked = false;
    record.blockedUntil = null;

    return this.toDocument(record);
  }

  async updateLastLogin(userId: string, date: Date): Promise<any | null> {
    const record = this.authByUserId.get(userId);
    if (!record) {
      return null;
    }

    record.lastLogin = date;
    return this.toDocument(record);
  }

  async updateRefreshToken(
    userId: string,
    refreshTokenHash: string,
    refreshTokenExpiresAt: Date,
  ): Promise<any | null> {
    const record = this.authByUserId.get(userId);
    if (!record) {
      return null;
    }

    record.refreshToken = refreshTokenHash;
    record.refreshTokenExpiresAt = refreshTokenExpiresAt;

    return this.toDocument(record);
  }

  async clearRefreshToken(userId: string): Promise<void> {
    const record = this.authByUserId.get(userId);
    if (!record) {
      return;
    }

    record.refreshToken = null;
    record.refreshTokenExpiresAt = null;
  }

  private toDocument(record: AuthRecord): any {
    return {
      userId: record.userId,
      password: record.password,
      maxLoginAttempts: record.maxLoginAttempts,
      loginAttempts: record.loginAttempts,
      isBlocked: record.isBlocked,
      blockedUntil: record.blockedUntil,
      lastLogin: record.lastLogin,
      refreshToken: record.refreshToken,
      refreshTokenExpiresAt: record.refreshTokenExpiresAt,
    };
  }
}

class InMemoryTruckRepository {
  private readonly trucks = new Map<string, TruckRecord>();

  constructor(private readonly nextId: () => string) {}

  async create(input: {
    plate: string;
    model: string;
    color: string;
    year: string;
    capacityKg?: number;
    status: TruckStatus;
    createdBy: string;
  }): Promise<any> {
    const duplicatedPlate = Array.from(this.trucks.values()).some(
      (truck) => truck.plate === input.plate,
    );

    if (duplicatedPlate) {
      throw { code: 11000 };
    }

    const record: TruckRecord = {
      id: this.nextId(),
      plate: input.plate,
      model: input.model,
      color: input.color,
      year: input.year,
      capacityKg: input.capacityKg,
      status: input.status,
      createdBy: input.createdBy,
      createdAt: new Date(),
    };

    this.trucks.set(record.id, record);
    return this.toDocument(record);
  }

  async findByPlate(plate: string): Promise<any | null> {
    const record = Array.from(this.trucks.values()).find(
      (truck) => truck.plate === plate,
    );

    return record ? this.toDocument(record) : null;
  }

  async findAllByOwner(input: {
    userId: string;
    page: number;
    limit: number;
    status?: TruckStatus;
  }): Promise<{ items: any[]; total: number }> {
    const filtered = Array.from(this.trucks.values())
      .filter(
        (truck) =>
          truck.createdBy === input.userId &&
          (!input.status || truck.status === input.status),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (input.page - 1) * input.limit;
    const items = filtered
      .slice(start, start + input.limit)
      .map((truck) => this.toDocument(truck));

    return {
      items,
      total: filtered.length,
    };
  }

  async findByIdAndOwner(id: string, userId: string): Promise<any | null> {
    const record = this.trucks.get(id);
    if (!record || record.createdBy !== userId) {
      return null;
    }

    return this.toDocument(record);
  }

  async updateStatus(
    id: string,
    userId: string,
    status: TruckStatus,
  ): Promise<any | null> {
    const record = this.trucks.get(id);
    if (!record || record.createdBy !== userId) {
      return null;
    }

    record.status = status;
    return this.toDocument(record);
  }

  private toDocument(record: TruckRecord): any {
    return {
      _id: toObjectId(record.id),
      plate: record.plate,
      model: record.model,
      color: record.color,
      year: record.year,
      capacityKg: record.capacityKg,
      status: record.status,
      createdBy: toObjectId(record.createdBy),
      createdAt: record.createdAt,
    };
  }
}

class InMemoryLocationRepository {
  private readonly locations = new Map<string, LocationRecord>();

  constructor(private readonly nextId: () => string) {}

  async create(input: {
    name: string;
    address: string;
    place_id: string;
    createdBy: string;
    latitude: number;
    longitude: number;
  }): Promise<any> {
    const duplicated = Array.from(this.locations.values()).some(
      (location) =>
        location.createdBy === input.createdBy &&
        location.place_id === input.place_id,
    );

    if (duplicated) {
      throw { code: 11000 };
    }

    const record: LocationRecord = {
      id: this.nextId(),
      name: input.name,
      address: input.address,
      place_id: input.place_id,
      createdBy: input.createdBy,
      latitude: input.latitude,
      longitude: input.longitude,
      createdAt: new Date(),
    };

    this.locations.set(record.id, record);
    return this.toDocument(record);
  }

  async findByPlaceIdAndOwner(placeId: string, userId: string): Promise<any | null> {
    const record = Array.from(this.locations.values()).find(
      (location) =>
        location.createdBy === userId &&
        location.place_id === placeId,
    );

    return record ? this.toDocument(record) : null;
  }

  async findAllByOwner(input: {
    userId: string;
    page: number;
    limit: number;
    name?: string;
  }): Promise<{ items: any[]; total: number }> {
    const nameRegex = input.name ? new RegExp(input.name, 'i') : null;

    const filtered = Array.from(this.locations.values())
      .filter(
        (location) =>
          location.createdBy === input.userId &&
          (!nameRegex || nameRegex.test(location.name)),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (input.page - 1) * input.limit;
    const items = filtered
      .slice(start, start + input.limit)
      .map((location) => this.toDocument(location));

    return {
      items,
      total: filtered.length,
    };
  }

  async findByIdAndOwner(id: string, userId: string): Promise<any | null> {
    const record = this.locations.get(id);
    if (!record || record.createdBy !== userId) {
      return null;
    }

    return this.toDocument(record);
  }

  async updateNameByIdAndOwner(
    id: string,
    userId: string,
    name: string,
  ): Promise<any | null> {
    const record = this.locations.get(id);
    if (!record || record.createdBy !== userId) {
      return null;
    }

    record.name = name;
    return this.toDocument(record);
  }

  async deleteByIdAndOwner(id: string, userId: string): Promise<any | null> {
    const record = this.locations.get(id);
    if (!record || record.createdBy !== userId) {
      return null;
    }

    this.locations.delete(id);
    return this.toDocument(record);
  }

  private toDocument(record: LocationRecord): any {
    return {
      _id: toObjectId(record.id),
      name: record.name,
      address: record.address,
      place_id: record.place_id,
      createdBy: toObjectId(record.createdBy),
      latitude: record.latitude,
      longitude: record.longitude,
      createdAt: record.createdAt,
    };
  }
}

class InMemoryOrderRepository {
  private readonly orders = new Map<string, OrderRecord>();

  constructor(private readonly nextId: () => string) {}

  async create(input: {
    createdBy: string;
    truckId: string;
    pickupId: string;
    dropoffId: string;
    status: OrderStatus;
    statusHistory: StatusHistoryEntry[];
  }): Promise<any> {
    const duplicatedActiveOrder = Array.from(this.orders.values()).find(
      (order) =>
        order.truckId === input.truckId && ACTIVE_ORDER_STATUSES.has(order.status),
    );

    if (duplicatedActiveOrder) {
      throw { code: 11000 };
    }

    const record: OrderRecord = {
      id: this.nextId(),
      createdBy: input.createdBy,
      truckId: input.truckId,
      pickupId: input.pickupId,
      dropoffId: input.dropoffId,
      status: input.status,
      statusHistory: [...input.statusHistory],
      createdAt: new Date(),
    };

    this.orders.set(record.id, record);
    return this.toDocument(record);
  }

  async findAllByOwner(input: {
    userId: string;
    page: number;
    limit: number;
    status?: OrderStatus;
    createdFrom?: Date;
    createdTo?: Date;
  }): Promise<{ items: any[]; total: number }> {
    const filtered = Array.from(this.orders.values())
      .filter((order) => {
        if (order.createdBy !== input.userId) {
          return false;
        }

        if (input.status && order.status !== input.status) {
          return false;
        }

        if (input.createdFrom && order.createdAt.getTime() < input.createdFrom.getTime()) {
          return false;
        }

        if (input.createdTo && order.createdAt.getTime() > input.createdTo.getTime()) {
          return false;
        }

        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (input.page - 1) * input.limit;
    const items = filtered
      .slice(start, start + input.limit)
      .map((order) => this.toDocument(order));

    return {
      items,
      total: filtered.length,
    };
  }

  async findByIdAndOwner(id: string, userId: string): Promise<any | null> {
    const record = this.orders.get(id);
    if (!record || record.createdBy !== userId) {
      return null;
    }

    return this.toDocument(record);
  }

  async findActiveByTruck(
    truckId: string,
    excludeOrderId?: string,
  ): Promise<any | null> {
    const record = Array.from(this.orders.values()).find(
      (order) =>
        order.truckId === truckId &&
        ACTIVE_ORDER_STATUSES.has(order.status) &&
        (!excludeOrderId || order.id !== excludeOrderId),
    );

    return record ? this.toDocument(record) : null;
  }

  async updateStatusByIdAndOwner(
    id: string,
    userId: string,
    status: OrderStatus,
    statusHistoryEntry: StatusHistoryEntry,
  ): Promise<any | null> {
    const record = this.orders.get(id);
    if (!record || record.createdBy !== userId) {
      return null;
    }

    record.status = status;
    record.statusHistory.push(statusHistoryEntry);

    return this.toDocument(record);
  }

  private toDocument(record: OrderRecord): any {
    return {
      _id: toObjectId(record.id),
      createdBy: toObjectId(record.createdBy),
      truckId: toObjectId(record.truckId),
      pickupId: toObjectId(record.pickupId),
      dropoffId: toObjectId(record.dropoffId),
      status: record.status,
      statusHistory: record.statusHistory.map((entry) => ({
        status: entry.status,
        changedAt: entry.changedAt,
      })),
      createdAt: record.createdAt,
    };
  }
}

describe('Auth + Orders (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    let currentSequence = 1;
    const nextId = () => {
      const id = currentSequence.toString(16).padStart(24, '0');
      currentSequence += 1;
      return id;
    };

    const userRepository = new InMemoryUserRepository(nextId);
    const authRepository = new InMemoryAuthRepository();
    const truckRepository = new InMemoryTruckRepository(nextId);
    const locationRepository = new InMemoryLocationRepository(nextId);
    const orderRepository = new InMemoryOrderRepository(nextId);
    const googlePlacesService = {
      getLocationFromGoogle: async (placeId: string) => {
        const canonicalPlaceId = placeId.trim().toUpperCase();

        return {
          place_id: canonicalPlaceId,
          address: `Address for ${canonicalPlaceId}`,
          latitude: 10.1234,
          longitude: -58.9876,
        };
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-access-secret',
          signOptions: {
            algorithm: 'HS256',
          },
        }),
      ],
      controllers: [
        AuthController,
        TrucksController,
        LocationsController,
        OrdersController,
      ],
      providers: [
        AuthService,
        JwtStrategy,
        TrucksService,
        LocationsService,
        OrdersService,
        {
          provide: USER_REPOSITORY,
          useValue: userRepository,
        },
        {
          provide: AUTH_REPOSITORY,
          useValue: authRepository,
        },
        {
          provide: TRUCK_REPOSITORY,
          useValue: truckRepository,
        },
        {
          provide: LOCATION_REPOSITORY,
          useValue: locationRepository,
        },
        {
          provide: ORDER_REPOSITORY,
          useValue: orderRepository,
        },
        {
          provide: GooglePlacesService,
          useValue: googlePlacesService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const registerAndLogin = async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'reviewer@example.com',
        firstName: 'Review',
        lastName: 'User',
        password: 'Password123!',
      })
      .expect(201);

    expect(registerResponse.body.user.email).toBe('reviewer@example.com');

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'reviewer@example.com',
        password: 'Password123!',
      })
      .expect(201);

    return {
      accessToken: loginResponse.body.accessToken as string,
    };
  };

  const createTruckAndLocations = async (accessToken: string) => {
    const truckResponse = await request(app.getHttpServer())
      .post('/api/trucks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        plate: 'ABC123',
        model: 'Volvo FH16',
        color: 'Blue',
        year: '2023',
        capacityKg: 24000,
      })
      .expect(201);

    const pickupResponse = await request(app.getHttpServer())
      .post('/api/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Pickup Hub',
        place_id: 'place-a',
      })
      .expect(201);

    const dropoffResponse = await request(app.getHttpServer())
      .post('/api/locations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Dropoff Hub',
        place_id: 'place-b',
      })
      .expect(201);

    return {
      truckId: truckResponse.body.id as string,
      pickupId: pickupResponse.body.id as string,
      dropoffId: dropoffResponse.body.id as string,
    };
  };

  it('rejects access to orders endpoints without bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/api/orders').expect(401);

    expect(response.body.statusCode).toBe(401);
    expect(response.body.message).toBe('Unauthorized');
  });

  it('creates and updates an order through auth + orders flow', async () => {
    const { accessToken } = await registerAndLogin();
    const { truckId, pickupId, dropoffId } = await createTruckAndLocations(
      accessToken,
    );

    const createOrderResponse = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        truckId,
        pickupId,
        dropoffId,
      })
      .expect(201);

    expect(createOrderResponse.body.status).toBe(OrderStatus.CREATED);
    expect(createOrderResponse.body.statusHistory).toHaveLength(1);

    const updateOrderResponse = await request(app.getHttpServer())
      .patch(`/api/orders/${createOrderResponse.body.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: OrderStatus.ASSIGNED })
      .expect(200);

    expect(updateOrderResponse.body.status).toBe(OrderStatus.ASSIGNED);
    expect(updateOrderResponse.body.statusHistory).toHaveLength(2);

    const listResponse = await request(app.getHttpServer())
      .get('/api/orders?page=1&limit=20&status=ASSIGNED')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listResponse.body.total).toBe(1);
    expect(listResponse.body.items[0].id).toBe(createOrderResponse.body.id);
    expect(listResponse.body.items[0].status).toBe(OrderStatus.ASSIGNED);
  });

  it('returns 409 for invalid transition from CREATED to DELIVERED', async () => {
    const { accessToken } = await registerAndLogin();
    const { truckId, pickupId, dropoffId } = await createTruckAndLocations(
      accessToken,
    );

    const createOrderResponse = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        truckId,
        pickupId,
        dropoffId,
      })
      .expect(201);

    const invalidTransitionResponse = await request(app.getHttpServer())
      .patch(`/api/orders/${createOrderResponse.body.id}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: OrderStatus.DELIVERED })
      .expect(409);

    expect(invalidTransitionResponse.body.message).toContain(
      'Invalid status transition from CREATED to DELIVERED',
    );
  });
});
