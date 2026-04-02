import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LOCATION_REPOSITORY } from './repositories/location.repository.token';
import type { ILocationRepository } from './repositories/location.repository.interface';
import { LocationDocument } from './schemas/location.schema';
import { GooglePlacesService } from './google-places.service';

export interface LocationResponse {
  id: string;
  name: string;
  address: string;
  place_id: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class LocationsService {
  constructor(
    @Inject(LOCATION_REPOSITORY)
    private readonly locationRepository: ILocationRepository,
    private readonly googlePlacesService: GooglePlacesService,
  ) {}

  /**
   * Crea una ubicacion para el usuario validando duplicados y enriqueciendo datos con Google Places.
   * @param userId Identificador del usuario propietario de la ubicacion.
   * @param dto Datos de entrada de la ubicacion.
   * @throws BadRequestException si el nombre o el place_id son invalidos.
   * @throws ConflictException si ya existe una ubicacion con el mismo place_id para el usuario.
   * @throws BadGatewayException si Google Places responde con datos invalidos.
   * @throws ServiceUnavailableException si Google Places no esta disponible.
   * @returns La ubicacion creada en formato de respuesta.
   */
  async create(
    userId: string,
    dto: CreateLocationDto,
  ): Promise<LocationResponse> {
    const name = dto.name.trim();
    const placeId = dto.place_id.trim();

    if (!name || !placeId) {
      throw new BadRequestException('Invalid location payload');
    }

    const existingLocation =
      await this.locationRepository.findByPlaceIdAndOwner(placeId, userId);
    if (existingLocation) {
      throw new ConflictException('Location already exists for this user');
    }

    const googleLocation =
      await this.googlePlacesService.getLocationFromGoogle(placeId);

    const existingCanonicalLocation =
      await this.locationRepository.findByPlaceIdAndOwner(
        googleLocation.place_id,
        userId,
      );
    if (existingCanonicalLocation) {
      throw new ConflictException('Location already exists for this user');
    }

    try {
      const location = await this.locationRepository.create({
        name,
        address: googleLocation.address,
        place_id: googleLocation.place_id,
        createdBy: userId,
        latitude: googleLocation.latitude,
        longitude: googleLocation.longitude,
      });

      return this.mapLocation(location);
    } catch (error: unknown) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException('Location already exists for this user');
      }
      throw error;
    }
  }

  /**
   * Lista todas las ubicaciones registradas por un usuario.
   * @param userId Identificador del usuario propietario de las ubicaciones.
   * @throws Error si el repositorio falla durante la consulta.
   * @returns La coleccion de ubicaciones del usuario.
   */
  async findAll(userId: string): Promise<LocationResponse[]> {
    const locations = await this.locationRepository.findAllByOwner(userId);
    return locations.map((location) => this.mapLocation(location));
  }

  /**
   * Busca una ubicacion por su identificador y valida que pertenezca al usuario.
   * @param userId Identificador del usuario propietario de la ubicacion.
   * @param locationId Identificador de la ubicacion a consultar.
   * @throws BadRequestException si el identificador de ubicacion no es un ObjectId valido.
   * @throws NotFoundException si no existe una ubicacion asociada al usuario.
   * @returns La ubicacion encontrada en formato de respuesta.
   */
  async findById(
    userId: string,
    locationId: string,
  ): Promise<LocationResponse> {
    this.assertValidObjectId(locationId);

    const location = await this.locationRepository.findByIdAndOwner(
      locationId,
      userId,
    );
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return this.mapLocation(location);
  }

  /**
   * Actualiza el nombre de una ubicacion existente del usuario.
   * @param userId Identificador del usuario propietario de la ubicacion.
   * @param locationId Identificador de la ubicacion a actualizar.
   * @param dto Datos de actualizacion del nombre.
   * @throws BadRequestException si el locationId o el nombre son invalidos.
   * @throws NotFoundException si la ubicacion no existe para el usuario.
   * @returns La ubicacion actualizada en formato de respuesta.
   */
  async updateName(
    userId: string,
    locationId: string,
    dto: UpdateLocationDto,
  ): Promise<LocationResponse> {
    this.assertValidObjectId(locationId);

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Invalid location payload');
    }

    const updatedLocation =
      await this.locationRepository.updateNameByIdAndOwner(
        locationId,
        userId,
        name,
      );
    if (!updatedLocation) {
      throw new NotFoundException('Location not found');
    }

    return this.mapLocation(updatedLocation);
  }

  /**
   * Elimina una ubicacion del usuario por identificador.
   * @param userId Identificador del usuario propietario de la ubicacion.
   * @param locationId Identificador de la ubicacion a eliminar.
   * @throws BadRequestException si el locationId no es un ObjectId valido.
   * @throws NotFoundException si la ubicacion no existe para el usuario.
   * @returns Una promesa que se resuelve cuando la eliminacion finaliza.
   */
  async remove(userId: string, locationId: string): Promise<void> {
    this.assertValidObjectId(locationId);

    const deletedLocation = await this.locationRepository.deleteByIdAndOwner(
      locationId,
      userId,
    );
    if (!deletedLocation) {
      throw new NotFoundException('Location not found');
    }
  }

  /**
   * Valida que un valor tenga formato de ObjectId de MongoDB.
   * @param id Identificador a validar.
   * @throws BadRequestException si el identificador no es valido.
   * @returns Nada; solo valida o lanza excepcion.
   */
  private assertValidObjectId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid location id');
    }
  }

  /**
   * Convierte un documento de persistencia a un DTO de respuesta.
   * @param document Documento de ubicacion obtenido del repositorio.
   * @throws Error no aplica de forma explicita en este mapeo.
   * @returns La ubicacion serializada para exponer en la API.
   */
  private mapLocation(document: LocationDocument): LocationResponse {
    return {
      id: document._id.toString(),
      name: document.name,
      address: document.address,
      place_id: document.place_id,
      latitude: document.latitude,
      longitude: document.longitude,
    };
  }

  /**
   * Determina si un error corresponde a una violacion de clave unica en MongoDB.
   * @param error Error a inspeccionar.
   * @throws Error no aplica de forma explicita; solo devuelve un indicador booleano.
   * @returns `true` cuando el codigo de error es 11000; en otro caso `false`.
   */
  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: number }).code === 11000
    );
  }
}
