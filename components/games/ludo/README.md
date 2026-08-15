# Ludo Game — Codebase Reference

## File Map

```
components/games/ludo/
├── index.tsx        — Root component, all game state, rollDice, moveToken, computer AI
├── types.ts         — PlayerColor, Token, LudoState interfaces
├── constants.ts     — MAIN_TRACK, HOME_COL, START_INDEX, SAFE_POSITIONS, COLOR, PLAYER_LABEL
├── board.ts         — classifyCell, BOARD_CELLS, getTokenGridPos, getMainTrackPos, isMainTrackSafe
├── gameLogic.ts     — buildInitialTokens, computeMovable, isTokenInDuo, getDuoPartner, pickBestToken, INITIAL_STATE
├── audio.ts         — playDiceSound, playTokenSound, playCaptureSound, playCompletionSound
├── LudoBoard.tsx    — Board rendering, 6 memoized sub-components
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

`getTokenGridPos(token)` returns the `[row, col]` for any token at any position (handles `-1` and `52–56`; returns `[7,7]` for `57` but position-57 tokens are excluded from `tokensByCell` and rendered separately by `FinishedTokensOverlay`).

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
computerPlayers: PlayerColor[]   // colors controlled by the AI ([] = all human)
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

**Triple-six penalty**: only counts *direct* six rolls. If a bonus roll comes from a capture or completion (`captureCount > 0 || completionCount > 0`), `consecutiveSixes` resets to `0` and `sixStreakSnapshot` is cleared. Example: 6 → 6 → capture bonus → 6 = streak stays at 1, not 3.

---

## Duo Mechanic

Two or more same-color tokens on the same non-safe main-track cell form a **duo**.

- The first two tokens by `token.index` (sorted ascending) are the duo pair.
- A duo moves **together** as one unit, advancing `dice / 2` steps each.
- Duo can only move when `dice % 2 === 0` (even roll).
- Duos **block** opponent singles from passing through their cell.
- Duos can **capture** opponent singles (if not on a safe cell).
- A single can **climb on** an opponent duo by landing exactly on its cell (`my_pos + dice === duo_pos`). The single coexists with the duo without capturing it. If the duo later moves forward, the single is left behind alone on that cell.
- A single **cannot pass through** an opponent duo (`my_pos + dice > duo_pos` with duo in the path → blocked).
- A third token on the same cell is a **single** that moves independently.

Key functions: `isTokenInDuo(tokens, tokenId)`, `getDuoPartner(tokens, tokenId)`, `computeMovable` (handles duo filtering and path-blocking).

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

## Computer AI (vs Computer mode)

Enabled via "Play vs Computer" checkbox on the 2-player setup screen. Computer plays as **Blue**; human plays as **Green**.

**How it works**: A `useEffect` in `index.tsx` watches for `isComputerTurn`. When it's the computer's turn:
- 900ms delay → calls `rollDice()`
- 700ms delay after dice lands → calls `moveToken(pickBestToken(...))`

**`pickBestToken`** in `gameLogic.ts` scores each movable token:

| Situation | Score |
|-----------|-------|
| Complete a token (reach 57) | +1000 |
| Capture opponent single (further along = higher) | +800 + opPosition |
| Enter home column | +600 |
| Form a duo with own token | +300 |
| Land on a safe cell | +200 |
| Advancement | +newPosition |
| Landing cell reachable by opponent in 1–6 moves | −150 |
| Entering from home base | −5 |

**Danger detection**: for each candidate landing cell, the AI checks every opponent token on the main track. If any opponent is 1–6 steps behind (i.e., `(absLanding - absOpponent + 52) % 52 ∈ [1,6]`), the move is flagged as dangerous and penalised. Safe cells bypass this check entirely (they can't be captured on).

**Duo formation**: if the AI already has a token at the landing position and the cell is non-safe, landing there forms a blocking duo — a strong defensive move that also locks opponents out of that cell.

**Capture preference**: when multiple captures are available, the AI targets the opponent token with the highest `position` value (closest to finishing), since that token is the biggest threat.

All scores are additive so combinations stack — e.g. capturing a high-position token on a safe cell scores higher than either alone. The AI still falls back to the highest-scoring option even when all candidates are dangerous.

The dice button is disabled and the avatar shows "🤖 Computer" during AI turns. The AI reuses the same `rollDice` and `moveToken` functions as the human player.

---

## Finished Tokens (Center Box)

Tokens at position 57 are **excluded from `tokensByCell`** and rendered by `FinishedTokensOverlay` in `LudoBoard.tsx`. The overlay covers the full 3×3 center pinwheel area (rows 6–8, cols 6–8 = 40%–60% of the board). Each token is placed using a deterministic pseudo-random position derived from a djb2 hash of its `token.id`, so placement is stable across re-renders. `overflow: hidden` ensures no token crosses the center box boundary.

---

## Audio

All functions in `audio.ts`. Singleton `AudioContext` (`getCtx()`) is reused across calls; recreated only if `state === 'closed'`, resumed if `state === 'suspended'`.

| Function | Sound | When called |
|----------|-------|-------------|
| `playDiceSound()` | Multi-impact dice roll with bandpass noise | Inside `rollDice`, before `setTimeout` |
| `playTokenSound()` | Short bandpass noise click | Inside `moveToken`, before `setState` |
| `playCaptureSound()` | "Tunggg" — triangle oscillator ring-down 650→380Hz + click transient | Inside `moveToken` setState updater, when `captureCount > 0` |
| `playCompletionSound()` | Fireworks — three ascending sine pops + highpass sparkle | Inside `moveToken` setState updater, when `completionCount > 0` |

Note: `playCaptureSound` and `playCompletionSound` are called inside the `setState` updater (impure), but execute synchronously in practice.

---

## React Performance

- `LudoBoard` and all sub-components are wrapped in `React.memo`.
- `tokensByCell`, `inactiveSet`, `movableSet` are `useMemo`-derived from state.
- `moveToken`, `rollDice`, `startGame`, `resetGame` are all `useCallback`.
- `BoardGrid` and `HomeQuadrantOverlays` use `inactiveSet = EMPTY_SET` as a default prop (module-level constant) to guard against undefined during HMR or rapid state transitions.
- `BoardGrid` receives only `inactiveSet` (fixed at game start, effectively never changes during play).
- `TokenLayer` iterates only occupied cells (sparse), not all 225.
- `FinishedTokensOverlay` only re-renders when `tokens` changes.
- `CenterPinwheel` is fully static.

---

## Player Colors and 2/3-Player Modes

```
2 players: green, blue   (blue may be computer-controlled)
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
- `computerPlayers` is set at game start and never mutated during gameplay.
