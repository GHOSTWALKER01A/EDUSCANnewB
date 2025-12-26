

import {Redis} from "ioredis"
import dotenv from "dotenv"
import {ApiError} from "../utils/ApiError.js"

dotenv.config()

let redis: Redis | null = null

/**
 * Get a singleton Redis instance
 */
export const getRedis = (): Redis => {
  if (redis) return redis

  const url = process.env.REDIS_URL
  if (!url) {
    throw new ApiError(
      500,
      "REDIS_URL environment variable is not set"
    )
  }

  redis = new Redis(url)

  redis.on("connect", () => {
    console.log("✅ Redis connected")
  })

  redis.on("error", (err) => {
    console.error("❌ Redis error:", err)
  })

  return redis
}

/**
 * OTP helpers
 */
export async function setOTP(
  email: string,
  hashedOtp: string,
  ttlSec = 300
) {
  const client = getRedis()
  await client.set(
    `otp:${email.toLowerCase()}`,
    hashedOtp,
    "EX",
    ttlSec
  )
}

export async function getOTP(email: string) {
  const client = getRedis()
  return client.get(`otp:${email.toLowerCase()}`)
}

export async function delOTP(email: string) {
  const client = getRedis()
  return client.del(`otp:${email.toLowerCase()}`)
}

/**
 * Generic key helpers
 */
export const setKey = async (
  key: string,
  value: string,
  ttlSec?: number
) => {
  const client = getRedis()
  if (ttlSec) return client.set(key, value, "EX", ttlSec)
  return client.set(key, value)
}

export const getKey = async (key: string) => {
  const client = getRedis()
  return client.get(key)
}

export const delKey = async (key: string) => {
  const client = getRedis()
  return client.del(key)
}
