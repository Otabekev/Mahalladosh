/** Strings for the pre-app flow: login, 3-step onboarding wizard, waiting room. */

import type { Dict } from './index'

export const onboardingStrings = {
  // ---------- login: brand ----------
  tagline: {
    uz: "Mahallangiz bilan bog'laning",
    uzc: 'Маҳаллангиз билан боғланинг',
    ru: 'Оставайтесь на связи со своей махаллёй',
    en: 'Stay connected with your mahalla',
  },
  // ---------- login: hero + welcome (redesign) ----------
  heroCaption: {
    uz: "mahalla ko'chasi · oltin soat",
    uzc: 'маҳалла кўчаси · олтин соат',
    ru: 'махаллинская улица · золотой час',
    en: 'mahalla street · golden hour',
  },
  welcomeLine1: {
    uz: 'Mahallangizga xush kelibsiz.',
    uzc: 'Маҳаллангизга хуш келибсиз.',
    ru: 'Добро пожаловать в вашу махаллю.',
    en: 'Welcome to your mahalla.',
  },
  welcomeLine2: {
    uz: 'Bu yerda hamma bir-birini taniydi.',
    uzc: 'Бу ерда ҳамма бир-бирини танийди.',
    ru: 'Здесь все знают друг друга.',
    en: 'Here, everyone knows one another.',
  },
  telegramLogin: {
    uz: 'Telegram orqali kirish',
    uzc: 'Телеграм орқали кириш',
    ru: 'Войти через Telegram',
    en: 'Log in with Telegram',
  },
  trustLine1: {
    uz: "Faqat qo'shnilaringiz ko'radi.",
    uzc: 'Фақат қўшниларингиз кўради.',
    ru: 'Видят только ваши соседи.',
    en: 'Only your neighbors can see.',
  },
  trustLine2: {
    uz: 'Davlat tizimlariga ulanmagan.',
    uzc: 'Давлат тизимларига уланмаган.',
    ru: 'Не подключено к государственным системам.',
    en: 'Not connected to government systems.',
  },
  // ---------- login: feature rows ----------
  featFamilyTitle: { uz: 'Oila sahifalari', uzc: 'Оила саҳифалари', ru: 'Семейные страницы', en: 'Family pages' },
  featFamilyText: { uz: 'avlodlar tarixi', uzc: 'авлодлар тарихи', ru: 'история поколений', en: 'history of generations' },
  featHelpTitle: { uz: "Qo'shnilar yordami", uzc: 'Қўшнилар ёрдами', ru: 'Взаимопомощь соседей', en: 'Neighborly help' },
  featHelpText: { uz: "so'rang va yordam bering", uzc: 'сўранг ва ёрдам беринг', ru: 'просите помощи и помогайте', en: 'ask for help and lend a hand' },
  featHonorTitle: { uz: "Obro'", uzc: 'Обрў', ru: 'Репутация', en: 'Reputation' },
  featHonorText: { uz: "faol qo'shnilar e'zozlanadi", uzc: 'фаол қўшнилар эъзозланади', ru: 'активных соседей ценят', en: 'active neighbors are honored' },
  // ---------- login: form ----------
  namePlaceholder: { uz: 'Ismingiz', uzc: 'Исмингиз', ru: 'Ваше имя', en: 'Your name' },
  nameRequired: { uz: 'Ismingizni yozing', uzc: 'Исмингизни ёзинг', ru: 'Введите ваше имя', en: 'Enter your name' },
  tgLoginError: { uz: 'Telegram kirish xatosi', uzc: 'Телеграм кириш хатоси', ru: 'Ошибка входа через Telegram', en: 'Telegram login error' },
  loginUnavailable: {
    uz: "Kirish hozircha sozlanmoqda — keyinroq urinib ko'ring.",
    uzc: 'Кириш ҳозирча созланмоқда — кейинроқ уриниб кўринг.',
    ru: 'Вход пока настраивается — попробуйте позже.',
    en: 'Login is still being set up — try again later.',
  },
  footerTelegram: {
    uz: 'Telegram hisobingiz bilan xavfsiz kirasiz',
    uzc: 'Телеграм ҳисобингиз билан хавфсиз кирасиз',
    ru: 'Безопасный вход через ваш аккаунт Telegram',
    en: 'Sign in securely with your Telegram account',
  },
  footerDev: {
    uz: 'Telegram orqali kirish deploy bilan yoqiladi — hozircha dev rejim',
    uzc: 'Телеграм орқали кириш деплой билан ёқилади — ҳозирча дев режим',
    ru: 'Вход через Telegram включится после деплоя — пока dev-режим',
    en: 'Telegram login is enabled on deploy — dev mode for now',
  },
  // ---------- onboarding wizard ----------
  stepLabel: { uz: '{n}/3 qadam', uzc: '{n}/3 қадам', ru: 'Шаг {n} из 3', en: 'Step {n} of 3' },
  regionTitle: { uz: 'Viloyatingiz', uzc: 'Вилоятингиз', ru: 'Ваша область', en: 'Your region' },
  regionSubtitle: { uz: 'Qaysi viloyatda yashaysiz?', uzc: 'Қайси вилоятда яшайсиз?', ru: 'В какой области вы живёте?', en: 'Which region do you live in?' },
  districtTitle: { uz: 'Tumaningiz', uzc: 'Туманингиз', ru: 'Ваш район', en: 'Your district' },
  mahallaTitle: { uz: 'Mahallangiz', uzc: 'Маҳаллангиз', ru: 'Ваша махалля', en: 'Your mahalla' },
  searchPlaceholder: { uz: 'Mahalla nomini qidiring', uzc: 'Маҳалла номини қидиринг', ru: 'Введите название махалли', en: 'Search mahalla by name' },
  emptyTitle: { uz: 'Mahalla topilmadi', uzc: 'Маҳалла топилмади', ru: 'Махалля не найдена', en: 'No mahalla found' },
  emptyText: {
    uz: "Bu tumanda mahallalar hali kiritilmagan. Tez orada qo'shiladi.",
    uzc: 'Бу туманда маҳаллалар ҳали киритилмаган. Тез орада қўшилади.',
    ru: 'В этом районе махалли ещё не добавлены. Скоро появятся.',
    en: 'No mahallas have been added in this district yet. Coming soon.',
  },
  statusOpen: { uz: 'Ochiq', uzc: 'Очиқ', ru: 'Открыта', en: 'Open' },
  memberCount: { uz: "{n} a'zo", uzc: '{n} аъзо', ru: '{n} чел.', en: '{n} members' },
  join: { uz: "Qo'shilish", uzc: 'Қўшилиш', ru: 'Вступить', en: 'Join' },
  statusPending: { uz: 'Tasdiqlanmoqda', uzc: 'Тасдиқланмоқда', ru: 'На подтверждении', en: 'Awaiting approval' },
  sendPetition: { uz: "So'rov yuborish", uzc: 'Сўров юбориш', ru: 'Подать заявку', en: 'Send a request' },
  petitionCount: { uz: "{count}/{total} so'rov", uzc: '{count}/{total} сўров', ru: '{count}/{total} заявок', en: '{count}/{total} requests' },
  householdsLabel: {
    uz: 'Mahallada taxminan nechta xonadon bor?',
    uzc: 'Маҳаллада тахминан нечта хонадон бор?',
    ru: 'Сколько примерно домов в махалле?',
    en: 'Roughly how many households are in the mahalla?',
  },
  householdsHint: { uz: 'Shart emas', uzc: 'Шарт эмас', ru: 'Необязательно', en: 'Optional' },
  householdsPlaceholder: { uz: 'Masalan: 40', uzc: 'Масалан: 40', ru: 'Например: 40', en: 'e.g. 40' },
  // ---------- waiting room ----------
  petitionAccepted: {
    uz: "So'rovingiz qabul qilindi!",
    uzc: 'Сўровингиз қабул қилинди!',
    ru: 'Ваша заявка принята!',
    en: 'Your request has been received!',
  },
  waitingText: {
    uz: "Qo'shnilaringiz ham so'rov yuborishini kutamiz. {n} ta so'rov yig'ilganda mahalla ochiladi.",
    uzc: 'Қўшниларингиз ҳам сўров юборишини кутамиз. {n} та сўров йиғилганда маҳалла очилади.',
    ru: 'Ждём заявок и от ваших соседей. Махалля откроется, когда наберётся {n} заявок.',
    en: 'We are waiting for your neighbors to send requests too. The mahalla opens once {n} requests are collected.',
  },
  awaitingAdmin: {
    uz: 'Admin tasdiqlashini kutmoqda',
    uzc: 'Админ тасдиқлашини кутмоқда',
    ru: 'Ожидает подтверждения администратора',
    en: 'Awaiting admin approval',
  },
  autoRefresh: {
    uz: "Sahifa o'zi yangilanib turadi",
    uzc: 'Саҳифа ўзи янгиланиб туради',
    ru: 'Страница обновится сама',
    en: 'This page refreshes automatically',
  },
  chooseAnother: {
    uz: 'Boshqa mahalla tanlash',
    uzc: 'Бошқа маҳалла танлаш',
    ru: 'Выбрать другую махаллю',
    en: 'Choose another mahalla',
  },
} satisfies Dict
