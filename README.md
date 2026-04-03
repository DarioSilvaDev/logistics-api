## 🚚 Logistics API - Challenge

Resolución del checkpoint para Backend Developer.

## Indice

- [1) Objetivo del proyecto](#sec-1)
- [2) Stack tecnologico y componentes clave](#sec-2)
- [3) Arquitectura y abordaje](#sec-3)
- [4) Flujo transversal de una request](#sec-4)
- [5) Funcionalidad por modulo](#sec-5)
- [6) Modelo de datos e indices importantes](#sec-6)
- [7) Contrato de errores y observabilidad](#sec-7)
- [8) Swagger y estandar de idioma](#sec-8)
- [9) Metodologia aplicada](#sec-9)
- [10) Variables de entorno requeridas](#sec-10)
- [11) Inicio rapido para revision por email](#sec-11)
- [12) Ejecucion local](#sec-12)
- [13) Testing](#sec-13)
- [14) Estado actual y siguientes mejoras recomendadas](#sec-14)

<a id="sec-1"></a>
## 1) Objetivo del proyecto

Este proyecto implementa una API REST para un dominio logistico con cuatro capacidades principales:

- autenticacion de usuarios
- gestion de camiones (`trucks`)
- gestion de ubicaciones (`locations`)
- gestion de ordenes (`orders`)

<a id="sec-2"></a>
## 2) 🛠️ Stack Tecnológico y componentes clave

- **Framework:** NestJS + TypeScript
- **Persistencia:** MongoDB con Mongoose
- **Auth:** JWT (access + refresh) con Passport
- **Validacion:** `class-validator` + `ValidationPipe` global
- **Observabilidad:** `LoggingInterceptor` con `requestId`
- **Manejo de errores:** filtro global `HttpExceptionFilter`
- **Documentacion:** Swagger/OpenAPI en `/api/docs`
- **Integracion externa:** Google Places API para ubicaciones


<a id="sec-3"></a>
## 3) 🏗️ Arquitectura y Abordaje
Decidí utilizar NestJS porque provee una estructura altamente organizada y escalable desde el inicio.

Se implemento una arquitectura modular por dominio:

- `AuthModule`
- `UsersModule`
- `TrucksModule`
- `LocationsModule`
- `OrdersModule`

Cada modulo mantiene la separacion:

- **Controller:** contrato HTTP, codigos de respuesta, Swagger
- **Service:** reglas de negocio
- **Repository (interface + implementacion):** acceso a datos
- **Schema:** modelo Mongoose e indices

### Principios tecnicos usados

1. **Ownership por usuario autenticado:**
   casi todas las consultas estan acotadas por `createdBy` para evitar acceso cruzado.
2. **Reglas de negocio en services, no en controllers:**
   los controllers son delgados y delegan validaciones de negocio.
3. **Contratos de error consistentes:**
   estructura uniforme de error con `statusCode`, `message`, `path`, `timestamp`, `requestId`.
4. **Abstraccion por interfaces de repositorio:**
   desacopla negocio de persistencia concreta y facilita testing/mocks.

<a id="sec-4"></a>
## 4) Flujo transversal de una request

1. La request entra con prefijo global `api`.
2. `ValidationPipe` limpia payload (`whitelist`), transforma tipos y rechaza campos no permitidos.
3. Si aplica, `JwtAuthGuard` valida JWT.
4. `CurrentUser` extrae el usuario autenticado desde `request.user`.
5. El controller invoca el service del dominio.
6. El service ejecuta reglas de negocio y usa repositorios.
7. `LoggingInterceptor` registra request/response con `requestId` (propio o `x-request-id`).
8. Si hay excepcion, `HttpExceptionFilter` normaliza la salida de error.

<a id="sec-5"></a>
## 5) Funcionalidad por modulo

### 5.1 Auth

Endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout` (autenticado)

Reglas principales implementadas:

- registro con email normalizado y password hasheado (`bcrypt`)
- deteccion de email duplicado con manejo explicito de clave unica
- login con bloqueo temporal por intentos fallidos (`MAX_LOGIN_ATTEMPTS`, `BLOCK_DURATION_MINUTES`)
- emision de access token + refresh token
- refresh token persistido como hash (no texto plano)
- expiracion de refresh token controlada por `REFRESH_TOKEN_TTL_DAYS`
- logout con invalidacion del refresh token persistido

### 5.2 Users

Endpoint:

- `GET /api/users/me` (autenticado)

Capacidad:

- obtiene perfil del usuario autenticado

### 5.3 Trucks

Endpoints (autenticados):

- `POST /api/trucks`
- `GET /api/trucks`
- `GET /api/trucks/:id`
- `PATCH /api/trucks/:id/status`

Reglas principales:

- `plate` unica
- validacion de `year` (4 digitos y no mayor al anio actual)
- listado paginado con filtro opcional por `status`
- actualizacion de estado del truck

### 5.4 Locations

Endpoints (autenticados):

- `POST /api/locations`
- `GET /api/locations`
- `GET /api/locations/:id`
- `PATCH /api/locations/:id`
- `DELETE /api/locations/:id`

Reglas principales:

- al crear, se consulta Google Places para obtener direccion y coordenadas canonicales
- se evita duplicidad por usuario con indice unico compuesto (`createdBy + place_id`)
- se valida nuevamente contra `place_id` canonico devuelto por Google
- listado paginado con filtro opcional por nombre (`name`, case-insensitive)
- `GooglePlacesService` reutiliza requests en vuelo por `placeId` para evitar llamadas duplicadas concurrentes

### 5.5 Orders

Endpoints (autenticados):

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/status`

Reglas principales:

- valida ObjectIds de truck/pickup/dropoff
- pickup y dropoff deben ser distintos
- truck, pickup y dropoff deben pertenecer al usuario autenticado
- solo se puede crear orden con truck `AVAILABLE`
- se impide mas de una orden activa por truck
- se mantiene historial de estados (`statusHistory`)
- transiciones permitidas:
  - `CREATED -> ASSIGNED | CANCELLED`
  - `ASSIGNED -> IN_TRANSIT | CANCELLED`
  - `IN_TRANSIT -> DELIVERED`
  - terminales: `DELIVERED`, `CANCELLED`
- al cambiar estado de orden, se sincroniza el estado del truck:
  - orden activa -> truck `UNAVAILABLE`
  - orden terminal -> truck `AVAILABLE`
- listado paginado con filtros `status`, `createdFrom`, `createdTo`

<a id="sec-6"></a>
## 6) Modelo de datos e indices importantes

### `users`

- `email` unico + index

### `auth`

- `userId` unico
- campos de control de seguridad:
  - `loginAttempts`
  - `maxLoginAttempts`
  - `isBlocked`
  - `blockedUntil`
  - `refreshToken` (hash)
  - `refreshTokenExpiresAt`
- indices auxiliares:
  - `{ isBlocked: 1, blockedUntil: 1 }`
  - `{ refreshTokenExpiresAt: 1 }`

### `trucks`

- `plate` unica + index
- `status` indexado
- `createdBy` indexado

### `locations`

- indice unico compuesto `{ createdBy: 1, place_id: 1 }`

### `orders`

- indice `{ createdBy: 1, createdAt: -1 }`
- indice unico parcial para orden activa por truck:
  - clave: `{ truckId: 1 }`
  - filtro parcial: `status in [CREATED, ASSIGNED, IN_TRANSIT]`

Este ultimo indice es clave para integridad de negocio bajo concurrencia.

<a id="sec-7"></a>
## 7) Contrato de errores y observabilidad

### Error response estandar

Se centralizo en filtro global:

```json
{
  "statusCode": 400,
  "message": "Invalid truck id",
  "path": "/api/trucks/invalid-id",
  "timestamp": "2026-04-01T12:00:00.000Z",
  "requestId": "2f72c04f-c44a-4ef8-933e-989de6802d74"
}
```

### Logging

- cada request tiene `requestId`
- si cliente envia `x-request-id`, se reutiliza
- si no, se genera UUID
- se registra metodo, ruta, status y latencia

Esto facilita trazabilidad en debugging y analisis operacional.

<a id="sec-8"></a>
## 8) Swagger y estandar de idioma

La API se documento en Swagger (`/api/docs`) con:

- operaciones por modulo
- ejemplos de payload y respuestas
- respuestas de error relevantes por endpoint
- autenticacion bearer en endpoints protegidos

Se unifico el idioma de **mensajes de error y Swagger a ingles** para mantener consistencia tecnica y estandar de APIs.

<a id="sec-9"></a>
## 9) Como se abordo el desarrollo (metodologia aplicada)

El desarrollo se abordo en capas incrementales:

1. **Base del proyecto**
   - configuracion de NestJS
   - conexion a Mongo
   - configuracion y validacion de variables de entorno

2. **Seguridad y cimientos transversales**
   - JWT strategy + guard
   - decorador `CurrentUser`
   - validacion global
   - filtro global de errores
   - logging con `requestId`

3. **Dominio principal (CRUD + ownership)**
   - users
   - trucks
   - locations

4. **Orquestacion de negocio compleja**
   - orders con reglas de transicion
   - sincronizacion de estado order/truck
   - protecciones de concurrencia con indice unico parcial

5. **Calidad del contrato externo**
   - documentacion Swagger completa
   - unificacion de idioma de errores/documentacion
   - ejemplos realistas de respuesta

Este enfoque permitio construir primero una base estable y luego agregar reglas de negocio complejas sin comprometer mantenibilidad.

<a id="sec-10"></a>
## 10) Variables de entorno requeridas

- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `GOOGLE_MAPS_API_KEY`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `BCRYPT_SALT_ROUNDS`
- `MAX_LOGIN_ATTEMPTS`
- `BLOCK_DURATION_MINUTES`
- `REFRESH_TOKEN_TTL_DAYS`
- `PACKAGE_NAME`

<a id="sec-11"></a>
## 11) Inicio rapido para revision por email

Este flujo esta pensado para compartir por email el link del repositorio y un archivo `.env.example` con credenciales de prueba.

1. Clonar el repositorio.
2. Copiar el archivo `.env.example` adjunto en la raiz del proyecto.
3. Renombrar el archivo a `.env`.
4. Instalar dependencias:

```bash
npm install
```

5. Levantar la API:

```bash
npm run start:dev
```

Notas:

- No commitear el archivo `.env` con credenciales.
- Si el proyecto ya trae un `.env.example` en repo, se puede usar ese mismo archivo y completar valores.

<a id="sec-12"></a>
## 12) Ejecucion local

```bash
npm install
npm run start:dev
```

- API base: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`

<a id="sec-13"></a>
## 13) Testing

### Unit tests

Se agrego una base inicial de tests unitarios con Jest para servicios core:

- `src/modules/auth/auth.service.spec.ts`
- `src/modules/orders/orders.service.spec.ts`

Cobertura enfocada en reglas criticas:

- auth: registro, login, bloqueo temporal, refresh token y logout
- orders: creacion, validaciones, transiciones de estado y paginacion

Comandos:

```bash
npm test
npm run test:cov
```

### E2E minimo (auth + orders)

Se agrego una suite e2e minima para validar integracion entre modulos:

- `test/auth-orders.e2e-spec.ts`

La suite valida:

- acceso denegado a rutas protegidas sin token
- flujo completo `register -> login -> create order -> update status -> list orders`
- error de negocio por transicion invalida de estado (`409`)

Comando:

```bash
npm run test:e2e
```

Soporte de configuracion e2e:

- `test/jest-e2e.json`
- `test/jest-e2e.setup.ts`

<a id="sec-14"></a>
## 14) Estado actual y siguientes mejoras recomendadas

Fortalezas actuales:

- arquitectura modular clara
- reglas de negocio centrales implementadas
- seguridad base funcional
- contratos HTTP consistentes
- documentacion Swagger util para consumo

Mejoras recomendadas para siguiente iteracion:

1. Expandir cobertura de tests unitarios a `locations` y `trucks`
2. Agregar mas escenarios e2e de auth (bloqueo por intentos fallidos)
3. Agregar rate limiting en endpoints de auth
4. Agregar cache (Redis) para consultas repetidas de Google Places

---
