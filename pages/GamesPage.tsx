import React, { useState } from 'react';
import TicTacToe from '../components/games/TicTacToe';
import SnakeGame from '../components/games/Snake.tsx';
import MemoryMatch from '../components/games/MemoryMatch.tsx';
import Game2048 from '../components/games/Game2048.tsx';
import { Gamepad2, ArrowLeft, Grid, Brain, Hash, Circle } from 'lucide-react';
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
        {selectedGame === GameType.MEMORY && <MemoryMatch />}
        {selectedGame === GameType.GAME_2048 && <Game2048 />}
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          onClick={() => setSelectedGame(GameType.TIC_TAC_TOE)}
          className="p-5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg transform transition hover:scale-[1.02] active:scale-95 text-left flex flex-col justify-between h-32"
        >
          <div>
             <div className="flex justify-between items-start">
               <h3 className="text-lg font-bold">Tic Tac Toe</h3>
               <Grid className="opacity-50 w-5 h-5" />
             </div>
             <p className="text-indigo-100 text-xs mt-1">Classic X vs O strategy.</p>
          </div>
        </button>

        <button 
          onClick={() => setSelectedGame(GameType.SNAKE)}
          className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg transform transition hover:scale-[1.02] active:scale-95 text-left flex flex-col justify-between h-32"
        >
          <div>
            <div className="flex justify-between items-start">
               <h3 className="text-lg font-bold">Snake</h3>
               <Circle className="opacity-50 w-5 h-5" />
            </div>
            <p className="text-emerald-100 text-xs mt-1">Eat apples, grow long.</p>
          </div>
        </button>

        <button 
          onClick={() => setSelectedGame(GameType.MEMORY)}
          className="p-5 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl text-white shadow-lg transform transition hover:scale-[1.02] active:scale-95 text-left flex flex-col justify-between h-32"
        >
          <div>
            <div className="flex justify-between items-start">
               <h3 className="text-lg font-bold">Memory Match</h3>
               <Brain className="opacity-50 w-5 h-5" />
            </div>
            <p className="text-pink-100 text-xs mt-1">Train your brain power.</p>
          </div>
        </button>

        <button 
          onClick={() => setSelectedGame(GameType.GAME_2048)}
          className="p-5 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl text-white shadow-lg transform transition hover:scale-[1.02] active:scale-95 text-left flex flex-col justify-between h-32"
        >
          <div>
             <div className="flex justify-between items-start">
               <h3 className="text-lg font-bold">2048</h3>
               <Hash className="opacity-50 w-5 h-5" />
            </div>
            <p className="text-orange-100 text-xs mt-1">Join the numbers.</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default GamesPage;