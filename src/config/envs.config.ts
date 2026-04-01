import 'dotenv/config';
import * as joi from "joi";

export interface IEnvConfig {
  PORT: number;
  NODE_ENV: string;
  MONGO_URI: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  BCRYPT_SALT_ROUNDS: number;
  MAX_LOGIN_ATTEMPTS: number;
  BLOCK_DURATION_MINUTES: number;
  REFRESH_TOKEN_TTL_DAYS: number;
  PACKAGE_NAME: string;
}

const envsSchema = joi.object({
  PORT: joi.number().port().default(3000),
  NODE_ENV: joi
    .string()
    .valid('development', 'production', 'test', 'local')
    .default("development"),
  MONGO_URI: joi.string().required(),
  JWT_ACCESS_SECRET: joi.string().required(),
  JWT_REFRESH_SECRET: joi.string().required(),
  JWT_ACCESS_EXPIRES_IN: joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: joi.string().required(),
  BCRYPT_SALT_ROUNDS: joi.number().default(10),
  MAX_LOGIN_ATTEMPTS: joi.number().default(5),
  BLOCK_DURATION_MINUTES: joi.number().default(15),
  REFRESH_TOKEN_TTL_DAYS: joi.number().default(2),
  PACKAGE_NAME: joi
    .string()
    .default(process.env.npm_package_name || 'logistics-api'),
}).unknown(true);

const { value, error } = envsSchema.validate(process.env);
const envsConfig: IEnvConfig = value;

if (error) {
  if (error) {
    throw new Error(
      `Config validation error: ${error.details
        .map((detail) => detail.message)
        .join(', ')}`,
    );
  }
}
export const envs = {
  port: envsConfig.PORT,
  node_env: envsConfig.NODE_ENV,
  package_name: envsConfig.PACKAGE_NAME,
  db: {
    url: envsConfig.MONGO_URI
  },
  jwt: {
    access_secret: envsConfig.JWT_ACCESS_SECRET,
    refresh_secret: envsConfig.JWT_REFRESH_SECRET,
    access_expires_in: envsConfig.JWT_ACCESS_EXPIRES_IN,
    refresh_expires_in: envsConfig.JWT_REFRESH_EXPIRES_IN,
  },
  bcrypt_salt_rounds: envsConfig.BCRYPT_SALT_ROUNDS,
  max_login_attempts: envsConfig.MAX_LOGIN_ATTEMPTS,
  block_duration_minutes: envsConfig.BLOCK_DURATION_MINUTES,
  refresh_token_ttl_days: envsConfig.REFRESH_TOKEN_TTL_DAYS,
};

