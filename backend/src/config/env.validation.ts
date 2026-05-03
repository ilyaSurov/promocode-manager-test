import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  MONGODB_URI: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  CLICKHOUSE_HOST: Joi.string().required(),
  CLICKHOUSE_PORT: Joi.number().port().default(8123),
  CLICKHOUSE_USER: Joi.string().default('default'),
  CLICKHOUSE_PASSWORD: Joi.string().allow('').default(''),
  CLICKHOUSE_DATABASE: Joi.string().default('default'),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
});
