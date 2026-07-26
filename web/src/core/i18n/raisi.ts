/** Raisi (mahalla head) panel strings. */

import type { Dict } from './index'

export const raisiStrings = {
  pinnedBadge: {
    uz: 'Raisi e’loni',
    uzc: 'Раиси эълони',
    ru: 'Объявление раиса',
    en: 'From the raisi',
  },
  pin: { uz: 'Yuqoriga qadash', uzc: 'Юқорига қадаш', ru: 'Закрепить сверху', en: 'Pin to top' },
  unpin: { uz: 'Qadashni olib tashlash', uzc: 'Қадашни олиб ташлаш', ru: 'Открепить', en: 'Unpin' },
  pinConfirm: {
    uz: 'Bu e’lon mahalla lentasining tepasida hamma uchun ko‘rinadi. Qadaymizmi?',
    uzc: 'Бу эълон маҳалла лентасининг тепасида ҳамма учун кўринади. Қадаймизми?',
    ru: 'Это объявление будет вверху ленты махалли для всех. Закрепить?',
    en: 'This post will sit at the top of the mahalla feed for everyone. Pin it?',
  },

  // ----- panel -----
  panelTitle: { uz: 'Raisi paneli', uzc: 'Раиси панели', ru: 'Панель раиса', en: 'Raisi panel' },
  panelSubtitle: {
    uz: 'Mahallani boshqarish vositalari',
    uzc: 'Маҳаллани бошқариш воситалари',
    ru: 'Инструменты управления махаллёй',
    en: 'Tools for running your mahalla',
  },
  openPanel: { uz: 'Raisi paneli', uzc: 'Раиси панели', ru: 'Панель раиса', en: 'Raisi panel' },
  openPanelHint: {
    uz: 'Shikoyatlar, a’zolar, e’lon qadash',
    uzc: 'Шикоятлар, аъзолар, эълон қадаш',
    ru: 'Жалобы, участники, закрепление',
    en: 'Reports, members, pinning',
  },

  tabReports: { uz: 'Shikoyatlar', uzc: 'Шикоятлар', ru: 'Жалобы', en: 'Reports' },
  tabMembers: { uz: 'A’zolar', uzc: 'Аъзолар', ru: 'Участники', en: 'Members' },

  reportsEmpty: {
    uz: 'Ochiq shikoyatlar yo‘q — mahalla tinch',
    uzc: 'Очиқ шикоятлар йўқ — маҳалла тинч',
    ru: 'Открытых жалоб нет — в махалле спокойно',
    en: 'No open reports — all quiet',
  },
  reportedBy: { uz: 'Shikoyat qildi', uzc: 'Шикоят қилди', ru: 'Пожаловался', en: 'Reported by' },
  resolve: { uz: 'Hal qilindi', uzc: 'Ҳал қилинди', ru: 'Решено', en: 'Resolve' },
  dismiss: { uz: 'Rad etish', uzc: 'Рад этиш', ru: 'Отклонить', en: 'Dismiss' },

  reasonSpam: { uz: 'Spam', uzc: 'Спам', ru: 'Спам', en: 'Spam' },
  reasonAbuse: { uz: 'Haqorat', uzc: 'Ҳақорат', ru: 'Оскорбление', en: 'Abuse' },
  reasonFake: { uz: 'Soxta', uzc: 'Сохта', ru: 'Фейк', en: 'Fake' },
  reasonOther: { uz: 'Boshqa', uzc: 'Бошқа', ru: 'Другое', en: 'Other' },

  membersEmpty: { uz: 'A’zolar yo‘q', uzc: 'Аъзолар йўқ', ru: 'Нет участников', en: 'No members' },
  raisiTag: { uz: 'Raisi', uzc: 'Раиси', ru: 'Раис', en: 'Raisi' },
  bannedTag: { uz: 'Chetlatilgan', uzc: 'Четлатилган', ru: 'Отстранён', en: 'Banned' },
  ban: { uz: 'Chetlatish', uzc: 'Четлатиш', ru: 'Отстранить', en: 'Ban' },
  banConfirm: {
    uz: '{name}ni mahalladan chetlatasizmi? Ularning e’lonlari yopiladi.',
    uzc: '{name}ни маҳалладан четлатасизми? Уларнинг эълонлари ёпилади.',
    ru: 'Отстранить {name} из махалли? Их объявления будут закрыты.',
    en: 'Ban {name} from the mahalla? Their posts will be closed.',
  },
} satisfies Dict
