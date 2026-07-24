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
} satisfies Dict
