import { player } from "./online-game.js";

const emotePopup = document.getElementById("emote-popup");
const emoteButton = document.getElementById("emote");
const crossEmotePopup = document.getElementById("cross");
const leftEmojiPopup = document.getElementById("left-emoji");
const rightEmojiPopup = document.getElementById("right-emoji");
const leftDialoguePopup = document.getElementById("left-dialogue");
const rightDialoguePopup = document.getElementById("right-dialogue");

let selectedEmoji = null;
let selectedDialogue = null;

const emoteDelay = 5000;

function toggleEmotePopup(hide = false) {
  if (hide) {
    emotePopup.style.display = "none";
    return;
  }

  emotePopup.style.display =
    emotePopup.style.display === "none" ? "block" : "none";
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
    //socket.emit("emoji", selectedEmoji);
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
    //socket.emit("dialogue", selectedDialogue);
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
