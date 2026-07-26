/** PWA install banner strings — the elder-guided "add to home screen" nudge. */

import type { Dict } from './index'

export const installStrings = {
  title: {
    uz: 'Mahalladosh ilovasini o‘rnating',
    uzc: 'Маҳалладош иловасини ўрнатинг',
    ru: 'Установите приложение Mahalladosh',
    en: 'Install the Mahalladosh app',
  },
  subtitle: {
    uz: 'Telefoningiz ekranida turadi, tezroq ochiladi',
    uzc: 'Телефонингиз экранида туради, тезроқ очилади',
    ru: 'Появится на экране телефона и будет открываться быстрее',
    en: 'It sits on your home screen and opens faster',
  },
  install: { uz: 'O‘rnatish', uzc: 'Ўрнатиш', ru: 'Установить', en: 'Install' },
  later: { uz: 'Keyinroq', uzc: 'Кейинроқ', ru: 'Позже', en: 'Later' },
  // iOS Safari has no install button — the user adds it by hand from the Share menu.
  iosHint: {
    uz: 'Pastdagi «Ulashish» tugmasini bosing, so‘ng «Bosh ekranga qo‘shish»ni tanlang',
    uzc: 'Пастдаги «Улашиш» тугмасини босинг, сўнг «Бош экранга қўшиш»ни танланг',
    ru: 'Нажмите «Поделиться» внизу, затем «На экран „Домой“»',
    en: 'Tap the Share button below, then “Add to Home Screen”',
  },
} satisfies Dict
