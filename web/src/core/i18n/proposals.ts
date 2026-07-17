/** Proposals & voting strings — list, create form, and detail screens. */

import type { Dict } from './index'

export const proposalsStrings = {
  // ---------- list screen ----------
  pageTitle: { uz: 'Ovoz berish', uzc: 'Овоз бериш', ru: 'Голосование', en: 'Voting' },
  pageSubtitle: {
    uz: 'Mahalla qarorlari birgalikda — adolatli ovoz bilan',
    uzc: 'Маҳалла қарорлари биргаликда — адолатли овоз билан',
    ru: 'Решения махалли — сообща, честным голосованием',
    en: 'Mahalla decisions together — by a fair vote',
  },
  newProposal: { uz: '+ Taklif', uzc: '+ Таклиф', ru: '+ Предложение', en: '+ Proposal' },
  tabActive: { uz: 'Faol', uzc: 'Фаол', ru: 'Активные', en: 'Active' },
  tabDone: { uz: 'Yakunlangan', uzc: 'Якунланган', ru: 'Завершённые', en: 'Finished' },
  emptyTitle: { uz: "Hozircha takliflar yo'q", uzc: 'Ҳозирча таклифлар йўқ', ru: 'Пока нет предложений', en: 'No proposals yet' },
  emptyText: {
    uz: "Mahalla uchun g'oyangiz bormi? Birinchi taklifni kiriting.",
    uzc: 'Маҳалла учун ғоянгиз борми? Биринчи таклифни киритинг.',
    ru: 'Есть идея для махалли? Внесите первое предложение.',
    en: 'Have an idea for your mahalla? Submit the first proposal.',
  },

  // ---------- status badges ----------
  statusSeconding: { uz: "Qo'llab-quvvatlash {n}/{m}", uzc: 'Қўллаб-қувватлаш {n}/{m}', ru: 'Поддержка {n}/{m}', en: 'Seconding {n}/{m}' },
  statusVoting: { uz: '🗳 Ovoz berilmoqda', uzc: '🗳 Овоз берилмоқда', ru: '🗳 Идёт голосование', en: '🗳 Voting open' },
  statusPassed: { uz: '✓ Qabul qilindi', uzc: '✓ Қабул қилинди', ru: '✓ Принято', en: '✓ Passed' },
  statusRejected: { uz: 'Rad etildi', uzc: 'Рад этилди', ru: 'Отклонено', en: 'Rejected' },
  statusExpired: { uz: 'Kvorum yetmadi', uzc: 'Кворум етмади', ru: 'Кворум не набран', en: 'No quorum' },
  banProposalBadge: { uz: '⚠️ Chetlatish taklifi', uzc: '⚠️ Четлатиш таклифи', ru: '⚠️ Предложение об отстранении', en: '⚠️ Suspension proposal' },
  proposalBadge: { uz: 'Taklif', uzc: 'Таклиф', ru: 'Предложение', en: 'Proposal' },
  voteCounts: { uz: "Ha {yes} · Yo'q {no}", uzc: 'Ҳа {yes} · Йўқ {no}', ru: 'Да {yes} · Нет {no}', en: 'Yes {yes} · No {no}' },

  // ---------- create screen ----------
  createTitle: { uz: 'Yangi taklif', uzc: 'Янги таклиф', ru: 'Новое предложение', en: 'New proposal' },
  pickType: { uz: 'Taklif turini tanlang', uzc: 'Таклиф турини танланг', ru: 'Выберите тип предложения', en: 'Choose a proposal type' },
  typeSimpleLabel: { uz: 'Oddiy taklif', uzc: 'Оддий таклиф', ru: 'Обычное предложение', en: 'Regular proposal' },
  typeSimpleDesc: {
    uz: 'Hashar, obodonlashtirish, umumiy qaror',
    uzc: 'Ҳашар, ободонлаштириш, умумий қарор',
    ru: 'Хашар, благоустройство, общее решение',
    en: 'Hashar, improvements, a shared decision',
  },
  typeRaisiLabel: { uz: 'Raisi saylash', uzc: 'Раиси сайлаш', ru: 'Выбор раиса', en: 'Elect a chairman' },
  typeRaisiDesc: {
    uz: 'Mahallaga raisi taklif qiling',
    uzc: 'Маҳаллага раиси таклиф қилинг',
    ru: 'Предложите раиса для махалли',
    en: 'Nominate a chairman for the mahalla',
  },
  typeBanLabel: { uz: 'Chetlatish', uzc: 'Четлатиш', ru: 'Отстранение', en: 'Suspension' },
  typeBanDesc: {
    uz: 'Qoidabuzarni vaqtincha chetlatish',
    uzc: 'Қоидабузарни вақтинча четлатиш',
    ru: 'Временно отстранить нарушителя',
    en: 'Temporarily suspend a rule-breaker',
  },
  pickNeighbor: { uz: "Qo'shnini tanlang", uzc: 'Қўшнини танланг', ru: 'Выберите соседа', en: 'Choose a neighbor' },
  noNeighbors: {
    uz: "Tanlash uchun qo'shni topilmadi",
    uzc: 'Танлаш учун қўшни топилмади',
    ru: 'Соседей для выбора не найдено',
    en: 'No neighbors to choose from',
  },
  banWarning: {
    uz: "Jazo taklifi uchun talab yuqori: 5 kishi qo'llab-quvvatlashi, uchdan ikki ko'pchilik va kvorum kerak. Ayblanuvchi xabardor qilinadi va javob bera oladi. Chetlatish vaqtinchalik (30 kun).",
    uzc: 'Жазо таклифи учун талаб юқори: 5 киши қўллаб-қувватлаши, учдан икки кўпчилик ва кворум керак. Айбланувчи хабардор қилинади ва жавоб бера олади. Четлатиш вақтинчалик (30 кун).',
    ru: 'Для карательного предложения требования выше: нужны поддержка 5 человек, большинство в две трети и кворум. Обвиняемый будет уведомлён и сможет ответить. Отстранение временное (30 дней).',
    en: 'A punitive proposal has a higher bar: 5 seconders, a two-thirds majority, and a quorum are required. The accused is notified and can respond. Suspension is temporary (30 days).',
  },
  titleLabel: { uz: 'Sarlavha', uzc: 'Сарлавҳа', ru: 'Заголовок', en: 'Title' },
  titlePlaceholder: { uz: 'Qisqa nom yozing', uzc: 'Қисқа ном ёзинг', ru: 'Напишите короткое название', en: 'Write a short title' },
  descLabel: { uz: 'Tushuntirish', uzc: 'Тушунтириш', ru: 'Пояснение', en: 'Explanation' },
  descPlaceholder: { uz: 'Nima uchun? Qisqacha yozing', uzc: 'Нима учун? Қисқача ёзинг', ru: 'Почему? Напишите кратко', en: 'Why? Keep it brief' },
  secondingNote: {
    uz: "Taklif avval {n} qo'shnining qo'llab-quvvatlashini olishi kerak — shunda ovozga qo'yiladi. Bu keraksiz ovozlardan himoya.",
    uzc: 'Таклиф аввал {n} қўшнининг қўллаб-қувватлашини олиши керак — шунда овозга қўйилади. Бу кераксиз овозлардан ҳимоя.',
    ru: 'Сначала предложение должны поддержать {n} соседей — тогда оно выносится на голосование. Это защита от лишних голосований.',
    en: 'A proposal first needs the support of {n} neighbors — then it goes to a vote. This protects against needless votes.',
  },

  // ---------- detail screen ----------
  backToVotes: { uz: '← Ovozlar', uzc: '← Овозлар', ru: '← Голоса', en: '← Votes' },
  targetRaisi: {
    uz: 'Raisi lavozimiga taklif etilmoqda',
    uzc: 'Раиси лавозимига таклиф этилмоқда',
    ru: 'Предлагается на должность раиса',
    en: 'Nominated for chairman',
  },
  targetBan: {
    uz: "Chetlatish so'ralmoqda — javob berish huquqiga ega",
    uzc: 'Четлатиш сўралмоқда — жавоб бериш ҳуқуқига эга',
    ru: 'Запрошено отстранение — имеет право ответить',
    en: 'Suspension requested — has the right to respond',
  },
  secondingHeading: { uz: "Qo'llab-quvvatlash", uzc: 'Қўллаб-қувватлаш', ru: 'Поддержка', en: 'Seconding' },
  secondingHint: {
    uz: "Ovozga qo'yilishi uchun qo'llab-quvvatlash kerak",
    uzc: 'Овозга қўйилиши учун қўллаб-қувватлаш керак',
    ru: 'Для вынесения на голосование нужна поддержка',
    en: 'Support is needed before it goes to a vote',
  },
  yourProposal: { uz: 'Bu sizning taklifingiz', uzc: 'Бу сизнинг таклифингиз', ru: 'Это ваше предложение', en: 'This is your proposal' },
  youSeconded: { uz: "✓ Siz qo'llab-quvvatladingiz", uzc: '✓ Сиз қўллаб-қувватладингиз', ru: '✓ Вы поддержали', en: '✓ You seconded' },
  secondButton: { uz: "🙌 Qo'llab-quvvatlayman", uzc: '🙌 Қўллаб-қувватлайман', ru: '🙌 Поддерживаю', en: '🙌 I second this' },
  votingCloses: { uz: '⏳ Tugaydi: {date}', uzc: '⏳ Тугайди: {date}', ru: '⏳ Завершится: {date}', en: '⏳ Closes: {date}' },
  yes: { uz: 'Ha', uzc: 'Ҳа', ru: 'Да', en: 'Yes' },
  no: { uz: "Yo'q", uzc: 'Йўқ', ru: 'Нет', en: 'No' },
  voteYes: { uz: 'Ha ✅', uzc: 'Ҳа ✅', ru: 'Да ✅', en: 'Yes ✅' },
  voteNo: { uz: "Yo'q ❌", uzc: 'Йўқ ❌', ru: 'Нет ❌', en: 'No ❌' },
  youVoted: { uz: '✓ Ovoz berdingiz: {choice}', uzc: '✓ Овоз бердингиз: {choice}', ru: '✓ Вы проголосовали: {choice}', en: '✓ You voted: {choice}' },
  quorumNote: {
    uz: 'Kamida {n} kishi ovoz berishi kerak, aks holda kuchga kirmaydi.',
    uzc: 'Камида {n} киши овоз бериши керак, акс ҳолда кучга кирмайди.',
    ru: 'Проголосовать должны не менее {n} человек, иначе решение не вступит в силу.',
    en: 'At least {n} people must vote, otherwise it does not take effect.',
  },
  passedBanner: {
    uz: "✅ Qabul qilindi — Ha {yes}, Yo'q {no}",
    uzc: '✅ Қабул қилинди — Ҳа {yes}, Йўқ {no}',
    ru: '✅ Принято — Да {yes}, Нет {no}',
    en: '✅ Passed — Yes {yes}, No {no}',
  },
  newRaisi: { uz: 'Yangi raisi tayinlandi 👑', uzc: 'Янги раиси тайинланди 👑', ru: 'Назначен новый раис 👑', en: 'A new chairman was appointed 👑' },
  banned30: { uz: '30 kunga chetlatildi', uzc: '30 кунга четлатилди', ru: 'Отстранён на 30 дней', en: 'Suspended for 30 days' },
  rejectedBanner: {
    uz: "Rad etildi — Ha {yes}, Yo'q {no}",
    uzc: 'Рад этилди — Ҳа {yes}, Йўқ {no}',
    ru: 'Отклонено — Да {yes}, Нет {no}',
    en: 'Rejected — Yes {yes}, No {no}',
  },
  expiredBanner: {
    uz: 'Kvorum yetmadi — ovoz kuchga kirmadi',
    uzc: 'Кворум етмади — овоз кучга кирмади',
    ru: 'Кворум не набран — голосование не вступило в силу',
    en: 'No quorum — the vote did not take effect',
  },
} satisfies Dict
