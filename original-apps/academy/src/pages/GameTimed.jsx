import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Trophy, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GameTimed() {
  const { t, isRTL } = useLanguage();
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [gameOver, setGameOver] = useState(false);

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: drinkItems = [] } = useQuery({
    queryKey: ['drinkItems'],
    queryFn: () => base44.entities.DrinkItem.list(),
  });

  useEffect(() => {
    if ((menuItems.length > 0 || drinkItems.length > 0) && questions.length === 0) {
      generateQuestions();
    }
  }, [menuItems, drinkItems]);

  useEffect(() => {
    if (gameStarted && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setGameOver(true);
    }
  }, [gameStarted, timeLeft]);

  const generateQuestions = () => {
    try {
      const qs = [];
      const allItems = [
        ...menuItems.map(item => ({ ...item, type: 'menu' })),
        ...drinkItems.filter(d => d.category !== 'Spirits').map(item => ({ ...item, type: 'drink' }))
      ];
      
      if (allItems.length === 0) return;
      
      const shuffled = [...allItems].sort(() => Math.random() - 0.5).slice(0, Math.min(20, allItems.length));
      
      shuffled.forEach(item => {
        if (!item || !item.name_he) return;
        
        // True questions
        if (item.allergens?.length > 0) {
          qs.push({
            question: `האם ${item.name_he} מכיל ${item.allergens[0]}?`,
            answer: true
          });
        }
        if (item.ingredients?.length > 0 && item.ingredients[0]) {
          qs.push({
            question: `האם ${item.ingredients[0]} נמצא ב-${item.name_he}?`,
            answer: true
          });
        }
        
        // False questions
        const similarItems = allItems.filter(i => 
          i.category === item.category && i.id !== item.id
        );
        if (similarItems.length > 0) {
          const confusingItem = similarItems[Math.floor(Math.random() * similarItems.length)];
          if (confusingItem?.ingredients?.length > 0) {
            const wrongIngredient = confusingItem.ingredients.find(ing => 
              ing && !item.ingredients?.includes(ing)
            );
            if (wrongIngredient) {
              qs.push({
                question: `האם ${wrongIngredient} נמצא ב-${item.name_he}?`,
                answer: false
              });
            }
          }
        }
      });
      
      const finalQuestions = qs.filter(q => q.question).sort(() => Math.random() - 0.5).slice(0, 20);
      setQuestions(finalQuestions);
    } catch (error) {
      console.error('Error generating questions:', error);
      setQuestions([]);
    }
  };

  const handleAnswer = (userAnsweredYes) => {
    if (!questions || currentQ >= questions.length) {
      setGameOver(true);
      return;
    }
    const current = questions[currentQ];
    const isCorrect = userAnsweredYes === current.answer;
    if (isCorrect) {
      setScore(score + 1);
    }
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
    } else {
      setGameOver(true);
    }
  };

  const handleRestart = () => {
    setGameStarted(false);
    setTimeLeft(60);
    setCurrentQ(0);
    setScore(0);
    setGameOver(false);
    generateQuestions();
  };

  if (menuItems.length === 0 && drinkItems.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">{t('loading')}...</div>;
  }

  if (questions.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">{t('loading')}...</div>;
  }

  if (!gameStarted) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 flex items-center justify-center ${isRTL ? 'rtl' : ''}`}>
        <Card className="max-w-lg">
          <CardContent className="p-8 text-center">
            <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-4">{t('timedChallenge')}</h1>
            <p className="text-gray-600 mb-6">
              {t('instructions')}
            </p>
            <Button onClick={() => setGameStarted(true)} size="lg" className="bg-yellow-600 hover:bg-yellow-700">
              {t('startGame')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 flex items-center justify-center ${isRTL ? 'rtl' : ''}`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('finish')}!</h1>
          <p className="text-2xl text-gray-700 mb-8">
            {t('yourScore')}: <span className="font-bold text-yellow-600">{score}</span>
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRestart} size="lg" className="bg-yellow-600 hover:bg-yellow-700">
              {t('tryAgain')}
            </Button>
            <Link to={createPageUrl('Games')}>
              <Button variant="outline" size="lg">
                {t('backToMenu')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!questions || questions.length === 0 || currentQ >= questions.length) {
    return <div className="min-h-screen flex items-center justify-center">{t('loading')}...</div>;
  }

  const current = questions[currentQ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-yellow-50 to-amber-50 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-2xl mx-auto px-4">
        {/* Timer & Score */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-center">
            <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-yellow-600">{timeLeft}s</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">{t('score')}</p>
            <p className="text-3xl font-bold text-gray-900">{score}</p>
          </div>
        </div>

        {/* Question */}
        <Card>
          <CardContent className="p-8">
            <p className="text-sm text-gray-500 mb-4">{t('questionNumber')} {currentQ + 1} {t('of')} {questions.length}</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              {current.question}
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <Button 
                size="lg"
                onClick={() => handleAnswer(true)}
                className="bg-green-600 hover:bg-green-700 text-xl py-8"
              >
                {t('yes')}
              </Button>
              <Button 
                size="lg"
                onClick={() => handleAnswer(false)}
                variant="destructive"
                className="text-xl py-8"
              >
                {t('no')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}