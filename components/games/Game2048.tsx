import React, { useState, useEffect } from 'react';
import { RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Hash } from 'lucide-react';

const SIZE = 4;

const Game2048: React.FC = () => {
  const [board, setBoard] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    let newBoard = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));
    addNumber(newBoard);
    addNumber(newBoard);
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
  };

  const addNumber = (currentBoard: number[][]) => {
    let added = false;
    while (!added) {
      // Check if full
      let isFull = true;
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          if (currentBoard[r][c] === 0) isFull = false;
      
      if (isFull) break;

      const r = Math.floor(Math.random() * SIZE);
      const c = Math.floor(Math.random() * SIZE);
      if (currentBoard[r][c] === 0) {
        currentBoard[r][c] = Math.random() < 0.9 ? 2 : 4;
        added = true;
      }
    }
  };

  const getCellColor = (value: number) => {
    switch (value) {
      case 0: return 'bg-gray-200 dark:bg-slate-700';
      case 2: return 'bg-orange-100 text-gray-800';
      case 4: return 'bg-orange-200 text-gray-800';
      case 8: return 'bg-orange-300 text-white';
      case 16: return 'bg-orange-400 text-white';
      case 32: return 'bg-orange-500 text-white';
      case 64: return 'bg-orange-600 text-white';
      case 128: return 'bg-yellow-400 text-white shadow-lg shadow-yellow-200/50';
      case 256: return 'bg-yellow-500 text-white shadow-lg';
      case 512: return 'bg-yellow-600 text-white shadow-lg';
      default: return 'bg-yellow-700 text-white shadow-lg';
    }
  };

  // Game Logic
  const move = (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    if (gameOver) return;

    let newBoard = board.map(row => [...row]);
    let moved = false;
    let addedScore = 0;

    const slide = (row: number[]) => {
      let arr = row.filter(val => val);
      let missing = SIZE - arr.length;
      let zeros = Array(missing).fill(0);
      return arr.concat(zeros);
    };

    const combine = (row: number[]) => {
      for (let i = 0; i < SIZE - 1; i++) {
        if (row[i] !== 0 && row[i] === row[i + 1]) {
          row[i] *= 2;
          row[i + 1] = 0;
          addedScore += row[i];
          moved = true;
        }
      }
      return row;
    };

    const processRow = (row: number[]) => {
      let original = [...row];
      let slided = slide(row);
      let combined = combine(slided);
      let final = slide(combined);
      if (JSON.stringify(original) !== JSON.stringify(final)) moved = true;
      return final;
    };

    if (direction === 'LEFT' || direction === 'RIGHT') {
      for (let i = 0; i < SIZE; i++) {
        if (direction === 'RIGHT') newBoard[i].reverse();
        newBoard[i] = processRow(newBoard[i]);
        if (direction === 'RIGHT') newBoard[i].reverse();
      }
    } else {
      // Transpose for Up/Down
      for (let i = 0; i < SIZE; i++) {
        let col = [newBoard[0][i], newBoard[1][i], newBoard[2][i], newBoard[3][i]];
        if (direction === 'DOWN') col.reverse();
        col = processRow(col);
        if (direction === 'DOWN') col.reverse();
        newBoard[0][i] = col[0];
        newBoard[1][i] = col[1];
        newBoard[2][i] = col[2];
        newBoard[3][i] = col[3];
      }
    }

    if (moved) {
      addNumber(newBoard);
      setBoard(newBoard);
      setScore(s => s + addedScore);
      
      // Check Game Over (naive check: full board)
      // Real check would ensure no moves possible, but this is sufficient for casual
      let isFull = true;
      for(let r=0; r<SIZE; r++)
         for(let c=0; c<SIZE; c++)
            if(newBoard[r][c]===0) isFull=false;
      
      if (isFull) {
         // Deep check for adjacent same numbers
         let canMove = false;
         for(let r=0; r<SIZE; r++) {
            for(let c=0; c<SIZE; c++) {
               if (r < SIZE-1 && newBoard[r][c] === newBoard[r+1][c]) canMove = true;
               if (c < SIZE-1 && newBoard[r][c] === newBoard[r][c+1]) canMove = true;
            }
         }
         if (!canMove) setGameOver(true);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full">
      <div className="flex justify-between w-full items-center mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
           <Hash className="text-orange-500 w-5 h-5" /> 2048
        </h3>
        <div className="bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-lg">
          <span className="text-xs text-gray-500 block uppercase">Score</span>
          <span className="font-bold">{score}</span>
        </div>
      </div>

      <div className="relative bg-gray-300 dark:bg-slate-900 p-2 rounded-xl mb-6">
        {gameOver && (
          <div className="absolute inset-0 z-10 bg-white/70 dark:bg-slate-900/80 flex flex-col items-center justify-center rounded-xl">
             <h4 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">Game Over</h4>
             <button onClick={initializeGame} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Try Again</button>
          </div>
        )}
        <div className="grid grid-cols-4 gap-2">
          {board.map((row, r) => (
            row.map((cell, c) => (
              <div 
                key={`${r}-${c}`}
                className={`
                  w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center text-lg sm:text-2xl font-bold transition-all duration-200
                  ${getCellColor(cell)}
                `}
              >
                {cell !== 0 ? cell : ''}
              </div>
            ))
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full max-w-[200px] mb-2">
         <div></div>
         <button onClick={() => move('UP')} className="p-3 bg-gray-100 dark:bg-slate-700 rounded-lg active:scale-95 transition-transform"><ChevronUp /></button>
         <div></div>
         <button onClick={() => move('LEFT')} className="p-3 bg-gray-100 dark:bg-slate-700 rounded-lg active:scale-95 transition-transform"><ChevronLeft /></button>
         <button onClick={() => move('DOWN')} className="p-3 bg-gray-100 dark:bg-slate-700 rounded-lg active:scale-95 transition-transform"><ChevronDown /></button>
         <button onClick={() => move('RIGHT')} className="p-3 bg-gray-100 dark:bg-slate-700 rounded-lg active:scale-95 transition-transform"><ChevronRight /></button>
      </div>
      
      <button onClick={initializeGame} className="mt-2 text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
         <RotateCcw className="w-3 h-3" /> Restart
      </button>
    </div>
  );
};

export default Game2048;