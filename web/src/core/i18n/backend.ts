/** Backend error translations. The API returns Uzbek-Latin detail strings
 * (single source of truth); this map localizes them client-side. Unknown
 * messages pass through untranslated. Keep in sync when adding backend errors. */

import { useLang, type Lang } from './index'

const MAP: Record<string, { uzc: string; ru: string; en: string }> = {
  "A'zo topilmadi": { uzc: 'Аъзо топилмади', ru: 'Участник не найден', en: 'Member not found' },
  'Admin huquqi kerak': { uzc: 'Админ ҳуқуқи керак', ru: 'Нужны права администратора', en: 'Admin rights required' },
  "Avval mahallaga qo'shiling": { uzc: 'Аввал маҳаллага қўшилинг', ru: 'Сначала вступите в махаллю', en: 'Join a mahalla first' },
  'Avval xonadoningizni yarating': { uzc: 'Аввал хонадонингизни яратинг', ru: 'Сначала создайте свой дом', en: 'Create your household first' },
  'Bu MFY allaqachon mavjud': { uzc: 'Бу МФЙ аллақачон мавжуд', ru: 'Эта махалля уже существует', en: 'This MFY already exists' },
  "Bu e'lon yopilgan": { uzc: 'Бу эълон ёпилган', ru: 'Эта запись закрыта', en: 'This post is closed' },
  "Bu foydalanuvchi mahallangiz a'zosi emas": { uzc: 'Бу фойдаланувчи маҳаллангиз аъзоси эмас', ru: 'Этот пользователь не из вашей махалли', en: 'This user is not in your mahalla' },
  'Bu mahalla hali ochilmagan': { uzc: 'Бу маҳалла ҳали очилмаган', ru: 'Эта махалля ещё не открыта', en: 'This mahalla is not open yet' },
  "Bu mahallaga ariza berib bo'lmaydi": { uzc: 'Бу маҳаллага ариза бериб бўлмайди', ru: 'В эту махаллю нельзя подать заявку', en: "You can't petition this mahalla" },
  "Bu o'z eshigingiz 🙂": { uzc: 'Бу ўз эшигингиз 🙂', ru: 'Это ваша собственная дверь 🙂', en: "That's your own door 🙂" },
  'Bu odam javob bermagan': { uzc: 'Бу одам жавоб бермаган', ru: 'Этот человек не откликался', en: "This person didn't respond" },
  "Bu sizning e'loningiz": { uzc: 'Бу сизнинг эълонингиз', ru: 'Это ваша запись', en: 'This is your own post' },
  'Bu xizmat sizning xonadoningizga tegishli emas': { uzc: 'Бу хизмат сизнинг хонадонингизга тегишли эмас', ru: 'Эта услуга не вашего дома', en: "This service isn't your household's" },
  'Bu xonadon sizning mahallangizda emas': { uzc: 'Бу хонадон сизнинг маҳаллангизда эмас', ru: 'Этот дом не в вашей махалле', en: 'This household is not in your mahalla' },
  'Bu xonadon uy joylashuvini hali belgilamagan': { uzc: 'Бу хонадон уй жойлашувини ҳали белгиламаган', ru: 'Этот дом ещё не отметил расположение', en: "This household hasn't set its location yet" },
  "Bu xonadonda hisob egasi yo'q": { uzc: 'Бу хонадонда ҳисоб эгаси йўқ', ru: 'В этом доме нет владельца аккаунта', en: 'No account holder in this household' },
  "E'lon topilmadi": { uzc: 'Эълон топилмади', ru: 'Запись не найдена', en: 'Post not found' },
  "Faqat e'lon egasi": { uzc: 'Фақат эълон эгаси', ru: 'Только автор записи', en: 'Only the post author' },
  "Faqat o'z mahallangizni ko'ra olasiz": { uzc: 'Фақат ўз маҳаллангизни кўра оласиз', ru: 'Можно смотреть только свою махаллю', en: 'You can only view your own mahalla' },
  "Faqat o'z xonadoningizni tahrirlaysiz": { uzc: 'Фақат ўз хонадонингизни таҳрирлайсиз', ru: 'Можно изменять только свой дом', en: 'You can only edit your own household' },
  'Fayl rasm emas': { uzc: 'Файл расм эмас', ru: 'Файл не является фото', en: 'File is not an image' },
  'Foydalanuvchi topilmadi': { uzc: 'Фойдаланувчи топилмади', ru: 'Пользователь не найден', en: 'User not found' },
  'Hozir ovoz berish bosqichi emas': { uzc: 'Ҳозир овоз бериш босқичи эмас', ru: 'Сейчас не этап голосования', en: 'Voting is not open now' },
  'Kim yordam berganini tanlang': { uzc: 'Ким ёрдам берганини танланг', ru: 'Выберите, кто помог', en: 'Select who helped' },
  'Kirish talab qilinadi': { uzc: 'Кириш талаб қилинади', ru: 'Требуется вход', en: 'Login required' },
  'Mahalla tasdiqlashni kutmayapti': { uzc: 'Маҳалла тасдиқлашни кутмаяпти', ru: 'Махалля не ожидает подтверждения', en: 'Mahalla is not awaiting approval' },
  'Mahalla topilmadi': { uzc: 'Маҳалла топилмади', ru: 'Махалля не найдена', en: 'Mahalla not found' },
  "Matn yoki rasm qo'shing": { uzc: 'Матн ёки расм қўшинг', ru: 'Добавьте текст или фото', en: 'Add text or a photo' },
  "Nishon foydalanuvchi ko'rsatilishi kerak": { uzc: 'Нишон фойдаланувчи кўрсатилиши керак', ru: 'Нужно указать пользователя', en: 'Target user must be specified' },
  "O'z taklifingizni qo'llab-quvvatlay olmaysiz": { uzc: 'Ўз таклифингизни қўллаб-қувватлай олмайсиз', ru: 'Нельзя поддержать своё предложение', en: "You can't second your own proposal" },
  "O'z xonadoningizga kafolat bera olmaysiz": { uzc: 'Ўз хонадонингизга кафолат бера олмайсиз', ru: 'Нельзя поручиться за свой дом', en: "You can't vouch for your own household" },
  "O'zingizni chetlata olmaysiz": { uzc: 'Ўзингизни четлата олмайсиз', ru: 'Нельзя исключить самого себя', en: "You can't ban yourself" },
  "Qo'llab-quvvatlash bosqichi tugagan": { uzc: 'Қўллаб-қувватлаш босқичи тугаган', ru: 'Этап поддержки завершён', en: 'Seconding stage is over' },
  "Qo'ng'iroq chalinmadi — eshik oldida turganingizda qayta urinib ko'ring": { uzc: 'Қўнғироқ чалинмади — эшик олдида турганингизда қайта уриниб кўринг', ru: 'Звонок не прошёл — попробуйте, стоя у двери', en: "The bell didn't ring — try again at the door" },
  "Qo'ng'iroq yaqinda chalingan — biroz kuting": { uzc: 'Қўнғироқ яқинда чалинган — бироз кутинг', ru: 'Звонок был недавно — подождите немного', en: 'The bell rang recently — wait a bit' },
  'Rasm avval yuklanishi kerak': { uzc: 'Расм аввал юкланиши керак', ru: 'Фото нужно сначала загрузить', en: 'Image must be uploaded first' },
  'Rasm juda katta (maks. 6 MB)': { uzc: 'Расм жуда катта (макс. 6 МБ)', ru: 'Фото слишком большое (макс. 6 МБ)', en: 'Image too large (max 6 MB)' },
  "Rasm o'lchami juda katta": { uzc: 'Расм ўлчами жуда катта', ru: 'Размер фото слишком большой', en: 'Image dimensions too large' },
  'Sanani kiriting': { uzc: 'Санани киритинг', ru: 'Укажите дату', en: 'Enter a date' },
  'Sarlavha kiriting': { uzc: 'Сарлавҳа киритинг', ru: 'Введите заголовок', en: 'Enter a title' },
  'Sessiya eskirgan': { uzc: 'Сессия эскирган', ru: 'Сессия устарела', en: 'Session expired' },
  'Siz allaqachon javob bergansiz': { uzc: 'Сиз аллақачон жавоб бергансиз', ru: 'Вы уже откликнулись', en: 'You already responded' },
  'Siz allaqachon kafolat bergansiz': { uzc: 'Сиз аллақачон кафолат бергансиз', ru: 'Вы уже поручились', en: 'You already vouched' },
  "Siz allaqachon mahalla a'zosisiz": { uzc: 'Сиз аллақачон маҳалла аъзосисиз', ru: 'Вы уже состоите в махалле', en: "You're already in a mahalla" },
  "Siz allaqachon qo'llab-quvvatlagansiz": { uzc: 'Сиз аллақачон қўллаб-қувватлагансиз', ru: 'Вы уже поддержали', en: 'You already seconded' },
  "Siz bu mahalla a'zosi emassiz": { uzc: 'Сиз бу маҳалла аъзоси эмассиз', ru: 'Вы не участник этой махалли', en: "You're not a member of this mahalla" },
  'Siz ovoz bergansiz': { uzc: 'Сиз овоз бергансиз', ru: 'Вы уже проголосовали', en: 'You already voted' },
  'Siz vaqtincha chetlatilgansiz': { uzc: 'Сиз вақтинча четлатилгансиз', ru: 'Вы временно отстранены', en: 'You are temporarily suspended' },
  'Sizda allaqachon faol taklif bor': { uzc: 'Сизда аллақачон фаол таклиф бор', ru: 'У вас уже есть активное предложение', en: 'You already have an active proposal' },
  'Sizda allaqachon xonadon bor': { uzc: 'Сизда аллақачон хонадон бор', ru: 'У вас уже есть дом', en: 'You already have a household' },
  'Taklif topilmadi': { uzc: 'Таклиф топилмади', ru: 'Предложение не найдено', en: 'Proposal not found' },
  'Telegram tekshiruvi muvaffaqiyatsiz': { uzc: 'Телеграм текшируви муваффақиятсиз', ru: 'Проверка Telegram не прошла', en: 'Telegram verification failed' },
  'Tuman topilmadi': { uzc: 'Туман топилмади', ru: 'Район не найден', en: 'District not found' },
  'Xizmat topilmadi': { uzc: 'Хизмат топилмади', ru: 'Услуга не найдена', en: 'Service not found' },
  'Xonadon topilmadi': { uzc: 'Хонадон топилмади', ru: 'Дом не найден', en: 'Household not found' },
  "Yangi qo'shni e'loni avtomatik yaratiladi": { uzc: 'Янги қўшни эълони автоматик яратилади', ru: 'Запись о новом соседе создаётся автоматически', en: 'Newcomer posts are created automatically' },
  'Yordam turini tanlang': { uzc: 'Ёрдам турини танланг', ru: 'Выберите вид помощи', en: 'Select help type' },
}

/** Localize a backend error message; unknown strings pass through. */
export function translateBackend(message: string, lang?: Lang): string {
  const l = lang ?? useLang.getState().lang
  if (l === 'uz') return message
  const entry = MAP[message]
  if (!entry) return message
  return entry[l as 'uzc' | 'ru' | 'en'] ?? message
}
