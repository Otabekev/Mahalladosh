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
} satisfies Dict
