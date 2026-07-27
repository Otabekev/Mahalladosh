/** Feed strings — feed lenses, post cards, create-post form, and post detail. */

import type { Dict } from './index'

export const feedStrings = {
  // ---------- feed lenses ----------
  tabMahalla: { uz: 'Mahallam', uzc: 'Маҳаллам', ru: 'Моя махалля', en: 'My mahalla' },
  tabRegion: { uz: 'Viloyatim', uzc: 'Вилоятим', ru: 'Моя область', en: 'My region' },
  tabCountry: { uz: "O'zbekiston", uzc: 'Ўзбекистон', ru: 'Узбекистан', en: 'Uzbekistan' },
  allTypes: { uz: 'Hammasi', uzc: 'Ҳаммаси', ru: 'Все', en: 'All' },

  // ---------- "Bugun" digest / composer / help card ----------
  bugunHeading: { uz: 'Bugun', uzc: 'Бугун', ru: 'Сегодня', en: 'Today' },
  bugunHelp: {
    uz: "{n} qo'shni yordam so'rayapti",
    uzc: '{n} қўшни ёрдам сўраяпти',
    ru: '{n} соседей просят помощи',
    en: '{n} neighbors asking for help',
  },
  todayLabel: { uz: 'Bugun', uzc: 'Бугун', ru: 'Сегодня', en: 'Today' },
  tomorrowLabel: { uz: 'Ertaga', uzc: 'Эртага', ru: 'Завтра', en: 'Tomorrow' },
  composerPrompt: {
    uz: "Nima bo'ldi, {name}?",
    uzc: 'Нима бўлди, {name}?',
    ru: 'Что нового, {name}?',
    en: "What's new, {name}?",
  },
  helpRequesting: { uz: "Yordam so'rayapti", uzc: 'Ёрдам сўраяпти', ru: 'Просит помощи', en: 'Asking for help' },
  iWillHelp: { uz: 'Men yordam beraman', uzc: 'Мен ёрдам бераман', ru: 'Я помогу', en: "I'll help" },

  // ---------- status badges ----------
  doneBadge: { uz: 'Bajarildi', uzc: 'Бажарилди', ru: 'Выполнено', en: 'Done' },
  closedBadge: { uz: 'Yopilgan', uzc: 'Ёпилган', ru: 'Закрыто', en: 'Closed' },

  // ---------- empty states ----------
  emptyFeedTitle: { uz: "Hozircha e'lonlar yo'q", uzc: 'Ҳозирча эълонлар йўқ', ru: 'Пока нет записей', en: 'No posts yet' },
  emptyFeedAction: { uz: "Birinchi bo'lib yozing", uzc: 'Биринчи бўлиб ёзинг', ru: 'Напишите первым', en: 'Be the first to write' },
  emptyDiscoverTitle: { uz: "Bu yerda hali post yo'q", uzc: 'Бу ерда ҳали пост йўқ', ru: 'Здесь пока нет постов', en: 'No posts here yet' },
  emptyDiscoverText: { uz: "Birinchi bo'lib ulashing!", uzc: 'Биринчи бўлиб улашинг!', ru: 'Поделитесь первым!', en: 'Be the first to share!' },

  // ---------- create post: type picker ----------
  newPost: { uz: "Yangi e'lon", uzc: 'Янги эълон', ru: 'Новая запись', en: 'New post' },
  createSubtitle: { uz: 'Nima haqida yozmoqchisiz?', uzc: 'Нима ҳақида ёзмоқчисиз?', ru: 'О чём хотите написать?', en: 'What would you like to write about?' },
  shareDesc: {
    uz: "Rasm yoki fikringizni ulashing — butun O'zbekiston ko'rishi mumkin",
    uzc: 'Расм ёки фикрингизни улашинг — бутун Ўзбекистон кўриши мумкин',
    ru: 'Поделитесь фото или мыслями — увидит весь Узбекистан',
    en: 'Share a photo or your thoughts — all of Uzbekistan can see it',
  },
  helpDesc: { uz: "Qo'shnilardan yordam so'rang", uzc: 'Қўшнилардан ёрдам сўранг', ru: 'Попросите помощи у соседей', en: 'Ask neighbors for help' },
  helpPlaceholder: { uz: 'Narvon kerak', uzc: 'Нарвон керак', ru: 'Нужна лестница', en: 'Need a ladder' },
  announcementDesc: { uz: 'Mahallaga xabar bering', uzc: 'Маҳаллага хабар беринг', ru: 'Сообщите махалле новость', en: 'Share news with the mahalla' },
  announcementPlaceholder: { uz: "Ertaga hashar bo'ladi", uzc: 'Эртага ҳашар бўлади', ru: 'Завтра будет хашар', en: 'Hashar tomorrow' },
  charityDesc: { uz: "Xayriya yig'ing yoki e'lon qiling", uzc: 'Хайрия йиғинг ёки эълон қилинг', ru: 'Соберите хайрию или объявите о ней', en: 'Collect or announce charity' },
  charityPlaceholder: { uz: 'Muhtoj oilaga yordam', uzc: 'Муҳтож оилага ёрдам', ru: 'Помощь нуждающейся семье', en: 'Help for a family in need' },
  eventDesc: { uz: "To'y-marosimga taklif qiling", uzc: 'Тўй-маросимга таклиф қилинг', ru: 'Пригласите на той или торжество', en: 'Invite neighbors to a celebration' },
  eventPlaceholder: { uz: "To'yga marhamat", uzc: 'Тўйга марҳамат', ru: 'Добро пожаловать на той', en: 'Welcome to the wedding' },

  // ---------- create post: help categories ----------
  catTool: { uz: 'Asbob-uskuna', uzc: 'Асбоб-ускуна', ru: 'Инструменты', en: 'Tools' },
  catRide: { uz: 'Transport', uzc: 'Транспорт', ru: 'Транспорт', en: 'Transport' },
  catLabor: { uz: 'Mehnat', uzc: 'Меҳнат', ru: 'Физическая помощь', en: 'Labor' },
  catChildcare: { uz: 'Bola qarash', uzc: 'Бола қараш', ru: 'Присмотр за детьми', en: 'Childcare' },
  catOther: { uz: 'Boshqa', uzc: 'Бошқа', ru: 'Другое', en: 'Other' },

  // ---------- create post: form ----------
  sharePlaceholder: { uz: 'Nima yangilik?...', uzc: 'Нима янгилик?...', ru: 'Что нового?..', en: "What's new?..." },
  fieldTitle: { uz: 'Sarlavha', uzc: 'Сарлавҳа', ru: 'Заголовок', en: 'Title' },
  fieldHelpType: { uz: 'Yordam turi', uzc: 'Ёрдам тури', ru: 'Вид помощи', en: 'Help type' },
  fieldDate: { uz: 'Sana', uzc: 'Сана', ru: 'Дата', en: 'Date' },
  fieldGoal: { uz: 'Maqsad', uzc: 'Мақсад', ru: 'Цель', en: 'Goal' },
  goalPlaceholder: { uz: "5 mln so'm", uzc: '5 млн сўм', ru: '5 млн сумов', en: '5 mln soums' },
  fieldDetails: { uz: 'Batafsil (shart emas)', uzc: 'Батафсил (шарт эмас)', ru: 'Подробности (необязательно)', en: 'Details (optional)' },
  detailsPlaceholder: { uz: 'Qisqacha yozing...', uzc: 'Қисқача ёзинг...', ru: 'Напишите коротко...', en: 'Write briefly...' },
  submitPost: { uz: "E'lon qilish", uzc: 'Эълон қилиш', ru: 'Опубликовать', en: 'Publish' },
  shareFootnote: {
    uz: 'Post mahallangiz lentasida va "Kashf" bo\'limida ko\'rinadi — viloyatingiz va butun O\'zbekiston bo\'ylab.',
    uzc: 'Пост маҳаллангиз лентасида ва "Кашф" бўлимида кўринади — вилоятингиз ва бутун Ўзбекистон бўйлаб.',
    ru: 'Пост появится в ленте вашей махалли и в разделе «Kashf» — в вашей области и по всему Узбекистану.',
    en: 'Your post appears in your mahalla feed and in the "Kashf" section — across your region and all of Uzbekistan.',
  },

  // ---------- post detail: status ----------
  resolvedBanner: {
    uz: '🎉 {name} yordam berdi — rahmat! (+10 ball)',
    uzc: '🎉 {name} ёрдам берди — раҳмат! (+10 балл)',
    ru: '🎉 Спасибо, {name}, за помощь! (+10 баллов)',
    en: '🎉 {name} helped — thank you! (+10 points)',
  },

  // ---------- post detail: author controls ----------
  markResolved: { uz: '✓ Bajarildi deb belgilash', uzc: '✓ Бажарилди деб белгилаш', ru: '✓ Отметить как выполненное', en: '✓ Mark as done' },
  finish: { uz: 'Yakunlash', uzc: 'Якунлаш', ru: 'Завершить', en: 'Finish' },

  // ---------- post detail: responses ----------
  responsesHeading: { uz: 'Javoblar ({n})', uzc: 'Жавоблар ({n})', ru: 'Ответы ({n})', en: 'Responses ({n})' },
  noResponsesYet: { uz: "Hali javob yo'q.", uzc: 'Ҳали жавоб йўқ.', ru: 'Пока нет ответов.', en: 'No responses yet.' },
  commentsHeading: { uz: 'Izohlar ({n})', uzc: 'Изоҳлар ({n})', ru: 'Комментарии ({n})', en: 'Comments ({n})' },
  commentPlaceholder: {
    uz: 'Izoh yozing…',
    uzc: 'Изоҳ ёзинг…',
    ru: 'Напишите комментарий…',
    en: 'Write a comment…',
  },
  noCommentsYet: {
    uz: 'Birinchi bo‘lib izoh qoldiring',
    uzc: 'Биринчи бўлиб изоҳ қолдиринг',
    ru: 'Оставьте первый комментарий',
    en: 'Be the first to comment',
  },
  deleteCommentConfirm: {
    uz: 'Bu izohni o‘chirasizmi?',
    uzc: 'Бу изоҳни ўчирасизми?',
    ru: 'Удалить этот комментарий?',
    en: 'Delete this comment?',
  },
  editPost: { uz: 'Tahrirlash', uzc: 'Таҳрирлаш', ru: 'Изменить', en: 'Edit' },
  editPostTitle: { uz: 'E’lonni tahrirlash', uzc: 'Эълонни таҳрирлаш', ru: 'Изменить объявление', en: 'Edit post' },
  titleLabel: { uz: 'Sarlavha', uzc: 'Сарлавҳа', ru: 'Заголовок', en: 'Title' },
  bodyLabel: { uz: 'Matn', uzc: 'Матн', ru: 'Текст', en: 'Text' },
  deletePostConfirm: {
    uz: 'Bu e’lonni o‘chirasizmi? Izohlar ham o‘chadi.',
    uzc: 'Бу эълонни ўчирасизми? Изоҳлар ҳам ўчади.',
    ru: 'Удалить это объявление? Комментарии тоже удалятся.',
    en: 'Delete this post? Its comments go too.',
  },
  respondPlaceholderHelp: { uz: 'Qanday yordam bera olasiz?', uzc: 'Қандай ёрдам бера оласиз?', ru: 'Как вы можете помочь?', en: 'How can you help?' },
  respondPlaceholderNewcomer: { uz: 'Xush kelibsiz deb yozing', uzc: 'Хуш келибсиз деб ёзинг', ru: 'Напишите приветствие', en: 'Write a welcome message' },
  respondPlaceholderEvent: { uz: 'Kelasizmi?', uzc: 'Келасизми?', ru: 'Придёте?', en: 'Will you come?' },
  respondPlaceholderShare: { uz: 'Fikr bildiring...', uzc: 'Фикр билдиринг...', ru: 'Оставьте комментарий...', en: 'Leave a comment...' },
  respondPlaceholderDefault: {
    uz: 'Fikringizni yozing (shart emas)',
    uzc: 'Фикрингизни ёзинг (шарт эмас)',
    ru: 'Напишите своё мнение (необязательно)',
    en: 'Write your thoughts (optional)',
  },
  respondHelp: { uz: '🤝 Yordam beraman', uzc: '🤝 Ёрдам бераман', ru: '🤝 Помогу', en: "🤝 I'll help" },
  respondEvent: { uz: '✅ Qatnashaman', uzc: '✅ Қатнашаман', ru: '✅ Приду', en: "✅ I'll attend" },
  respondNewcomer: { uz: '👋 Xush kelibsiz', uzc: '👋 Хуш келибсиз', ru: '👋 Добро пожаловать', en: '👋 Welcome' },
  respondShare: { uz: 'Yozish', uzc: 'Ёзиш', ru: 'Написать', en: 'Comment' },
  respondDefault: { uz: 'Javob berish', uzc: 'Жавоб бериш', ru: 'Ответить', en: 'Respond' },
  newcomerPoints: { uz: '+5 ball', uzc: '+5 балл', ru: '+5 баллов', en: '+5 points' },

  // ---------- post detail: resolve modal ----------
  resolveTitle: { uz: 'Kim yordam berdi?', uzc: 'Ким ёрдам берди?', ru: 'Кто помог?', en: 'Who helped?' },
  noRespondersYet: { uz: 'Hali hech kim javob bermagan.', uzc: 'Ҳали ҳеч ким жавоб бермаган.', ru: 'Пока никто не откликнулся.', en: 'No one has responded yet.' },
  helperGetsPoints: {
    uz: "Tanlangan qo'shni +10 ball oladi",
    uzc: 'Танланган қўшни +10 балл олади',
    ru: 'Выбранный сосед получит +10 баллов',
    en: 'The chosen neighbor gets +10 points',
  },
  confirm: { uz: 'Tasdiqlash', uzc: 'Тасдиқлаш', ru: 'Подтвердить', en: 'Confirm' },

  // ---------- post detail: reporting ----------
  reportBtn: { uz: 'Shikoyat qilish', uzc: 'Шикоят қилиш', ru: 'Пожаловаться', en: 'Report' },
  reportTitle: { uz: 'Shikoyat qilish', uzc: 'Шикоят қилиш', ru: 'Пожаловаться', en: 'Report' },
  reportReasonHeading: { uz: 'Sabab', uzc: 'Сабаб', ru: 'Причина', en: 'Reason' },
  reasonSpam: {
    uz: 'Spam yoki reklama',
    uzc: 'Спам ёки реклама',
    ru: 'Спам или реклама',
    en: 'Spam or ads',
  },
  reasonAbuse: {
    uz: 'Haqorat yoki tajovuz',
    uzc: 'Ҳақорат ёки тажовуз',
    ru: 'Оскорбление или агрессия',
    en: 'Abuse or harassment',
  },
  reasonFake: {
    uz: 'Soxta yoki aldov',
    uzc: 'Сохта ёки алдов',
    ru: 'Обман или фейк',
    en: 'Fake or scam',
  },
  reasonOther: { uz: 'Boshqa sabab', uzc: 'Бошқа сабаб', ru: 'Другая причина', en: 'Other' },
  reportNoteLabel: {
    uz: 'Izoh (shart emas)',
    uzc: 'Изоҳ (шарт эмас)',
    ru: 'Комментарий (необязательно)',
    en: 'Note (optional)',
  },
  reportNotePh: { uz: 'Qisqacha yozing...', uzc: 'Қисқача ёзинг...', ru: 'Напишите коротко...', en: 'Write briefly...' },
  reportSend: { uz: 'Yuborish', uzc: 'Юбориш', ru: 'Отправить', en: 'Send' },
  reportSent: {
    uz: 'Shikoyatingiz yuborildi. Rahmat.',
    uzc: 'Шикоятингиз юборилди. Раҳмат.',
    ru: 'Жалоба отправлена. Спасибо.',
    en: 'Your report was sent. Thank you.',
  },

  // ---------- charity progress (#15) ----------
  som: { uz: "so'm", uzc: 'сўм', ru: 'сум', en: 'soum' },
  fieldGoalAmount: {
    uz: "Maqsad summasi (so'm)",
    uzc: 'Мақсад суммаси (сўм)',
    ru: 'Сумма цели (сум)',
    en: 'Goal amount (soum)',
  },
  goalAmountHint: {
    uz: "Ixtiyoriy — summani yozsangiz, jarayon chizig'i ko'rinadi",
    uzc: 'Ихтиёрий — суммани ёзсангиз, жараён чизиғи кўринади',
    ru: 'Необязательно — с суммой появится полоса прогресса',
    en: 'Optional — with an amount, a progress bar appears',
  },
  charityOfGoal: {
    uz: '{goal} dan',
    uzc: '{goal} дан',
    ru: 'из {goal}',
    en: 'of {goal}',
  },
  charityReported: {
    uz: 'Yangilandi: {when}',
    uzc: 'Янгиланди: {when}',
    ru: 'Обновлено: {when}',
    en: 'Updated {when}',
  },
  charityNotReported: {
    uz: 'Hali hisobot berilmagan',
    uzc: 'Ҳали ҳисобот берилмаган',
    ru: 'Пока не отчитались',
    en: 'Not reported yet',
  },
  charityReport: {
    uz: 'Yangilash',
    uzc: 'Янгилаш',
    ru: 'Обновить',
    en: 'Update',
  },
  charityReportTitle: {
    uz: "Yig'ilgan summa",
    uzc: 'Йиғилган сумма',
    ru: 'Собранная сумма',
    en: 'Amount collected',
  },
  charityReportHint: {
    uz: "Faqat siz o'zgartira olasiz. Qachon yangilanganini hamma ko'radi.",
    uzc: 'Фақат сиз ўзгартира оласиз. Қачон янгиланганини ҳамма кўради.',
    ru: 'Менять можете только вы. Все видят, когда обновлено.',
    en: 'Only you can change it. Everyone sees when it was updated.',
  },
  charityCollected: {
    uz: "Hozirgacha yig'ildi",
    uzc: 'Ҳозиргача йиғилди',
    ru: 'Собрано на сейчас',
    en: 'Collected so far',
  },

  // ---------- quick polls (#16) ----------
  pollDesc: {
    uz: "Qisqa so'rovnoma — bir teginish",
    uzc: 'Қисқа сўровнома — бир тегиниш',
    ru: 'Быстрый опрос — одно касание',
    en: 'A quick poll — one tap',
  },
  pollPlaceholder: {
    uz: 'Qaysi kuni hashar qilamiz?',
    uzc: 'Қайси куни ҳашар қиламиз?',
    ru: 'В какой день сделаем хашар?',
    en: 'Which day shall we do the hashar?',
  },
  pollOptionsLabel: { uz: 'Variantlar', uzc: 'Вариантлар', ru: 'Варианты', en: 'Options' },
  pollOptionPlaceholder: {
    uz: 'Variant {n}',
    uzc: 'Вариант {n}',
    ru: 'Вариант {n}',
    en: 'Option {n}',
  },
  pollAddOption: {
    uz: "Variant qo'shish",
    uzc: 'Вариант қўшиш',
    ru: 'Добавить вариант',
    en: 'Add option',
  },
  pollNeedsTwo: {
    uz: 'Kamida 2 ta variant kiriting',
    uzc: 'Камида 2 та вариант киритинг',
    ru: 'Нужно минимум 2 варианта',
    en: 'Add at least 2 options',
  },
  pollVotes: {
    uz: '{n} ta ovoz',
    uzc: '{n} та овоз',
    ru: 'Голосов: {n}',
    en: '{n} votes',
  },
  pollNoVotes: {
    uz: 'Hali hech kim ovoz bermadi',
    uzc: 'Ҳали ҳеч ким овоз бермади',
    ru: 'Пока никто не голосовал',
    en: 'No votes yet',
  },
  pollTapToVote: {
    uz: 'Tanlang',
    uzc: 'Танланг',
    ru: 'Выберите',
    en: 'Choose',
  },
  pollClosed: {
    uz: "So'rovnoma yopilgan",
    uzc: 'Сўровнома ёпилган',
    ru: 'Опрос закрыт',
    en: 'This poll is closed',
  },

  // ---------- paging (#19) ----------
  showMore: {
    uz: "Yana ko'rsatish",
    uzc: 'Яна кўрсатиш',
    ru: 'Показать ещё',
    en: 'Show more',
  },
  feedEnd: {
    uz: 'Hammasi shu',
    uzc: 'Ҳаммаси шу',
    ru: 'Это всё',
    en: "That's everything",
  },
} satisfies Dict
