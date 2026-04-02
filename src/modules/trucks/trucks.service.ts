import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateTruckDto } from './dto/create-truck.dto';
import { UpdateTruckStatusDto } from './dto/update-truck-status.dto';
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
  ) { }

  /**
   * Crea un nuevo truck.
   * @param userId ID del usuario que crea el truck.
   * @param dto DTO con los datos del truck a crear.
   * @throws BadRequestException si el año del truck no es valido o si el ID del usuario no es un ObjectId valido.
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
   * @returns Lista de trucks pertenecientes al usuario. Si el usuario no tiene trucks, se retorna una lista vacia.
   * @throws BadRequestException si el ID del usuario no es un ObjectId valido.
   * @throws NotFoundException si no se encuentran trucks para el usuario. 
   */
  async findAll(userId: string): Promise<TruckResponse[]> {
    const trucks = await this.truckRepository.findAllByOwner(userId);
    return trucks.map((truck) => this.mapTruck(truck));
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
   * Verifica si un ID es un ObjectId valido.
   * @param id ID a verificar.
   * @throws BadRequestException si el ID no es un ObjectId valido.
   */
  private assertValidObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid truck id');
    }
  }

  /**
   * Verifica si un año es valido. Un año valido debe ser un string de 4 digitos numericos y no puede ser mayor al año actual.
   * @param year Año a verificar.
   * @throws BadRequestException si el año no es valido.
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
