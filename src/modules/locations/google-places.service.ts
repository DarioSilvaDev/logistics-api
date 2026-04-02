import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { envs } from '../../config/envs.config';

interface GooglePlaceDetailsResponse {
  id?: string;
  shortFormattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
}

export interface GoogleLocationResult {
  place_id: string;
  address: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly inFlightRequests = new Map<
    string,
    Promise<GoogleLocationResult>
  >();

  /**
   * Obtiene una ubicacion de Google Places reutilizando solicitudes en curso para el mismo placeId.
   * @param placeId Identificador de lugar recibido desde el cliente.
   * @throws BadGatewayException si Google responde con un payload invalido o un estado HTTP no exitoso.
   * @throws ServiceUnavailableException si ocurre un error de red o de disponibilidad con Google Places.
   * @returns La ubicacion normalizada con direccion y coordenadas.
   */
  async getLocationFromGoogle(placeId: string): Promise<GoogleLocationResult> {
    const normalizedPlaceId = placeId.trim();
    const inFlightRequest = this.inFlightRequests.get(normalizedPlaceId);

    if (inFlightRequest) {
      return inFlightRequest;
    }

    const request = this.fetchLocationFromGoogle(normalizedPlaceId).finally(
      () => {
        this.inFlightRequests.delete(normalizedPlaceId);
      },
    );

    this.inFlightRequests.set(normalizedPlaceId, request);
    return request;
  }

  /**
   * Consulta Google Places y transforma la respuesta al formato interno de ubicacion.
   * @param placeId Identificador de lugar ya normalizado.
   * @throws BadGatewayException si Google responde con error HTTP o datos incompletos.
   * @throws ServiceUnavailableException si falla la comunicacion con el servicio externo.
   * @returns La informacion de ubicacion lista para persistirse.
   */
  private async fetchLocationFromGoogle(
    placeId: string,
  ): Promise<GoogleLocationResult> {
    const encodedPlaceId = encodeURIComponent(placeId);
    const url = `https://places.googleapis.com/v1/places/${encodedPlaceId}?fields=id,shortFormattedAddress,location&key=${envs.google.maps_api_key}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        this.logger.error(
          `Google Places request failed with status=${response.status} placeId=${placeId}`,
        );
        throw new BadGatewayException(
          `Google Places service error with status ${response.status}`,
        );
      }

      const data = (await response.json()) as GooglePlaceDetailsResponse;
      if (
        !data.id ||
        !data.shortFormattedAddress ||
        typeof data.location?.latitude !== 'number' ||
        typeof data.location?.longitude !== 'number'
      ) {
        throw new BadGatewayException(
          'Invalid response from Google Places service',
        );
      }

      return {
        place_id: data.id,
        address: data.shortFormattedAddress,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
      };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      this.logger.error(
        `Error consulting Google Places placeId=${placeId}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Google Places service unavailable',
      );
    }
  }
}
