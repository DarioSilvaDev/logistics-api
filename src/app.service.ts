import { Injectable } from '@nestjs/common';
import { envs } from './config/envs.config';

@Injectable()
export class AppService {
  /**
   * Obtiene el estado general del servicio para verificaciones de salud.
   * @throws Error no aplica de forma explicita; solo retorna datos estaticos de estado.
   * @returns Un objeto con el estado de la API y el nombre del paquete.
   */
  getStatus(): { status: string; apiName: string } {
    return {
      status: 'ONLINE',
      apiName: envs.package_name,
    };
  }
}
