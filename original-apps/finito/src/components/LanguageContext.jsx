import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    appName: "Finito",
    tagline: "Close your shift beautifully",
    loading: "Loading...",
    submit: "Submit",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    back: "Back",
    search: "Search",
    all: "All",
    none: "None",
    optional: "Optional",
    required: "Required",
    today: "Today",
    
    // Work Areas
    floor: "Floor",
    bar: "Bar",
    host: "Host",
    kitchen: "Kitchen",
    cleaning: "Managers",
    
    // Checklist Types
    opening: "Opening",
    closing: "Closing",
    checklistType: "Checklist",
    
    // Employee Flow
    readyToClose: "Ready to close?",
    readyToOpen: "Ready to open?",
    selectArea: "Choose your area",
    startChecklist: "Let's go",
    closingChecklist: "Closing Checklist",
    tasksCompleted: "done",
    addNote: "Add a note...",
    takePhoto: "Take Photo",
    addMorePhotos: "Add More Photos",
    photoRequired: "Photo required",
    photoOptional: "Photo optional",
    submitChecklist: "Finish",
    lookingGood: "Looking good!",
    oneMoreStep: "Just one more step…",
    finitoMessage: "Great job!",
    newChecklist: "Start New",
    
    // Manager
    managerMode: "Manager",
    enterCode: "Restaurant Code",
    enterPassword: "Password",
    login: "Enter",
    logout: "Exit",
    incorrectPassword: "Check your credentials",
    dashboard: "Dashboard",
    checklistBuilder: "Checklists",
    createTask: "Add Task",
    editTask: "Edit Task",
    taskName: "Task",
    taskDescription: "Details",
    workArea: "Area",
    shiftType: "Shift",
    photoRequirement: "Photo",
    noTasks: "No tasks yet",
    addFirstTask: "Create your first task",
    
    // Reports
    reports: "Reports",
    submissionDetails: "Details",
    submittedAt: "Submitted",
    noSubmissions: "No submissions yet",
    completedTasks: "Completed",
    incompleteTasks: "Skipped",
    photos: "Photos",
    
    // Filters
    filterByDate: "Date",
    filterByShift: "Shift",
    filterByArea: "Area",
    
    // Settings
    settings: "Settings",
    languages: "Languages",
    autoTranslate: "Auto-translate",
    
    // Messages
    confirmDelete: "Delete this?",
    changesSaved: "Saved",

    // Daily Report Summary
    dailyReportTitle: "Daily Summary Report",
    completion: "Completion",
    tasksCompletedLabel: "Tasks Completed",
    shiftsSubmitted: "Shifts Submitted",
    lowStockItems: "Low Stock Items",
    specialNotes: "Special Notes",
    overallCompletion: "Overall Task Completion",
    specialNotesFromShifts: "Special Notes from Shifts",
    noActivityRecorded: "No activity recorded for this day",
    loadingShiftData: "Loading shift data..."
  },
  he: {
    appName: "Finito",
    tagline: "סוגרים משמרת בסטייל",
    loading: "טוען...",
    submit: "שלח",
    save: "שמור",
    cancel: "ביטול",
    delete: "מחק",
    edit: "ערוך",
    add: "הוסף",
    back: "חזור",
    search: "חיפוש",
    all: "הכל",
    none: "ללא",
    optional: "אופציונלי",
    required: "חובה",
    today: "היום",
    
    floor: "פלור",
    bar: "בר",
    host: "אירוח",
    kitchen: "מטבח",
    cleaning: "מנהלים",
    
    opening: "פתיחה",
    closing: "סגירה",
    checklistType: "צ'ק ליסט",
    
    readyToClose: "מוכנים לסגור?",
    readyToOpen: "מוכנים לפתוח?",
    selectArea: "בחרו אזור",
    startChecklist: "התחל",
    closingChecklist: "רשימת סגירה",
    tasksCompleted: "בוצע",
    addNote: "הוסיפו הערה...",
    takePhoto: "צלמו",
    addMorePhotos: "הוסיפו עוד תמונות",
    photoRequired: "נדרשת תמונה",
    photoOptional: "תמונה אופציונלית",
    submitChecklist: "סיימתי",
    lookingGood: "נראה מעולה!",
    oneMoreStep: "עוד צעד אחד…",
    finitoMessage: "עבודה מצוינת!",
    newChecklist: "התחלה חדשה",
    
    managerMode: "ניהול",
    enterCode: "קוד מסעדה",
    enterPassword: "סיסמה",
    login: "כניסה",
    logout: "יציאה",
    incorrectPassword: "בדקו את הפרטים",
    dashboard: "לוח בקרה",
    checklistBuilder: "רשימות",
    createTask: "משימה חדשה",
    editTask: "עריכת משימה",
    taskName: "משימה",
    taskDescription: "פרטים",
    workArea: "אזור",
    shiftType: "משמרת",
    photoRequirement: "תמונה",
    noTasks: "אין משימות עדיין",
    addFirstTask: "צרו את המשימה הראשונה",
    
    reports: "דוחות",
    submissionDetails: "פרטים",
    submittedAt: "נשלח",
    noSubmissions: "אין הגשות עדיין",
    completedTasks: "הושלמו",
    incompleteTasks: "דולגו",
    photos: "תמונות",
    
    filterByDate: "תאריך",
    filterByShift: "משמרת",
    filterByArea: "אזור",
    
    settings: "הגדרות",
    languages: "שפות",
    autoTranslate: "תרגום אוטומטי",
    
    confirmDelete: "למחוק?",
    changesSaved: "נשמר",

    // דוח יומי מרוכז
    dailyReportTitle: "דוח יומי מרוכז",
    completion: "השלמה",
    tasksCompletedLabel: "משימות שבוצעו",
    shiftsSubmitted: "משמרות שהוגשו",
    lowStockItems: "פריטי מלאי חסרים",
    specialNotes: "הערות מיוחדות",
    overallCompletion: "אחוז השלמת משימות כללי",
    specialNotesFromShifts: "הערות מיוחדות מהמשמרות",
    noActivityRecorded: "אין פעילות רשומה ליום זה",
    loadingShiftData: "טוען נתוני משמרות..."
  },
  ja: {
    appName: "Finito",
    tagline: "シフトをスマートに完了",
    loading: "読み込み中...",
    submit: "送信",
    save: "保存",
    cancel: "キャンセル",
    delete: "削除",
    edit: "編集",
    add: "追加",
    back: "戻る",
    search: "検索",
    all: "すべて",
    none: "なし",
    optional: "任意",
    required: "必須",
    today: "今日",
    
    floor: "フロア",
    bar: "バー",
    host: "受付",
    kitchen: "キッチン",
    cleaning: "マネージャー",
    
    opening: "開店",
    closing: "閉店",
    checklistType: "チェックリスト",
    
    readyToClose: "閉店準備OK？",
    readyToOpen: "開店準備OK？",
    selectArea: "エリアを選択",
    startChecklist: "スタート",
    closingChecklist: "閉店チェック",
    tasksCompleted: "完了",
    addNote: "メモを追加...",
    takePhoto: "撮影",
    addMorePhotos: "写真を追加",
    photoRequired: "写真必須",
    photoOptional: "写真任意",
    submitChecklist: "完了",
    lookingGood: "いい感じ！",
    oneMoreStep: "あと少し…",
    finitoMessage: "お疲れ様！",
    newChecklist: "新規開始",
    
    managerMode: "管理",
    enterCode: "店舗コード",
    enterPassword: "パスワード",
    login: "ログイン",
    logout: "ログアウト",
    incorrectPassword: "認証情報を確認",
    dashboard: "ダッシュボード",
    checklistBuilder: "チェックリスト",
    createTask: "タスク追加",
    editTask: "タスク編集",
    taskName: "タスク",
    taskDescription: "詳細",
    workArea: "エリア",
    shiftType: "シフト",
    photoRequirement: "写真",
    noTasks: "タスクなし",
    addFirstTask: "最初のタスクを作成",
    
    reports: "レポート",
    submissionDetails: "詳細",
    submittedAt: "提出",
    noSubmissions: "提出なし",
    completedTasks: "完了",
    incompleteTasks: "スキップ",
    photos: "写真",
    
    filterByDate: "日付",
    filterByShift: "シフト",
    filterByArea: "エリア",
    
    settings: "設定",
    languages: "言語",
    autoTranslate: "自動翻訳",
    
    confirmDelete: "削除しますか？",
    changesSaved: "保存完了",

    // 日次サマリーレポート
    dailyReportTitle: "日次サマリーレポート",
    completion: "完了率",
    tasksCompletedLabel: "完了タスク",
    shiftsSubmitted: "提出シフト",
    lowStockItems: "在庫不足アイテム",
    specialNotes: "特記メモ",
    overallCompletion: "全体タスク完了率",
    specialNotesFromShifts: "シフトからの特記メモ",
    noActivityRecorded: "この日の記録はありません",
    loadingShiftData: "シフトデータを読み込み中..."
  },
  fr: {
    appName: "Finito",
    tagline: "Clôturez avec élégance",
    loading: "Chargement...",
    submit: "Envoyer",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    add: "Ajouter",
    back: "Retour",
    search: "Rechercher",
    all: "Tout",
    none: "Aucune",
    optional: "Optionnelle",
    required: "Obligatoire",
    today: "Aujourd'hui",
    
    floor: "Salle",
    bar: "Bar",
    host: "Accueil",
    kitchen: "Cuisine",
    cleaning: "Gestionnaires",
    
    opening: "Ouverture",
    closing: "Fermeture",
    checklistType: "Liste",
    
    readyToClose: "Prêt à clôturer ?",
    readyToOpen: "Prêt à ouvrir ?",
    selectArea: "Choisissez votre zone",
    startChecklist: "C'est parti",
    closingChecklist: "Liste de fermeture",
    tasksCompleted: "fait",
    addNote: "Ajouter une note...",
    takePhoto: "Photo",
    addMorePhotos: "Ajouter plus de photos",
    photoRequired: "Photo requise",
    photoOptional: "Photo optionnelle",
    submitChecklist: "Terminer",
    lookingGood: "Parfait !",
    oneMoreStep: "Encore une étape…",
    finitoMessage: "Excellent travail !",
    newChecklist: "Recommencer",
    
    managerMode: "Gérant",
    enterCode: "Code restaurant",
    enterPassword: "Mot de passe",
    login: "Entrer",
    logout: "Sortir",
    incorrectPassword: "Vérifiez vos identifiants",
    dashboard: "Tableau de bord",
    checklistBuilder: "Listes",
    createTask: "Nouvelle tâche",
    editTask: "Modifier",
    taskName: "Tâche",
    taskDescription: "Détails",
    workArea: "Zone",
    shiftType: "Service",
    photoRequirement: "Photo",
    noTasks: "Aucune tâche",
    addFirstTask: "Créez votre première tâche",
    
    reports: "Rapports",
    submissionDetails: "Détails",
    submittedAt: "Soumis",
    noSubmissions: "Aucune soumission",
    completedTasks: "Terminées",
    incompleteTasks: "Ignorées",
    photos: "Photos",
    
    filterByDate: "Date",
    filterByShift: "Service",
    filterByArea: "Zone",
    
    settings: "Paramètres",
    languages: "Langues",
    autoTranslate: "Traduction auto",
    
    confirmDelete: "Supprimer ?",
    changesSaved: "Enregistré",

    // Rapport quotidien résumé
    dailyReportTitle: "Résumé quotidien",
    completion: "Complétion",
    tasksCompletedLabel: "Tâches complétées",
    shiftsSubmitted: "Services soumis",
    lowStockItems: "Articles en rupture",
    specialNotes: "Notes spéciales",
    overallCompletion: "Complétion globale des tâches",
    specialNotesFromShifts: "Notes spéciales des services",
    noActivityRecorded: "Aucune activité enregistrée ce jour",
    loadingShiftData: "Chargement des données..."
  },
  ru: {
    appName: "Finito",
    tagline: "Закрывайте смену красиво",
    loading: "Загрузка...",
    submit: "Отправить",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    edit: "Изменить",
    add: "Добавить",
    back: "Назад",
    search: "Поиск",
    all: "Все",
    none: "Нет",
    optional: "По желанию",
    required: "Обязательно",
    today: "Сегодня",
    
    floor: "Зал",
    bar: "Бар",
    host: "Ресепшн",
    kitchen: "Кухня",
    cleaning: "Менеджеры",
    
    opening: "Открытие",
    closing: "Закрытие",
    checklistType: "Список",
    
    readyToClose: "Готовы закрыть?",
    readyToOpen: "Готовы открыть?",
    selectArea: "Выберите зону",
    startChecklist: "Поехали",
    closingChecklist: "Чек-лист закрытия",
    tasksCompleted: "готово",
    addNote: "Добавить заметку...",
    takePhoto: "Фото",
    addMorePhotos: "Добавить ещё фото",
    photoRequired: "Фото обязательно",
    photoOptional: "Фото по желанию",
    submitChecklist: "Готово",
    lookingGood: "Отлично!",
    oneMoreStep: "Ещё чуть-чуть…",
    finitoMessage: "Отличная работа!",
    newChecklist: "Начать заново",
    
    managerMode: "Управление",
    enterCode: "Код ресторана",
    enterPassword: "Пароль",
    login: "Войти",
    logout: "Выйти",
    incorrectPassword: "Проверьте данные",
    dashboard: "Панель",
    checklistBuilder: "Списки",
    createTask: "Новая задача",
    editTask: "Редактировать",
    taskName: "Задача",
    taskDescription: "Детали",
    workArea: "Зона",
    shiftType: "Смена",
    photoRequirement: "Фото",
    noTasks: "Нет задач",
    addFirstTask: "Создайте первую задачу",
    
    reports: "Отчёты",
    submissionDetails: "Детали",
    submittedAt: "Отправлено",
    noSubmissions: "Нет отправок",
    completedTasks: "Выполнено",
    incompleteTasks: "Пропущено",
    photos: "Фото",
    
    filterByDate: "Дата",
    filterByShift: "Смена",
    filterByArea: "Зона",
    
    settings: "Настройки",
    languages: "Языки",
    autoTranslate: "Авто-перевод",
    
    confirmDelete: "Удалить?",
    changesSaved: "Сохранено",

    // Ежедневный сводный отчёт
    dailyReportTitle: "Ежедневный сводный отчёт",
    completion: "Выполнение",
    tasksCompletedLabel: "Задач выполнено",
    shiftsSubmitted: "Смен отправлено",
    lowStockItems: "Товаров с низким остатком",
    specialNotes: "Особые заметки",
    overallCompletion: "Общее выполнение задач",
    specialNotesFromShifts: "Особые заметки со смен",
    noActivityRecorded: "Нет записей за этот день",
    loadingShiftData: "Загрузка данных смен..."
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('finito_language') || 'he';
    }
    return 'he';
  });

  useEffect(() => {
    localStorage.setItem('finito_language', language);
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => translations[language]?.[key] || translations.en[key] || key;
  
  const getLocalizedField = (item, fieldBase) => {
    const localizedKey = `${fieldBase}_${language}`;
    return item[localizedKey] || item[`${fieldBase}_en`] || item[fieldBase] || '';
  };

  const isRTL = language === 'he';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, getLocalizedField, isRTL, translations }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}

export default LanguageContext;