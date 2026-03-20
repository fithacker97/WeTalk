import { dbClient } from "../database/dbClient.js";

export const authMiddleware = async (socket, next) => {
	const token = socket.handshake.auth.token;
	const username = socket.handshake.auth.username;

	if (!token || !username) {
		if (socket.handshake.query.purpose === "generateToken") {
			return next();
		}
		return next(new Error("Authentication error"));
	}

	try {
		const result = await dbClient.execute({
			sql: `SELECT token FROM tokens WHERE token = ?`,
			args: [token],
		});

		if (result.rows.length === 0) {
			return next(new Error("Invalid token"));
		}

		socket.token = token;
		socket.username = username;
		next();
	} catch (error) {
		return next(new Error("Database error"));
	}
};
