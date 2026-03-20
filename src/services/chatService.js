import { dbClient } from "../database/dbClient.js";
import { v4 as uuidv4 } from "uuid";

export const generateToken = async () => {
	const generatedToken = uuidv4().split("-")[0];
	await dbClient.execute({
		sql: `INSERT INTO tokens (token) VALUES (?)`,
		args: [generatedToken],
	});
	return generatedToken;
};

export const saveMessage = async (token, username, content) => {
	const now = new Date();
	const formattedDate = now.toISOString();

	await dbClient.execute({
		sql: `INSERT INTO messages (token, username, content, date) VALUES (?, ?, ?, ?)`,
		args: [token, username, content, formattedDate],
	});
};

export const getMessages = async (token) => {
	const result = await dbClient.execute({
		sql: `SELECT username, content, date FROM messages WHERE token = ? ORDER BY date ASC`,
		args: [token],
	});
	return result.rows;
};

export const deleteTokenAndMessages = async (token) => {
	await dbClient.execute({
		sql: `DELETE FROM tokens WHERE token = ?`,
		args: [token],
	});
	await dbClient.execute({
		sql: `DELETE FROM messages WHERE token = ?`,
		args: [token],
	});
};
