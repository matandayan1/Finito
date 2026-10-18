import React, { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Trophy, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const questionTypes = ['multiple', 'scenario', 'multiple', 'scenario', 'multiple', 'scenario', 'multiple', 'scenario', 'multiple', 'scenario'];
const questionCorrects = [1, 1, 1, 2, 1, 2, 1, 2, 2, 1];

export default function Assessment() {
  const { t, isRTL } = useLanguage();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const questions = (t('assessmentQuestions') || []).map((q, i) => ({
    id: i + 1,
    type: questionTypes[i],
    question: q.question,
    options: q.options,
    correct: questionCorrects[i],
    explanation: q.explanation,
  }));

  const handleAnswer = (questionId, answerIndex) => {
    setAnswers({ ...answers, [questionId]: answerIndex });
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1);
  };

  const handlePrevious = () => {
    if (currentQ > 0) setCurrentQ(currentQ - 1);
  };

  const handleSubmit = () => setShowResults(true);

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => { if (answers[q.id] === q.correct) correct++; });
    return correct;
  };

  const handleRestart = () => {
    setCurrentQ(0);
    setAnswers({});
    setShowResults(false);
  };

  if (!questions.length) return null;

  if (showResults) {
    const score = calculateScore();
    const percentage = (score / questions.length) * 100;
    const passed = percentage >= 80;

    return (
      <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 ${isRTL ? 'rtl' : ''}`}>
        <div className="max-w-4xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <Trophy className={`w-24 h-24 mx-auto mb-6 ${passed ? 'text-green-500' : 'text-orange-500'}`} />
            <h1 className="text-4xl font-bold mb-4">{passed ? t('congratulations') : t('tryAgain')}!</h1>
            <p className="text-2xl text-gray-700 mb-2">
              {t('yourScore')}: <span className={`font-bold ${passed ? 'text-green-600' : 'text-orange-600'}`}>
                {score} / {questions.length}
              </span> ({Math.round(percentage)}%)
            </p>
            <p className="text-gray-600">{passed ? t('passed') : t('failed')}</p>
          </motion.div>

          <div className="space-y-4 mb-8">
            {questions.map((q, idx) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correct;
              return (
                <Card key={q.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      {isCorrect
                        ? <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                        : <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                      }
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-2">{idx + 1}. {q.question}</p>
                        <p className={`text-sm mb-1 ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          {isCorrect ? `✓ ${t('correct')}` : `✗ ${t('incorrect')}: ${q.options[userAnswer]}`}
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-green-700 mb-2">✓ {t('correct')}: {q.options[q.correct]}</p>
                        )}
                        <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded mt-2">💡 {q.explanation}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={handleRestart} size="lg" className="bg-blue-600 hover:bg-blue-700">{t('tryAgain')}</Button>
            <Link to={createPageUrl('Home')}>
              <Button variant="outline" size="lg">{t('backToMenu')}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;
  const allAnswered = questions.every(q => answers[q.id] !== undefined);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToMenu')}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{t('assessment')}</h1>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{t('questionNumber')} {currentQ + 1} {t('of')} {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="mb-6">
              <Badge className="mb-4">
                {question.type === 'scenario' ? `🎭 ${t('scenarioGame')}` : `📚 ${t('level')}`}
              </Badge>
              <h2 className="text-2xl font-medium text-gray-900">{question.question}</h2>
            </div>
            <div className="space-y-3">
              {question.options.map((option, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswer(question.id, idx)}
                  className={`w-full p-4 rounded-lg border-2 text-right transition-all ${
                    answers[question.id] === idx
                      ? 'bg-blue-100 border-blue-500 text-blue-900'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <span className="font-medium">{String.fromCharCode(65 + idx)}.</span> {option}
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button onClick={handlePrevious} disabled={currentQ === 0} variant="outline">
            ← {t('previous')}
          </Button>
          {currentQ === questions.length - 1 ? (
            <Button onClick={handleSubmit} disabled={!allAnswered} size="lg" className="bg-green-600 hover:bg-green-700">
              {t('finish')}
            </Button>
          ) : (
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700">
              {t('next')} →
            </Button>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          {Object.keys(answers).length} {t('of')} {questions.length}
        </div>
      </div>
    </div>
  );
}