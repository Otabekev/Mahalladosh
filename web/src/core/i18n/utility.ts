/** «Chiroq bormi?» — the live light / gas / water board.
 *
 *  Wording note: the question people actually ask each other is not "report an
 *  outage", it is "sizda ham yo'qmi?" — is yours out too. The copy stays in that
 *  register throughout, because the moment it starts sounding like a utility form
 *  the elders stop using it.
 */

import type { Dict } from './index'

export const utilityStrings = {
  title: { uz: 'Chiroq bormi?', uzc: 'Чироқ борми?', ru: 'Есть свет?', en: 'Is the light on?' },
  subtitle: {
    uz: 'Mahallangizda hozir nima ahvol',
    uzc: 'Маҳаллангизда ҳозир нима аҳвол',
    ru: 'Что сейчас в вашей махалле',
    en: 'What is happening in your mahalla right now',
  },

  light: { uz: 'Yorug‘lik', uzc: 'Ёруғлик', ru: 'Свет', en: 'Electricity' },
  gas: { uz: 'Gaz', uzc: 'Газ', ru: 'Газ', en: 'Gas' },
  water: { uz: 'Suv', uzc: 'Сув', ru: 'Вода', en: 'Water' },

  // the two taps
  iHaveNone: { uz: 'Menda yo‘q', uzc: 'Менда йўқ', ru: 'У меня нет', en: 'Mine is out' },
  iHaveIt: { uz: 'Menda bor', uzc: 'Менда бор', ru: 'У меня есть', en: 'Mine is on' },

  // live tallies
  outCount: {
    uz: '{out} ta xonadonda yo‘q',
    uzc: '{out} та хонадонда йўқ',
    ru: 'Нет в {out} домах',
    en: 'Out in {out} households',
  },
  onCount: {
    uz: '{on} ta xonadonda bor',
    uzc: '{on} та хонадонда бор',
    ru: 'Есть в {on} домах',
    en: 'On in {on} households',
  },
  allFine: {
    uz: 'Hammada bor',
    uzc: 'Ҳаммада бор',
    ru: 'У всех есть',
    en: 'Everyone has it',
  },
  nobodySaid: {
    uz: 'Hali hech kim aytmadi',
    uzc: 'Ҳали ҳеч ким айтмади',
    ru: 'Пока никто не ответил',
    en: 'Nobody has answered yet',
  },
  sinceLabel: {
    uz: '{time} dan beri',
    uzc: '{time} дан бери',
    ru: 'с {time}',
    en: 'since {time}',
  },
  youSaid: {
    uz: 'Siz aytdingiz',
    uzc: 'Сиз айтдингиз',
    ru: 'Вы ответили',
    en: 'You answered',
  },

  // the point of the whole feature
  streetsTitle: {
    uz: 'Ko‘chalar bo‘yicha',
    uzc: 'Кўчалар бўйича',
    ru: 'По улицам',
    en: 'Street by street',
  },
  streetOut: { uz: '{out} yo‘q', uzc: '{out} йўқ', ru: '{out} без', en: '{out} out' },
  streetOn: { uz: '{on} bor', uzc: '{on} бор', ru: '{on} с', en: '{on} on' },
  onlyYou: {
    uz: 'Faqat sizda — uydagi avtomatni tekshiring',
    uzc: 'Фақат сизда — уйдаги автоматни текширинг',
    ru: 'Только у вас — проверьте автомат в доме',
    en: 'Only you — check the fuse in your house',
  },
  wholeStreet: {
    uz: 'Butun ko‘chada yo‘q',
    uzc: 'Бутун кўчада йўқ',
    ru: 'Нет на всей улице',
    en: 'The whole street is out',
  },

  // announced windows
  plannedTitle: {
    uz: 'E’lon qilingan uzilishlar',
    uzc: 'Эълон қилинган узилишлар',
    ru: 'Объявленные отключения',
    en: 'Announced cuts',
  },
  plannedNow: { uz: 'Hozir', uzc: 'Ҳозир', ru: 'Сейчас', en: 'Now' },
  addWindow: {
    uz: 'Uzilish e’lon qilish',
    uzc: 'Узилиш эълон қилиш',
    ru: 'Объявить отключение',
    en: 'Announce a cut',
  },
  windowKind: { uz: 'Nima o‘chadi', uzc: 'Нима ўчади', ru: 'Что отключают', en: 'What goes off' },
  windowFrom: { uz: 'Boshlanishi', uzc: 'Бошланиши', ru: 'Начало', en: 'Starts' },
  windowTo: { uz: 'Tugashi', uzc: 'Тугаши', ru: 'Конец', en: 'Ends' },
  windowNote: {
    uz: 'Izoh (ixtiyoriy)',
    uzc: 'Изоҳ (ихтиёрий)',
    ru: 'Примечание (необязательно)',
    en: 'Note (optional)',
  },
  windowSave: { uz: 'E’lon qilish', uzc: 'Эълон қилиш', ru: 'Объявить', en: 'Announce' },
  windowDelete: {
    uz: 'Bu e’lonni o‘chirasizmi?',
    uzc: 'Бу эълонни ўчирасизми?',
    ru: 'Удалить это объявление?',
    en: 'Remove this announcement?',
  },
  raisiOnly: {
    uz: 'Faqat raisi e’lon qila oladi',
    uzc: 'Фақат раиси эълон қила олади',
    ru: 'Объявлять может только раис',
    en: 'Only the raisi can announce',
  },

  // the solo half — works with nobody else on the app
  logTitle: {
    uz: 'Sizning tarixingiz',
    uzc: 'Сизнинг тарихингиз',
    ru: 'Ваша история',
    en: 'Your record',
  },
  logSummary: {
    uz: 'Bu oy: {cuts} marta uzildi · {hours} soat',
    uzc: 'Бу ой: {cuts} марта узилди · {hours} соат',
    ru: 'В этом месяце: отключений {cuts} · {hours} ч',
    en: 'This month: {cuts} cuts · {hours} hours',
  },
  logEmpty: {
    uz: 'Bu oy hali uzilish qayd etilmagan',
    uzc: 'Бу ой ҳали узилиш қайд этилмаган',
    ru: 'В этом месяце отключений не отмечено',
    en: 'No outages recorded this month',
  },
  logHint: {
    uz: 'Har safar “menda yo‘q” desangiz, shu yerga yoziladi. Qo‘shnilaringiz bo‘lmasa ham ishlaydi.',
    uzc: 'Ҳар сафар “менда йўқ” десангиз, шу ерга ёзилади. Қўшниларингиз бўлмаса ҳам ишлайди.',
    ru: 'Каждое «у меня нет» попадает сюда. Работает, даже если соседей ещё нет.',
    en: 'Every “mine is out” lands here. It works even with no neighbours yet.',
  },
  estimated: {
    uz: 'taxminan',
    uzc: 'тахминан',
    ru: 'примерно',
    en: 'approx.',
  },
  minutes: { uz: '{n} daqiqa', uzc: '{n} дақиқа', ru: '{n} мин', en: '{n} min' },
  hoursShort: { uz: '{n} soat', uzc: '{n} соат', ru: '{n} ч', en: '{n} h' },

  // why this is not a Telegram channel
  whyTitle: {
    uz: 'Nega bu Telegramda yo‘q?',
    uzc: 'Нега бу Телеграмда йўқ?',
    ru: 'Почему этого нет в Telegram?',
    en: 'Why isn’t this in Telegram?',
  },
  whyBody: {
    uz: 'Elektr tarmoqlari kanali butun viloyat haqida yozadi. “Faqat mendami yoki butun ko‘chadami?” degan savolga esa faqat qo‘shningiz javob bera oladi.',
    uzc: 'Электр тармоқлари канали бутун вилоят ҳақида ёзади. “Фақат мендами ёки бутун кўчадами?” деган саволга эса фақат қўшнингиз жавоб бера олади.',
    ru: 'Канал электросетей пишет про всю область. А на вопрос «только у меня или на всей улице?» может ответить только сосед.',
    en: 'The utility’s channel covers a whole region. Only a neighbour can answer “is it just my house, or the whole street?”',
  },
} satisfies Dict
