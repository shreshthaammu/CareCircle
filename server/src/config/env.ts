import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

dotenv.config();

const hasFirestoreConfig = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST ||
  process.env.USE_CLOUD_FIRESTORE === 'true'
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform((v) => parseInt(v, 10)),
  APP_URL: z.string().default('http://localhost:3000'),
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().optional(),
  INTERNAL_SCHEDULER_SECRET: z.string().optional(),
  ENABLE_CRON: z.string().default(process.env.NODE_ENV === 'production' ? 'false' : 'true')
    .transform((v) => v === 'true'),
  ALLOW_IN_MEMORY_STORE: z.string().default(hasFirestoreConfig ? 'false' : 'true')
    .transform((v) => v === 'true'),
  GEMINI_API_KEY: z.string().optional().default(''),
  FIRESTORE_EMULATOR_HOST: z.string().optional().default(''),
  GOOGLE_CLOUD_PROJECT: z.string().optional().default(''),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.string().default('587').transform((v) => parseInt(v, 10)),
  SMTP_SECURE: z.string().default('false').transform((v) => v === 'true'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('CareCircle Health <reminders@carecircle.health>'),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  JWT_SECRET: parsedEnv.JWT_SECRET || randomBytes(32).toString('hex'),
  INTERNAL_SCHEDULER_SECRET: parsedEnv.INTERNAL_SCHEDULER_SECRET || randomBytes(32).toString('hex'),
};
