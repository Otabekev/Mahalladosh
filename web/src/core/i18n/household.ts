/** Household (xonadon) screens — create form, members, family history,
 * privacy, vouching and the DingDong virtual doorbell. */

import type { Dict } from './index'

export const householdStrings = {
  // page / header
  title: { uz: 'Xonadoningiz', uzc: 'Хонадонингиз', ru: 'Ваш дом', en: 'Your household' },
  householdOf: {
    uz: '{name} xonadoni',
    uzc: '{name} хонадони',
    ru: 'Дом семьи {name}',
    en: '{name} household',
  },
  nPeople: { uz: '{n} kishi', uzc: '{n} киши', ru: '{n} чел.', en: '{n} people' },
  backToMahalla: { uz: '← Mahalla', uzc: '← Маҳалла', ru: '← Махалля', en: '← Mahalla' },

  // create form
  createIntro: {
    uz: "Xonadoningizni yarating — faqat familiya va nechta kishi yashashini kiriting. Qolganini xohlasangiz keyin to'ldirasiz.",
    uzc: 'Хонадонингизни яратинг — фақат фамилия ва нечта киши яшашини киритинг. Қолганини хоҳласангиз кейин тўлдирасиз.',
    ru: 'Создайте страницу своего дома — укажите только фамилию и сколько человек живёт. Остальное можно заполнить позже.',
    en: 'Create your household — just enter your family name and how many people live there. You can fill in the rest later.',
  },
  familyNameLabel: { uz: 'Oila familiyasi', uzc: 'Оила фамилияси', ru: 'Фамилия семьи', en: 'Family name' },
  familyNamePlaceholder: { uz: 'Rustamovlar', uzc: 'Рустамовлар', ru: 'Рустамовы', en: 'Rustamovs' },
  residentsLabel: {
    uz: 'Nechta kishi yashaydi?',
    uzc: 'Нечта киши яшайди?',
    ru: 'Сколько человек живёт?',
    en: 'How many people live there?',
  },
  streetLabel: { uz: "Ko'cha (shart emas)", uzc: 'Кўча (шарт эмас)', ru: 'Улица (необязательно)', en: 'Street (optional)' },
  streetPlaceholder: { uz: "Guliston ko'chasi", uzc: 'Гулистон кўчаси', ru: 'улица Гулистон', en: 'Guliston street' },
  create: { uz: 'Yaratish', uzc: 'Яратиш', ru: 'Создать', en: 'Create' },
  createAnnounceNote: {
    uz: "Mahalla lentasida qo'shnilarga e'lon qilinadi 👋",
    uzc: 'Маҳалла лентасида қўшниларга эълон қилинади 👋',
    ru: 'Соседи увидят объявление в ленте махалли 👋',
    en: 'Neighbors will see an announcement in the mahalla feed 👋',
  },

  // verification / vouching
  verifiedBadge: {
    uz: "✓ Qo'shnilar tasdiqlagan",
    uzc: '✓ Қўшнилар тасдиқлаган',
    ru: '✓ Подтверждено соседями',
    en: '✓ Verified by neighbors',
  },
  awaitingVouch: {
    uz: 'Kafolat kutilmoqda ({n}/2)',
    uzc: 'Кафолат кутилмоқда ({n}/2)',
    ru: 'Ожидает поручительства ({n}/2)',
    en: 'Awaiting vouches ({n}/2)',
  },
  vouchHint: {
    uz: "Qo'shnilaringiz sahifangizga kirib kafolat berishi mumkin.",
    uzc: 'Қўшниларингиз саҳифангизга кириб кафолат бериши мумкин.',
    ru: 'Соседи могут зайти на вашу страницу и поручиться за вас.',
    en: 'Neighbors can visit your page and vouch for you.',
  },
  youVouched: { uz: '✓ Siz kafolat bergansiz', uzc: '✓ Сиз кафолат бергансиз', ru: '✓ Вы поручились', en: '✓ You vouched' },
  vouchQuestion: {
    uz: 'Bu oila haqiqatan mahallangizda yashaydimi?',
    uzc: 'Бу оила ҳақиқатан маҳаллангизда яшайдими?',
    ru: 'Эта семья действительно живёт в вашей махалле?',
    en: 'Does this family really live in your mahalla?',
  },
  vouchButton: { uz: '🤝 Kafolat beraman', uzc: '🤝 Кафолат бераман', ru: '🤝 Поручиться', en: '🤝 I vouch for them' },
  vouchExplain: {
    uz: "Kafolat — qo'shnichilik ishonchi. {n}/2 to'planganda oila tasdiqlanadi.",
    uzc: 'Кафолат — қўшничилик ишончи. {n}/2 тўпланганда оила тасдиқланади.',
    ru: 'Поручительство — знак соседского доверия. При {n}/2 семья будет подтверждена.',
    en: 'A vouch is a sign of neighborly trust. At {n}/2 the family is verified.',
  },

  // DingDong — my household (set location)
  dingdongTitle: {
    uz: "🔔 Eshik qo'ng'irog'i (DingDong)",
    uzc: '🔔 Эшик қўнғироғи (DingDong)',
    ru: '🔔 Дверной звонок (DingDong)',
    en: '🔔 Doorbell (DingDong)',
  },
  locationFail: {
    uz: "Joylashuvni belgilab bo'lmadi",
    uzc: 'Жойлашувни белгилаб бўлмади',
    ru: 'Не удалось отметить расположение',
    en: "Couldn't set the location",
  },
  locationSet: {
    uz: '✓ Uy joylashuvi belgilangan',
    uzc: '✓ Уй жойлашуви белгиланган',
    ru: '✓ Расположение дома отмечено',
    en: '✓ House location set',
  },
  setAgain: { uz: 'Qayta belgilash', uzc: 'Қайта белгилаш', ru: 'Отметить заново', en: 'Set again' },
  setLocationExplain: {
    uz: "Uyingiz oldida turib joylashuvni belgilang — shunda qo'shnilar eshik qo'ng'irog'ingizni chala oladi.",
    uzc: 'Уйингиз олдида туриб жойлашувни белгиланг — шунда қўшнилар эшик қўнғироғингизни чала олади.',
    ru: 'Отметьте расположение, стоя у своего дома — тогда соседи смогут позвонить в ваш дверной звонок.',
    en: 'Mark your location while standing at your house — then neighbors can ring your doorbell.',
  },
  markHere: {
    uz: '📍 Shu yerda deb belgilash',
    uzc: '📍 Шу ерда деб белгилаш',
    ru: '📍 Отметить это место',
    en: '📍 Mark this spot',
  },
  locationPrivacyNote: {
    uz: "Koordinatalar hech kimga ko'rsatilmaydi — faqat qo'ng'iroq masofasini tekshirish uchun.",
    uzc: 'Координаталар ҳеч кимга кўрсатилмайди — фақат қўнғироқ масофасини текшириш учун.',
    ru: 'Координаты никому не показываются — они нужны только для проверки расстояния при звонке.',
    en: 'Coordinates are never shown to anyone — they are only used to check the ringing distance.',
  },

  // DingDong — neighbor's household (ring)
  noBell: {
    uz: "🔔 Bu xonadon hali eshik qo'ng'irog'ini yoqmagan",
    uzc: '🔔 Бу хонадон ҳали эшик қўнғироғини ёқмаган',
    ru: '🔔 Этот дом ещё не включил дверной звонок',
    en: "🔔 This household hasn't set up its doorbell yet",
  },
  ringFail: { uz: "Qo'ng'iroq chalinmadi", uzc: 'Қўнғироқ чалинмади', ru: 'Звонок не прошёл', en: "The bell didn't ring" },
  ringButton: {
    uz: "🔔 Eshik qo'ng'irog'ini chalish",
    uzc: '🔔 Эшик қўнғироғини чалиш',
    ru: '🔔 Позвонить в дверь',
    en: '🔔 Ring the doorbell',
  },
  ringExplain: {
    uz: "Faqat eshik oldida turganingizda ishlaydi — GPS tekshiriladi. Xonadon telefonida qo'ng'iroq jiringlaydi.",
    uzc: 'Фақат эшик олдида турганингизда ишлайди — GPS текширилади. Хонадон телефонида қўнғироқ жиринглайди.',
    ru: 'Работает, только когда вы стоите у двери — GPS проверяется. На телефоне хозяев прозвенит звонок.',
    en: "Works only when you're standing at the door — GPS is checked. The household's phone will ring.",
  },

  // members
  membersTitle: { uz: "Oila a'zolari", uzc: 'Оила аъзолари', ru: 'Члены семьи', en: 'Family members' },
  noMembers: { uz: "Hali a'zo qo'shilmagan.", uzc: 'Ҳали аъзо қўшилмаган.', ru: 'Пока никто не добавлен.', en: 'No members added yet.' },
  elderBadge: { uz: 'Otaxon/Onaxon', uzc: 'Отахон/Онахон', ru: 'Аксакал', en: 'Elder' },
  confirmRemove: { uz: "O'chirilsinmi?", uzc: 'Ўчирилсинми?', ru: 'Удалить?', en: 'Remove?' },
  memberNamePlaceholder: { uz: 'Ismi va familiyasi', uzc: 'Исми ва фамилияси', ru: 'Имя и фамилия', en: 'Full name' },
  elderCheckbox: {
    uz: 'Keksa avlod vakili',
    uzc: 'Кекса авлод вакили',
    ru: 'Представитель старшего поколения',
    en: 'Elder (older generation)',
  },
  addMember: { uz: "+ A'zo qo'shish", uzc: '+ Аъзо қўшиш', ru: '+ Добавить члена семьи', en: '+ Add member' },
  membersHint: {
    uz: "Telefoni yo'q keksalarni ham yozing — ular ham mahalla xotirasining bir qismi.",
    uzc: 'Телефони йўқ кексаларни ҳам ёзинг — улар ҳам маҳалла хотирасининг бир қисми.',
    ru: 'Впишите и пожилых без телефона — они тоже часть памяти махалли.',
    en: "Add elders without phones too — they are part of the mahalla's memory.",
  },

  // family history
  historyTitle: { uz: '📖 Oila tarixi', uzc: '📖 Оила тарихи', ru: '📖 История семьи', en: '📖 Family history' },
  historyEncourage: {
    uz: 'Keksalar xotirasi — mahallaning boyligi. Yozib qoldiring (+15 ball).',
    uzc: 'Кексалар хотираси — маҳалланинг бойлиги. Ёзиб қолдиринг (+15 балл).',
    ru: 'Память старших — богатство махалли. Запишите её (+15 баллов).',
    en: "Elders' memories are the mahalla's treasure. Write them down (+15 points).",
  },
  generationsLabel: {
    uz: 'Necha avloddan beri shu yerda yashaysiz?',
    uzc: 'Неча авлоддан бери шу ерда яшайсиз?',
    ru: 'Сколько поколений вы здесь живёте?',
    en: 'How many generations have you lived here?',
  },
  historyLabel: { uz: 'Tarix', uzc: 'Тарих', ru: 'История', en: 'History' },
  historyPlaceholder: {
    uz: "Bobolaringiz qachon kelgan? Ko'chada kimlar yashagan? Keksalardan so'rab yozing...",
    uzc: 'Боболарингиз қачон келган? Кўчада кимлар яшаган? Кексалардан сўраб ёзинг...',
    ru: 'Когда приехали ваши деды? Кто жил на этой улице? Расспросите старших и запишите...',
    en: 'When did your grandparents arrive? Who lived on this street? Ask your elders and write it down...',
  },
  saved: { uz: '✓ Saqlandi', uzc: '✓ Сақланди', ru: '✓ Сохранено', en: '✓ Saved' },
  generationsHere: {
    uz: '🏠 {n} avloddan beri shu mahallada',
    uzc: '🏠 {n} авлоддан бери шу маҳаллада',
    ru: '🏠 В этой махалле — уже {n}-е поколение',
    en: '🏠 In this mahalla for {n} generations',
  },

  // privacy
  privacyLabel: { uz: "Kim ko'ra oladi?", uzc: 'Ким кўра олади?', ru: 'Кто может видеть?', en: 'Who can see this?' },
  visNeighbors: {
    uz: "Tasdiqlangan qo'shnilar",
    uzc: 'Тасдиқланган қўшнилар',
    ru: 'Подтверждённые соседи',
    en: 'Verified neighbors',
  },
  visFamily: { uz: 'Faqat oilamiz', uzc: 'Фақат оиламиз', ru: 'Только наша семья', en: 'Family only' },
  privacyFooter: {
    uz: "Ma'lumotlaringiz faqat mahalla ichida. Hech qanday davlat tizimiga berilmaydi.",
    uzc: 'Маълумотларингиз фақат маҳалла ичида. Ҳеч қандай давлат тизимига берилмайди.',
    ru: 'Ваши данные остаются внутри махалли и не передаются ни в какие государственные системы.',
    en: 'Your information stays within the mahalla. It is never shared with any government system.',
  },

  // detail screen
  emptyFamily: {
    uz: "Bu oila hali o'z hikoyasini yozmagan",
    uzc: 'Бу оила ҳали ўз ҳикоясини ёзмаган',
    ru: 'Эта семья ещё не рассказала свою историю',
    en: "This family hasn't shared their story yet",
  },

  // ---- read-mode redesign (family album) ----
  heroBack: { uz: 'Orqaga', uzc: 'Орқага', ru: 'Назад', en: 'Back' },
  notificationsAria: { uz: 'Bildirishnomalar', uzc: 'Билдиришномалар', ru: 'Уведомления', en: 'Notifications' },
  editButton: { uz: 'Tahrirlash', uzc: 'Таҳрирлаш', ru: 'Редактировать', en: 'Edit' },
  doneEditing: { uz: 'Tayyor', uzc: 'Тайёр', ru: 'Готово', en: 'Done' },
  editTitle: {
    uz: 'Xonadonni tahrirlash',
    uzc: 'Хонадонни таҳрирлаш',
    ru: 'Редактирование дома',
    en: 'Edit household',
  },
  basicsTitle: { uz: "Oila ma'lumotlari", uzc: 'Оила маълумотлари', ru: 'Данные семьи', en: 'Family details' },

  // "N avloddan beri shu ko'chada" stat card
  genStatLine: {
    uz: "avloddan beri shu ko'chada",
    uzc: 'авлоддан бери шу кўчада',
    ru: 'поколения на этой улице',
    en: 'generations on this street',
  },
  // subtle English gloss under the localized line (shown only for non-English)
  genStatGloss: {
    uz: '{n} generations on this street',
    uzc: '{n} generations on this street',
    ru: '{n} generations on this street',
    en: '{n} generations on this street',
  },

  // family album strip
  albumTitle: { uz: 'Oila albomi', uzc: 'Оила альбоми', ru: 'Семейный альбом', en: 'Family album' },
  albumSoon: { uz: 'Tez orada', uzc: 'Тез орада', ru: 'Скоро', en: 'Coming soon' },

  // "Bizning tariximiz" read-mode prose
  ourHistory: { uz: 'Bizning tariximiz', uzc: 'Бизнинг тарихимиз', ru: 'Наша история', en: 'Our story' },
  vouchedPill: {
    uz: "Qo'shnilar tasdiqlagan",
    uzc: 'Қўшнилар тасдиқлаган',
    ru: 'Подтверждено соседями',
    en: 'Verified by neighbors',
  },
  historyReadEmpty: {
    uz: "Oilangiz hikoyasi hali yozilmagan. Yuqoridagi qalam belgisini bosib, uni yozib qoldiring.",
    uzc: 'Оилангиз ҳикояси ҳали ёзилмаган. Юқоридаги қалам белгисини босиб, уни ёзиб қолдиринг.',
    ru: 'История вашей семьи ещё не записана. Нажмите на карандаш вверху и расскажите её.',
    en: "Your family story isn't written yet. Tap the pencil above to share it.",
  },

  // ---- join / claim / stewardship ----
  joinRequestsTitle: {
    uz: "Qo'shilish so'rovlari",
    uzc: 'Қўшилиш сўровлари',
    ru: 'Заявки на вступление',
    en: 'Join requests',
  },
  wantsToJoin: {
    uz: "oilangizga qo'shilmoqchi",
    uzc: 'оилангизга қўшилмоқчи',
    ru: 'хочет вступить в вашу семью',
    en: 'wants to join your family',
  },
  claimsToBe: {
    // rendered after the quoted name: «Alisher» {claimsToBe}
    uz: 'ekanini aytmoqda',
    uzc: 'эканини айтмоқда',
    ru: '— так они представились',
    en: 'or so they claim',
  },
  approve: { uz: 'Tasdiqlash', uzc: 'Тасдиқлаш', ru: 'Принять', en: 'Approve' },
  decline: { uz: 'Rad etish', uzc: 'Рад этиш', ru: 'Отклонить', en: 'Decline' },
  joinIntro: {
    uz: "Bu oilaning a'zosimisiz? Ular sizni tasdiqlashi uchun so'rov yuboring.",
    uzc: 'Бу оиланинг аъзосимисиз? Улар сизни тасдиқлаши учун сўров юборинг.',
    ru: 'Вы член этой семьи? Отправьте запрос, чтобы они вас подтвердили.',
    en: 'Are you part of this family? Send a request for them to confirm you.',
  },
  joinButton: {
    uz: "Bu oilaga qo'shilish",
    uzc: 'Бу оилага қўшилиш',
    ru: 'Вступить в эту семью',
    en: 'Join this family',
  },
  joinPending: { uz: "So'rov yuborildi", uzc: 'Сўров юборилди', ru: 'Запрос отправлен', en: 'Request sent' },
  joinPendingHint: {
    uz: "Oila a'zolari tasdiqlashini kuting.",
    uzc: 'Оила аъзолари тасдиқлашини кутинг.',
    ru: 'Подождите, пока члены семьи подтвердят.',
    en: 'Wait for the family to confirm.',
  },
  claimButton: {
    uz: "Men shu oila a'zosiman",
    uzc: 'Мен шу оила аъзосиман',
    ru: 'Я член этой семьи',
    en: "I'm a member of this family",
  },
  claimPick: {
    uz: "Ro'yxatdan o'zingizni tanlang",
    uzc: 'Рўйхатдан ўзингизни танланг',
    ru: 'Выберите себя из списка',
    en: 'Pick yourself from the list',
  },
} satisfies Dict
