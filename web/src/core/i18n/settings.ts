/** Strings for the account-basics Settings screen (task #27): edit display name,
 * and the "danger zone" — leave household, leave mahalla, delete account. Copy is
 * deliberately plain and reassuring for elders; every destructive action spells
 * out exactly what will and won't happen. */

import type { Dict } from './index'

export const settingsStrings = {
  // ---------- entry point / title ----------
  title: { uz: 'Sozlamalar', uzc: 'Созламалар', ru: 'Настройки', en: 'Settings' },
  navSettings: { uz: 'Sozlamalar', uzc: 'Созламалар', ru: 'Настройки', en: 'Settings' },
  back: { uz: 'Orqaga', uzc: 'Орқага', ru: 'Назад', en: 'Back' },

  // ---------- edit display name ----------
  nameSectionTitle: { uz: 'Ismingiz', uzc: 'Исмингиз', ru: 'Ваше имя', en: 'Your name' },
  nameLabel: {
    uz: "Ko'rinadigan ism",
    uzc: 'Кўринадиган исм',
    ru: 'Отображаемое имя',
    en: 'Display name',
  },
  namePlaceholder: {
    uz: 'Masalan: Otabek Ergashaliyev',
    uzc: 'Масалан: Отабек Эргашалиев',
    ru: 'Например: Отабек Эргашалиев',
    en: 'e.g. Otabek Ergashaliyev',
  },
  save: { uz: 'Saqlash', uzc: 'Сақлаш', ru: 'Сохранить', en: 'Save' },
  saved: { uz: 'Saqlandi', uzc: 'Сақланди', ru: 'Сохранено', en: 'Saved' },

  // ---------- danger zone ----------
  dangerTitle: { uz: "Ehtiyot bo'ling", uzc: 'Эҳтиёт бўлинг', ru: 'Будьте осторожны', en: 'Careful zone' },
  dangerHint: {
    uz: 'Bu amallar jiddiy. Har birini tasdiqlashingiz kerak.',
    uzc: 'Бу амаллар жиддий. Ҳар бирини тасдиқлашингиз керак.',
    ru: 'Это серьёзные действия. Каждое нужно подтвердить.',
    en: 'These actions are serious. Each one asks you to confirm.',
  },

  // leave household
  leaveHousehold: { uz: 'Xonadondan chiqish', uzc: 'Хонадондан чиқиш', ru: 'Выйти из дома', en: 'Leave household' },
  leaveHouseholdConfirmTitle: {
    uz: 'Xonadondan chiqasizmi?',
    uzc: 'Хонадондан чиқасизми?',
    ru: 'Выйти из дома?',
    en: 'Leave your household?',
  },
  leaveHouseholdBody: {
    uz: "Siz mahallada qolasiz, faqat xonadoningizdan chiqasiz. Agar bu xonadonda boshqa hisob egasi qolmasa, xonadon va uning tarixi o'chiriladi.",
    uzc: 'Сиз маҳаллада қоласиз, фақат хонадонингиздан чиқасиз. Агар бу хонадонда бошқа ҳисоб эгаси қолмаса, хонадон ва унинг тарихи ўчирилади.',
    ru: 'Вы останетесь в махалле, но выйдете из своего дома. Если в доме не останется других владельцев аккаунта, дом и его история будут удалены.',
    en: 'You stay in the mahalla, you only leave your household. If no other account holder remains, the household and its history are deleted.',
  },
  leaveHouseholdConfirm: { uz: 'Ha, chiqaman', uzc: 'Ҳа, чиқаман', ru: 'Да, выйти', en: 'Yes, leave' },

  // leave mahalla
  leaveMahalla: { uz: 'Mahalladan chiqish', uzc: 'Маҳалладан чиқиш', ru: 'Выйти из махалли', en: 'Leave mahalla' },
  leaveMahallaConfirmTitle: {
    uz: 'Mahalladan chiqasizmi?',
    uzc: 'Маҳалладан чиқасизми?',
    ru: 'Выйти из махалли?',
    en: 'Leave your mahalla?',
  },
  leaveMahallaBody: {
    uz: "Siz mahalladan va xonadoningizdan chiqasiz va yangi mahalla tanlash uchun boshiga qaytasiz. Yozgan e'lonlaringiz saqlanib qoladi. Xohlagan vaqt qayta qo'shilishingiz mumkin.",
    uzc: 'Сиз маҳалладан ва хонадонингиздан чиқасиз ва янги маҳалла танлаш учун бошига қайтасиз. Ёзган эълонларингиз сақланиб қолади. Хоҳлаган вақт қайта қўшилишингиз мумкин.',
    ru: 'Вы выйдете из махалли и своего дома и вернётесь к выбору новой махалли. Ваши записи сохранятся. Вы сможете вступить снова в любое время.',
    en: 'You leave the mahalla and your household and go back to choosing a new one. Your posts stay. You can join again any time.',
  },
  leaveMahallaConfirm: { uz: 'Ha, chiqaman', uzc: 'Ҳа, чиқаман', ru: 'Да, выйти', en: 'Yes, leave' },

  // delete account
  deleteAccount: { uz: "Hisobni o'chirish", uzc: 'Ҳисобни ўчириш', ru: 'Удалить аккаунт', en: 'Delete account' },
  deleteAccountConfirmTitle: {
    uz: "Hisobingizni o'chirasizmi?",
    uzc: 'Ҳисобингизни ўчирасизми?',
    ru: 'Удалить ваш аккаунт?',
    en: 'Delete your account?',
  },
  deleteAccountBody: {
    uz: "Ismingiz, rasmingiz va bog'lanishlaringiz o'chiriladi va hisobingizga qayta kira olmaysiz. Mahalla tarixini buzmaslik uchun eski e'lonlaringiz nomsiz holda qoladi. Bu amalni ortga qaytarib bo'lmaydi.",
    uzc: 'Исмингиз, расмингиз ва боғланишларингиз ўчирилади ва ҳисобингизга қайта кира олмайсиз. Маҳалла тарихини бузмаслик учун эски эълонларингиз номсиз ҳолда қолади. Бу амални ортга қайтариб бўлмайди.',
    ru: 'Ваше имя, фото и связи будут удалены, и вы больше не сможете войти в этот аккаунт. Чтобы не разрушать историю махалли, ваши старые записи останутся без имени. Это действие необратимо.',
    en: "Your name, photo and links are removed and you can't sign back into this account. To keep the mahalla's history whole, your old posts stay but without your name. This cannot be undone.",
  },
  deleteAccountConfirm: { uz: "Ha, o'chirish", uzc: 'Ҳа, ўчириш', ru: 'Да, удалить', en: 'Yes, delete' },

  cancel: { uz: 'Bekor qilish', uzc: 'Бекор қилиш', ru: 'Отмена', en: 'Cancel' },
} satisfies Dict
