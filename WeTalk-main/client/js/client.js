import { io } from "https://cdn.socket.io/4.5.1/socket.io.esm.min.js";

let socket;
let currentToken = "";
let currentUsername = "";
const userColors = {};
let toastTimer;
const elements = {};
const NO_TOKEN_TEXT = "No token generated yet";

async function copyTextToClipboard(textToCopy) {
	try {
		if (navigator?.clipboard?.writeText) {
			await navigator.clipboard.writeText(textToCopy);
		}
		return true;
	} catch {
		return false;
	}
}

function getTextColor(backgroundColor) {
	const r = parseInt(backgroundColor.slice(1, 3), 16);
	const g = parseInt(backgroundColor.slice(3, 5), 16);
	const b = parseInt(backgroundColor.slice(5, 7), 16);
	const luminosity = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminosity > 128 ? "#000000" : "#FFFFFF";
}

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

function showToast(message, isError = false) {
	if (!elements.toast) {
		return;
	}

	elements.toast.textContent = message;
	elements.toast.style.display = "block";
	elements.toast.style.background = isError ? "rgba(230, 57, 70, 0.12)" : "rgba(16, 42, 67, 0.08)";
	elements.toast.style.borderColor = isError ? "rgba(230, 57, 70, 0.28)" : "rgba(16, 42, 67, 0.14)";

	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => {
		elements.toast.style.display = "none";
	}, 2200);
}

function getTokenValue() {
	const typedToken = elements.tokenInput.value.trim();
	if (typedToken) {
		return typedToken;
	}

	const displayToken = elements.tokenDisplay.textContent.trim();
	if (displayToken && displayToken !== NO_TOKEN_TEXT) {
		return displayToken;
	}

	return "";
}

function buildShareLink(token) {
	const url = new URL(window.location.href);
	if (token) {
		url.searchParams.set("token", token);
	} else {
		url.searchParams.delete("token");
	}
	return url.toString();
}

function syncTokenAndLinkUI(token) {
	const cleanToken = (token || "").trim();

	if (!cleanToken) {
		elements.tokenDisplay.textContent = NO_TOKEN_TEXT;
		elements.shareLink.value = "";
		return;
	}

	elements.tokenDisplay.textContent = cleanToken;
	elements.shareLink.value = buildShareLink(cleanToken);
}

function setConnectionState(text, variant = "neutral") {
	elements.connectionState.textContent = text;

	if (variant === "success") {
		elements.connectionState.style.background = "#d7f3eb";
		elements.connectionState.style.color = "#0f6b61";
		return;
	}

	if (variant === "warn") {
		elements.connectionState.style.background = "#fff4d4";
		elements.connectionState.style.color = "#7c5f00";
		return;
	}

	if (variant === "error") {
		elements.connectionState.style.background = "#ffe2e6";
		elements.connectionState.style.color = "#9f1239";
		return;
	}

	elements.connectionState.style.background = "#edf2f7";
	elements.connectionState.style.color = "#102a43";
}

function setChatEnabled(enabled) {
	elements.input.disabled = !enabled;
	elements.sendButton.disabled = !enabled;
	elements.chatOverlay.classList.toggle("hidden", enabled);
}

function appendMessage(msg, senderUsername, timestamp) {
	const li = document.createElement("li");
	li.textContent = msg;

	const smallName = document.createElement("small");
	smallName.textContent = senderUsername || "Unknown";

	const messageDate = timestamp ? new Date(timestamp) : new Date();
	const smallTimeDate = document.createElement("small");
	smallTimeDate.textContent = Number.isNaN(messageDate.getTime())
		? ""
		: messageDate.toLocaleString();

	const colors = getColorForUser(senderUsername || "Unknown");
	li.style.backgroundColor = colors.background;
	li.style.color = colors.text;

	li.appendChild(smallName);
	if (smallTimeDate.textContent) {
		li.appendChild(smallTimeDate);
	}

	if (senderUsername === currentUsername) {
		li.classList.add("own-message");
	}

	elements.messages.appendChild(li);
	elements.messages.scrollTop = elements.messages.scrollHeight;
}

