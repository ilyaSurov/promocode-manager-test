import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  MONGODB_URI: Joi.string().default(
    'mongodb://127.0.0.1:27017/promocode_manager',
  ),
  REDIS_URL: Joi.string().default('redis://127.0.0.1:6379'),
  CLICKHOUSE_HOST: Joi.string().default('127.0.0.1'),
  CLICKHOUSE_PORT: Joi.number().port().default(8123),
  CLICKHOUSE_USER: Joi.string().default('default'),
  CLICKHOUSE_PASSWORD: Joi.string().allow('').default('dev_clickhouse_local'),
  CLICKHOUSE_DATABASE: Joi.string().default('default'),
  JWT_ACCESS_SECRET: Joi.string()
    .min(32)
    .default('dev-only-access-secret-min-32-characters-long!!'),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .default('dev-only-refresh-secret-min-32-characters-long!'),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),
});
