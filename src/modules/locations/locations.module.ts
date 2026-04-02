import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { Location, LocationSchema } from './schemas/location.schema';
import { LOCATION_REPOSITORY } from './repositories/location.repository.token';
import { LocationRepository } from './repositories/location.repository';
import { GooglePlacesService } from './google-places.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Location.name, schema: LocationSchema },
    ]),
  ],
  controllers: [LocationsController],
  providers: [
    LocationsService,
    GooglePlacesService,
    {
      provide: LOCATION_REPOSITORY,
      useClass: LocationRepository,
    },
  ],
  exports: [LOCATION_REPOSITORY],
})
export class LocationsModule {}
