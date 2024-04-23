import { player } from "./online-game.js";

const emotePopup = document.getElementById("emote-popup");
const emoteButton = document.getElementById("emote");
const crossEmotePopup = document.getElementById("cross");
const leftEmojiPopup = document.getElementById("left-emoji");
const rightEmojiPopup = document.getElementById("right-emoji");
const leftDialoguePopup = document.getElementById("left-dialogue");
const rightDialoguePopup = document.getElementById("right-dialogue");
const leftEmotes = document.getElementById("left-emote");
const rightEmotes = document.getElementById("right-emote");
const muteEmoteButton = document.getElementById("mute-button");

let selectedEmoji = null;
let selectedDialogue = null;

const emoteDelay = 5000;

const socket = io("/api/social");

function toggleEmotePopup(hide = false) {
  if (hide || emotePopup.style.display === "block") {
    emotePopup.style.display = "none";
  } else {
    emotePopup.style.display = "block";
  }
}

crossEmotePopup.addEventListener("click", () => toggleEmotePopup(true));
emoteButton.addEventListener("click", () => toggleEmotePopup());

emotePopup.addEventListener("click", (e) => {
  if (e.target.classList.contains("emoji-container")) {
    selectedEmoji = e.target.innerHTML;
    toggleEmotePopup(true);
    showEmoji();
  }

  if (e.target.classList.contains("dialogue-container")) {
    selectedDialogue = e.target.innerHTML;
    toggleEmotePopup(true);
    showDialogue();
  }
});

function showEmoji() {
  if (selectedEmoji) {
    socket.emit("emoji", { player, message: selectedEmoji });
    if (player === 1) {
      leftEmojiPopup.innerHTML = selectedEmoji;
      leftEmojiPopup.style.display = "block";
      setTimeout(() => {
        leftEmojiPopup.style.display = "none";
      }, emoteDelay);
    } else {
      rightEmojiPopup.innerHTML = selectedEmoji;
      rightEmojiPopup.style.display = "block";
      setTimeout(() => {
        rightEmojiPopup.style.display = "none";
      }, emoteDelay);
    }

    selectedEmoji = null;
  }
}

function showDialogue() {
  if (selectedDialogue) {
    socket.emit("dialogue", { player, message: selectedDialogue });
    if (player === 1) {
      leftDialoguePopup.innerHTML = selectedDialogue;
      leftDialoguePopup.style.display = "block";
      setTimeout(() => {
        leftDialoguePopup.style.display = "none";
      }, emoteDelay);
    } else {
      rightDialoguePopup.innerHTML = selectedDialogue;
      rightDialoguePopup.style.display = "block";
      setTimeout(() => {
        rightDialoguePopup.style.display = "none";
      }, emoteDelay);
    }

    selectedDialogue = null;
  }
}

socket.on("dialogue", (data) => {
  const { player, message } = data;
  console.log("Received dialogue: ", message + " from player: " + player);
  if (player === 1) {
    leftDialoguePopup.innerHTML = message;
    leftDialoguePopup.style.display = "block";
    setTimeout(() => {
      leftDialoguePopup.style.display = "none";
    }, emoteDelay);
  } else {
    rightDialoguePopup.innerHTML = message;
    rightDialoguePopup.style.display = "block";
    setTimeout(() => {
      rightDialoguePopup.style.display = "none";
    }, emoteDelay);
  }
});

socket.on("emoji", (data) => {
  const { player, message: emoji } = data;
  console.log("Received emoji: ", emoji + " from player: " + player);
  if (player === 1) {
    leftEmojiPopup.innerHTML = emoji;
    leftEmojiPopup.style.display = "block";
    setTimeout(() => {
      leftEmojiPopup.style.display = "none";
    }, emoteDelay);
  } else {
    rightEmojiPopup.innerHTML = emoji;
    rightEmojiPopup.style.display = "block";
    setTimeout(() => {
      rightEmojiPopup.style.display = "none";
    }, emoteDelay);
  }
});

muteEmoteButton.addEventListener("click", () => {
  muteEmoteButton.classList.toggle("mute");
  muteEmoteButton.classList.toggle("unmute");

  muteEmote(muteEmoteButton.classList.contains("mute"));
});

function muteEmote(mute) {
    rightEmotes.style.display = mute ? "none" : "flex";
    leftEmotes.style.display = mute ? "none" : "flex";
    emoteButton.disabled = mute;
}