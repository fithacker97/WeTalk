import { io } from "../config/serverConfig.js";
import {
	generateToken,
	saveMessage,
	getMessages,
	deleteTokenAndMessages,
} from "../services/chatService.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const activeUsers = {};
const activeUserCounts = {};

io.use(authMiddleware);

io.on("connection", async (socket) => {
	const purpose = socket.handshake.query.purpose;

	if (purpose === "generateToken") {
		socket.on("generateToken", async () => {
			try {
				const token = await generateToken();
				socket.emit("generated-token", token);
				socket.disconnect();
			} catch (error) {
				socket.emit("token-error", "Error generating token. Please try again.");
				socket.disconnect();
			}
		});
	} else {
		const token = socket.token;
		const username = socket.username;

		if (!activeUsers[token]) {
			activeUsers[token] = {};
			activeUserCounts[token] = 0;
		}

		activeUsers[token][username] = socket;
		activeUserCounts[token]++;

		io.emit("update-user-count", activeUserCounts[token]);

		try {
			const messages = await getMessages(token);
			messages.forEach((msg) => {
				socket.emit("message", msg.content, msg.username, msg.date);
			});
		} catch (error) {
			console.error("Error fetching messages from database:", error);
		}

		socket.on("disconnect", async () => {
			delete activeUsers[token][username];
			activeUserCounts[token]--;

			if (activeUserCounts[token] === 0) {
				try {
					await deleteTokenAndMessages(token);
				} catch (error) {
					console.error("Error deleting token/messages from database:", error);
				}
			}

			io.emit("update-user-count", activeUserCounts[token]);
		});

		socket.on("message", async (msg) => {
			const now = new Date();
			const formattedDate = now.toISOString();
			try {
				await saveMessage(token, username, msg);
				Object.keys(activeUsers[token]).forEach((user) => {
					activeUsers[token][user].emit("message", msg, username, formattedDate);
				});
			} catch (error) {
				console.error("Error inserting message into database:", error);
			}
		});
	}
});
