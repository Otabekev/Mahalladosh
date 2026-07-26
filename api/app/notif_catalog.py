"""The one catalog of notification copy, in all four languages.

Notifications used to be stored as pre-rendered Uzbek text, which meant a Russian
speaker saw Uzbek and a fixed typo stayed wrong in every row already sent. They are
now stored structurally — an `event` key plus a `params` dict — and rendered at the
moment they are read, in the reader's own language.

This catalog lives on the backend rather than the frontend because it has two
consumers: the in-app list *and* the Telegram DM sender, which composes messages
server-side with no browser involved. A mirrored frontend copy would drift the first
time someone edited one side, and drift here means a neighbour silently gets the wrong
words. One catalog, two delivery paths.

Adding an event: add it to CATALOG with all four languages and the same placeholders
in each. `test_notifications.py` walks this table and fails if a language is missing
or if its placeholders disagree with the Uzbek original — so a half-translated event
cannot reach a user.
"""

import re

LANGS = ("uz", "uzc", "ru", "en")
DEFAULT_LANG = "uz"

# event key -> {lang: template}. Placeholders are {name}-style and must match across
# the four languages of a given event.
CATALOG: dict[str, dict[str, str]] = {
    # ---------- mahalla lifecycle ----------
    "mahalla_opened": {
        "uz": "🎉 {mahalla} mahallasi ochildi! Siz asoschilardansiz (+20 ball)",
        "uzc": "🎉 {mahalla} маҳалласи очилди! Сиз асосчилардансиз (+20 балл)",
        "ru": "🎉 Махалля {mahalla} открыта! Вы один из основателей (+20 баллов)",
        "en": "🎉 {mahalla} mahalla is now open! You are a founder (+20 points)",
    },
    # ---------- household ----------
    "join_request": {
        "uz": "👋 {name} xonadoningizga qo'shilmoqchi",
        "uzc": "👋 {name} хонадонингизга қўшилмоқчи",
        "ru": "👋 {name} хочет присоединиться к вашему дому",
        "en": "👋 {name} wants to join your household",
    },
    "claim_request": {
        "uz": "👋 {name} o'zini «{member}» deb xonadoningizga qo'shilmoqchi",
        "uzc": "👋 {name} ўзини «{member}» деб хонадонингизга қўшилмоқчи",
        "ru": "👋 {name} утверждает, что он «{member}», и хочет войти в ваш дом",
        "en": "👋 {name} says they are «{member}» and wants to join your household",
    },
    "join_approved": {
        "uz": "✅ {family} oilasiga qabul qilindingiz",
        "uzc": "✅ {family} оиласига қабул қилиндингиз",
        "ru": "✅ Вас приняли в семью {family}",
        "en": "✅ You have been accepted into the {family} family",
    },
    "join_rejected": {
        "uz": "{family} oilasiga qo'shilish so'rovingiz rad etildi",
        "uzc": "{family} оиласига қўшилиш сўровингиз рад этилди",
        "ru": "Ваш запрос на присоединение к семье {family} отклонён",
        "en": "Your request to join the {family} family was declined",
    },
    "dingdong": {
        "uz": "🔔 {name} eshigingiz oldida turibdi!",
        "uzc": "🔔 {name} эшигингиз олдида турибди!",
        "ru": "🔔 {name} у вашей двери!",
        "en": "🔔 {name} is at your door!",
    },
    "vouch_received": {
        "uz": "🤝 {name} xonadoningizga kafolat berdi",
        "uzc": "🤝 {name} хонадонингизга кафолат берди",
        "ru": "🤝 {name} поручился за ваш дом",
        "en": "🤝 {name} vouched for your household",
    },
    "household_verified": {
        "uz": "✅ Xonadoningiz qo'shnilar tomonidan tasdiqlandi!",
        "uzc": "✅ Хонадонингиз қўшнилар томонидан тасдиқланди!",
        "ru": "✅ Ваш дом подтверждён соседями!",
        "en": "✅ Your household has been verified by your neighbours!",
    },
    # ---------- posts & the help loop ----------
    # Author name and title are user content, so this one reads the same everywhere.
    "new_post": {
        "uz": "{emoji} {name}: {title}",
        "uzc": "{emoji} {name}: {title}",
        "ru": "{emoji} {name}: {title}",
        "en": "{emoji} {name}: {title}",
    },
    "post_response": {
        "uz": "💬 {name} javob berdi: {title}",
        "uzc": "💬 {name} жавоб берди: {title}",
        "ru": "💬 {name} ответил(а): {title}",
        "en": "💬 {name} replied: {title}",
    },
    "thanks": {
        "uz": "⭐ {name} sizga rahmat aytdi: {title}",
        "uzc": "⭐ {name} сизга раҳмат айтди: {title}",
        "ru": "⭐ {name} поблагодарил(а) вас: {title}",
        "en": "⭐ {name} thanked you: {title}",
    },
    "thanks_points": {
        "uz": "⭐ {name} sizga rahmat aytdi (+{points} ball): {title}",
        "uzc": "⭐ {name} сизга раҳмат айтди (+{points} балл): {title}",
        "ru": "⭐ {name} поблагодарил(а) вас (+{points} баллов): {title}",
        "en": "⭐ {name} thanked you (+{points} points): {title}",
    },
    # ---------- governance ----------
    "vote_started": {
        "uz": "🗳 Ovoz berish boshlandi: {title}",
        "uzc": "🗳 Овоз бериш бошланди: {title}",
        "ru": "🗳 Голосование началось: {title}",
        "en": "🗳 Voting has started: {title}",
    },
    "vote_closing": {
        "uz": "⏳ Ovoz berish tez orada tugaydi: {title}",
        "uzc": "⏳ Овоз бериш тез орада тугайди: {title}",
        "ru": "⏳ Голосование скоро закончится: {title}",
        "en": "⏳ Voting ends soon: {title}",
    },
    "vote_passed": {
        "uz": "✅ Qabul qilindi: {title} (Ha {yes} · Yo'q {no})",
        "uzc": "✅ Қабул қилинди: {title} (Ҳа {yes} · Йўқ {no})",
        "ru": "✅ Принято: {title} (За {yes} · Против {no})",
        "en": "✅ Passed: {title} (Yes {yes} · No {no})",
    },
    "vote_rejected": {
        "uz": "❌ Rad etildi: {title} (Ha {yes} · Yo'q {no})",
        "uzc": "❌ Рад этилди: {title} (Ҳа {yes} · Йўқ {no})",
        "ru": "❌ Отклонено: {title} (За {yes} · Против {no})",
        "en": "❌ Rejected: {title} (Yes {yes} · No {no})",
    },
    # a vote that simply did not draw enough neighbours — worth distinguishing from a
    # rejection, since "nobody voted" and "the mahalla said no" mean different things
    "vote_expired": {
        "uz": "⏳ Kvorum yetmadi: {title} (Ha {yes} · Yo'q {no})",
        "uzc": "⏳ Кворум етмади: {title} (Ҳа {yes} · Йўқ {no})",
        "ru": "⏳ Кворум не набран: {title} (За {yes} · Против {no})",
        "en": "⏳ Quorum not reached: {title} (Yes {yes} · No {no})",
    },
    "raisi_proposed": {
        "uz": "👑 Sizni raisi lavozimiga taklif qilishdi: {title}",
        "uzc": "👑 Сизни раиси лавозимига таклиф қилишди: {title}",
        "ru": "👑 Вас выдвинули на должность раиса: {title}",
        "en": "👑 You have been nominated as raisi: {title}",
    },
    # ---------- moderation ----------
    "ban_proposed": {
        "uz": "⚠️ Sizga nisbatan chetlatish taklifi kiritildi — javob berish huquqiga egasiz",
        "uzc": "⚠️ Сизга нисбатан четлатиш таклифи киритилди — жавоб бериш ҳуқуқига эгасиз",
        "ru": "⚠️ Предложено отстранить вас — у вас есть право ответить",
        "en": "⚠️ A proposal to ban you was raised — you have the right to respond",
    },
    "member_banned": {
        "uz": "⚠️ {name} qoidabuzarlik uchun chetlatildi",
        "uzc": "⚠️ {name} қоидабузарлик учун четлатилди",
        "ru": "⚠️ {name} отстранён(а) за нарушение правил",
        "en": "⚠️ {name} has been suspended for breaking the rules",
    },
    # ---------- honour ----------
    "honor_public": {
        "uz": "🏆 O'tgan oyning faol qo'shnisi: {name} (⭐ {points})",
        "uzc": "🏆 Ўтган ойнинг фаол қўшниси: {name} (⭐ {points})",
        "ru": "🏆 Активный сосед прошлого месяца: {name} (⭐ {points})",
        "en": "🏆 Last month's most active neighbour: {name} (⭐ {points})",
    },
    "honor_self": {
        "uz": "🏆 Tabriklaymiz! Siz o'tgan oyning faol qo'shnisi deb topildingiz",
        "uzc": "🏆 Табриклаймиз! Сиз ўтган ойнинг фаол қўшниси деб топилдингиз",
        "ru": "🏆 Поздравляем! Вы — активный сосед прошлого месяца",
        "en": "🏆 Congratulations! You are last month's most active neighbour",
    },
    # ---------- scheduled ----------
    "event_tomorrow": {
        "uz": "🎉 Ertaga: {title}",
        "uzc": "🎉 Эртага: {title}",
        "ru": "🎉 Завтра: {title}",
        "en": "🎉 Tomorrow: {title}",
    },
    "digest": {
        "uz": "📬 Bu hafta mahallangizda: {posts} e'lon · {helped} yordam · {neighbours} yangi qo'shni",
        "uzc": "📬 Бу ҳафта маҳаллангизда: {posts} эълон · {helped} ёрдам · {neighbours} янги қўшни",
        "ru": "📬 На этой неделе в махалле: {posts} объявл. · {helped} помощь · {neighbours} новых соседей",
        "en": "📬 This week in your mahalla: {posts} posts · {helped} helped · {neighbours} new neighbours",
    },
}

