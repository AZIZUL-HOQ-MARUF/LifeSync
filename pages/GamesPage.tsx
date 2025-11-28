import React, { useState } from 'react';
import TicTacToe from '../components/games/TicTacToe';
import SnakeGame from '../components/games/Snake.tsx';
import { Gamepad2, ArrowLeft } from 'lucide-react';
import { GameType } from '../types';

const GamesPage: React.FC = () => {
  const [selectedGame, setSelectedGame] = useState<GameType>(GameType.NONE);

  if (selectedGame !== GameType.NONE) {
    return (
      <div className="space-y-4">
        <button 
          onClick={() => setSelectedGame(GameType.NONE)}
          className="flex items-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-5 h-5 mr-1" /> Back to Arcade
        </button>
        {selectedGame === GameType.TIC_TAC_TOE && <TicTacToe />}
        {selectedGame === GameType.SNAKE && <SnakeGame />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Gamepad2 className="text-indigo-500" />
        Game Center
      </h2>
      <p className="text-gray-500 dark:text-gray-400">Kill some time with these offline classics.</p>
      
      <div className="grid gap-4">
        <button 
          onClick={() => setSelectedGame(GameType.TIC_TAC_TOE)}
          className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg transform transition hover:scale-[1.02] active:scale-95 text-left"
        >
          <h3 className="text-xl font-bold mb-1">Tic Tac Toe</h3>
          <p className="text-indigo-100 text-sm">Classic X vs O strategy.</p>
        </button>

        <button 
          onClick={() => setSelectedGame(GameType.SNAKE)}
          className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg transform transition hover:scale-[1.02] active:scale-95 text-left"
        >
          <h3 className="text-xl font-bold mb-1">Snake</h3>
          <p className="text-emerald-100 text-sm">Eat apples, grow long, don't crash.</p>
        </button>
      </div>
    </div>
  );
};

export default GamesPage;