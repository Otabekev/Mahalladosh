/** Away members — the family working abroad.
 *
 *  Tone note: this screen is read by someone a long way from home, often late at
 *  night after a shift. It is warm and it is short. It never says "you do not have
 *  access to X" — the limits are simply not mentioned, because listing what a
 *  person cannot see is a way of making them feel like a suspect in their own
 *  family. What it does say plainly is that the family controls the link.
 */

import type { Dict } from './index'

export const awayStrings = {
  title: { uz: 'Uydan xabar', uzc: 'Уйдан хабар', ru: 'Вести из дома', en: 'News from home' },
  greeting: {
    uz: '{family} oilasi · {mahalla}',
    uzc: '{family} оиласи · {mahalla}',
    ru: 'Семья {family} · {mahalla}',
    en: 'The {family} family · {mahalla}',
  },
  familyTitle: { uz: 'Oilangiz', uzc: 'Оилангиз', ru: 'Ваша семья', en: 'Your family' },
  newsTitle: { uz: 'Mahalladan', uzc: 'Маҳалладан', ru: 'Из махалли', en: 'From the mahalla' },
  noNews: {
    uz: 'Hozircha yangi xabar yo‘q',
    uzc: 'Ҳозирча янги хабар йўқ',
    ru: 'Пока новостей нет',
    en: 'No news yet',
  },
  elder: { uz: 'Katta', uzc: 'Катта', ru: 'Старший', en: 'Elder' },
  generations: {
    uz: '{n} avloddan beri shu yerda',
    uzc: '{n} авлоддан бери шу ерда',
    ru: 'Здесь уже {n} поколения',
    en: '{n} generations here',
  },
  leave: { uz: 'Ulanishni uzish', uzc: 'Уланишни узиш', ru: 'Отключиться', en: 'Unlink' },
  leaveConfirm: {
    uz: 'Uydan keladigan xabarlarni to‘xtatasizmi?',
    uzc: 'Уйдан келадиган хабарларни тўхтатасизми?',
    ru: 'Остановить вести из дома?',
    en: 'Stop receiving news from home?',
  },

  // ---- waiting for the family ----
  pendingTitle: {
    uz: 'Oilangiz tasdiqlashini kutmoqdamiz',
    uzc: 'Оилангиз тасдиқлашини кутмоқдамиз',
    ru: 'Ждём подтверждения от вашей семьи',
    en: 'Waiting for your family to confirm',
  },
  pendingBody: {
    uz: 'Xonadoningizdagi kimdir tasdiqlagach, mahalla xabarlari sizga kela boshlaydi.',
    uzc: 'Хонадонингиздаги кимдир тасдиқлагач, маҳалла хабарлари сизга кела бошлайди.',
    ru: 'Как только кто-то из вашего дома подтвердит, новости начнут приходить.',
    en: 'Once someone in your household confirms, news from the mahalla will start arriving.',
  },

  // ---- joining ----
  joinTitle: {
    uz: 'Oilangizga ulanish',
    uzc: 'Оилангизга уланиш',
    ru: 'Связаться с семьёй',
    en: 'Link to your family',
  },
  joinBody: {
    uz: 'Chetda ishlayotgan bo‘lsangiz, uydagi xabarlar shu yerga keladi.',
    uzc: 'Четда ишлаётган бўлсангиз, уйдаги хабарлар шу ерга келади.',
    ru: 'Если вы работаете за границей, новости из дома будут приходить сюда.',
    en: 'If you are working abroad, news from home arrives here.',
  },
  countryLabel: { uz: 'Qaysi davlatdasiz?', uzc: 'Қайси давлатдасиз?', ru: 'В какой вы стране?', en: 'Which country are you in?' },
  countryPlaceholder: { uz: 'Rossiya', uzc: 'Россия', ru: 'Россия', en: 'Russia' },
  joinAction: { uz: 'Ulanish', uzc: 'Уланиш', ru: 'Связаться', en: 'Link' },
  joinBadToken: {
    uz: 'Havola eskirgan. Oilangizdan yangisini so‘rang.',
    uzc: 'Ҳавола эскирган. Оилангиздан янгисини сўранг.',
    ru: 'Ссылка устарела. Попросите семью прислать новую.',
    en: 'This link has expired. Ask your family for a new one.',
  },

  // ---- steward side, inside the mahalla ----
  stewardTitle: {
    uz: 'Chetdagi oila a’zolari',
    uzc: 'Четдаги оила аъзолари',
    ru: 'Родные за границей',
    en: 'Family abroad',
  },
  stewardBody: {
    uz: 'Chetda ishlayotgan yaqiningizga havola yuboring — mahalla xabarlari unga ham yetadi.',
    uzc: 'Четда ишлаётган яқинингизга ҳавола юборинг — маҳалла хабарлари унга ҳам етади.',
    ru: 'Отправьте ссылку близкому за границей — новости махалли дойдут и до него.',
    en: 'Send a link to your relative abroad — the mahalla’s news will reach them too.',
  },
  makeInvite: { uz: 'Havola yaratish', uzc: 'Ҳавола яратиш', ru: 'Создать ссылку', en: 'Create a link' },
  inviteReady: {
    uz: 'Havolani {hours} soat ichida ishlatish kerak',
    uzc: 'Ҳаволани {hours} соат ичида ишлатиш керак',
    ru: 'Ссылку нужно использовать в течение {hours} ч',
    en: 'The link must be used within {hours} hours',
  },
  copy: { uz: 'Nusxa olish', uzc: 'Нусха олиш', ru: 'Копировать', en: 'Copy' },
  copied: { uz: 'Nusxa olindi', uzc: 'Нусха олинди', ru: 'Скопировано', en: 'Copied' },
  approve: { uz: 'Tasdiqlash', uzc: 'Тасдиқлаш', ru: 'Подтвердить', en: 'Approve' },
  revoke: { uz: 'Uzish', uzc: 'Узиш', ru: 'Отключить', en: 'Unlink' },
  revokeConfirm: {
    uz: 'Bu ulanishni uzasizmi?',
    uzc: 'Бу уланишни узасизми?',
    ru: 'Отключить эту связь?',
    en: 'Unlink this person?',
  },
  statusPending: { uz: 'Kutilmoqda', uzc: 'Кутилмоқда', ru: 'Ожидает', en: 'Pending' },
  statusActive: { uz: 'Ulangan', uzc: 'Уланган', ru: 'Подключён', en: 'Linked' },
  statusRevoked: { uz: 'Uzilgan', uzc: 'Узилган', ru: 'Отключён', en: 'Unlinked' },
  approvalNote: {
    uz: 'Havolani boshqa odam ochishi mumkin — shuning uchun tasdiqlashni oila o‘zi qiladi.',
    uzc: 'Ҳаволани бошқа одам очиши мумкин — шунинг учун тасдиқлашни оила ўзи қилади.',
    ru: 'Ссылку может открыть посторонний — поэтому подтверждает сама семья.',
    en: 'A link can be forwarded to anyone, so the family itself does the confirming.',
  },
} satisfies Dict
