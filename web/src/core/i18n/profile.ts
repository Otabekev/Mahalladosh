/** Strings unique to the redesigned Profile screen: the daraja pill, the stat
 * cards, the Nishonlar (badges) row and the settings list. Existing profile
 * strings (myHousehold, adminPanel, logout, language) stay in mahalla.ts /
 * common.ts and are reused there. */

import type { Dict } from './index'

export const profileStrings = {
  // ---------- daraja pill (header) ----------
  darajaPill: {
    uz: 'Daraja {level} · {name}',
    uzc: 'Даража {level} · {name}',
    ru: 'Уровень {level} · {name}',
    en: 'Level {level} · {name}',
  },

  // ---------- stat cards ----------
  monthPoints: { uz: 'Bu oy', uzc: 'Бу ой', ru: 'За месяц', en: 'This month' },
  totalRep: { uz: "Jami obro'", uzc: 'Жами обрў', ru: "Всего обро'", en: "Total obro'" },

  // ---------- nishonlar (badges) ----------
  badgesTitle: { uz: 'Nishonlar', uzc: 'Нишонлар', ru: 'Награды', en: 'Badges' },
  // earned badges (#11) — names mirror BADGE_ORDER in core/badges.ts
  badgeFaol: { uz: "Faol qo'shni", uzc: 'Фаол қўшни', ru: 'Активный сосед', en: 'Active neighbor' },
  badgeAsoschi: { uz: 'Asoschi', uzc: 'Асосчи', ru: 'Основатель', en: 'Founder' },
  badgeMehmondost: { uz: "Mehmondo'st", uzc: 'Меҳмондўст', ru: 'Гостеприимный', en: 'Host' },
  badgeTarixchi: { uz: 'Tarixchi', uzc: 'Тарихчи', ru: 'Историк', en: 'Historian' },
  badgesHeading: { uz: 'Nishonlar', uzc: 'Нишонлар', ru: 'Знаки', en: 'Badges' },
  badgeLocked: {
    uz: "Hali qo'lga kiritilmagan",
    uzc: 'Ҳали қўлга киритилмаган',
    ru: 'Пока не получен',
    en: 'Not earned yet',
  },
  badgeFaolHow: {
    uz: "Oyning faol qo'shnisi bo'ling",
    uzc: 'Ойнинг фаол қўшниси бўлинг',
    ru: 'Станьте активным соседом месяца',
    en: 'Be the active neighbor of the month',
  },
  badgeAsoschiHow: {
    uz: 'Mahalla ochilishida qatnashing',
    uzc: 'Маҳалла очилишида қатнашинг',
    ru: 'Участвуйте в открытии махалли',
    en: 'Be there when the mahalla opens',
  },
  badgeMehmondostHow: {
    uz: "Uch qo'shningizga yordam bering",
    uzc: 'Уч қўшнингизга ёрдам беринг',
    ru: 'Помогите трём соседям',
    en: 'Help three neighbors',
  },
  badgeTarixchiHow: {
    uz: 'Oila tarixingizni yozing',
    uzc: 'Оила тарихингизни ёзинг',
    ru: 'Запишите историю семьи',
    en: 'Write your family history',
  },

  // ---------- settings list ----------
  largeText: { uz: 'Katta shrift', uzc: 'Катта шрифт', ru: 'Крупный шрифт', en: 'Large text' },
  homelandTie: {
    uz: 'Vatan bilan aloqa',
    uzc: 'Ватан билан алоқа',
    ru: 'Связь с родиной',
    en: 'Ties to homeland',
  },
  homelandHint: { uz: 'Moskva → uy', uzc: 'Москва → уй', ru: 'Москва → дом', en: 'Moscow → home' },

  // ----- public person page -----
  raisiTag: { uz: 'Raisi', uzc: 'Раиси', ru: 'Раис', en: 'Raisi' },
  viewFamily: { uz: 'Oila sahifasi', uzc: 'Оила саҳифаси', ru: 'Страница семьи', en: 'Family page' },
  memberSince: { uz: '{date}dan beri', uzc: '{date}дан бери', ru: 'С {date}', en: 'Since {date}' },
  postsCount: { uz: '{n} e’lon', uzc: '{n} эълон', ru: '{n} объявл.', en: '{n} posts' },
  profileNotFound: {
    uz: 'Foydalanuvchi topilmadi',
    uzc: 'Фойдаланувчи топилмади',
    ru: 'Пользователь не найден',
    en: 'User not found',
  },
} satisfies Dict
