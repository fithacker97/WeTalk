import { io } from "https://cdn.socket.io/4.5.1/socket.io.esm.min.js";

// Variables to store socket connection, current token, and current username
let socket;
let currentToken;
let currentUsername;

// Object to store user colors based on username
const userColors = {};

/**
 * Function to generate a token by connecting to the server
 * and emitting a "generateToken" event.
 */
function getToken() {
	socket = io({
		query: {
			purpose: "generateToken",
		},
	});

	socket.on("connect", () => {
		console.log("Connected to the server to generate token");
		socket.emit("generateToken");

		socket.on("generated-token", (token) => {
			console.log("Received token:", token);
			const tokenDisplay = document.getElementById("token-display");
			tokenDisplay.textContent = token;

			socket.disconnect();
			console.log("Socket disconnected after receiving the token");
		});

		socket.on("token-error", (message) => {
			console.error(message);
			alert("Error generating token. Please try again.");
			socket.disconnect();
		});
	});

	socket.on("connect_error", (err) => {
		console.error("Connection error:", err);
	});
}

/**
 * Function to copy text to clipboard using the Clipboard API.
 * @param {string} textToCopy - The text to copy to clipboard.
 */
async function copyTextToClipboard(textToCopy) {
	try {
		if (navigator?.clipboard?.writeText) {
			await navigator.clipboard.writeText(textToCopy);
		}
		console.log("Text copied to clipboard:", textToCopy);
	} catch (err) {
		console.error("Error copying text:", err);
	}
}

/**
 * Function to calculate text color based on background color for better visibility.
 * @param {string} backgroundColor - The background color in hexadecimal format.
 * @returns {string} - The calculated text color (either black or white).
 */
function getTextColor(backgroundColor) {
	const r = parseInt(backgroundColor.slice(1, 3), 16);
	const g = parseInt(backgroundColor.slice(3, 5), 16);
	const b = parseInt(backgroundColor.slice(5, 7), 16);
	const luminosity = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminosity > 128 ? "#000000" : "#FFFFFF";
}

/**
 * Function to generate a random color for a user based on their username.
 * @param {string} username - The username of the user.
 * @returns {object} - The generated colors for background and text.
 */
function getColorForUser(username) {
	if (!userColors[username]) {
		const randomColor = `#${Math.floor(Math.random() * 16777215)
			.toString(16)
			.padStart(6, "0")}`;
		const textColor = getTextColor(randomColor);
		userColors[username] = { background: randomColor, text: textColor };
	}
	return userColors[username];
}

/**
 * Function to connect to the chat using a given token and username.
 * @param {string} token - The token used to connect to the chat.
 * @param {string} username - The username used to connect to the chat.
 */
function connectToChat(token, username) {
	if (token === "" || username === "") {
		alert("Token and username cannot be empty");
		return;
	}

	socket = io({
		auth: {
			token: token,
			username: username,
		},
	});

	socket.on("connect", () => {
		document.getElementById("auth").classList.add("hidden");
		document.getElementById("chat").classList.remove("hidden");
		currentToken = token;
		currentUsername = username;

		const tokenUsed = document.getElementById("token-used");
		tokenUsed.textContent = `Token: ${currentToken}`;
		socket.emit("request-user-count");

		// Save token and username to localStorage
		localStorage.setItem("chatToken", currentToken);
		localStorage.setItem("chatUsername", currentUsername);
	});

	socket.on("update-user-count", (count) => {
		const userCount = document.getElementById("user-count");
		userCount.textContent = `Users online: ${count}`;
	});

	document.getElementById("form").addEventListener("submit", (e) => {
		e.preventDefault();
		const input = document.getElementById("input");
		if (input.value) {
			socket.emit("message", input.value);
			input.value = "";
		}
	});

	socket.on("message", (msg, senderUsername, timestamp) => {
		const messages = document.getElementById("messages");
		const li = document.createElement("li");
		li.textContent = `${msg}`;

		const smallTimeDate = document.createElement("small");
		smallTimeDate.textContent = new Date(timestamp).toLocaleString();
		const smallName = document.createElement("small");
		smallName.textContent = senderUsername;

		smallName.style.fontSize = "0.7rem";
		smallName.style.color = "#999";
		smallTimeDate.style.fontSize = "0.5rem";
		smallTimeDate.style.color = "#999";

		const colors = getColorForUser(senderUsername);
		li.style.backgroundColor = colors.background;
		li.style.color = colors.text;

		li.appendChild(smallName);
		li.appendChild(smallTimeDate);

		if (senderUsername === currentUsername) {
			li.classList.add("own-message");
		}

		messages.appendChild(li);
		messages.scrollTop = messages.scrollHeight;
	});
}

document.addEventListener("DOMContentLoaded", () => {
	const loginForm = document.getElementById("login-form");
	const tokenInput = document.getElementById("token-input");
	const generateTokenButton = document.getElementById("generate-token");
	const tokenDisplay = document.getElementById("token-display");
	const usernameInput = document.getElementById("username-input");

	document.getElementById("exit-chat").addEventListener("click", () => {
		socket.disconnect();
		document.getElementById("chat").classList.add("hidden");
		document.getElementById("auth").classList.remove("hidden");
		tokenInput.value = "";
		usernameInput.value = "";
		localStorage.removeItem("chatToken");
		localStorage.removeItem("chatUsername");
	});
	// Check if token and username exist in localStorage
	const storedToken = localStorage.getItem("chatToken");
	const storedUsername = localStorage.getItem("chatUsername");

	if (storedToken && storedUsername) {
		// Automatically connect with stored token and username
		connectToChat(storedToken, storedUsername);
	}

	loginForm.addEventListener("submit", (e) => {
		e.preventDefault();
		const token = tokenInput.value.trim();
		const username = usernameInput.value.trim();
		connectToChat(token, username);
	});

	generateTokenButton.addEventListener("click", (e) => {
		e.preventDefault();
		getToken();
	});

	tokenDisplay.addEventListener("click", () => {
		const textToCopy = tokenDisplay.textContent;
		copyTextToClipboard(textToCopy)
			.then(() => {
				showToast("Token copied successfully!");
			})
			.catch((err) => {
				console.error("Error copying token:", err);
			});
	});

	function showToast(message) {
		const toast = document.getElementById("toast");
		toast.textContent = message;
		toast.style.display = "block";

		setTimeout(() => {
			toast.style.display = "none";
		}, 2000);
	}

	usernameInput.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			const token = tokenInput.value.trim();
			const username = usernameInput.value.trim();
			connectToChat(token, username);
		}
	});
});
