import express from "express";
import logger from "morgan";
import dotenv from "dotenv";
import { createServer } from "node:http";
import { Server } from "socket.io";

dotenv.config();

export const app = express();
export const server = createServer(app);
export const io = new Server(server, { connectionStateRecovery: true });

app.use(logger("dev"));
app.use(express.json());
app.use(express.static("client"));

export const port = process.env.PORT ?? 3001;
