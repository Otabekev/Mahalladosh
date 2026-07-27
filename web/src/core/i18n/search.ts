/** In-mahalla search (#38). */

import type { Dict } from './index'

export const searchStrings = {
  title: { uz: 'Qidiruv', uzc: 'Қидирув', ru: 'Поиск', en: 'Search' },
  placeholder: {
    uz: 'Nima qidiryapsiz?',
    uzc: 'Нима қидиряпсиз?',
    ru: 'Что вы ищете?',
    en: 'What are you looking for?',
  },
  hint: {
    uz: 'Mahallangizdagi e’lonlar va xizmatlar',
    uzc: 'Маҳаллангиздаги эълонлар ва хизматлар',
    ru: 'Объявления и услуги вашей махалли',
    en: 'Posts and services in your mahalla',
  },
  sectionPosts: { uz: 'E’lonlar', uzc: 'Эълонлар', ru: 'Объявления', en: 'Posts' },
  sectionServices: { uz: 'Xizmatlar', uzc: 'Хизматлар', ru: 'Услуги', en: 'Services' },
  emptyTitle: {
    uz: 'Hech narsa topilmadi',
    uzc: 'Ҳеч нарса топилмади',
    ru: 'Ничего не найдено',
    en: 'Nothing found',
  },
  emptyText: {
    uz: 'Boshqacha yozib ko’ring',
    uzc: 'Бошқача ёзиб кўринг',
    ru: 'Попробуйте написать иначе',
    en: 'Try wording it differently',
  },
  startTitle: {
    uz: 'Nimani qidiramiz?',
    uzc: 'Нимани қидирамиз?',
    ru: 'Что будем искать?',
    en: 'What shall we look for?',
  },
  startText: {
    uz: 'Lotin yoki kirill — ikkalasi ham ishlaydi',
    uzc: 'Лотин ёки кирилл — иккаласи ҳам ишлайди',
    ru: 'Латиница или кириллица — работают обе',
    en: 'Latin or Cyrillic — both work',
  },
} satisfies Dict
