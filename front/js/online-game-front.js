const emotePopup = document.getElementById("emote-popup");
const emoteButton = document.getElementById("emote");
const crossEmotePopup = document.getElementById("cross");

let selectedEmote = null;

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