function clearConnectedState(clearMessages = false) {
	currentToken = "";
	currentUsername = "";
	elements.tokenUsed.textContent = "Token: -";
	elements.userCount.textContent = "Users online: 0";
	setConnectionState("Not connected");
	setChatEnabled(false);

	if (clearMessages) {
		elements.messages.innerHTML = "";
	}
}

function disconnectFromChat(clearStorage = false) {
	if (socket) {
		socket.disconnect();
		socket = undefined;
	}

	if (clearStorage) {
		localStorage.removeItem("chatToken");
		localStorage.removeItem("chatUsername");
	}

	clearConnectedState();
}

function attachChatSocket(token, username) {
	socket = io({
		auth: {
			token,
			username,
		},
	});

	setConnectionState("Connecting...", "warn");

	socket.on("connect", () => {
		currentToken = token;
		currentUsername = username;

		elements.tokenUsed.textContent = `Token: ${currentToken}`;
		setConnectionState(`Connected as ${currentUsername}`, "success");
		setChatEnabled(true);
		elements.input.focus();

		localStorage.setItem("chatToken", currentToken);
		localStorage.setItem("chatUsername", currentUsername);
	});

	socket.on("connect_error", (err) => {
		setConnectionState("Unable to connect", "error");
		setChatEnabled(false);
		showToast(err?.message || "Connection failed. Check token/username.", true);
	});

	socket.on("disconnect", (reason) => {
		setChatEnabled(false);
		elements.userCount.textContent = "Users online: 0";

		if (reason === "io client disconnect") {
			setConnectionState("Not connected");
			return;
		}

		setConnectionState("Disconnected. Rejoin from left panel.", "error");
	});

	socket.on("update-user-count", (count) => {
		elements.userCount.textContent = `Users online: ${count}`;
	});

	socket.on("message", (msg, senderUsername, timestamp) => {
		appendMessage(msg, senderUsername, timestamp);
	});
}

function connectToChat(token, username) {
	const cleanToken = token.trim();
	const cleanUsername = username.trim();

	if (!cleanToken || !cleanUsername) {
		showToast("Token and username cannot be empty.", true);
		return;
	}

	if (socket) {
		socket.disconnect();
		socket = undefined;
	}

	syncTokenAndLinkUI(cleanToken);
	elements.messages.innerHTML = "";
	attachChatSocket(cleanToken, cleanUsername);
}

function getToken() {
	const tokenSocket = io({
		query: {
			purpose: "generateToken",
		},
	});

	setConnectionState("Creating room token...", "warn");

	tokenSocket.on("connect", () => {
		tokenSocket.emit("generateToken");
	});

	tokenSocket.on("generated-token", (token) => {
		elements.tokenInput.value = token;
		syncTokenAndLinkUI(token);
		showToast("Token generated. Share it with others.");

		if (socket?.connected) {
			setConnectionState(`Connected as ${currentUsername}`, "success");
		} else {
			setConnectionState("Token ready. Join chat now.");
		}

		tokenSocket.disconnect();
	});

	tokenSocket.on("token-error", () => {
		showToast("Error generating token. Please try again.", true);
		setConnectionState("Token generation failed", "error");
		tokenSocket.disconnect();
	});

	tokenSocket.on("connect_error", (err) => {
		showToast(err?.message || "Failed to connect for token generation.", true);
		setConnectionState("Token generation failed", "error");
	});
}

async function copyTokenFromDisplay() {
	const token = getTokenValue();
	if (!token) {
		showToast("Generate a token first.", true);
		return;
	}

	const copied = await copyTextToClipboard(token);
	if (copied) {
		showToast("Token copied successfully.");
		return;
	}

	showToast("Unable to copy token.", true);
}

