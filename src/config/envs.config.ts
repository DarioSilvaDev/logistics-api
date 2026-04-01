import 'dotenv/config';
import * as joi from "joi";

export interface IEnvConfig {
  PORT: number;
  NODE_ENV: string;
  MONGO_URI: string;
}

const envsSchema = joi.object({
  PORT: joi.number().port().default(3000),
  NODE_ENV: joi
    .string()
    .valid('development', 'production', 'test', 'local')
    .default("development"),
  MONGO_URI: joi.string().hostname().required().message("Url database connection is required")
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
  db: {
    url: envsConfig.MONGO_URI
  },
};

