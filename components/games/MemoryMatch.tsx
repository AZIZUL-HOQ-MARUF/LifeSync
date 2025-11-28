import React, { useState, useEffect } from 'react';
import { RotateCcw, Brain } from 'lucide-react';

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const MemoryMatch: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const shuffled = [...EMOJIS, ...EMOJIS]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setIsWon(false);
  };

  const handleCardClick = (id: number) => {
    // Prevent clicking if already 2 flipped, or card is already flipped/matched
    if (flippedCards.length === 2) return;
    const clickedCard = cards.find(c => c.id === id);
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched) return;

    // Flip the card
    const newCards = cards.map(c => c.id === id ? { ...c, isFlipped: true } : c);
    setCards(newCards);
    
    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    // Check match if 2 cards flipped
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [firstId, secondId] = newFlipped;
      const firstCard = newCards.find(c => c.id === firstId);
      const secondCard = newCards.find(c => c.id === secondId);

      if (firstCard?.emoji === secondCard?.emoji) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === firstId || c.id === secondId 
              ? { ...c, isMatched: true, isFlipped: true } 
              : c
          ));
          setFlippedCards([]);
          
          // Check win condition
          if (newCards.filter(c => !c.isMatched).length === 2) {
            setIsWon(true);
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            c.id === firstId || c.id === secondId 
              ? { ...c, isFlipped: false } 
              : c
          ));
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full">
      <div className="flex justify-between w-full items-center mb-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Brain className="text-pink-500 w-5 h-5" /> Memory
          </h3>
          <p className="text-xs text-gray-500">Find the pairs</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">Moves: {moves}</div>
        </div>
      </div>

      {isWon ? (
        <div className="text-center py-10 animate-in zoom-in">
          <div className="text-4xl mb-4">🎉</div>
          <h4 className="text-2xl font-bold text-green-500 mb-2">You Won!</h4>
          <p className="text-gray-500 mb-6">Great memory skills!</p>
          <button
            onClick={initializeGame}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700"
          >
            Play Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-sm mb-6">
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`
                aspect-square rounded-xl text-2xl sm:text-3xl flex items-center justify-center transition-all duration-300 transform perspective-1000
                ${card.isFlipped || card.isMatched 
                  ? 'bg-indigo-100 dark:bg-indigo-900 border-2 border-indigo-200 dark:border-indigo-700 rotate-y-180' 
                  : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'
                }
                ${card.isMatched ? 'opacity-50' : 'opacity-100'}
              `}
            >
              {(card.isFlipped || card.isMatched) ? card.emoji : ''}
            </button>
          ))}
        </div>
      )}

      {!isWon && (
        <button
          onClick={initializeGame}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 text-sm"
        >
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      )}
    </div>
  );
};

export default MemoryMatch;