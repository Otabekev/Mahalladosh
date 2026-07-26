/** Invite-a-neighbour strings — the mahalla growth mechanic. */

import type { Dict } from './index'

export const inviteStrings = {
  button: { uz: 'Taklif qilish', uzc: 'Таклиф қилиш', ru: 'Пригласить', en: 'Invite' },
  title: {
    uz: 'Qo‘shnilarni taklif qiling',
    uzc: 'Қўшниларни таклиф қилинг',
    ru: 'Пригласите соседей',
    en: 'Invite your neighbours',
  },
  hint: {
    uz: 'Bu havolani ulashing — qo‘shnilaringiz mahallaga qo‘shiladi',
    uzc: 'Бу ҳаволани улашинг — қўшниларингиз маҳаллага қўшилади',
    ru: 'Поделитесь этой ссылкой — соседи присоединятся к махалле',
    en: 'Share this link — neighbours join your mahalla',
  },
  hintCard: {
    uz: 'Ko‘proq qo‘shni, jonliroq mahalla',
    uzc: 'Кўпроқ қўшни, жонлироқ маҳалла',
    ru: 'Больше соседей — живее махалля',
    en: 'More neighbours, a livelier mahalla',
  },
  share: { uz: 'Ulashish', uzc: 'Улашиш', ru: 'Поделиться', en: 'Share' },
  copyLink: { uz: 'Havolani nusxalash', uzc: 'Ҳаволани нусхалаш', ru: 'Копировать ссылку', en: 'Copy link' },
  copied: { uz: 'Nusxalandi!', uzc: 'Нусхаланди!', ru: 'Скопировано!', en: 'Copied!' },

  // /join deep-link screen
  joining: { uz: 'Mahallaga qo‘shilmoqda…', uzc: 'Маҳаллага қўшилмоқда…', ru: 'Присоединяемся к махалле…', en: 'Joining the mahalla…' },
  joinFailed: {
    uz: 'Qo‘shilib bo‘lmadi. Havola eskirgan bo‘lishi mumkin.',
    uzc: 'Қўшилиб бўлмади. Ҳавола эскирган бўлиши мумкин.',
    ru: 'Не удалось присоединиться. Возможно, ссылка устарела.',
    en: 'Could not join. The link may be out of date.',
  },
  goHome: { uz: 'Bosh sahifa', uzc: 'Бош саҳифа', ru: 'На главную', en: 'Go home' },
} satisfies Dict