async function shareInviteLink() {
	const token = getTokenValue();
	if (!token) {
		showToast("Generate or enter a token first.", true);
		return;
	}

	const inviteLink = buildShareLink(token);
	elements.shareLink.value = inviteLink;

	if (navigator.share) {
		try {
			await navigator.share({
				title: "Join my WeTalk room",
				text: `Use token ${token} to join my WeTalk chat.`,
				url: inviteLink,
			});
			showToast("Invite shared.");
			return;
		} catch (err) {
			if (err?.name === "AbortError") {
				return;
			}
		}
	}

	const copied = await copyTextToClipboard(inviteLink);
	if (copied) {
		showToast("Share link copied to clipboard.");
		return;
	}

	showToast("Unable to share link.", true);
}

document.addEventListener("DOMContentLoaded", () => {
	elements.loginForm = document.getElementById("login-form");
	elements.tokenInput = document.getElementById("token-input");
	elements.generateTokenButton = document.getElementById("generate-token");
	elements.tokenDisplay = document.getElementById("token-display");
	elements.shareLink = document.getElementById("share-link");
	elements.copyTokenButton = document.getElementById("copy-token");
	elements.shareLinkButton = document.getElementById("share-link-button");
	elements.usernameInput = document.getElementById("username-input");
	elements.exitChatButton = document.getElementById("exit-chat");
	elements.form = document.getElementById("form");
	elements.input = document.getElementById("input");
	elements.sendButton = document.getElementById("send-button");
	elements.messages = document.getElementById("messages");
	elements.tokenUsed = document.getElementById("token-used");
	elements.userCount = document.getElementById("user-count");
	elements.connectionState = document.getElementById("connection-state");
	elements.toast = document.getElementById("toast");
	elements.chatOverlay = document.getElementById("chat-overlay");

	clearConnectedState();

	elements.loginForm.addEventListener("submit", (e) => {
		e.preventDefault();
		connectToChat(elements.tokenInput.value, elements.usernameInput.value);
	});

	elements.tokenInput.addEventListener("input", () => {
		syncTokenAndLinkUI(elements.tokenInput.value);
	});

	elements.generateTokenButton.addEventListener("click", () => {
		getToken();
	});

	elements.copyTokenButton.addEventListener("click", () => {
		copyTokenFromDisplay();
	});

	elements.shareLinkButton.addEventListener("click", () => {
		shareInviteLink();
	});

	elements.exitChatButton.addEventListener("click", () => {
		disconnectFromChat(true);
		elements.tokenInput.value = "";
		elements.usernameInput.value = "";
		elements.messages.innerHTML = "";
		syncTokenAndLinkUI("");
	});

	elements.form.addEventListener("submit", (e) => {
		e.preventDefault();

		if (!socket || !socket.connected) {
			showToast("Join a room first.", true);
			return;
		}

		const message = elements.input.value.trim();
		if (!message) {
			return;
		}

		socket.emit("message", message);
		elements.input.value = "";
	});

	elements.tokenDisplay.addEventListener("click", () => {
		copyTokenFromDisplay();
	});

	elements.tokenDisplay.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			copyTokenFromDisplay();
		}
	});

	elements.shareLink.addEventListener("click", () => {
		if (elements.shareLink.value) {
			elements.shareLink.select();
		}
	});

	const urlToken = new URLSearchParams(window.location.search).get("token");
	if (urlToken) {
		elements.tokenInput.value = urlToken;
		syncTokenAndLinkUI(urlToken);
	}

	const storedToken = localStorage.getItem("chatToken");
	const storedUsername = localStorage.getItem("chatUsername");

	if (storedToken && storedUsername) {
		elements.tokenInput.value = storedToken;
		elements.usernameInput.value = storedUsername;
		syncTokenAndLinkUI(storedToken);
		connectToChat(storedToken, storedUsername);
		return;
	}

	if (!urlToken) {
		syncTokenAndLinkUI("");
	}
});
