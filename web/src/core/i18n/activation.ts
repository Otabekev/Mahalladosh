/** Onboarding checklist (activation) strings — the new-neighbour card on the feed. */

import type { Dict } from './index'

export const activationStrings = {
  title: { uz: 'Xush kelibsiz! 🌿', uzc: 'Хуш келибсиз! 🌿', ru: 'Добро пожаловать! 🌿', en: 'Welcome! 🌿' },
  subtitle: {
    uz: 'Mahallada boshlash uchun bir necha qadam',
    uzc: 'Маҳаллада бошлаш учун бир неча қадам',
    ru: 'Несколько шагов, чтобы начать в махалле',
    en: 'A few steps to get started in your mahalla',
  },
  progress: {
    uz: '{done}/{total} bajarildi',
    uzc: '{done}/{total} бажарилди',
    ru: '{done}/{total} выполнено',
    en: '{done}/{total} done',
  },
  hide: { uz: 'Yashirish', uzc: 'Яшириш', ru: 'Скрыть', en: 'Hide' },

  // step labels (keys match backend OnboardingStep.key)
  stepHousehold: {
    uz: 'Oila sahifangizni yarating',
    uzc: 'Оила саҳифангизни яратинг',
    ru: 'Создайте страницу семьи',
    en: 'Create your family page',
  },
  stepHistory: {
    uz: 'Oila tarixini yozing',
    uzc: 'Оила тарихини ёзинг',
    ru: 'Напишите историю семьи',
    en: 'Write your family history',
  },
  stepLocation: {
    uz: 'Uy joylashuvini belgilang',
    uzc: 'Уй жойлашувини белгиланг',
    ru: 'Укажите расположение дома',
    en: 'Set your home location',
  },
  stepPost: {
    uz: "Birinchi e'loningizni joylang",
    uzc: 'Биринчи эълонингизни жойланг',
    ru: 'Опубликуйте первое объявление',
    en: 'Make your first post',
  },
  stepHelp: {
    uz: "Qo'shningizga yordam bering",
    uzc: 'Қўшнингизга ёрдам беринг',
    ru: 'Помогите соседу',
    en: 'Help a neighbour',
  },

  // ---------- "Nega Mahalladosh?" (#51 / #52) ----------
  whyTitle: {
    uz: 'Nega Mahalladosh?',
    uzc: 'Нега Маҳалладош?',
    ru: 'Почему Mahalladosh?',
    en: 'Why Mahalladosh?',
  },
  whyLead: {
    uz: 'Telegramda yozganingiz yo‘qoladi. Bu yerda qoladi.',
    uzc: 'Телеграмда ёзганингиз йўқолади. Бу ерда қолади.',
    ru: 'В Телеграме написанное теряется. Здесь — остаётся.',
    en: 'In Telegram it gets lost. Here it stays.',
  },
  whyBefore1: {
    uz: 'Guruhda yo‘qoldi',
    uzc: 'Гуруҳда йўқолди',
    ru: 'Утонуло в чате',
    en: 'Lost in the chat',
  },
  whyAfter1: {
    uz: 'Yordam so‘rovi — javob berilgunicha turadi',
    uzc: 'Ёрдам сўрови — жавоб берилгунича туради',
    ru: 'Просьба о помощи — висит, пока не помогут',
    en: 'A help request — stays until someone helps',
  },
  whyBefore2: {
    uz: '200 ta xabar',
    uzc: '200 та хабар',
    ru: '200 сообщений',
    en: '200 messages',
  },
  whyAfter2: {
    uz: 'Qidiruv — uch oy oldingisini ham topadi',
    uzc: 'Қидирув — уч ой олдингисини ҳам топади',
    ru: 'Поиск — найдёт и трёхмесячное',
    en: 'Search — finds it three months later',
  },
  whyBefore3: {
    uz: 'Kim kimligi noma’lum',
    uzc: 'Ким кимлиги номаълум',
    ru: 'Непонятно, кто есть кто',
    en: "You can't tell who's who",
  },
  whyAfter3: {
    uz: 'Oila sahifasi — qo‘shningizni tanidingiz',
    uzc: 'Оила саҳифаси — қўшнингизни танидингиз',
    ru: 'Страница семьи — вы знаете соседа',
    en: 'A family page — you know your neighbour',
  },
  whyStartNow: {
    uz: 'Hozir qila oladigan ishlar',
    uzc: 'Ҳозир қила оладиган ишлар',
    ru: 'Что можно сделать прямо сейчас',
    en: 'What you can do right now',
  },
  whySoloFamily: {
    uz: 'Oila sahifangizni yarating',
    uzc: 'Оила саҳифангизни яратинг',
    ru: 'Создайте страницу семьи',
    en: 'Create your family page',
  },
  whySoloNumbers: {
    uz: 'Muhim raqamlarni ko‘ring',
    uzc: 'Муҳим рақамларни кўринг',
    ru: 'Посмотрите важные номера',
    en: 'See the important numbers',
  },
  whySoloInvite: {
    uz: 'Qo‘shnilaringizni taklif qiling',
    uzc: 'Қўшниларингизни таклиф қилинг',
    ru: 'Пригласите соседей',
    en: 'Invite your neighbours',
  },
} satisfies Dict
