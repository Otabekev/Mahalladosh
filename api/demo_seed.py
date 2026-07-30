"""Populate a believably-alive Yoshlik mahalla for demos/screenshots.
Mirrors the Uzbek design mockup (Malika opa = Faol qo'shni, Rustam ota the
elder, real posts). Run once against a fresh DB:
    .venv/Scripts/python.exe demo_seed.py
"""

import shutil
from datetime import timedelta
from pathlib import Path

from app import models
from app.db import SessionLocal
from app.migrate import upgrade_to_head
from app.routers.uploads import UPLOAD_DIR
from app.seed import seed

# The demo has to be alive whenever it is opened, so everything is placed relative
# to the moment it was seeded rather than to a frozen date. A pinned NOW meant the
# to'y in the feed drifted into the past and the month keys silently stopped
# matching the real month, so a judge opening the app saw an empty Bugun card.
NOW = models.utcnow()
THIS_MONTH = NOW.strftime("%Y-%m")
LAST_MONTH = (NOW.replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
UP = "/api/uploads/"

# api/uploads/ is gitignored — it is a runtime directory, and on a fresh clone or a
# container it is empty. Anything the demo needs to *show* therefore lives here,
# committed, and is copied across at seed time.
ASSETS = Path(__file__).resolve().parent / "app" / "demo_assets"


def install_assets() -> set[str]:
    """Copy the committed demo images into the uploads directory. Returns the set
    of filenames that are actually available afterwards."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    if ASSETS.is_dir():
        for src in ASSETS.iterdir():
            if src.is_file():
                shutil.copy2(src, UPLOAD_DIR / src.name)
    return {p.name for p in UPLOAD_DIR.iterdir() if p.is_file()}


_AVAILABLE: set[str] = set()


def img(n):
    """A URL for an image, or None if that file is not present.

    Returning None rather than a dead path is deliberate: a missing avatar then
    falls back to the initials circle the UI already draws, instead of rendering a
    broken-image icon in the middle of the demo."""
    return UP + n if n in _AVAILABLE else None


def run():
    global _AVAILABLE
    _AVAILABLE = install_assets()
    # the same path production takes, so dev never diverges from it
    upgrade_to_head()
    db = SessionLocal()
    seed(db)  # regions/districts + forming MFYs

    yoshlik = db.query(models.Mahalla).filter_by(name="Yoshlik").first()
    yoshlik.status = "active"
    yoshlik.activated_at = NOW - timedelta(days=40)
    yoshlik.estimated_households = 84

    # ---- people (name, username, photo, month pts, alltime pts, admin) ----
    people = [
        ("Otabek Ergashaliyev", "otabek", "otabek.jpg", 640, 5180, True),
        ("Malika opa Yusupova", "malika", "malika.jpg", 1240, 8600, False),
        ("Sardor aka", "sardor", "sardor.jpg", 980, 6100, False),
        ("Gulnora opa", "gulnora", "gulnora.jpg", 910, 5400, False),
        ("Salima opa", "salima", "salima.jpg", 220, 1500, False),
        ("Bekzod aka", "bekzod", "bekzod.jpg", 480, 3200, False),
        ("Rustam ota", "rustam", "rustam.jpg", 60, 900, False),
        ("Dilnoza opa", "dilnoza", "dilnoza.jpg", 150, 1100, False),
        ("Toshpo'lat aka", "toshpolat", "toshpolat.jpg", 700, 7200, False),
        ("Aziz Ergashaliyev", "aziz", "aziz.jpg", 90, 400, False),
    ]
    users = {}
    for i, (name, un, photo, m, a, adm) in enumerate(people):
        u = models.User(
            tg_id=100000 + i, username=un, full_name=name, photo_url=img(photo),
            is_admin=adm, mahalla_id=yoshlik.id,
            rep_month=m, rep_alltime=a, rep_month_key=THIS_MONTH,
            created_at=NOW - timedelta(days=40 - i),
        )
        db.add(u)
        users[un] = u
    db.flush()

    # Toshpo'lat = raisi
    yoshlik.raisi_user_id = users["toshpolat"].id

    # reputation ledger — this month (drives podium) + last month (Faol qo'shni)
    for u in users.values():
        if u.rep_month:
            db.add(models.ReputationEntry(user_id=u.id, mahalla_id=yoshlik.id,
                   amount=u.rep_month, reason="help_fulfilled", month=THIS_MONTH,
                   created_at=NOW - timedelta(days=3)))
    # last month: Malika clearly on top -> she is the honored Faol qo'shni
    for un, amt in [("malika", 1400), ("sardor", 1050), ("gulnora", 820), ("toshpolat", 600)]:
        db.add(models.ReputationEntry(user_id=users[un].id, mahalla_id=yoshlik.id,
               amount=amt, reason="help_fulfilled", month=LAST_MONTH,
               created_at=NOW - timedelta(days=35)))
    db.add(models.MonthHonor(mahalla_id=yoshlik.id, month=LAST_MONTH,
           winner_user_id=users["malika"].id, created_at=NOW - timedelta(days=19)))

    # badges (#11) are derived from facts, so the demo needs the facts themselves:
    # the founders who were here when Yoshlik opened, and the family historians.
    for un in ["otabek", "toshpolat", "malika", "rustam"]:
        db.add(models.ReputationEntry(user_id=users[un].id, mahalla_id=yoshlik.id,
               amount=20, reason="founding_member", month=THIS_MONTH,
               source_type="mahalla", source_id=yoshlik.id,
               created_at=NOW - timedelta(days=40)))
    for un in ["otabek", "malika"]:
        db.add(models.ReputationEntry(user_id=users[un].id, mahalla_id=yoshlik.id,
               amount=15, reason="history_seeded", month=THIS_MONTH,
               created_at=NOW - timedelta(days=30)))

    # ---- households ----
    erg = models.Household(
        mahalla_id=yoshlik.id, family_name="Ergashaliyevlar", resident_count=5,
        street="2-ko'cha", generations_here=3, verification_status="verified",
        visibility="neighbors", created_by=users["otabek"].id,
        family_history=("Bobomiz Rustam ota bu hovlini 1998-yilda o'z qo'li bilan qurgan. "
                        "Uch avlod shu ostonada katta bo'ldi. Eshigimiz hamisha ochiq — "
                        "choy doim tayyor."),
        created_at=NOW - timedelta(days=38),
    )
    db.add(erg)
    db.flush()
    users["otabek"].household_id = erg.id
    users["rustam"].household_id = erg.id
    users["dilnoza"].household_id = erg.id
    users["aziz"].household_id = erg.id
    db.add_all([
        models.HouseholdMember(household_id=erg.id, full_name="Rustam ota", is_elder=True, user_id=users["rustam"].id),
        models.HouseholdMember(household_id=erg.id, full_name="Dilnoza opa", user_id=users["dilnoza"].id),
        models.HouseholdMember(household_id=erg.id, full_name="Aziz", user_id=users["aziz"].id),
    ])
    # a couple neighbour households (for the "xonadonlar" tab + verify queue)
    for fam, who, street, ver in [
        ("Yusupovlar", "malika", "1-ko'cha", "verified"),
        ("Karimovlar", "bekzod", "Guzar", "pending"),
        ("Sultonovlar", "sardor", "3-ko'cha", "pending"),
    ]:
        h = models.Household(mahalla_id=yoshlik.id, family_name=fam, resident_count=4,
                             street=street, verification_status=ver,
                             created_by=users[who].id, created_at=NOW - timedelta(days=30))
        db.add(h)
        db.flush()
        users[who].household_id = h.id
    # vouches making Ergashaliyevlar verified
    db.add_all([
        models.Vouch(household_id=erg.id, voucher_user_id=users["malika"].id),
        models.Vouch(household_id=erg.id, voucher_user_id=users["bekzod"].id),
    ])

    # ---- posts ----
    def post(author, typ, title, mins, **kw):
        p = models.Post(mahalla_id=yoshlik.id, author_id=users[author].id, type=typ,
                        title=title, created_at=NOW - timedelta(minutes=mins), **kw)
        db.add(p)
        db.flush()
        return p

    post("salima", "help", "Narvon kerak edi — tomdagi uzumni tushirishga. Kimda bor?",
         20, category="tool", body="Ertagacha kerak bo'lardi, rahmat qo'shnilar.")
    share = post("bekzod", "share", "Guzarni tozaladik — rahmat hammaga! 🌿", 60,
                 body="Guzarni tozaladik — rahmat hammaga!", image_path=img("post_guzar.jpg"))
    db.add(models.PostResponse(post_id=share.id, user_id=users["malika"].id, message="Rahmat!"))
    toy = post("otabek", "event", "Karimovlarda to'y — barchamiz taklifdamiz", 240,
               event_date=NOW + timedelta(days=1), body="Shanba kuni kechqurun. Xush kelibsiz!")
    for who in ["malika", "gulnora", "salima", "bekzod"]:
        db.add(models.PostResponse(post_id=toy.id, user_id=users[who].id))
    yigin = post("toshpolat", "event", "Mahalla yig'ini — yangi yil rejalari", 480,
                 event_date=NOW + timedelta(days=6), body="Guzardagi choyxonada, 18:00 da.")
    db.add(models.PostResponse(post_id=yigin.id, user_id=users["sardor"].id))
    post("toshpolat", "announcement", "Shanba kuni umumiy hashar — 8:00 da guzarda", 600,
         body="Ko'chani obodonlashtiriamiz. Barcha xonadonlardan bir kishi kutamiz.",
         place="Guzar oldida")

    # ---- «Xabar bering»: one of each, so both cards are visible in the demo ----
    # The ta'ziya is placed nine days back on purpose: past the three days of open
    # gates but well inside the mourning calendar, which is the state the card
    # spends most of its life in.
    post("otabek", "taziya", "Rustam ota Ergashaliyev", 60 * 24 * 9,
         event_date=NOW - timedelta(days=9) + timedelta(hours=4),
         place="Yoshlik masjidi",
         body="Uch kun eshik ochiq. Alloh rahmat qilsin.")
    # and a resolved emergency, which shows the lifecycle rather than just the siren
    post("sardor", "shoshilinch", "Qora sigir yo'qoldi — 3-ko'cha tomonda",
         60 * 24 * 2, category="livestock", status="closed",
         resolved_at=NOW - timedelta(days=2) + timedelta(hours=3),
         body="Topildi, rahmat qo'shnilar! Guzar orqasidagi maysazorda ekan.")
    hashar = post("gulnora", "share", "O'tgan hashardan xotira 💚", 1440, body="O'tgan hashardan xotira",
                  image_path=img("post_hashar.jpg"))
    db.add(models.PostResponse(post_id=hashar.id, user_id=users["otabek"].id, message="Ajoyib kun edi"))

    # resolved help requests — the mutual-aid history, and what earns Mehmondo'st
    for i, (asker, days) in enumerate([("salima", 12), ("bekzod", 20), ("dilnoza", 28)]):
        done = post(asker, "help", f"Yordam kerak edi ({i + 1})", days * 1440,
                    category="tool", status="resolved",
                    resolved_helper_id=users["malika"].id,
                    resolved_at=NOW - timedelta(days=days - 1))
        db.add(models.PostResponse(post_id=done.id, user_id=users["malika"].id))

    # a charity collection, part-way to its goal
    post("gulnora", "charity", "Maktab kutubxonasiga kitob yig'amiz", 900,
         goal="Kitoblar", charity_goal_amount=3_000_000,
         charity_collected_amount=1_850_000,
         charity_updated_at=NOW - timedelta(hours=20),
         body="Bolalarimiz uchun. Kim qancha qo'sha olsa.")

    # a quick poll, mid-vote — the light counterpart to a governance proposal
    poll = post("malika", "poll", "Hasharni qaysi kuni qilamiz?", 180,
                body="Ko'pchilikka qulay kunni tanlaymiz.")
    poll_options = []
    for i, text in enumerate(["Shanba ertalab", "Yakshanba ertalab", "Juma kechqurun"]):
        opt = models.PollOption(post_id=poll.id, text=text, position=i)
        db.add(opt)
        poll_options.append(opt)
    db.flush()
    for who, opt in [("otabek", 0), ("bekzod", 0), ("gulnora", 0),
                     ("sardor", 1), ("salima", 1), ("toshpolat", 2)]:
        db.add(models.PollVote(post_id=poll.id, option_id=poll_options[opt].id,
                               user_id=users[who].id))

    # ---- services (Xizmatlar directory, with photos of the work) ----
    def service(who, title, cat, price, contact, desc, photos=()):
        s = models.ServiceOffering(
            household_id=users[who].household_id, mahalla_id=yoshlik.id,
            category=cat, title=title, price=price, contact=contact, description=desc,
            created_by=users[who].id, created_at=NOW - timedelta(days=6),
        )
        db.add(s)
        db.flush()
        for i, name in enumerate(photos):
            db.add(models.ServiceImage(service_id=s.id, path=img(name), position=i))
        return s

    service("malika", "Tikuvchilik — ko'ylak va nimcha", "skill", "150 000 so'mdan",
            "+998 90 123 45 67", "Uy sharoitida tikaman. O'lchov olib, 3 kunda tayyor.",
            ["svc_tikuv1.jpg", "svc_tikuv2.jpg"])
    service("dilnoza", "Uyda pishirilgan somsa va non", "food", "6 000 so'm / dona",
            "+998 91 234 56 78", "Har kuni ertalab tandirdan. Buyurtma kechqurun.",
            ["svc_somsa.jpg"])
    service("bekzod", "Santexnika — kran, quvur, isitish", "service", "Kelishilgan holda",
            "+998 93 345 67 89", "Tez va kafolat bilan. Qo'ng'iroq qiling.")
    service("sardor", "Traktor va tirkama ijaraga", "rental", "200 000 so'm / kun",
            "+998 94 456 78 90", "Yer haydash, yuk tashish. Hafta oxiri band bo'ladi.",
            ["svc_traktor.jpg"])

    # ---- «Chiroq bormi?»: a live evening outage on two of the four streets ----
    # The demo is worthless if the board is empty, and the interesting state is the
    # one the feature exists for: SOME of the mahalla is dark, not all of it. Two
    # streets out and one street fine is what makes the street breakdown mean
    # something at a glance.
    def outage(username, kind, is_out, minutes_ago):
        u = users[username]
        h = db.get(models.Household, u.household_id) if u.household_id else None
        db.add(models.UtilityReport(
            mahalla_id=yoshlik.id, user_id=u.id,
            household_id=h.id if h else None, street=h.street if h else None,
            kind=kind, is_out=is_out,
            created_at=NOW - timedelta(minutes=minutes_ago),
        ))

    for un, mins in [("otabek", 42), ("malika", 38), ("bekzod", 25)]:
        outage(un, "light", True, mins)
    outage("sardor", "light", False, 20)  # 3-ko'cha still has power

    # last night's cut, closed — so Otabek's personal log is not empty on day one
    outage("otabek", "light", True, 60 * 21)
    outage("otabek", "light", False, 60 * 18)
    outage("otabek", "gas", True, 60 * 50)
    outage("otabek", "gas", False, 60 * 46)

    # and a cut the raisi announced for tomorrow evening
    tomorrow = (NOW + timedelta(days=1)).replace(minute=0, second=0, microsecond=0)
    db.add(models.UtilityWindow(
        mahalla_id=yoshlik.id, kind="gas",
        starts_at=tomorrow.replace(hour=9), ends_at=tomorrow.replace(hour=15),
        note="Quvur ta'mirlash ishlari", created_by=users["toshpolat"].id,
    ))

    # ---- «Narx»: a believable Pop bazaar week, with last week to compare against ----
    # Several reporters per item on purpose: one number is a claim, three is a price.
    # The meat and petrol rows carry a rise, which is what the trend arrow is for.
    def price(username, item, som, days_ago, market="Pop bozori"):
        when = NOW - timedelta(days=days_ago)
        db.add(models.PriceReport(
            district_id=yoshlik.district_id, mahalla_id=yoshlik.id,
            user_id=users[username].id, item=item, som=som, market=market,
            day=when.strftime("%Y-%m-%d"), created_at=when,
        ))

    # (item, last week's three, this week's three)
    basket = [
        ("non",        [3800, 4000, 4000], [4000, 4000, 4200]),
        ("un",         [7000, 7200, 7500], [7200, 7500, 7500]),
        ("guruch",     [18000, 19000, 19000], [19000, 19000, 20000]),
        ("yog",        [24000, 25000, 25000], [25000, 26000, 26000]),
        ("tuxum",      [16000, 17000, 17000], [17000, 17000, 18000]),
        ("kartoshka",  [6000, 6500, 7000], [5000, 5500, 5500]),
        ("piyoz",      [4000, 4500, 4500], [4000, 4000, 4500]),
        ("pomidor",    [12000, 13000, 14000], [9000, 10000, 11000]),
        ("gosht_mol",  [92000, 95000, 95000], [98000, 100000, 105000]),
        ("gosht_qoy",  [110000, 115000, 115000], [118000, 120000, 120000]),
        ("benzin",     [11500, 11500, 12000], [12500, 13000, 13000]),
        ("gaz_ballon", [95000, 100000, 100000], [100000, 105000, 110000]),
    ]
    reporters = ["malika", "gulnora", "salima"]
    for item, before, after in basket:
        for who, som in zip(reporters, before, strict=True):
            price(who, item, som, 9)
        for who, som in zip(reporters, after, strict=True):
            price(who, item, som, 2)

    # ---- one relative abroad, so the away view is demonstrable ----
    # Aziz is already an Ergashaliyev household member; giving him a second account
    # with NO mahalla is exactly the shape an away member has in production.
    aziz_away = models.User(
        tg_id=100900, username="aziz_moskva", full_name="Aziz aka (Moskvada)",
        created_at=NOW - timedelta(days=12),
    )
    db.add(aziz_away)
    db.flush()
    db.add(models.AwayMember(
        user_id=aziz_away.id, household_id=erg.id, mahalla_id=yoshlik.id,
        country="Rossiya", status="active", approved_by=users["otabek"].id,
        created_at=NOW - timedelta(days=12),
    ))

    db.commit()
    n_users = db.query(models.User).count()
    n_posts = db.query(models.Post).count()
    n_svc = db.query(models.ServiceOffering).count()
    db.close()
    print(
        f"demo seeded: {n_users} users, {n_posts} posts, {n_svc} services, "
        "Yoshlik active, Malika = Faol qo'shni"
    )


if __name__ == "__main__":
    run()
