import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    timezone: '+00:00'
  }
);

export const connectDatabase = async () => {
  await sequelize.authenticate();
  await sequelize.sync();
};
