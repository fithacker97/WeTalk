import { app, server, port } from "./config/serverConfig.js";
import { initializeDB } from "./database/dbClient.js";
import "./controllers/chatController.js";

initializeDB().then(() => {
	server.listen(port, () => {
		console.log(`Chat App listening on port http://localhost:${port}`);
	});
});

app.get("/", (req, res) => {
	res.sendFile(process.cwd() + "/client/index.html");
});
