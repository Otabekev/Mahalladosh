/** Mahalla contacts page strings — the important-numbers list. */

import type { Dict } from './index'

export const contactsStrings = {
  title: { uz: 'Muhim raqamlar', uzc: 'Муҳим рақамлар', ru: 'Важные номера', en: 'Important numbers' },
  subtitle: {
    uz: 'Mahalla uchun kerakli telefon raqamlari',
    uzc: 'Маҳалла учун керакли телефон рақамлари',
    ru: 'Нужные телефоны для махалли',
    en: 'Phone numbers your mahalla needs',
  },
  call: { uz: 'Qo‘ng‘iroq', uzc: 'Қўнғироқ', ru: 'Позвонить', en: 'Call' },
  emptyTitle: { uz: 'Hozircha raqamlar yo‘q', uzc: 'Ҳозирча рақамлар йўқ', ru: 'Пока нет номеров', en: 'No numbers yet' },
  emptyRaisi: {
    uz: 'Raisi sifatida muhim raqamlarni qo‘shing',
    uzc: 'Раиси сифатида муҳим рақамларни қўшинг',
    ru: 'Как раис, добавьте важные номера',
    en: 'As the raisi, add the important numbers',
  },
  add: { uz: 'Raqam qo‘shish', uzc: 'Рақам қўшиш', ru: 'Добавить номер', en: 'Add a number' },
  edit: { uz: 'Tahrirlash', uzc: 'Таҳрирлаш', ru: 'Изменить', en: 'Edit' },
  label: { uz: 'Nomi (masalan, Tez yordam)', uzc: 'Номи (масалан, Тез ёрдам)', ru: 'Название (напр., Скорая)', en: 'Label (e.g. Ambulance)' },
  name: { uz: 'Kim (ixtiyoriy)', uzc: 'Ким (ихтиёрий)', ru: 'Кто (необязательно)', en: 'Who (optional)' },
  phone: { uz: 'Telefon raqami', uzc: 'Телефон рақами', ru: 'Номер телефона', en: 'Phone number' },
  save: { uz: 'Saqlash', uzc: 'Сақлаш', ru: 'Сохранить', en: 'Save' },
  deleteConfirm: {
    uz: 'Bu raqamni o‘chirasizmi?',
    uzc: 'Бу рақамни ўчирасизми?',
    ru: 'Удалить этот номер?',
    en: 'Delete this number?',
  },
  // entry card on the mahalla screen
  openTitle: { uz: 'Muhim raqamlar', uzc: 'Муҳим рақамлар', ru: 'Важные номера', en: 'Important numbers' },
  openHint: {
    uz: 'Raisi, poliklinika, tez yordam',
    uzc: 'Раиси, поликлиника, тез ёрдам',
    ru: 'Раис, поликлиника, скорая',
    en: 'Raisi, clinic, ambulance',
  },
} satisfies Dict
