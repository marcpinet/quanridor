function initializeGame() {
  // TODO : when multiplayer is implemented, indice will have to be better handled (see https://i.imgur.com/uZXRibi.png)
  return {
    _id: null,
    author: null,
    players: [null, null],
    playerspositions: [
      [4, 8],
      [4, 0],
    ],
    status: 1,
    p1walls: 10,
    p2walls: 10,
    vwalls: [],
    hwalls: [],
    turn: 0,
    date: new Date(),
    winner: null,
  };
}

module.exports = { initializeGame };
