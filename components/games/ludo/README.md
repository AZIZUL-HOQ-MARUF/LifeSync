# Ludo Game — Codebase Reference

## File Map

```
components/games/ludo/
├── index.tsx        — Root component, all game state, rollDice, moveToken
├── types.ts         — PlayerColor, Token, LudoState interfaces
├── constants.ts     — MAIN_TRACK, HOME_COL, START_INDEX, SAFE_POSITIONS, COLOR, PLAYER_LABEL
├── board.ts         — classifyCell, BOARD_CELLS, getTokenGridPos, getMainTrackPos, isMainTrackSafe
├── gameLogic.ts     — buildInitialTokens, computeMovable, isTokenInDuo, getDuoPartner, INITIAL_STATE
├── audio.ts         — playDiceSound, playTokenSound, playCaptureSound, playCompletionSound
├── LudoBoard.tsx    — Board rendering, 5 memoized sub-components
├── DiceButton.tsx   — Dice face renderer, color-coded per current player
└── TokenCircle.tsx  — Single token button with movable/duo/small/home variants
```

Entry point from the app: `components/games/Ludo.tsx` re-exports `ludo/index.tsx`.

---

## Position Encoding

Every `Token.position` is a relative integer:

| Value | Meaning |
|-------|---------|
| `-1` | Home base (not yet entered) |
| `1–51` | Main track (relative to the player's start) |
| `52–56` | Home column (5 cells leading to finish) |
| `57` | Finished |

**Absolute board position** = `(START_INDEX[player] + token.position) % 52`

`START_INDEX`: `green=0`, `yellow=13`, `blue=26`, `red=39`

Token enters the track at relative position `1` (not `0`). Position `0` is never used.

---

## Board Coordinate System

The board is a **15×15 grid** (`BOARD_CELLS[row][col]`).

`MAIN_TRACK` is an array of 52 `[row, col]` pairs, index 0–51, defining the shared outer path in clockwise order starting from green's entry cell.

`HOME_COL[player]` — 5 `[row, col]` pairs, index 0 = first cell after turning off the main track, index 4 = last cell before center.

`HOME_BASE_CELLS[player]` — 4 `[row, col]` cells inside the colored corner quadrant, used for `position === -1` rendering.

`getTokenGridPos(token)` returns the `[row, col]` for any token at any position (handles all cases including `-1` and `57`).

---

## Coordinate → Grid Pixel (LudoBoard)

```
top  = (row / 15) * 100%
left = (col / 15) * 100%
```

Tokens are absolutely positioned inside the board container as percentage offsets.

---

## Game State (`LudoState`)

```ts
phase: 'setup' | 'playing' | 'finished'
players: PlayerColor[]           // active players only (2–4)
tokens: Token[]                  // all tokens for all active players
currentPlayerIndex: number       // index into players[]
diceValue: number | null         // null = not yet rolled this turn
diceRolled: boolean              // true after roll, before move
movableTokenIds: string[]        // which token ids are clickable
winner: PlayerColor | null

bonusRolls: number               // pending extra rolls after move (≥ 0)
consecutiveSixes: number         // 0 | 1 | 2 — direct six streak
sixStreakSnapshot: Token[] | null // token state before first six of streak
sixPenalty: boolean              // true during the 1400ms rollback display
```

---

## Turn Flow

```
rollDice()
  └─ dice = 1–6
       ├─ dice === 6, consecutiveSixes+1 >= 3  →  sixPenalty=true, rollback after 1400ms, next player
       ├─ dice === 6, movable.length === 0      →  auto-advance after 900ms, streak resets
       ├─ dice === 6, movable.length > 0        →  wait for moveToken(), streak increments
       ├─ dice !== 6, movable.length === 0      →  auto-advance after 900ms
       └─ dice !== 6, movable.length > 0        →  wait for moveToken(), streak resets

moveToken(tokenId)
  └─ move token(s), detect captures + completions
       ├─ allDone → phase='finished', winner set
       └─ bonusRolls = (dice===6?1:0) + captureCount + completionCount + s.bonusRolls
            ├─ bonusRolls > 0  →  same player goes again, bonusRolls decrements by 1
            └─ bonusRolls == 0 →  next player
```

---

## Bonus Roll Rules

| Trigger | Extra rolls granted |
|---------|-------------------|
| Roll a 6 | +1 |
| Capture N opponent tokens | +N |
| Complete N own tokens (reach 57) | +N |

Bonuses stack. `bonusRolls` after a move = `totalEarned - 1` (the -1 pre-allocates the next roll).

**Triple-six penalty**: only counts *direct* six rolls — i.e., when `consecutiveSixes` is preserved. If a bonus roll comes from a capture or completion (`captureCount > 0 || completionCount > 0`), `consecutiveSixes` resets to `0` and `sixStreakSnapshot` is cleared. Example: 6 → 6 → capture bonus → 6 = streak stays at 1, not 3.

---

## Duo Mechanic

Two or more same-color tokens on the same non-safe main-track cell form a **duo**.

- The first two tokens by `token.index` (sorted ascending) are the duo pair.
- A duo moves **together** as one unit, advancing `dice / 2` steps each.
- Duo can only move when `dice % 2 === 0` (even roll).
- Duos **block** opponent singles from landing on or passing through their cell.
- Duos can **capture** opponent singles (if not on a safe cell).
- A third token on the same cell is a **single** that moves independently.

Key functions: `isTokenInDuo(tokens, tokenId)`, `getDuoPartner(tokens, tokenId)`, `computeMovable` (handles duo filtering and blocking).

---

## Safe Cells

`SAFE_POSITIONS` = absolute track indices `{1, 9, 14, 22, 27, 35, 40, 48}`.

Tokens on safe cells cannot be captured. Duos cannot be formed on safe cells (they do not block opponents there).

Start-entry cells `{1, 14, 27, 40}` are also safe. These are each player's first main-track cell.

---

## `rollDice` Stability Pattern

`rollDice` has `[]` dependency (never recreated). It reads current state via `rollStateRef`:

```ts
const rollStateRef = useRef({ diceRolled, tokens, players, currentPlayerIndex, consecutiveSixes });
useEffect(() => { rollStateRef.current = { ... }; }); // runs after every render
```

`computeMovable` inside `rollDice` uses the ref's token snapshot, which is the state at the time of the roll (pre-move). `sixStreakSnapshot` is captured inside a functional `setState(s => ...)` to guarantee it's the pre-move token state.

---

## Audio

All functions in `audio.ts`. Singleton `AudioContext` (`getCtx()`) is reused across calls; recreated only if `state === 'closed'`, resumed if `state === 'suspended'`.

| Function | Sound | When called |
|----------|-------|-------------|
| `playDiceSound()` | Multi-impact dice roll with bandpass noise | Inside `rollDice`, before `setTimeout` |
| `playTokenSound()` | Short bandpass noise click | Inside `moveToken`, before `setState` |
| `playCaptureSound()` | "Tunggg" — triangle oscillator ring-down 650→380Hz | Inside `moveToken` setState updater, when `captureCount > 0` |
| `playCompletionSound()` | Fireworks — three ascending sine pops + highpass sparkle | Inside `moveToken` setState updater, when `completionCount > 0` |

Note: `playCaptureSound` and `playCompletionSound` are called inside the `setState` updater (making it impure), but they execute synchronously in practice. `playDiceSound` and `playTokenSound` are called outside `setState`.

---

## React Performance

- `LudoBoard` and all its sub-components are wrapped in `React.memo`.
- `tokensByCell`, `inactiveSet`, `movableSet` are `useMemo`-derived from state.
- `moveToken`, `rollDice`, `startGame`, `resetGame` are all `useCallback`.
- `BoardGrid` receives only `inactiveSet` (fixed at game start, never changes during play).
- `TokenLayer` iterates only occupied cells (sparse), not all 225.
- `HomeQuadrantOverlays` and `CenterPinwheel` are effectively static once the game starts.

---

## Player Colors and 2/3-Player Modes

```
2 players: green, blue
3 players: green, yellow, blue
4 players: green, yellow, blue, red
```

Inactive players have their quadrant and home column rendered at `opacity: 0.3`. `inactiveSet` is the set of colors NOT in `state.players`.

---

## Key Invariants

- `token.position` is always one of: `-1`, `1–51`, `52–56`, `57`. Value `0` is unused.
- `movableTokenIds` is always a subset of the current player's token ids.
- `diceRolled === true` implies `diceValue !== null`.
- `bonusRolls === 0` after turn change.
- `sixStreakSnapshot` is `null` whenever `consecutiveSixes === 0`.
- `sixPenalty === true` only for the 1400ms window; all other fields are already reset within that window except `tokens` (which restores from snapshot on timeout).