_PLACEHOLDER = re.compile(r"\{(\w+)\}")


def placeholders(template: str) -> set[str]:
    """The {names} a template expects — used by the catalog completeness test."""
    return set(_PLACEHOLDER.findall(template))


def normalize_lang(lang: str | None) -> str:
    return lang if lang in LANGS else DEFAULT_LANG


def render(
    event: str | None,
    params: dict | None,
    lang: str | None,
    fallback: str = "",
) -> str:
    """Render a notification into `lang`. Total by construction: this sits on the
    read path of the notifications list and the Telegram sender, so any input at all
    must produce *something* rather than 500 a neighbour's notification screen.

    Degradation is deliberately stepwise — an unknown event falls back to the stored
    legacy text, a missing translation falls back to Uzbek, and an absent parameter
    leaves its own placeholder visible. A visibly odd string is a bug report from the
    field; a blank one is a mystery, and an exception is an outage.
    """
    entry = CATALOG.get(event or "")
    if entry is None:
        return fallback  # legacy row written before events existed, or a retired key
    template = entry.get(normalize_lang(lang)) or entry.get(DEFAULT_LANG) or fallback
    if not template:
        return fallback

    values = params if isinstance(params, dict) else {}

    def sub(match: re.Match[str]) -> str:
        key = match.group(1)
        if key not in values:
            return match.group(0)  # leave "{name}" visible rather than guessing
        value = values[key]
        return "" if value is None else str(value)

    return _PLACEHOLDER.sub(sub, template)
