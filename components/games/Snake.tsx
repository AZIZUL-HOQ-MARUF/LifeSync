import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw } from 'lucide-react';

const GRID_SIZE = 15;
const INITIAL_SNAKE = [[5, 5]];
const INITIAL_DIRECTION = [0, 1];

const SnakeGame: React.FC = () => {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState([10, 10]);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const moveInterval = useRef<number | null>(null);

  const generateFood = () => {
    let newFood;
    while (true) {
      newFood = [
        Math.floor(Math.random() * GRID_SIZE),
        Math.floor(Math.random() * GRID_SIZE),
      ];
      // Check collision with snake
      // eslint-disable-next-line no-loop-func
      const collision = snake.some(segment => segment[0] === newFood[0] && segment[1] === newFood[1]);
      if (!collision) break;
    }
    setFood(newFood);
  };

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setGameOver(false);
    setScore(0);
    setIsPlaying(false);
    if (moveInterval.current) clearInterval(moveInterval.current);
  };

  const checkCollision = (head: number[]) => {
    // Wall collision
    if (head[0] < 0 || head[0] >= GRID_SIZE || head[1] < 0 || head[1] >= GRID_SIZE) return true;
    // Self collision
    for (const segment of snake) {
      if (head[0] === segment[0] && head[1] === segment[1]) return true;
    }
    return false;
  };

  const gameLoop = () => {
    setSnake((prevSnake) => {
      const newHead = [prevSnake[0][0] + direction[0], prevSnake[0][1] + direction[1]];
      
      if (checkCollision(newHead)) {
        setGameOver(true);
        setIsPlaying(false);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];
      
      if (newHead[0] === food[0] && newHead[1] === food[1]) {
        setScore(s => s + 1);
        generateFood();
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  };

  useEffect(() => {
    if (isPlaying && !gameOver) {
      moveInterval.current = window.setInterval(gameLoop, 200);
    } else {
      if (moveInterval.current) clearInterval(moveInterval.current);
    }
    return () => {
      if (moveInterval.current) clearInterval(moveInterval.current);
    };
  }, [isPlaying, gameOver, direction, food]);

  // Touch controls
  const handleControl = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (gameOver) return;
    switch (dir) {
      case 'UP': if (direction[0] !== 1) setDirection([-1, 0]); break;
      case 'DOWN': if (direction[0] !== -1) setDirection([1, 0]); break;
      case 'LEFT': if (direction[1] !== 1) setDirection([0, -1]); break;
      case 'RIGHT': if (direction[1] !== -1) setDirection([0, 1]); break;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full">
        <h3 className="text-xl font-bold mb-2">Retro Snake</h3>
        <div className="mb-2 text-sm text-gray-500">Score: {score}</div>
        
        <div 
            className="relative bg-gray-100 dark:bg-slate-900 border-2 border-gray-300 dark:border-slate-700 mb-4"
            style={{ 
                width: 250, 
                height: 250,
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
            }}
        >
            {gameOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-bold z-10">
                    GAME OVER
                </div>
            )}
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const x = Math.floor(i / GRID_SIZE);
                const y = i % GRID_SIZE;
                const isSnake = snake.some(s => s[0] === x && s[1] === y);
                const isFood = food[0] === x && food[1] === y;
                return (
                    <div key={i} className={`
                        ${isSnake ? 'bg-green-500 rounded-sm' : ''}
                        ${isFood ? 'bg-red-500 rounded-full scale-75' : ''}
                    `} />
                );
            })}
        </div>

        <div className="grid grid-cols-3 gap-2 w-full max-w-[200px] mb-4">
            <div></div>
            <button onClick={() => handleControl('UP')} className="p-3 bg-gray-200 dark:bg-slate-700 rounded-lg active:bg-gray-300">⬆️</button>
            <div></div>
            <button onClick={() => handleControl('LEFT')} className="p-3 bg-gray-200 dark:bg-slate-700 rounded-lg active:bg-gray-300">⬅️</button>
            <button onClick={() => handleControl('DOWN')} className="p-3 bg-gray-200 dark:bg-slate-700 rounded-lg active:bg-gray-300">⬇️</button>
            <button onClick={() => handleControl('RIGHT')} className="p-3 bg-gray-200 dark:bg-slate-700 rounded-lg active:bg-gray-300">➡️</button>
        </div>

        <div className="flex gap-2">
            {!isPlaying && !gameOver && (
                <button onClick={() => setIsPlaying(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg">
                    <Play className="w-4 h-4" /> Start
                </button>
            )}
            <button onClick={resetGame} className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg">
                <RotateCcw className="w-4 h-4" /> Reset
            </button>
        </div>
    </div>
  );
};

export default SnakeGame;