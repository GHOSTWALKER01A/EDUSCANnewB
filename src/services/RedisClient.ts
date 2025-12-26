import { createClient } from 'redis';
import { ApiError } from '../utils/ApiError.js';

if (!process.env.REDIS_URL) {
    throw new ApiError(400,'REDIS_URL environment variable is not set');
}

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err: any) => console.error('Redis Client Error', err));

export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('Redis connected');
    }
};

export default redisClient;
