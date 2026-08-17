import express from "express";
export const app = express();
export const redisUrl = process.env.REDIS_URL;
