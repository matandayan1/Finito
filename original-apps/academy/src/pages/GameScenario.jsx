import React, { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Trophy, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAutoTranslate } from '@/components/hooks/useAutoTranslate';

const scenarios = [
  {
    id: 1,
    scenario: 'אורחת בהריון שואלת האם היא יכולה לאכול סושי',
    question: 'מה תמליץ לה?',
    options: [
      { text: 'כן, כל הסושי שלנו בטוח', correct: false, feedback: 'לא! סושי עם דגים גולמיים לא מומלץ להריון' },
      { text: 'רק סושי צמחוני או מבושל', correct: true, feedback: 'מצוין! זו התשובה הנכונה והבטוחה' },
      { text: 'לא, אסור לאכול סושי בהריון', correct: false, feedback: 'לא מדויק - סושי מבושל או צמחוני בסדר גמור' },
    ]
  },
  {
    id: 2,
    scenario: 'אורח מבקש מנה ללא גלוטן',
    question: 'איזו מנה תמליץ?',
    options: [
      { text: 'ראמן - זה רק אטריות', correct: false, feedback: 'שגוי! אטריות ראמן מכילות גלוטן' },
      { text: 'סשימי או סושי ללא רוטב סויה', correct: true, feedback: 'נכון! רק שים לב לרוטב הסויה שמכיל גלוטן' },
      { text: 'טמפורה - זה ירקות מטוגנים', correct: false, feedback: 'לא! הציפוי של טמפורה עשוי מקמח' },
    ]
  },
  {
    id: 3,
    scenario: 'אורח עם אלרגיה לפירות ים',
    question: 'מה חשוב לציין?',
    options: [
      { text: 'כל המנות בטוחות אם הוא לא מזמין דגים', correct: false, feedback: 'לא! יש סיכון לזיהום צולב במטבח' },
      { text: 'יש לבדוק עם השף כל מנה בנפרד', correct: true, feedback: 'מצוין! תמיד יש להיוועץ עם השף באלרגיות' },
      { text: 'לא לדאוג, אין פירות ים במנות הצמחוניות', correct: false, feedback: 'לא מספיק! יש לוודא גם זיהום צולב' },
    ]
  },
  {
    id: 4,
    scenario: 'שולחן של 4 - אחד טבעוני, אחד ללא גלוטן, אחד רגיל',
    question: 'איך תבנה את ההזמנה?',
    options: [
      { text: 'כל אחד יזמין בנפרד', correct: false, feedback: 'לא מקצועי! כדאי לעזור לתאם' },
      { text: 'מגוון מנות שמתאימות לכולם + התאמות', correct: true, feedback: 'מעולה! זו הדרך הנכונה לטפל בשולחן מורכב' },
      { text: 'להמליץ רק על מנות צמחוניות', correct: false, feedback: 'לא! צריך לכבד את הצרכים של כולם' },
    ]
  }
];

function ScenarioOption({ option, index, isSelected, onSelect, disabled }) {
  const { translatedText: translatedText } = useAutoTranslate(option.text);
  
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      onClick={() => !disabled && onSelect()}
      disabled={disabled}
      className={`w-full p-4 rounded-lg border-2 text-right font-medium transition-all ${
        isSelected
          ? option.correct
            ? 'bg-green-100 border-green-500 text-green-800'
            : 'bg-red-100 border-red-500 text-red-800'
          : 'bg-white border-gray-200 hover:border-orange-400'
      }`}
    >
      {translatedText}
    </motion.button>
  );
}

export default function GameScenario() {
  const { t, isRTL } = useLanguage();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [gameOver, setGameOver] = useState(false);

  const handleSelectAnswer = (optionIndex) => {
    const option = scenarios[currentQuestion].options[optionIndex];
    setSelectedAnswer({ index: optionIndex, ...option });
    if (option.correct) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion + 1 < scenarios.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setGameOver(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setGameOver(false);
  };

  const current = scenarios[currentQuestion];
  const { translatedText: translatedScenario } = useAutoTranslate(current.scenario);
  const { translatedText: translatedQuestion } = useAutoTranslate(current.question);
  const { translatedText: translatedFeedback } = useAutoTranslate(selectedAnswer?.feedback || '');

  if (gameOver) {
    const percentage = (score / scenarios.length) * 100;
    const isPassed = percentage >= 80;
    
    return (
      <div className={`min-h-screen bg-gradient-to-br ${isPassed ? 'from-orange-50 to-red-50' : 'from-gray-50 to-orange-50'} flex items-center justify-center ${isRTL ? 'rtl' : ''}`}>
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
            {t('yourScore')}: <span className={`font-bold ${isPassed ? 'text-orange-600' : 'text-gray-600'}`}>{score}</span> / {scenarios.length}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={handleRestart} size="lg" className={`${isPassed ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-600 hover:bg-gray-700'}`}>
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

  return (
    <div className={`min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Link to={createPageUrl('Games')}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToMenu')}
            </Button>
          </Link>
          <div className="text-center">
            <p className="text-sm text-gray-600">{t('questionNumber')} {currentQuestion + 1} {t('of')} {scenarios.length}</p>
            <p className="text-2xl font-bold text-orange-600">{t('score')}: {score}</p>
          </div>
        </div>

        {/* Scenario Card */}
        <Card>
          <CardContent className="p-8">
            <div className="mb-6">
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
                <p className="text-lg font-medium text-gray-900">{translatedScenario}</p>
              </div>
              <h3 className="text-xl font-bold text-gray-900">{translatedQuestion}</h3>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {current.options.map((option, idx) => (
                <ScenarioOption
                  key={idx}
                  option={option}
                  index={idx}
                  isSelected={selectedAnswer?.index === idx}
                  onSelect={() => handleSelectAnswer(idx)}
                  disabled={!!selectedAnswer}
                />
              ))}
            </div>

            {/* Feedback */}
            <AnimatePresence>
              {selectedAnswer && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg mb-6 ${
                    selectedAnswer.correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {selectedAnswer.correct ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    )}
                    <p className={selectedAnswer.correct ? 'text-green-800' : 'text-red-800'}>
                      {translatedFeedback}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next Button */}
            {selectedAnswer && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <Button onClick={handleNext} size="lg" className="bg-orange-600 hover:bg-orange-700">
                  {currentQuestion + 1 < scenarios.length ? t('next') : t('finish')}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}