/**
 * Position names and the movement of the Button.
 *
 * Source: "Poker PRD Part 1", M3-03 (the table of position names) and
 * "Poker PRD Part 2", M4-04-A2 (after one hand, CO becomes HJ).
 */

/** Position names in the preflop action order, for each number of players in the rotation. */
const POSITIONS_BY_PLAYER_COUNT = Object.freeze({
  2: Object.freeze(['BTN', 'BB']),
  3: Object.freeze(['BTN', 'SB', 'BB']),
  4: Object.freeze(['CO', 'BTN', 'SB', 'BB']),
  5: Object.freeze(['HJ', 'CO', 'BTN', 'SB', 'BB']),
  6: Object.freeze(['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']),
  7: Object.freeze(['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']),
  8: Object.freeze(['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']),
  9: Object.freeze(['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']),
  10: Object.freeze(['UTG', 'UTG+1', 'UTG+2', 'UTG+3', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB']),
});

/**
 * Gives the position names for a number of players.
 * @param {number} playerCount - the number of players in the rotation (2 to 10)
 * @returns {readonly string[]} the position names in the preflop action order
 * @throws {RangeError} if the number of players is not from 2 to 10
 */
export function positionsFor(playerCount) {
  const positions = POSITIONS_BY_PLAYER_COUNT[playerCount];
  if (!positions) {
    throw new RangeError(`The number of players must be from 2 to 10. Received: ${playerCount}`);
  }
  return positions;
}

/**
 * Gives Hero's position in the next hand. The Button moves one seat, so Hero
 * moves one step earlier in the action order (CO becomes HJ, UTG becomes BB).
 * @param {string} position - Hero's position in this hand
 * @param {number} playerCount - the number of players in the rotation
 * @returns {string} Hero's position in the next hand
 */
export function positionAfterButtonMove(position, playerCount) {
  return shiftPosition(position, playerCount, -1);
}

/**
 * Gives Hero's position in the previous hand. The undo of a record uses it.
 * @param {string} position - Hero's position in this hand
 * @param {number} playerCount - the number of players in the rotation
 * @returns {string} Hero's position in the previous hand
 */
export function positionBeforeButtonMove(position, playerCount) {
  return shiftPosition(position, playerCount, 1);
}

function shiftPosition(position, playerCount, step) {
  const positions = positionsFor(playerCount);
  const index = positions.indexOf(position);
  if (index === -1) {
    throw new RangeError(`Unknown position "${position}" for ${playerCount} players.`);
  }
  return positions[(index + step + positions.length) % positions.length];
}
