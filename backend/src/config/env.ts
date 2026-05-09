import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

function getEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

const jwtSecret = process.env.JWT_SECRET ?? 'dev_secret_change_me';
if (isProd && jwtSecret === 'dev_secret_change_me') {
  throw new Error('JWT_SECRET must be set to a strong unique value in production');
}

const encryptionKey = process.env.ENCRYPTION_KEY ?? '';
if (isProd && !encryptionKey) {
  throw new Error('ENCRYPTION_KEY must be set in production (32-byte hex string)');
}

export const env = {
  port: Number(process.env.PORT || 5000),
  databaseUrl: getEnv('DATABASE_URL', 'postgresql://localhost:5432/ajocircle'),
  jwtSecret,
  encryptionKey,
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
  platformFeeBps: Number(process.env.PLATFORM_FEE_BASIS_POINTS || 100),
  nodeEnv: process.env.NODE_ENV || 'development',
};
