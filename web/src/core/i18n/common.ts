/** Shared strings: navigation, generic actions, time units, post types. */

import type { Dict, Entry, Lang } from './index'

export const common = {
  // bottom nav
  navFeed: { uz: 'Lenta', uzc: 'Лента', ru: 'Лента', en: 'Feed' },
  navMahalla: { uz: 'Mahalla', uzc: 'Маҳалла', ru: 'Махалля', en: 'Mahalla' },
  navServices: { uz: 'Xizmatlar', uzc: 'Хизматлар', ru: 'Услуги', en: 'Services' },
  navVotes: { uz: 'Ovozlar', uzc: 'Овозлар', ru: 'Голоса', en: 'Votes' },
  navProfile: { uz: 'Profil', uzc: 'Профиль', ru: 'Профиль', en: 'Profile' },
  // header
  mahallaSuffix: {
    uz: '{name} mahallasi',
    uzc: '{name} маҳалласи',
    ru: 'Махалля {name}',
    en: '{name} mahalla',
  },
  // generic actions
  save: { uz: 'Saqlash', uzc: 'Сақлаш', ru: 'Сохранить', en: 'Save' },
  send: { uz: 'Yuborish', uzc: 'Юбориш', ru: 'Отправить', en: 'Send' },
  cancel: { uz: 'Bekor qilish', uzc: 'Бекор қилиш', ru: 'Отмена', en: 'Cancel' },
  close: { uz: 'Yopish', uzc: 'Ёпиш', ru: 'Закрыть', en: 'Close' },
  back: { uz: 'Orqaga', uzc: 'Орқага', ru: 'Назад', en: 'Back' },
  add: { uz: "Qo'shish", uzc: 'Қўшиш', ru: 'Добавить', en: 'Add' },
  remove: { uz: "O'chirish", uzc: 'Ўчириш', ru: 'Удалить', en: 'Delete' },
  edit: { uz: 'Tahrirlash', uzc: 'Таҳрирлаш', ru: 'Изменить', en: 'Edit' },
  rahmat: { uz: 'Rahmat', uzc: 'Раҳмат', ru: 'Спасибо', en: 'Thanks' },
  logout: { uz: 'Chiqish', uzc: 'Чиқиш', ru: 'Выйти', en: 'Log out' },
  login: { uz: 'Kirish', uzc: 'Кириш', ru: 'Войти', en: 'Log in' },
  error: { uz: 'Xatolik yuz berdi', uzc: 'Хатолик юз берди', ru: 'Произошла ошибка', en: 'Something went wrong' },
  offline: {
    uz: "Internet aloqasi yo'q — oxirgi ma'lumotlar ko'rsatilmoqda",
    uzc: 'Интернет алоқаси йўқ — охирги маълумотлар кўрсатилмоқда',
    ru: 'Нет соединения — показаны последние данные',
    en: "You're offline — showing recent data",
  },
  language: { uz: 'Til', uzc: 'Тил', ru: 'Язык', en: 'Language' },
  searchLabel: { uz: 'Qidirish', uzc: 'Қидириш', ru: 'Искать', en: 'Search' },
  // image picker
  addPhoto: { uz: "Rasm qo'shish", uzc: 'Расм қўшиш', ru: 'Добавить фото', en: 'Add photo' },
  uploadFailed: { uz: 'Rasm yuklanmadi', uzc: 'Расм юкланмади', ru: 'Фото не загрузилось', en: 'Upload failed' },
} satisfies Dict

// ---------- time ----------

/** Wording for timeAgo() in components/ui.tsx. Elders read a clock, not a
 * countdown: "Bugun 14:30" beats "3 soat oldin". {t} is a HH:MM clock time,
 * {d}/{mon}/{y} a day/month/year. */
export const time = {
  now: { uz: 'Hozir', uzc: 'Ҳозир', ru: 'Сейчас', en: 'Just now' },
  today: { uz: 'Bugun {t}', uzc: 'Бугун {t}', ru: 'Сегодня в {t}', en: 'Today at {t}' },
  yesterday: { uz: 'Kecha {t}', uzc: 'Кеча {t}', ru: 'Вчера в {t}', en: 'Yesterday at {t}' },
  /** A date inside the current year. */
  dateShort: { uz: '{d}-{mon}', uzc: '{d}-{mon}', ru: '{d} {mon}', en: '{d} {mon}' },
  /** A date in an earlier year. */
  dateFull: { uz: '{d}-{mon}, {y}', uzc: '{d}-{mon}, {y}', ru: '{d} {mon} {y}', en: '{d} {mon} {y}' },
} satisfies Dict

/** Month names, index 0 = January. Russian is genitive ("12 июля"), English is
 * the 3-letter short form; both Uzbek scripts use the everyday spoken form. */
export const monthNames: Record<Lang, string[]> = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  uzc: ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентабр', 'октабр', 'ноябр', 'декабр'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

// ---------- post types ----------

export const postTypeLabels: Record<string, Entry> = {
  help: { uz: 'Yordam kerak', uzc: 'Ёрдам керак', ru: 'Нужна помощь', en: 'Need help' },
  announcement: { uz: "E'lon", uzc: 'Эълон', ru: 'Объявление', en: 'Announcement' },
  charity: { uz: 'Xayriya', uzc: 'Хайрия', ru: 'Хайрия', en: 'Charity' },
  event: { uz: "To'y-marosim", uzc: 'Тўй-маросим', ru: 'Торжество', en: 'Event' },
  newcomer: { uz: "Yangi qo'shni", uzc: 'Янги қўшни', ru: 'Новый сосед', en: 'New neighbor' },
  share: { uz: 'Ulashish', uzc: 'Улашиш', ru: 'Пост', en: 'Share' },
  poll: { uz: "So'rovnoma", uzc: 'Сўровнома', ru: 'Опрос', en: 'Poll' },
}
