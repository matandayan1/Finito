import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Trophy, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAutoTranslateObject, useAutoTranslate } from '@/components/hooks/useAutoTranslate';

function IngredientButton({ ingredient, isSelected, isCorrect, showResult, submitted, onClick }) {
  const { translatedText } = useAutoTranslate(ingredient);
  
  return (
    <motion.button
      whileHover={!submitted ? { scale: 1.05 } : {}}
      whileTap={!submitted ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={submitted}
      className={`p-3 rounded-lg border-2 font-medium transition-all ${
        showResult
          ? isCorrect
            ? 'bg-green-100 border-green-500 text-green-800'
            : 'bg-red-100 border-red-500 text-red-800'
          : isSelected
            ? 'bg-blue-100 border-blue-500 text-blue-800'
            : 'bg-white border-gray-200 hover:border-green-400'
      }`}
    >
      {translatedText}
    </motion.button>
  );
}

function TranslatedBadge({ text, className }) {
  const { translatedText } = useAutoTranslate(text);
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${className}`}>{translatedText}</span>;
}

function DishName({ item }) {
  const { language } = useLanguage();
  const { translatedText } = useAutoTranslate(item?.name_he || '');
  return language === 'en' && item?.name_en ? item.name_en : (language === 'he' ? item?.name_he : translatedText);
}

export default function GameBuildDish() {
  const { t, isRTL, language } = useLanguage();
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [gameItems, setGameItems] = useState([]);
  const [gameOver, setGameOver] = useState(false);

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: drinkItems = [] } = useQuery({
    queryKey: ['drinkItems'],
    queryFn: () => base44.entities.DrinkItem.list(),
  });

  const currentItem = gameItems[currentRound];
  const { translatedObj: translatedItem } = useAutoTranslateObject(currentItem, ['name_he', 'short_story', 'ingredients']);
  const [allOptions, setAllOptions] = useState([]);

  useEffect(() => {
    if (menuItems.length > 0 || drinkItems.length > 0) {
      const allItems = [
        ...menuItems.map(item => ({ ...item, type: 'menu' })),
        ...drinkItems.filter(d => d.category !== 'Spirits' && d.ingredients?.length >= 3).map(item => ({ ...item, type: 'drink' }))
      ];
      const itemsWithIngredients = allItems.filter(item => item.ingredients && item.ingredients.length >= 3);
      const shuffled = itemsWithIngredients.sort(() => Math.random() - 0.5).slice(0, 8);
      setGameItems(shuffled);
    }
  }, [menuItems, drinkItems]);

  useEffect(() => {
    if (currentItem) {
      const correctIngredients = currentItem.ingredients || [];
      const allItems = [
        ...menuItems.map(item => ({ ...item, type: 'menu' })),
        ...drinkItems.filter(d => d.category !== 'Spirits').map(item => ({ ...item, type: 'drink' }))
      ];
      const sameCategoryItems = allItems.filter(item => 
        item.category === currentItem.category && item.id !== currentItem.id
      );
      const confusingIngredients = [...new Set(sameCategoryItems.flatMap(item => item.ingredients || []))].filter(Boolean);
      const wrongIngredients = confusingIngredients
        .filter(ing => !correctIngredients.includes(ing))
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.max(6, correctIngredients.length));
      const options = [...correctIngredients, ...wrongIngredients].sort(() => Math.random() - 0.5);
      setAllOptions(options);
    }
  }, [currentRound, currentItem, menuItems, drinkItems]);

  const handleToggleIngredient = (ingredient) => {
    if (submitted) return;
    if (selectedIngredients.includes(ingredient)) {
      setSelectedIngredients(selectedIngredients.filter(i => i !== ingredient));
    } else {
      setSelectedIngredients([...selectedIngredients, ingredient]);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correctIngredients = currentItem?.ingredients || [];
    const correctCount = selectedIngredients.filter(ing => correctIngredients.includes(ing)).length;
    const wrongCount = selectedIngredients.filter(ing => !correctIngredients.includes(ing)).length;
    const pointsEarned = Math.max(0, (correctCount * 5) - (wrongCount * 2));
    setScore(score + pointsEarned);
  };

  const handleNext = () => {
    if (currentRound + 1 < gameItems.length) {
      setCurrentRound(currentRound + 1);
      setSelectedIngredients([]);
      setSubmitted(false);
    } else {
      setGameOver(true);
    }
  };

  const handleRestart = () => {
    setCurrentRound(0);
    setScore(0);
    setSelectedIngredients([]);
    setSubmitted(false);
    setGameOver(false);
    const allItems = [
      ...menuItems.map(item => ({ ...item, type: 'menu' })),
      ...drinkItems.filter(d => d.category !== 'Spirits' && d.ingredients?.length >= 3).map(item => ({ ...item, type: 'drink' }))
    ];
    const shuffled = allItems.filter(item => item.ingredients && item.ingredients.length >= 3).sort(() => Math.random() - 0.5).slice(0, 8);
    setGameItems(shuffled);
  };

  if (gameItems.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">{t('startGame')}...</div>;
  }

  if (gameOver) {
    const maxScore = gameItems.length * 15; // Maximum possible points
    const percentage = (score / maxScore) * 100;
    const isPassed = percentage >= 80;
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${isPassed ? 'from-green-50 to-emerald-50' : 'from-orange-50 to-red-50'} flex items-center justify-center ${isRTL ? 'rtl' : ''}`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <Trophy className={`w-24 h-24 ${isPassed ? 'text-yellow-500' : 'text-orange-400'} mx-auto mb-6`} />
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {isPassed ? t('congratulations') : t('tryAgain')}!
          </h1>
          <p className="text-2xl text-gray-700 mb-8">
            {t('yourScore')}: <span className={`font-bold ${isPassed ? 'text-green-600' : 'text-orange-600'}`}>{score}</span> / {maxScore}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRestart} size="lg" className={`${isPassed ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
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

  const correctIngredients = currentItem?.ingredients || [];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Link to={createPageUrl('Games')}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToMenu')}
            </Button>
          </Link>
          <div className="text-center">
            <p className="text-sm text-gray-600">{t('questionNumber')} {currentRound + 1} {t('of')} {gameItems.length}</p>
            <p className="text-2xl font-bold text-green-600">{t('score')}: {score}</p>
          </div>
        </div>

        {/* Game Area */}
        <Card>
          <CardContent className="p-8">
            <h2 className="text-2xl font-light text-center mb-4">{t('selectIngredients')}</h2>
            <h3 className="text-3xl font-bold text-center mb-8 text-gray-900">
              <DishName item={currentItem} />
            </h3>

            {/* Ingredient Selection */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {allOptions.map((ingredient, idx) => {
                const isSelected = selectedIngredients.includes(ingredient);
                const isCorrect = correctIngredients.includes(ingredient);
                const showResult = submitted && isSelected;
                
                return (
                  <IngredientButton
                    key={idx}
                    ingredient={ingredient}
                    isSelected={isSelected}
                    isCorrect={isCorrect}
                    showResult={showResult}
                    submitted={submitted}
                    onClick={() => handleToggleIngredient(ingredient)}
                  />
                );
              })}
            </div>

            {/* Feedback */}
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 mb-6"
              >
                {selectedIngredients.filter(ing => !correctIngredients.includes(ing)).length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="font-medium text-red-900 mb-2">❌ {t('wrongIngredients')}:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedIngredients.filter(ing => !correctIngredients.includes(ing)).map((ing, idx) => (
                        <TranslatedBadge key={idx} text={ing} className="bg-red-100 text-red-800" />
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-medium text-green-900 mb-2">✓ {t('correctIngredients')}:</p>
                  <div className="flex flex-wrap gap-2">
                    {correctIngredients.map((ing, idx) => (
                      <TranslatedBadge key={idx} text={ing} className="bg-green-100 text-green-800" />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="text-center">
              {!submitted ? (
                <Button 
                  onClick={handleSubmit} 
                  size="lg" 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={selectedIngredients.length === 0}
                >
                  {t('submit')}
                </Button>
              ) : (
                <Button onClick={handleNext} size="lg" className="bg-green-600 hover:bg-green-700">
                  {currentRound + 1 < gameItems.length ? t('next') : t('finish')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}