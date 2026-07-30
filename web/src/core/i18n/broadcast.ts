/** «Xabar bering» — ta'ziya and shoshilinch.
 *
 *  Register matters more here than anywhere else in the app. A ta'ziya is not an
 *  announcement and must never be worded like one: no "post", no "share", no
 *  exclamation marks, and the closing line is the one a neighbour would actually
 *  say. The emergency copy goes the other way — short, imperative, unmistakable.
 */

import type { Dict } from './index'

export const broadcastStrings = {
  sectionTitle: { uz: 'Xabar bering', uzc: 'Хабар беринг', ru: 'Сообщить', en: 'Tell everyone' },
  sectionNote: {
    uz: 'Bu xabarlar butun mahallaga darhol yetadi',
    uzc: 'Бу хабарлар бутун маҳаллага дарҳол етади',
    ru: 'Эти сообщения сразу дойдут до всей махалли',
    en: 'These reach the whole mahalla immediately',
  },

  // ---- ta'ziya ----
  taziyaDesc: {
    uz: 'Vafot etgan qo‘shni haqida xabar',
    uzc: 'Вафот этган қўшни ҳақида хабар',
    ru: 'Сообщить о кончине соседа',
    en: 'Announce the death of a neighbour',
  },
  taziyaNamePlaceholder: {
    uz: 'Marhumning ismi',
    uzc: 'Марҳумнинг исми',
    ru: 'Имя усопшего',
    en: 'Name of the deceased',
  },
  fieldJanoza: { uz: 'Janoza vaqti', uzc: 'Жаноза вақти', ru: 'Время джанозы', en: 'Janoza time' },
  fieldPlace: { uz: 'Joyi', uzc: 'Жойи', ru: 'Место', en: 'Place' },
  placePlaceholder: {
    uz: 'Masalan: Yoshlik masjidi',
    uzc: 'Масалан: Ёшлик масжиди',
    ru: 'Например: мечеть Ёшлик',
    en: 'e.g. Yoshlik mosque',
  },
  janozaAt: { uz: 'Janoza: {when}', uzc: 'Жаноза: {when}', ru: 'Джаноза: {when}', en: 'Janoza: {when}' },
  gatesOpen: {
    uz: 'Eshik uch kun ochiq',
    uzc: 'Эшик уч кун очиқ',
    ru: 'Двери открыты три дня',
    en: 'The gates are open for three days',
  },
  condolence: {
    uz: 'Alloh rahmat qilsin',
    uzc: 'Аллоҳ раҳмат қилсин',
    ru: 'Соболезнуем семье',
    en: 'May God have mercy on them',
  },
  /** On a ta'ziya the 🤲 tap is not "thanks" — it is "I prayed". Same mechanism,
   *  the only word that is not offensive on a death notice. */
  duo: { uz: 'Duo qildim', uzc: 'Дуо қилдим', ru: 'Помолился', en: 'I prayed' },
  taziyaGateNote: {
    uz: 'Ta’ziya e’lonini tasdiqlangan xonadon yoki raisi bera oladi',
    uzc: 'Таъзия эълонини тасдиқланган хонадон ёки раиси бера олади',
    ru: 'Объявить о кончине может подтверждённый дом или раис',
    en: 'A verified household or the raisi may post a bereavement notice',
  },
  taziyaGateWhy: {
    uz: 'Yolg‘on ta’ziya butun mahallaga yetib boradi — shuning uchun kafolat kerak',
    uzc: 'Ёлғон таъзия бутун маҳаллага етиб боради — шунинг учун кафолат керак',
    ru: 'Ложное сообщение дойдёт до всей махалли — поэтому нужно подтверждение',
    en: 'A false notice would reach everyone — that is why vouching is required',
  },

  // ---- shoshilinch ----
  shoshilinchDesc: {
    uz: 'Hozir yordam kerak — yong‘in, kasal, yo‘qolgan',
    uzc: 'Ҳозир ёрдам керак — ёнғин, касал, йўқолган',
    ru: 'Помощь нужна сейчас — пожар, больной, пропажа',
    en: 'Help needed right now — fire, illness, missing',
  },
  shoshilinchPlaceholder: {
    uz: 'Nima bo‘ldi va qayerda',
    uzc: 'Нима бўлди ва қаерда',
    ru: 'Что случилось и где',
    en: 'What happened and where',
  },
  fieldEmergencyType: {
    uz: 'Nima bo‘ldi?',
    uzc: 'Нима бўлди?',
    ru: 'Что случилось?',
    en: 'What happened?',
  },
  catFire: { uz: 'Yong‘in', uzc: 'Ёнғин', ru: 'Пожар', en: 'Fire' },
  catMedical: { uz: 'Tez tibbiy yordam', uzc: 'Тез тиббий ёрдам', ru: 'Скорая помощь', en: 'Medical' },
  catMissing: { uz: 'Odam yo‘qoldi', uzc: 'Одам йўқолди', ru: 'Пропал человек', en: 'Missing person' },
  catLivestock: { uz: 'Mol yo‘qoldi', uzc: 'Мол йўқолди', ru: 'Пропал скот', en: 'Missing livestock' },
  catOther: { uz: 'Boshqa', uzc: 'Бошқа', ru: 'Другое', en: 'Other' },
  emergencyOver: {
    uz: 'Hal bo‘ldi',
    uzc: 'Ҳал бўлди',
    ru: 'Решено',
    en: 'Resolved',
  },
  emergencyOverConfirm: {
    uz: 'Bu shoshilinch xabarni yopasizmi?',
    uzc: 'Бу шошилинч хабарни ёпасизми?',
    ru: 'Закрыть это срочное сообщение?',
    en: 'Close this urgent notice?',
  },
  emergencyLive: {
    uz: 'Hozir davom etmoqda',
    uzc: 'Ҳозир давом этмоқда',
    ru: 'Происходит сейчас',
    en: 'Happening now',
  },
  callWarning: {
    uz: 'Jiddiy holatda avval 101 / 103 ga qo‘ng‘iroq qiling',
    uzc: 'Жиддий ҳолатда аввал 101 / 103 га қўнғироқ қилинг',
    ru: 'В серьёзном случае сначала звоните 101 / 103',
    en: 'In a real emergency call 101 / 103 first',
  },
} satisfies Dict
