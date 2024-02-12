function determinePlayerTurn(game) {
  return game.players[game.turn % game.players.length];
}

export { determinePlayerTurn };
