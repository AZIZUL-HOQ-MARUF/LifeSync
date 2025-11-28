import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

const TicTacToe: React.FC = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const calculateWinner = (squares: any[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const winner = calculateWinner(board);
  const isDraw = !winner && board.every((square) => square !== null);

  const handleClick = (i: number) => {
    if (winner || board[i]) return;
    const newBoard = [...board];
    newBoard[i] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
      <h3 className="text-xl font-bold mb-4">Tic Tac Toe</h3>
      <div className="mb-4 text-lg font-medium">
        {winner ? (
          <span className="text-green-500">Winner: {winner}</span>
        ) : isDraw ? (
          <span className="text-yellow-500">Draw!</span>
        ) : (
          <span>Next Player: <span className={xIsNext ? 'text-indigo-500' : 'text-purple-500'}>{xIsNext ? 'X' : 'O'}</span></span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {board.map((square, i) => (
          <button
            key={i}
            className={`w-16 h-16 text-2xl font-bold rounded-lg transition-colors flex items-center justify-center
              ${square === 'X' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300' : ''}
              ${square === 'O' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300' : ''}
              ${!square ? 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600' : ''}
            `}
            onClick={() => handleClick(i)}
          >
            {square}
          </button>
        ))}
      </div>
      <button
        onClick={resetGame}
        className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:opacity-90"
      >
        <RotateCcw className="w-4 h-4" /> Reset Game
      </button>
    </div>
  );
};

export default TicTacToe;