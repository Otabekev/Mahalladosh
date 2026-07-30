/** «Narx» — the district price board.
 *
 *  The item names and units live here rather than in the API, which is the same
 *  rule the onboarding steps follow: the server sends a key, all copy is i18n. It
 *  also means adding a fourth language to a basket item never needs a migration.
 */

import type { Dict } from './index'

export const pricesStrings = {
  title: { uz: 'Narxlar', uzc: 'Нархлар', ru: 'Цены', en: 'Prices' },
  subtitle: {
    uz: 'Tumanimizdagi bu haftagi narxlar',
    uzc: 'Туманимиздаги бу ҳафтаги нархлар',
    ru: 'Цены в нашем тумане на этой неделе',
    en: 'This week’s prices in our district',
  },
  som: { uz: "so'm", uzc: 'сўм', ru: 'сум', en: 'som' },
  noPrice: { uz: 'Hali aytilmagan', uzc: 'Ҳали айтилмаган', ru: 'Пока не указано', en: 'Not reported yet' },
  reportsCount: {
    uz: '{n} kishi aytdi',
    uzc: '{n} киши айтди',
    ru: 'указали: {n}',
    en: '{n} reported',
  },
  youSaid: { uz: 'Siz: {som}', uzc: 'Сиз: {som}', ru: 'Вы: {som}', en: 'You: {som}' },
  tellPrice: { uz: 'Narxni ayting', uzc: 'Нархни айтинг', ru: 'Указать цену', en: 'Report a price' },
  updatePrice: { uz: "O'zgartirish", uzc: 'Ўзгартириш', ru: 'Изменить', en: 'Change' },
  marketLabel: { uz: 'Qaysi bozor (ixtiyoriy)', uzc: 'Қайси бозор (ихтиёрий)', ru: 'Какой базар (необязательно)', en: 'Which bazaar (optional)' },
  marketPlaceholder: { uz: 'Pop bozori', uzc: 'Поп бозори', ru: 'Попский базар', en: 'Pop bazaar' },
  priceLabel: { uz: 'Narxi', uzc: 'Нархи', ru: 'Цена', en: 'Price' },
  save: { uz: 'Saqlash', uzc: 'Сақлаш', ru: 'Сохранить', en: 'Save' },
  whoSaid: { uz: 'Kim aytdi', uzc: 'Ким айтди', ru: 'Кто указал', en: 'Who reported' },
  medianNote: {
    uz: "Ko'rsatilgan narx — o'rtadagi narx, o'rtacha emas. Bitta xato yozilgan raqam uni buzolmaydi.",
    uzc: 'Кўрсатилган нарх — ўртадаги нарх, ўртача эмас. Битта хато ёзилган рақам уни бузолмайди.',
    ru: 'Показана медианная цена, а не средняя. Одна опечатка её не испортит.',
    en: 'The figure is the median, not the average — one mistyped number cannot wreck it.',
  },
  emptyHint: {
    uz: 'Bozorga borsangiz, bir-ikkita narxni yozib qo‘ying — qo‘shnilaringizga asqotadi',
    uzc: 'Бозорга борсангиз, бир-иккита нархни ёзиб қўйинг — қўшниларингизга асқотади',
    ru: 'Были на базаре — отметьте пару цен, соседям пригодится',
    en: 'Next time you are at the bazaar, note a price or two — your neighbours will use it',
  },

  // ---- the basket ----
  non: { uz: 'Non', uzc: 'Нон', ru: 'Лепёшка', en: 'Bread' },
  un: { uz: 'Un', uzc: 'Ун', ru: 'Мука', en: 'Flour' },
  guruch: { uz: 'Guruch', uzc: 'Гуруч', ru: 'Рис', en: 'Rice' },
  yog: { uz: "Yog'", uzc: 'Ёғ', ru: 'Масло', en: 'Oil' },
  shakar: { uz: 'Shakar', uzc: 'Шакар', ru: 'Сахар', en: 'Sugar' },
  tuxum: { uz: 'Tuxum', uzc: 'Тухум', ru: 'Яйца', en: 'Eggs' },
  sut: { uz: 'Sut', uzc: 'Сут', ru: 'Молоко', en: 'Milk' },
  kartoshka: { uz: 'Kartoshka', uzc: 'Картошка', ru: 'Картофель', en: 'Potatoes' },
  piyoz: { uz: 'Piyoz', uzc: 'Пиёз', ru: 'Лук', en: 'Onions' },
  sabzi: { uz: 'Sabzi', uzc: 'Сабзи', ru: 'Морковь', en: 'Carrots' },
  pomidor: { uz: 'Pomidor', uzc: 'Помидор', ru: 'Помидоры', en: 'Tomatoes' },
  olma: { uz: 'Olma', uzc: 'Олма', ru: 'Яблоки', en: 'Apples' },
  gosht_mol: { uz: "Mol go'shti", uzc: 'Мол гўшти', ru: 'Говядина', en: 'Beef' },
  gosht_qoy: { uz: "Qo'y go'shti", uzc: 'Қўй гўшти', ru: 'Баранина', en: 'Mutton' },
  benzin: { uz: 'Benzin', uzc: 'Бензин', ru: 'Бензин', en: 'Petrol' },
  gaz_ballon: { uz: 'Gaz balloni', uzc: 'Газ баллони', ru: 'Газовый баллон', en: 'Gas cylinder' },

  // ---- units ----
  unitDona: { uz: 'dona', uzc: 'дона', ru: 'шт', en: 'each' },
  unitKg: { uz: 'kg', uzc: 'кг', ru: 'кг', en: 'kg' },
  unitLitr: { uz: 'litr', uzc: 'литр', ru: 'литр', en: 'litre' },
  unitTen: { uz: '10 dona', uzc: '10 дона', ru: '10 шт', en: '10 eggs' },
} satisfies Dict
