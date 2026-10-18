import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useLanguage } from '@/components/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Gamepad2, Puzzle, Brain, Clock, Target } from 'lucide-react';

export default function Games() {
  const { t, isRTL, language } = useLanguage();

  const gameDescriptions = {
    'dish-match': {
      he: 'גרור את שם המנה הנכון לתמונה. פתח את הזיכרון החזותי שלך!',
      en: 'Match the correct dish name to the image. Develop your visual memory!',
      fr: 'Faites correspondre le bon nom de plat à l\'image. Développez votre mémoire visuelle!',
      ja: '正しい料理名を画像に合わせます。視覚記憶を鍛えましょう！',
      ru: 'Сопоставьте правильное название блюда с изображением. Развивайте визуальную память!'
    },
    'build-dish': {
      he: 'בחר את המרכיבים הנכונים לבניית המנה. למד את הרכב המנות!',
      en: 'Select the correct ingredients to build the dish. Learn the composition!',
      fr: 'Sélectionnez les bons ingrédients pour construire le plat. Apprenez la composition!',
      ja: '正しい材料を選んで料理を作ります。構成を学びましょう！',
      ru: 'Выберите правильные ингредиенты для приготовления блюда. Изучите состав!'
    },
    'memory': {
      he: 'משחק זיכרון קלאסי עם מנות ומרכיבים. חזק את הזיכרון!',
      en: 'Classic memory game with dishes and ingredients. Strengthen your memory!',
      fr: 'Jeu de mémoire classique avec plats et ingrédients. Renforcez votre mémoire!',
      ja: '料理と材料を使った古典的な記憶ゲーム。記憶力を強化しましょう！',
      ru: 'Классическая игра на память с блюдами и ингредиентами. Укрепите память!'
    },
    'scenario': {
      he: 'קבל החלטות מהירות בתרחישים אמיתיים מהמסעדה. אימון למציאות!',
      en: 'Make quick decisions in real restaurant scenarios. Real-world training!',
      fr: 'Prenez des décisions rapides dans de vrais scénarios de restaurant. Entraînement réel!',
      ja: '実際のレストランシナリオで迅速な決定を下します。実践トレーニング！',
      ru: 'Принимайте быстрые решения в реальных ресторанных сценариях. Практическое обучение!'
    },
    'timed': {
      he: 'ענה על כמה שיותר שאלות ב-60 שניות. בדוק את המהירות שלך!',
      en: 'Answer as many questions as possible in 60 seconds. Test your speed!',
      fr: 'Répondez à autant de questions que possible en 60 secondes. Testez votre vitesse!',
      ja: '60秒でできるだけ多くの質問に答えます。スピードをテストしましょう！',
      ru: 'Ответьте на как можно больше вопросов за 60 секунд. Проверьте свою скорость!'
    }
  };

  const games = [
    {
      id: 'dish-match',
      title: t('dishMatch'),
      description: gameDescriptions['dish-match'][language] || gameDescriptions['dish-match']['he'],
      icon: Target,
      color: 'from-blue-500 to-cyan-500',
      link: 'GameDishMatch'
    },
    {
      id: 'build-dish',
      title: t('buildDish'),
      description: gameDescriptions['build-dish'][language] || gameDescriptions['build-dish']['he'],
      icon: Puzzle,
      color: 'from-green-500 to-emerald-500',
      link: 'GameBuildDish'
    },
    {
      id: 'memory',
      title: t('memoryGame'),
      description: gameDescriptions['memory'][language] || gameDescriptions['memory']['he'],
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
      link: 'GameMemory'
    },
    {
      id: 'scenario',
      title: t('scenarioGame'),
      description: gameDescriptions['scenario'][language] || gameDescriptions['scenario']['he'],
      icon: Gamepad2,
      color: 'from-orange-500 to-red-500',
      link: 'GameScenario'
    },
    {
      id: 'timed',
      title: t('timedChallenge'),
      description: gameDescriptions['timed'][language] || gameDescriptions['timed']['he'],
      icon: Clock,
      color: 'from-yellow-500 to-amber-500',
      link: 'GameTimed'
    }
  ];

  return (
    <div className={`min-h-screen bg-neutral-50 py-12 ${isRTL ? 'rtl' : ''}`}>
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-light text-neutral-900 mb-4 tracking-wide">
            🎯 {t('games')}
          </h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto leading-relaxed">
            {t('gamesIntro')}
          </p>
        </motion.div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={createPageUrl(game.link)}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 cursor-pointer group border-neutral-200">
                  <CardHeader>
                    <div className={`w-16 h-16 rounded-sm bg-gradient-to-br ${game.color} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm`}>
                      <game.icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-medium text-neutral-900">{game.title}</CardTitle>
                    <CardDescription className="text-base mt-2 leading-relaxed text-neutral-600">
                      {game.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-neutral-700 font-medium group-hover:translate-x-2 transition-transform">
                      {t('startGame')} →
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}