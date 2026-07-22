/** Shared strings: navigation, generic actions, time units, post types. */

import type { Dict, Entry } from './index'

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
  // image picker
  addPhoto: { uz: "Rasm qo'shish", uzc: 'Расм қўшиш', ru: 'Добавить фото', en: 'Add photo' },
  uploadFailed: { uz: 'Rasm yuklanmadi', uzc: 'Расм юкланмади', ru: 'Фото не загрузилось', en: 'Upload failed' },
} satisfies Dict

// ---------- time ----------

export const time = {
  now: { uz: 'hozir', uzc: 'ҳозир', ru: 'только что', en: 'just now' },
  minutes: { uz: '{n} daqiqa oldin', uzc: '{n} дақиқа олдин', ru: '{n} мин. назад', en: '{n} min ago' },
  hours: { uz: '{n} soat oldin', uzc: '{n} соат олдин', ru: '{n} ч. назад', en: '{n} h ago' },
  days: { uz: '{n} kun oldin', uzc: '{n} кун олдин', ru: '{n} дн. назад', en: '{n} d ago' },
} satisfies Dict

// ---------- post types ----------

export const postTypeLabels: Record<string, Entry> = {
  help: { uz: 'Yordam kerak', uzc: 'Ёрдам керак', ru: 'Нужна помощь', en: 'Need help' },
  announcement: { uz: "E'lon", uzc: 'Эълон', ru: 'Объявление', en: 'Announcement' },
  charity: { uz: 'Xayriya', uzc: 'Хайрия', ru: 'Хайрия', en: 'Charity' },
  event: { uz: "To'y-marosim", uzc: 'Тўй-маросим', ru: 'Торжество', en: 'Event' },
  newcomer: { uz: "Yangi qo'shni", uzc: 'Янги қўшни', ru: 'Новый сосед', en: 'New neighbor' },
  share: { uz: 'Ulashish', uzc: 'Улашиш', ru: 'Пост', en: 'Share' },
}
