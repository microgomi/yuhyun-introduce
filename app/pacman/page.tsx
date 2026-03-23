'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useCallback } from 'react';

// Maze: 0=wall, 1=dot, 2=empty, 3=power pellet, 4=ghost house
const INITIAL_MAZE: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,3,1,1,1,1,1,0,1,1,1,1,1,3,0],
  [0,1,0,0,1,0,1,0,1,0,1,0,0,1,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0],
  [0,1,0,1,0,0,1,0,1,0,0,1,0,1,0],
  [0,1,1,1,1,1,1,0,1,1,1,1,1,1,0],
  [0,0,0,1,0,0,2,2,2,0,0,1,0,0,0],
  [2,2,0,1,0,4,4,4,4,4,0,1,0,2,2],
  [0,0,0,1,0,4,4,4,4,4,0,1,0,0,0],
  [0,1,1,1,1,1,1,0,1,1,1,1,1,1,0],
  [0,1,0,0,1,0,1,0,1,0,1,0,0,1,0],
  [0,3,1,0,1,1,1,2,1,1,1,0,1,3,0],
  [0,0,1,0,1,0,1,0,1,0,1,0,1,0,0],
  [0,1,1,1,1,1,1,0,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const ROWS = 15;
const COLS = 15;
const CELL_SIZE = 28;

type Direction = 'up' | 'down' | 'left' | 'right';

interface Position {
  x: number;
  y: number;
}

interface Ghost {
  pos: Position;
  color: string;
  name: string;
  dir: Direction;
  frightened: boolean;
  eaten: boolean;
  homeTimer: number;
}

interface GameState {
  pacman: Position;
  pacmanDir: Direction;
  nextDir: Direction;
  ghosts: Ghost[];
  maze: number[][];
  score: number;
  lives: number;
  level: number;
  dotsLeft: number;
  powerTimer: number;
  ghostsEaten: number;
  phase: 'ready' | 'playing' | 'dying' | 'gameover' | 'levelcomplete';
  phaseTimer: number;
  mouthOpen: boolean;
  mouthTimer: number;
  flashTimer: number;
  eatFlash: Position | null;
  eatScore: number;
}

function deepCopyMaze(m: number[][]): number[][] {
  return m.map(row => [...row]);
}

function countDots(maze: number[][]): number {
  let c = 0;
  for (let r = 0; r < ROWS; r++)
    for (let col = 0; col < COLS; col++)
      if (maze[r][col] === 1 || maze[r][col] === 3) c++;
  return c;
}

function createGhosts(): Ghost[] {
  return [
    { pos: { x: 6, y: 7 }, color: '#FF0000', name: 'red', dir: 'up', frightened: false, eaten: false, homeTimer: 0 },
    { pos: { x: 7, y: 7 }, color: '#FFB8FF', name: 'pink', dir: 'up', frightened: false, eaten: false, homeTimer: 30 },
    { pos: { x: 8, y: 7 }, color: '#00FFFF', name: 'cyan', dir: 'up', frightened: false, eaten: false, homeTimer: 60 },
    { pos: { x: 5, y: 7 }, color: '#FFB852', name: 'orange', dir: 'up', frightened: false, eaten: false, homeTimer: 90 },
  ];
}

function initState(level: number = 1, lives: number = 3, score: number = 0): GameState {
  const maze = deepCopyMaze(INITIAL_MAZE);
  return {
    pacman: { x: 7, y: 11 },
    pacmanDir: 'left',
    nextDir: 'left',
    ghosts: createGhosts(),
    maze,
    score,
    lives,
    level,
    dotsLeft: countDots(maze),
    powerTimer: 0,
    ghostsEaten: 0,
    phase: 'ready',
    phaseTimer: 90,
    mouthOpen: true,
    mouthTimer: 0,
    flashTimer: 0,
    eatFlash: null,
    eatScore: 0,
  };
}

function dirDelta(d: Direction): Position {
  switch (d) {
    case 'up': return { x: 0, y: -1 };
    case 'down': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
  }
}

function isWalkable(maze: number[][], x: number, y: number, isGhost: boolean = false): boolean {
  // Warp tunnel
  if (y === 7 && (x < 0 || x >= COLS)) return true;
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  const cell = maze[y][x];
  if (cell === 0) return false;
  if (cell === 4 && !isGhost) return false;
  return true;
}

function wrapX(x: number): number {
  if (x < 0) return COLS - 1;
  if (x >= COLS) return 0;
  return x;
}

function dist(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

const ALL_DIRS: Direction[] = ['up', 'down', 'left', 'right'];

function opposite(d: Direction): Direction {
  switch (d) {
    case 'up': return 'down';
    case 'down': return 'up';
    case 'left': return 'right';
    case 'right': return 'left';
  }
}

function chooseGhostDir(ghost: Ghost, target: Position, maze: number[][]): Direction {
  const options = ALL_DIRS.filter(d => {
    if (d === opposite(ghost.dir)) return false;
    const delta = dirDelta(d);
    const nx = ghost.pos.x + delta.x;
    const ny = ghost.pos.y + delta.y;
    return isWalkable(maze, nx, ny, true);
  });
  if (options.length === 0) {
    // Reverse allowed if no other option
    const delta = dirDelta(opposite(ghost.dir));
    const nx = ghost.pos.x + delta.x;
    const ny = ghost.pos.y + delta.y;
    if (isWalkable(maze, nx, ny, true)) return opposite(ghost.dir);
    return ghost.dir;
  }
  let best = options[0];
  let bestDist = Infinity;
  for (const d of options) {
    const delta = dirDelta(d);
    const nx = wrapX(ghost.pos.x + delta.x);
    const ny = ghost.pos.y + delta.y;
    const dd = dist({ x: nx, y: ny }, target);
    if (dd < bestDist) {
      bestDist = dd;
      best = d;
    }
  }
  return best;
}

function randomDir(ghost: Ghost, maze: number[][]): Direction {
  const options = ALL_DIRS.filter(d => {
    if (d === opposite(ghost.dir)) return false;
    const delta = dirDelta(d);
    return isWalkable(maze, ghost.pos.x + delta.x, ghost.pos.y + delta.y, true);
  });
  if (options.length === 0) return opposite(ghost.dir);
  return options[Math.floor(Math.random() * options.length)];
}

export default function PacmanPage() {
  const stateRef = useRef<GameState>(initState());
  const [renderTick, setRenderTick] = useState(0);
  const animRef = useRef<number>(0);
  const tickRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gameStartedRef = useRef(false);

  const setDir = useCallback((d: Direction) => {
    const s = stateRef.current;
    if (s.phase === 'ready') {
      s.phase = 'playing';
      s.phaseTimer = 0;
    }
    s.nextDir = d;
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); setDir('up'); break;
        case 'ArrowDown': e.preventDefault(); setDir('down'); break;
        case 'ArrowLeft': e.preventDefault(); setDir('left'); break;
        case 'ArrowRight': e.preventDefault(); setDir('right'); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setDir]);

  // Touch swipe
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        setDir(dx > 0 ? 'right' : 'left');
      } else {
        setDir(dy > 0 ? 'down' : 'up');
      }
      touchStartRef.current = null;
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [setDir]);

  // Game loop
  useEffect(() => {
    const TICK_RATE = 150; // ms per game tick
    let lastTick = 0;

    const loop = (time: number) => {
      animRef.current = requestAnimationFrame(loop);
      if (time - lastTick < TICK_RATE) return;
      lastTick = time;

      const s = stateRef.current;

      // Mouth animation
      s.mouthTimer++;
      if (s.mouthTimer >= 2) {
        s.mouthOpen = !s.mouthOpen;
        s.mouthTimer = 0;
      }

      // Flash timer
      if (s.flashTimer > 0) s.flashTimer--;

      if (s.phase === 'ready') {
        s.phaseTimer--;
        if (s.phaseTimer <= 0) {
          s.phase = 'playing';
        }
        setRenderTick(t => t + 1);
        return;
      }

      if (s.phase === 'dying') {
        s.phaseTimer--;
        if (s.phaseTimer <= 0) {
          if (s.lives <= 0) {
            s.phase = 'gameover';
          } else {
            // Reset positions
            s.pacman = { x: 7, y: 11 };
            s.pacmanDir = 'left';
            s.nextDir = 'left';
            s.ghosts = createGhosts();
            s.powerTimer = 0;
            s.ghostsEaten = 0;
            s.phase = 'ready';
            s.phaseTimer = 60;
          }
        }
        setRenderTick(t => t + 1);
        return;
      }

      if (s.phase === 'levelcomplete') {
        s.phaseTimer--;
        if (s.phaseTimer <= 0) {
          const newState = initState(s.level + 1, s.lives, s.score);
          Object.assign(s, newState);
        }
        setRenderTick(t => t + 1);
        return;
      }

      if (s.phase === 'gameover') {
        setRenderTick(t => t + 1);
        return;
      }

      // Playing phase
      // Power timer
      if (s.powerTimer > 0) {
        s.powerTimer--;
        if (s.powerTimer <= 0) {
          s.ghosts.forEach(g => {
            g.frightened = false;
          });
          s.ghostsEaten = 0;
        }
      }

      // Move pacman: try nextDir first
      const nd = dirDelta(s.nextDir);
      let nx = wrapX(s.pacman.x + nd.x);
      let ny = s.pacman.y + nd.y;
      if (isWalkable(s.maze, nx, ny)) {
        s.pacmanDir = s.nextDir;
        s.pacman = { x: nx, y: ny };
      } else {
        // Try current dir
        const cd = dirDelta(s.pacmanDir);
        nx = wrapX(s.pacman.x + cd.x);
        ny = s.pacman.y + cd.y;
        if (isWalkable(s.maze, nx, ny)) {
          s.pacman = { x: nx, y: ny };
        }
      }

      // Warp
      s.pacman.x = wrapX(s.pacman.x);

      // Eat dot / pellet
      const cell = s.maze[s.pacman.y]?.[s.pacman.x];
      if (cell === 1) {
        s.maze[s.pacman.y][s.pacman.x] = 2;
        s.score += 10;
        s.dotsLeft--;
      } else if (cell === 3) {
        s.maze[s.pacman.y][s.pacman.x] = 2;
        s.score += 50;
        s.dotsLeft--;
        s.powerTimer = 53; // ~8 seconds at 150ms tick
        s.ghostsEaten = 0;
        s.ghosts.forEach(g => {
          if (!g.eaten) {
            g.frightened = true;
            g.dir = opposite(g.dir);
          }
        });
      }

      // Level complete
      if (s.dotsLeft <= 0) {
        s.phase = 'levelcomplete';
        s.phaseTimer = 60;
        setRenderTick(t => t + 1);
        return;
      }

      // Move ghosts
      const speedMult = Math.min(s.level, 5);
      s.ghosts.forEach(g => {
        if (g.homeTimer > 0) {
          g.homeTimer--;
          return;
        }

        // If in ghost house, move up
        if (s.maze[g.pos.y]?.[g.pos.x] === 4) {
          g.pos = { x: 7, y: 6 };
          g.dir = 'left';
          return;
        }

        if (g.eaten) {
          // Go home
          const homeTarget = { x: 7, y: 7 };
          if (g.pos.x === homeTarget.x && g.pos.y === homeTarget.y) {
            g.eaten = false;
            g.frightened = false;
            g.homeTimer = 20;
            return;
          }
          g.dir = chooseGhostDir(g, homeTarget, s.maze);
        } else if (g.frightened) {
          g.dir = randomDir(g, s.maze);
        } else {
          // AI
          let target: Position;
          switch (g.name) {
            case 'red':
              target = { ...s.pacman };
              break;
            case 'pink': {
              const ahead = dirDelta(s.pacmanDir);
              target = { x: s.pacman.x + ahead.x * 4, y: s.pacman.y + ahead.y * 4 };
              break;
            }
            case 'cyan':
              g.dir = randomDir(g, s.maze);
              target = g.pos; // not used since we set dir
              break;
            case 'orange': {
              const d2 = dist(g.pos, s.pacman);
              if (d2 > 8) {
                target = { ...s.pacman };
              } else {
                target = { x: 0, y: ROWS - 1 }; // run to corner
              }
              break;
            }
            default:
              target = { ...s.pacman };
          }
          if (g.name !== 'cyan') {
            g.dir = chooseGhostDir(g, target, s.maze);
          }
        }

        const delta = dirDelta(g.dir);
        const gnx = wrapX(g.pos.x + delta.x);
        const gny = g.pos.y + delta.y;
        if (isWalkable(s.maze, gnx, gny, true)) {
          g.pos = { x: gnx, y: gny };
        } else {
          // pick random valid
          g.dir = randomDir(g, s.maze);
          const d2 = dirDelta(g.dir);
          const gnx2 = wrapX(g.pos.x + d2.x);
          const gny2 = g.pos.y + d2.y;
          if (isWalkable(s.maze, gnx2, gny2, true)) {
            g.pos = { x: gnx2, y: gny2 };
          }
        }
      });

      // Check collisions
      s.ghosts.forEach(g => {
        if (g.homeTimer > 0) return;
        if (g.pos.x === s.pacman.x && g.pos.y === s.pacman.y) {
          if (g.eaten) return;
          if (g.frightened) {
            g.eaten = true;
            g.frightened = false;
            s.ghostsEaten++;
            const points = 200 * Math.pow(2, s.ghostsEaten - 1);
            s.score += points;
            s.eatFlash = { ...g.pos };
            s.eatScore = points;
            s.flashTimer = 8;
          } else {
            // Die
            s.lives--;
            s.phase = 'dying';
            s.phaseTimer = 30;
          }
        }
      });

      setRenderTick(t => t + 1);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const s = stateRef.current;

  const restart = () => {
    Object.assign(stateRef.current, initState());
    setRenderTick(t => t + 1);
  };

  // Rotation for pac-man mouth
  const rotation = s.pacmanDir === 'right' ? 0 : s.pacmanDir === 'down' ? 90 : s.pacmanDir === 'left' ? 180 : 270;

  // Render wall cell - check neighbors for rounded corners
  const getWallStyle = (r: number, c: number) => {
    const isW = (rr: number, cc: number) => {
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) return true;
      return s.maze[rr][cc] === 0;
    };
    const top = isW(r - 1, c);
    const bot = isW(r + 1, c);
    const left = isW(r, c - 1);
    const right = isW(r, c + 1);

    let borderRadius = '';
    if (!top && !left && !isW(r - 1, c - 1)) borderRadius += '0 ';
    else borderRadius += '4px ';
    if (!top && !right && !isW(r - 1, c + 1)) borderRadius += '0 ';
    else borderRadius += '4px ';
    if (!bot && !right && !isW(r + 1, c + 1)) borderRadius += '0 ';
    else borderRadius += '4px ';
    if (!bot && !left && !isW(r + 1, c - 1)) borderRadius += '0';
    else borderRadius += '4px';

    return {
      backgroundColor: '#1a1aff',
      border: '1px solid #3333ff',
      borderRadius,
    };
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center py-4 px-2">
      <div className="w-full max-w-lg">
        <Link href="/" className="text-yellow-400 hover:text-yellow-300 mb-3 inline-block text-sm">
          ← 홈으로
        </Link>

        <h1 className="text-2xl font-bold text-center text-yellow-400 mb-2">팩맨</h1>

        {/* Score / Lives / Level */}
        <div className="flex justify-between items-center mb-2 text-sm px-1">
          <div>점수: <span className="text-yellow-300 font-bold">{s.score}</span></div>
          <div>레벨: <span className="text-green-400">{s.level}</span></div>
          <div>
            목숨:{' '}
            {Array.from({ length: s.lives }).map((_, i) => (
              <span key={i} className="text-yellow-400 text-lg">●</span>
            ))}
          </div>
        </div>

        {/* Maze */}
        <div
          className="relative mx-auto border-2 border-blue-800"
          style={{
            width: COLS * CELL_SIZE,
            height: ROWS * CELL_SIZE,
          }}
        >
          {/* Render maze cells */}
          {s.maze.map((row, r) =>
            row.map((cell, c) => {
              const style: React.CSSProperties = {
                position: 'absolute',
                left: c * CELL_SIZE,
                top: r * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              };

              if (cell === 0) {
                return (
                  <div key={`${r}-${c}`} style={{ ...style, ...getWallStyle(r, c) }} />
                );
              }

              // Path (black bg)
              return (
                <div key={`${r}-${c}`} style={{ ...style, backgroundColor: '#000' }}>
                  {cell === 1 && (
                    <div
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        backgroundColor: '#FFB8AE',
                      }}
                    />
                  )}
                  {cell === 3 && (
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: s.mouthOpen ? '#FFB8AE' : '#FF8888',
                        animation: 'pulse 0.5s infinite',
                      }}
                    />
                  )}
                </div>
              );
            })
          )}

          {/* Pac-Man */}
          <div
            style={{
              position: 'absolute',
              left: s.pacman.x * CELL_SIZE + 2,
              top: s.pacman.y * CELL_SIZE + 2,
              width: CELL_SIZE - 4,
              height: CELL_SIZE - 4,
              borderRadius: '50%',
              backgroundColor: '#FFFF00',
              transform: `rotate(${rotation}deg)`,
              transition: 'left 0.1s linear, top 0.1s linear',
              zIndex: 10,
              clipPath: s.mouthOpen
                ? 'polygon(100% 50%, 50% 50%, 80% 15%, 50% 0%, 0% 0%, 0% 100%, 50% 100%, 80% 85%)'
                : 'polygon(100% 50%, 50% 50%, 65% 40%, 50% 0%, 0% 0%, 0% 100%, 50% 100%, 65% 60%)',
              opacity: s.phase === 'dying' ? (s.phaseTimer % 4 < 2 ? 1 : 0.2) : 1,
            }}
          />

          {/* Ghosts */}
          {s.ghosts.map((g, i) => {
            if (g.homeTimer > 0 && s.maze[g.pos.y]?.[g.pos.x] === 4) return null;
            const isFlashing = g.frightened && s.powerTimer < 15 && s.powerTimer % 4 < 2;
            const ghostColor = g.eaten
              ? 'transparent'
              : g.frightened
                ? isFlashing ? '#FFFFFF' : '#2121DE'
                : g.color;
            const eyeColor = g.eaten ? g.color : g.frightened ? '#FFFFFF' : '#FFFFFF';

            return (
              <div
                key={`ghost-${i}`}
                style={{
                  position: 'absolute',
                  left: g.pos.x * CELL_SIZE + 2,
                  top: g.pos.y * CELL_SIZE + 1,
                  width: CELL_SIZE - 4,
                  height: CELL_SIZE - 2,
                  zIndex: 9,
                  transition: 'left 0.1s linear, top 0.1s linear',
                }}
              >
                {/* Ghost body */}
                <div
                  style={{
                    width: '100%',
                    height: '80%',
                    backgroundColor: ghostColor,
                    borderRadius: '50% 50% 0 0',
                    position: 'relative',
                    border: g.eaten ? `2px solid ${g.color}` : 'none',
                  }}
                >
                  {/* Eyes */}
                  <div style={{
                    position: 'absolute', left: '20%', top: '30%',
                    width: 6, height: 7, backgroundColor: eyeColor, borderRadius: '50%',
                  }}>
                    <div style={{
                      width: 3, height: 3, backgroundColor: g.frightened && !g.eaten ? '#2121DE' : '#000',
                      borderRadius: '50%', position: 'absolute',
                      left: g.dir === 'left' ? 0 : g.dir === 'right' ? 3 : 1.5,
                      top: g.dir === 'up' ? 0 : g.dir === 'down' ? 4 : 2,
                    }} />
                  </div>
                  <div style={{
                    position: 'absolute', right: '20%', top: '30%',
                    width: 6, height: 7, backgroundColor: eyeColor, borderRadius: '50%',
                  }}>
                    <div style={{
                      width: 3, height: 3, backgroundColor: g.frightened && !g.eaten ? '#2121DE' : '#000',
                      borderRadius: '50%', position: 'absolute',
                      left: g.dir === 'left' ? 0 : g.dir === 'right' ? 3 : 1.5,
                      top: g.dir === 'up' ? 0 : g.dir === 'down' ? 4 : 2,
                    }} />
                  </div>
                  {/* Frightened mouth */}
                  {g.frightened && !g.eaten && (
                    <div style={{
                      position: 'absolute', bottom: 2, left: '15%', right: '15%',
                      height: 2, backgroundColor: eyeColor,
                      borderRadius: 1,
                    }} />
                  )}
                </div>
                {/* Ghost skirt */}
                <div style={{
                  display: 'flex', width: '100%', height: '20%',
                }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      flex: 1,
                      backgroundColor: ghostColor,
                      borderRadius: '0 0 50% 50%',
                      border: g.eaten ? `1px solid ${g.color}` : 'none',
                    }} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Eat flash / score popup */}
          {s.flashTimer > 0 && s.eatFlash && (
            <div
              style={{
                position: 'absolute',
                left: s.eatFlash.x * CELL_SIZE - 8,
                top: s.eatFlash.y * CELL_SIZE - 4,
                color: '#00FFFF',
                fontSize: 12,
                fontWeight: 'bold',
                zIndex: 20,
                textShadow: '0 0 6px #00FFFF',
              }}
            >
              {s.eatScore}
            </div>
          )}

          {/* Ready text */}
          {s.phase === 'ready' && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '45%',
                textAlign: 'center',
                color: '#FFFF00',
                fontSize: 20,
                fontWeight: 'bold',
                zIndex: 30,
                textShadow: '0 0 10px #FFFF00',
              }}
            >
              준비!
            </div>
          )}

          {/* Game Over */}
          {s.phase === 'gameover' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.8)',
                zIndex: 30,
              }}
            >
              <div className="text-red-500 text-2xl font-bold mb-2" style={{ textShadow: '0 0 10px #FF0000' }}>
                게임 오버
              </div>
              <div className="text-yellow-300 mb-3">최종 점수: {s.score}</div>
              <button
                onClick={restart}
                className="bg-yellow-500 text-black px-4 py-2 rounded font-bold hover:bg-yellow-400"
              >
                다시 하기
              </button>
            </div>
          )}

          {/* Level complete */}
          {s.phase === 'levelcomplete' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 30,
              }}
            >
              <div
                className="text-green-400 text-xl font-bold"
                style={{
                  textShadow: '0 0 10px #00FF00',
                  animation: 'pulse 0.3s infinite',
                }}
              >
                레벨 클리어!
              </div>
            </div>
          )}
        </div>

        {/* D-pad mobile controls */}
        <div className="mt-4 flex flex-col items-center gap-1 select-none">
          <button
            onTouchStart={(e) => { e.preventDefault(); setDir('up'); }}
            onClick={() => setDir('up')}
            className="w-14 h-14 bg-gray-800 rounded-lg text-2xl active:bg-gray-600 border border-gray-600 flex items-center justify-center"
          >
            ▲
          </button>
          <div className="flex gap-1">
            <button
              onTouchStart={(e) => { e.preventDefault(); setDir('left'); }}
              onClick={() => setDir('left')}
              className="w-14 h-14 bg-gray-800 rounded-lg text-2xl active:bg-gray-600 border border-gray-600 flex items-center justify-center"
            >
              ◀
            </button>
            <div className="w-14 h-14 bg-gray-900 rounded-lg flex items-center justify-center text-yellow-400 text-lg">
              ●
            </div>
            <button
              onTouchStart={(e) => { e.preventDefault(); setDir('right'); }}
              onClick={() => setDir('right')}
              className="w-14 h-14 bg-gray-800 rounded-lg text-2xl active:bg-gray-600 border border-gray-600 flex items-center justify-center"
            >
              ▶
            </button>
          </div>
          <button
            onTouchStart={(e) => { e.preventDefault(); setDir('down'); }}
            onClick={() => setDir('down')}
            className="w-14 h-14 bg-gray-800 rounded-lg text-2xl active:bg-gray-600 border border-gray-600 flex items-center justify-center"
          >
            ▼
          </button>
        </div>

        <div className="text-center text-gray-500 text-xs mt-3">
          방향키 또는 스와이프로 조작
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
