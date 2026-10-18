import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/LanguageContext';
import { menuData, glossaryData } from '@/components/data/menuData';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Gamepad2, BookOpen, HelpCircle, Shuffle, Trophy, 
  CheckCircle, XCircle, RotateCcw, ArrowRight, Star
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GameMode() {
  const { t, language, isRTL } = useLanguage();
  const [activeGame, setActiveGame] = useState('flashcards');
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    loadUserProgress();
  }, []);

  const loadUserProgress = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const progressList = await base44.entities.UserProgress.filter({ created_by: currentUser.email });
      if (progressList.length > 0) {
        setProgress(progressList[0]);
      }
    } catch (e) {
      console.log('User not logged in');
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-900 to-black py-12 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Gamepad2 className="w-10 h-10 text-red-500" />
            <h1 className="text-4xl md:text-5xl font-light text-white">
              {t('gameMode')}
            </h1>
          </div>
          <div className="w-24 h-1 bg-red-600 mx-auto mb-6" />
          
          {/* Progress Bar */}
          {progress && (
            <div className="max-w-md mx-auto bg-white/10 backdrop-blur rounded-lg p-4 mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white">{t('yourProgress')}</span>
                <Badge className="bg-amber-500 text-white">
                  <Star className="w-3 h-3 mr-1" />
                  {progress.total_points || 0} {t('points')}
                </Badge>
              </div>
              <Progress value={Math.min((progress.total_points || 0) / 10, 100)} className="h-2" />
              {progress.certification_passed && (
                <Badge className="mt-2 bg-green-500">{t('certified')}</Badge>
              )}
            </div>
          )}
        </motion.div>

        <Tabs value={activeGame} onValueChange={setActiveGame} className="w-full">
          <TabsList className="w-full grid grid-cols-4 gap-2 bg-transparent mb-8">
            <TabsTrigger 
              value="flashcards" 
              className="bg-white/10 data-[state=active]:bg-red-600 text-white"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {t('flashcards')}
            </TabsTrigger>
            <TabsTrigger 
              value="quiz" 
              className="bg-white/10 data-[state=active]:bg-red-600 text-white"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              {t('quiz')}
            </TabsTrigger>
            <TabsTrigger 
              value="match" 
              className="bg-white/10 data-[state=active]:bg-red-600 text-white"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              {t('matchGame')}
            </TabsTrigger>
            <TabsTrigger 
              value="exam" 
              className="bg-white/10 data-[state=active]:bg-red-600 text-white"
            >
              <Trophy className="w-4 h-4 mr-2" />
              {t('finalExam')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flashcards">
            <FlashcardsGame language={language} t={t} isRTL={isRTL} />
          </TabsContent>

          <TabsContent value="quiz">
            <QuizGame language={language} t={t} isRTL={isRTL} />
          </TabsContent>

          <TabsContent value="match">
            <MatchGame language={language} t={t} isRTL={isRTL} />
          </TabsContent>

          <TabsContent value="exam">
            <FinalExam language={language} t={t} isRTL={isRTL} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function FlashcardsGame({ language, t, isRTL }) {
  const allDishes = Object.values(menuData).flat();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const getName = (dish) => {
    switch(language) {
      case 'he': return dish.nameHe;
      case 'fr': return dish.nameFr;
      case 'ja': return dish.nameJa;
      case 'ru': return dish.nameRu;
      default: return dish.nameEn;
    }
  };

  const getDescription = (dish) => {
    switch(language) {
      case 'he': return dish.descriptionHe;
      case 'fr': return dish.descriptionFr;
      case 'ja': return dish.descriptionJa;
      case 'ru': return dish.descriptionRu;
      default: return dish.descriptionEn;
    }
  };

  const currentDish = allDishes[currentIndex];

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % allDishes.length);
    }, 200);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + allDishes.length) % allDishes.length);
    }, 200);
  };

  return (
    <div className="flex flex-col items-center">
      <p className="text-white/60 mb-4">
        {currentIndex + 1} / {allDishes.length}
      </p>
      
      <motion.div
        className="w-full max-w-md cursor-pointer perspective-1000"
        onClick={() => setIsFlipped(!isFlipped)}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div
          className="relative w-full h-80"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <Card className="absolute inset-0 backface-hidden bg-white">
            <CardContent className="h-full flex flex-col items-center justify-center p-6">
              <img 
                src={currentDish?.image} 
                alt={getName(currentDish)}
                className="w-32 h-32 object-cover rounded-lg mb-4"
              />
              <h3 className="text-2xl font-bold text-center">{getName(currentDish)}</h3>
              <p className="text-gray-500 text-center mt-2">{currentDish?.nameEn}</p>
              <p className="text-sm text-gray-400 mt-4">Click to flip</p>
            </CardContent>
          </Card>

          {/* Back */}
          <Card className="absolute inset-0 backface-hidden bg-red-50 border-red-200" style={{ transform: 'rotateY(180deg)' }}>
            <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
              <p className="text-lg text-gray-700 mb-4">{getDescription(currentDish)}</p>
              <div className="flex flex-wrap gap-1 justify-center mb-4">
                {currentDish?.ingredients?.slice(0, 4).map(ing => (
                  <Badge key={ing} variant="secondary">{ing}</Badge>
                ))}
              </div>
              {currentDish?.japaneseTerms?.length > 0 && (
                <div className="flex gap-1">
                  {currentDish.japaneseTerms.map(term => (
                    <Badge key={term} className="bg-red-100 text-red-800">{term}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <div className="flex gap-4 mt-8">
        <Button variant="outline" onClick={prevCard} className="bg-white/10 text-white border-white/20">
          {t('previous')}
        </Button>
        <Button onClick={nextCard} className="bg-red-600 hover:bg-red-700">
          {t('next')}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function QuizGame({ language, t, isRTL }) {
  const allDishes = Object.values(menuData).flat();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = () => {
    const shuffled = [...allDishes].sort(() => Math.random() - 0.5).slice(0, 10);
    const quizQuestions = shuffled.map(dish => {
      const wrongAnswers = allDishes
        .filter(d => d.id !== dish.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      const options = [...wrongAnswers.map(d => d.nameEn), dish.nameEn]
        .sort(() => Math.random() - 0.5);
      
      return {
        image: dish.image,
        correctAnswer: dish.nameEn,
        options
      };
    });
    setQuestions(quizQuestions);
    setCurrentQuestion(0);
    setScore(0);
    setAnswered(false);
    setGameOver(false);
  };

  const handleAnswer = (answer) => {
    if (answered) return;
    setSelectedAnswer(answer);
    setAnswered(true);
    if (answer === questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setAnswered(false);
      setSelectedAnswer(null);
    } else {
      setGameOver(true);
    }
  };

  if (questions.length === 0) return null;

  if (gameOver) {
    return (
      <Card className="max-w-md mx-auto bg-white text-center">
        <CardContent className="py-12">
          <Trophy className={`w-20 h-20 mx-auto mb-6 ${score >= 7 ? 'text-amber-500' : 'text-gray-400'}`} />
          <h2 className="text-3xl font-bold mb-2">{t('score')}: {score}/{questions.length}</h2>
          <p className="text-gray-600 mb-6">
            {score >= 7 ? t('congratulations') : t('tryAgain')}
          </p>
          <Button onClick={generateQuestions} className="bg-red-600 hover:bg-red-700">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('tryAgain')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const q = questions[currentQuestion];

  return (
    <Card className="max-w-md mx-auto bg-white">
      <CardHeader>
        <div className="flex justify-between items-center">
          <Badge variant="outline">Question {currentQuestion + 1}/{questions.length}</Badge>
          <Badge className="bg-green-100 text-green-800">{t('score')}: {score}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <img src={q.image} alt="Dish" className="w-full h-48 object-cover rounded-lg" />
        <p className="text-center font-medium">What dish is this?</p>
        <div className="grid grid-cols-2 gap-3">
          {q.options.map((option) => {
            let buttonClass = "h-auto py-3 text-sm";
            if (answered) {
              if (option === q.correctAnswer) {
                buttonClass += " bg-green-500 hover:bg-green-500 text-white";
              } else if (option === selectedAnswer) {
                buttonClass += " bg-red-500 hover:bg-red-500 text-white";
              }
            }
            return (
              <Button
                key={option}
                variant={answered ? "default" : "outline"}
                className={buttonClass}
                onClick={() => handleAnswer(option)}
                disabled={answered}
              >
                {option}
              </Button>
            );
          })}
        </div>
        {answered && (
          <Button onClick={nextQuestion} className="w-full bg-red-600 hover:bg-red-700">
            {currentQuestion < questions.length - 1 ? t('next') : 'See Results'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function MatchGame({ language, t, isRTL }) {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    initGame();
  }, []);

  const initGame = () => {
    const terms = glossaryData.slice(0, 6);
    const cardPairs = terms.flatMap(term => [
      { id: `${term.term}-en`, content: term.term, pairId: term.term, type: 'english' },
      { id: `${term.term}-ja`, content: term.japanese, pairId: term.term, type: 'japanese' }
    ]).sort(() => Math.random() - 0.5);
    setCards(cardPairs);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  };

  const handleCardClick = (card) => {
    if (flipped.length === 2 || flipped.includes(card.id) || matched.includes(card.pairId)) return;
    
    const newFlipped = [...flipped, card.id];
    setFlipped(newFlipped);
    
    if (newFlipped.length === 2) {
      setMoves(moves + 1);
      const [first, second] = newFlipped.map(id => cards.find(c => c.id === id));
      
      if (first.pairId === second.pairId && first.type !== second.type) {
        setMatched([...matched, first.pairId]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  const isCardFlipped = (card) => flipped.includes(card.id) || matched.includes(card.pairId);

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6">
        <Badge className="bg-white/10 text-white">Moves: {moves}</Badge>
        <Badge className="bg-green-500">Matched: {matched.length}/6</Badge>
        <Button variant="outline" size="sm" onClick={initGame} className="text-white border-white/20">
          <RotateCcw className="w-4 h-4 mr-1" /> Reset
        </Button>
      </div>

      {matched.length === 6 ? (
        <Card className="bg-white text-center">
          <CardContent className="py-12">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">{t('congratulations')}!</h2>
            <p className="text-gray-600 mb-4">Completed in {moves} moves</p>
            <Button onClick={initGame} className="bg-red-600 hover:bg-red-700">Play Again</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {cards.map((card) => (
            <motion.div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`aspect-square rounded-lg cursor-pointer flex items-center justify-center text-center p-2 transition-all ${
                isCardFlipped(card)
                  ? matched.includes(card.pairId)
                    ? 'bg-green-500 text-white'
                    : 'bg-white text-gray-900'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isCardFlipped(card) ? (
                <span className={card.type === 'japanese' ? 'text-xl' : 'text-xs font-medium'}>
                  {card.content}
                </span>
              ) : (
                <span className="text-white text-2xl">?</span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinalExam({ language, t, isRTL }) {
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const generateExam = () => {
    const allDishes = Object.values(menuData).flat();
    const examQuestions = [];
    
    // 10 dish identification questions
    const dishQuestions = [...allDishes].sort(() => Math.random() - 0.5).slice(0, 10);
    dishQuestions.forEach((dish, i) => {
      const wrongAnswers = allDishes
        .filter(d => d.id !== dish.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      examQuestions.push({
        id: `dish-${i}`,
        type: 'dish',
        question: 'Identify this dish:',
        image: dish.image,
        options: [...wrongAnswers.map(d => d.nameEn), dish.nameEn].sort(() => Math.random() - 0.5),
        correctAnswer: dish.nameEn
      });
    });

    // 5 terminology questions
    const termQuestions = [...glossaryData].sort(() => Math.random() - 0.5).slice(0, 5);
    termQuestions.forEach((term, i) => {
      const wrongAnswers = glossaryData
        .filter(t => t.term !== term.term)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      examQuestions.push({
        id: `term-${i}`,
        type: 'term',
        question: `What does "${term.term}" (${term.japanese}) mean?`,
        options: [...wrongAnswers.map(t => t.meaning), term.meaning].sort(() => Math.random() - 0.5),
        correctAnswer: term.meaning
      });
    });

    setQuestions(examQuestions.sort(() => Math.random() - 0.5));
    setAnswers({});
    setSubmitted(false);
    setStarted(true);
  };

  const handleSubmit = () => {
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctAnswer) correctCount++;
    });
    setScore(correctCount);
    setSubmitted(true);
  };

  if (!started) {
    return (
      <Card className="max-w-md mx-auto bg-white text-center">
        <CardContent className="py-12">
          <Trophy className="w-20 h-20 mx-auto mb-6 text-amber-500" />
          <h2 className="text-2xl font-bold mb-4">{t('finalExam')}</h2>
          <p className="text-gray-600 mb-6">
            15 questions covering dishes and terminology. You need 80% to pass.
          </p>
          <Button onClick={generateExam} className="bg-red-600 hover:bg-red-700">
            Start Exam
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    const passed = score >= 12;
    return (
      <Card className="max-w-md mx-auto bg-white text-center">
        <CardContent className="py-12">
          {passed ? (
            <>
              <Trophy className="w-20 h-20 mx-auto mb-6 text-amber-500" />
              <h2 className="text-2xl font-bold text-green-600 mb-2">{t('passed')}</h2>
            </>
          ) : (
            <>
              <XCircle className="w-20 h-20 mx-auto mb-6 text-red-500" />
              <h2 className="text-2xl font-bold text-red-600 mb-2">Not Passed</h2>
            </>
          )}
          <p className="text-3xl font-bold mb-4">{score}/15</p>
          <p className="text-gray-600 mb-6">
            {passed ? 'Congratulations! You are now certified.' : 'You need 12/15 to pass. Keep studying!'}
          </p>
          <Button onClick={generateExam} className="bg-red-600 hover:bg-red-700">
            {t('tryAgain')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <Badge className="bg-white/10 text-white">
          Answered: {Object.keys(answers).length}/{questions.length}
        </Badge>
        <Button 
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length}
          className="bg-green-600 hover:bg-green-700"
        >
          {t('submit')}
        </Button>
      </div>

      {questions.map((q, index) => (
        <Card key={q.id} className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Question {index + 1}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{q.question}</p>
            {q.image && (
              <img src={q.image} alt="Question" className="w-48 h-32 object-cover rounded-lg mb-4" />
            )}
            <div className="grid grid-cols-2 gap-2">
              {q.options.map(option => (
                <Button
                  key={option}
                  variant={answers[q.id] === option ? "default" : "outline"}
                  className={`h-auto py-2 text-sm ${answers[q.id] === option ? 'bg-red-600' : ''}`}
                  onClick={() => setAnswers({ ...answers, [q.id]: option })}
                >
                  {option}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}