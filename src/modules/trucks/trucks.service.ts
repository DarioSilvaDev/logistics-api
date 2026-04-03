import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
} from '../../common/dto/pagination-query.dto';
import type { PaginatedResponse } from '../../common/interfaces/pagination.interface';
import { CreateTruckDto } from './dto/create-truck.dto';
import { FindTrucksQueryDto } from './dto/find-trucks-query.dto';
import { UpdateTruckStatusDto } from './dto/update-truck-status.dto';
import { ORDER_REPOSITORY } from '../orders/repositories/order.repository.token';
import type { IOrderRepository } from '../orders/repositories/order.repository.interface';
import { TRUCK_REPOSITORY } from './repositories/truck.repository.token';
import type { ITruckRepository } from './repositories/truck.repository.interface';
import { TruckDocument, TruckStatus } from './schemas/truck.schema';

export interface TruckResponse {
  id: string;
  plate: string;
  model: string;
  color: string;
  year: string;
  capacityKg?: number;
  status: TruckStatus;
  createdBy: string;
}

@Injectable()
export class TrucksService {
  constructor(
    @Inject(TRUCK_REPOSITORY)
    private readonly truckRepository: ITruckRepository,
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
  ) {}

  /**
   * Crea un nuevo truck asociado al usuario autenticado.
   * @param userId ID del usuario que crea el truck.
   * @param dto DTO con los datos del truck a crear.
   * @throws BadRequestException si el anio del truck no cumple el formato esperado.
   * @throws ConflictException si ya existe un truck con la misma placa.
   * @returns La respuesta del truck creado.
   */
  async create(userId: string, dto: CreateTruckDto): Promise<TruckResponse> {
    const plate = dto.plate.trim().toUpperCase();
    const model = dto.model.trim();
    const color = dto.color.trim();
    const year = dto.year.trim();

    this.assertValidYear(year);

    const existingTruck = await this.truckRepository.findByPlate(plate);
    if (existingTruck) {
      throw new ConflictException('Truck plate already exists');
    }

    const truck = await this.truckRepository.create({
      plate,
      model,
      color,
      year,
      capacityKg: dto.capacityKg,
      status: dto.status ?? TruckStatus.AVAILABLE,
      createdBy: userId,
    });

    return this.mapTruck(truck);
  }
  /**
   * Obtiene todos los trucks pertenecientes a un usuario especifico.
   * @param userId ID del usuario propietario de los trucks a consultar.
   * @throws Error si ocurre una falla en la capa de persistencia.
   * @returns Resultado paginado de trucks pertenecientes al usuario.
   */
  async findAll(
    userId: string,
    query: FindTrucksQueryDto,
  ): Promise<PaginatedResponse<TruckResponse>> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const result = await this.truckRepository.findAllByOwner({
      userId,
      page,
      limit,
      status: query.status,
    });

    const totalPages = Math.max(1, Math.ceil(result.total / limit));

    return {
      items: result.items.map((truck) => this.mapTruck(truck)),
      page,
      limit,
      total: result.total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
  /**
   * Obtiene un truck por su ID si pertenece al usuario especifico.
   * @param userId ID del usuario propietario del truck a consultar.
   * @param truckId ID del truck a consultar.
   * @throws BadRequestException si el ID del truck no es un ObjectId valido.
   * @throws NotFoundException si no se encuentra un truck con el ID especificado perteneciente al usuario.
   * @returns El truck encontrado.
   */
  async findById(userId: string, truckId: string): Promise<TruckResponse> {
    this.assertValidObjectId(truckId);

    const truck = await this.truckRepository.findByIdAndOwner(truckId, userId);
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    return this.mapTruck(truck);
  }

  /**
   * Actualiza el estado de un truck perteneciente a un usuario especifico.
   * @param userId ID del usuario propietario del truck a actualizar.
   * @param truckId ID del truck a actualizar.
   * @param dto DTO con el nuevo estado del truck.
   * @throws BadRequestException si el ID del truck no es un ObjectId valido o si el nuevo estado no es valido.
   * @throws NotFoundException si no se encuentra un truck con el ID especificado perteneciente al usuario.
   * @returns El truck actualizado.
   */
  async updateStatus(
    userId: string,
    truckId: string,
    dto: UpdateTruckStatusDto,
  ): Promise<TruckResponse> {
    this.assertValidObjectId(truckId);

    const truck = await this.truckRepository.updateStatus(
      truckId,
      userId,
      dto.status,
    );
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    return this.mapTruck(truck);
  }

  /**
   * Soft deletes a truck owned by the authenticated user.
   * @param userId ID of the authenticated owner.
   * @param truckId ID of the truck to remove.
   * @throws BadRequestException if truck id is invalid.
   * @throws NotFoundException if truck does not exist for the user.
   * @throws ConflictException if truck has active orders.
   * @returns Promise that resolves when truck is soft deleted.
   */
  async remove(userId: string, truckId: string): Promise<void> {
    this.assertValidObjectId(truckId);

    const truck = await this.truckRepository.findByIdAndOwner(truckId, userId);
    if (!truck) {
      throw new NotFoundException('Truck not found');
    }

    const activeOrder = await this.orderRepository.findActiveByTruck(truckId);
    if (activeOrder) {
      throw new ConflictException('Truck has active orders');
    }

    const deletedTruck = await this.truckRepository.softDeleteByIdAndOwner(
      truckId,
      userId,
    );
    if (!deletedTruck) {
      throw new NotFoundException('Truck not found');
    }
  }

  /**
   * Verifica si un ID es un ObjectId valido.
   * @param id ID a verificar.
   * @throws BadRequestException si el ID no es un ObjectId valido.
   * @returns Nada; solo valida o lanza una excepcion.
   */
  private assertValidObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid truck id');
    }
  }

  /**
   * Verifica si un anio es valido. Debe tener 4 digitos numericos y no superar el anio actual.
   * @param year Anio a verificar.
   * @throws BadRequestException si el anio no es valido.
   * @returns Nada; solo valida o lanza una excepcion.
   */
  private assertValidYear(year: string): void {
    if (!/^\d{4}$/.test(year)) {
      throw new BadRequestException('Invalid truck year');
    }

    const currentYear = new Date().getFullYear();
    if (Number(year) > currentYear) {
      throw new BadRequestException(
        'Truck year cannot be greater than current year',
      );
    }
  }

  /**
   * Mapea un documento de truck a una respuesta de truck.
   * @param truck Documento de truck a mapear.
   * @throws Error no aplica de forma explicita durante el mapeo.
   * @returns Respuesta de truck mapeada.
   */
  private mapTruck(truck: TruckDocument): TruckResponse {
    return {
      id: truck._id.toString(),
      plate: truck.plate,
      model: truck.model,
      color: truck.color,
      year: truck.year,
      capacityKg: truck.capacityKg ?? undefined,
      status: truck.status,
      createdBy: truck.createdBy.toString(),
    };
  }
}
