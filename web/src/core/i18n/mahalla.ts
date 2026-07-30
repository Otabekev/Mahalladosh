/** Strings for the Mahalla screen (stats, faol qo'shni, reyting/qo'shnilar/
 * xonadonlar tabs) and the Profile screen (points explainer, menu). */

import type { Dict } from './index'

export const mahallaStrings = {
  // ---------- mahalla header ----------
  raisi: { uz: 'Raisi', uzc: 'Раиси', ru: 'Раис', en: 'Raisi' },
  noRaisi: {
    uz: "Raisi hali saylanmagan — Ovozlar bo'limida taklif qiling",
    uzc: 'Раиси ҳали сайланмаган — Овозлар бўлимида таклиф қилинг',
    ru: 'Раис ещё не избран — предложите кандидата в разделе «Голоса»',
    en: 'No raisi elected yet — propose one in the Votes section',
  },
  statMembers: { uz: "{n} a'zo", uzc: '{n} аъзо', ru: '{n} участников', en: '{n} members' },
  statHouseholds: { uz: '{n} xonadon', uzc: '{n} хонадон', ru: '{n} домов', en: '{n} households' },
  faolQoshniTitle: {
    uz: "O'tgan oyning faol qo'shnisi",
    uzc: 'Ўтган ойнинг фаол қўшниси',
    ru: 'Активный сосед прошлого месяца',
    en: "Last month's most active neighbor",
  },

  // ---------- honor redesign: header stats ----------
  unitMembers: { uz: "a'zo", uzc: 'аъзо', ru: 'участников', en: 'members' },
  unitHouseholds: { uz: 'xonadon', uzc: 'хонадон', ru: 'домов', en: 'households' },
  noRaisiShort: {
    uz: 'Raisi saylanmagan',
    uzc: 'Раиси сайланмаган',
    ru: 'Раис не избран',
    en: 'No raisi yet',
  },

  // ---------- honor redesign: faol qo'shni medallion ----------
  faolQoshniPill: {
    uz: "Oyning faol qo'shnisi",
    uzc: 'Ойнинг фаол қўшниси',
    ru: 'Активный сосед месяца',
    en: 'Neighbor of the month',
  },
  obroPoints: { uz: "{n} obro'", uzc: '{n} обрў', ru: "{n} обро'", en: "{n} obro'" },
  awardedByRaisi: {
    uz: 'Raisi tomonidan taqdirlangan',
    uzc: 'Раиси томонидан тақдирланган',
    ru: 'Отмечен раисом',
    en: 'Awarded by the raisi',
  },

  // ---------- honor redesign: verify strip ----------
  verifyPending: {
    uz: '{n} xonadon tasdiqlashni kutmoqda',
    uzc: '{n} хонадон тасдиқлашни кутмоқда',
    ru: '{n} домов ждут подтверждения',
    en: '{n} households awaiting verification',
  },
  seeAction: { uz: "Ko'rish", uzc: 'Кўриш', ru: 'Смотреть', en: 'View' },

  // ---------- honor redesign: your rank ----------
  youLabel: { uz: 'Siz', uzc: 'Сиз', ru: 'Вы', en: 'You' },
  yourRankHint: {
    uz: "Yana {n} obro' — {rank}-o'ringa",
    uzc: 'Яна {n} обрў — {rank}-ўринга',
    ru: "Ещё {n} обро' — до {rank}-го места",
    en: '{n} more obro’ to reach #{rank}',
  },
  yourRankLeader: {
    uz: 'Siz yetakchisiz!',
    uzc: 'Сиз етакчисиз!',
    ru: 'Вы лидер!',
    en: "You're in the lead!",
  },

  // ---------- tabs ----------
  tabRating: { uz: 'Reyting', uzc: 'Рейтинг', ru: 'Рейтинг', en: 'Leaderboard' },
  tabNeighbors: { uz: "Qo'shnilar", uzc: 'Қўшнилар', ru: 'Соседи', en: 'Neighbors' },
  tabHouseholds: { uz: 'Xonadonlar', uzc: 'Хонадонлар', ru: 'Дома', en: 'Households' },

  // ---------- reyting tab ----------
  periodMonth: { uz: 'Bu oy', uzc: 'Бу ой', ru: 'Этот месяц', en: 'This month' },
  periodAllTime: { uz: 'Umumiy', uzc: 'Умумий', ru: 'За всё время', en: 'All-time' },
  emptyRatingMonthTitle: {
    uz: "Bu oy hali ball yig'ilmagan",
    uzc: 'Бу ой ҳали балл йиғилмаган',
    ru: 'В этом месяце пока нет баллов',
    en: 'No points earned this month yet',
  },
  emptyRatingAllTitle: {
    uz: "Hali ball yig'ilmagan",
    uzc: 'Ҳали балл йиғилмаган',
    ru: 'Пока нет баллов',
    en: 'No points earned yet',
  },
  emptyRatingText: {
    uz: "Qo'shnilarga yordam bering — birinchi bo'ling!",
    uzc: 'Қўшниларга ёрдам беринг — биринчи бўлинг!',
    ru: 'Помогайте соседям — станьте первым!',
    en: 'Help your neighbors — be the first!',
  },

  // ---------- qo'shnilar tab ----------
  emptyNeighborsTitle: {
    uz: "Hali qo'shnilar yo'q",
    uzc: 'Ҳали қўшнилар йўқ',
    ru: 'Соседей пока нет',
    en: 'No neighbors yet',
  },
  emptyNeighborsText: {
    uz: "Qo'shnilaringizni Mahalladoshga taklif qiling.",
    uzc: 'Қўшниларингизни Маҳалладошга таклиф қилинг.',
    ru: 'Пригласите соседей в Mahalladosh.',
    en: 'Invite your neighbors to Mahalladosh.',
  },

  // ---------- xonadonlar tab ----------
  noHouseholdYet: {
    uz: "Xonadoningiz hali yo'q",
    uzc: 'Хонадонингиз ҳали йўқ',
    ru: 'Ваш дом ещё не добавлен',
    en: "You don't have a household yet",
  },
  createHousehold: { uz: 'Xonadon yaratish', uzc: 'Хонадон яратиш', ru: 'Создать дом', en: 'Create household' },
  emptyHouseholdsTitle: {
    uz: "Hali xonadonlar yo'q",
    uzc: 'Ҳали хонадонлар йўқ',
    ru: 'Домов пока нет',
    en: 'No households yet',
  },
  emptyHouseholdsText: {
    uz: 'Birinchi xonadonni siz yarating!',
    uzc: 'Биринчи хонадонни сиз яратинг!',
    ru: 'Создайте первый дом!',
    en: 'Create the first one!',
  },
  householdOf: { uz: '{name} xonadoni', uzc: '{name} хонадони', ru: 'Дом семьи {name}', en: '{name} household' },
  residents: { uz: '{n} kishi', uzc: '{n} киши', ru: '{n} чел.', en: '{n} people' },
  verifiedBadge: { uz: '✓ Tasdiqlangan', uzc: '✓ Тасдиқланган', ru: '✓ Подтверждён', en: '✓ Verified' },
  pendingBadge: { uz: 'Kutilmoqda', uzc: 'Кутилмоқда', ru: 'Ожидает', en: 'Pending' },

  // ---------- profile ----------
  statThisMonth: { uz: 'bu oy', uzc: 'бу ой', ru: 'за месяц', en: 'this month' },
  statAllTime: { uz: 'umumiy', uzc: 'умумий', ru: 'всего', en: 'all-time' },
  adminBadge: { uz: 'Admin', uzc: 'Админ', ru: 'Админ', en: 'Admin' },
  myHousehold: { uz: 'Mening xonadonim', uzc: 'Менинг хонадоним', ru: 'Мой дом', en: 'My household' },
  adminPanel: { uz: 'Admin panel', uzc: 'Админ панель', ru: 'Админ-панель', en: 'Admin panel' },
  howPointsTitle: {
    uz: "Ball qanday yig'iladi?",
    uzc: 'Балл қандай йиғилади?',
    ru: 'Как начисляются баллы?',
    en: 'How do points work?',
  },
  pointHelp: { uz: 'Yordam berish', uzc: 'Ёрдам бериш', ru: 'Помочь соседу', en: 'Helping a neighbor' },
  pointHistory: {
    uz: 'Oila tarixini yozish',
    uzc: 'Оила тарихини ёзиш',
    ru: 'Написать историю семьи',
    en: 'Writing your family history',
  },
  pointWelcome: {
    uz: "Yangi qo'shnini kutib olish",
    uzc: 'Янги қўшнини кутиб олиш',
    ru: 'Встретить нового соседа',
    en: 'Welcoming a newcomer',
  },
  pointFounder: { uz: "Asoschi bo'lish", uzc: 'Асосчи бўлиш', ru: 'Стать основателем', en: 'Being a founder' },
  pointsExplainer: {
    uz: "Ball — bu obro' belgisi. Oy oxirida eng faol qo'shni e'zozlanadi.",
    uzc: 'Балл — бу обрў белгиси. Ой охирида энг фаол қўшни эъзозланади.',
    ru: 'Баллы — это знак уважения. В конце месяца самого активного соседа чествуют.',
    en: 'Points are a mark of respect. At the end of the month, the most active neighbor is honored.',
  },
  mahallaSuffixShort: {
    uz: '{name} mahallasi',
    uzc: '{name} маҳалласи',
    ru: 'махалля {name}',
    en: '{name} mahalla',
  },
} satisfies Dict
