"""Populate a believably-alive Yoshlik mahalla for demos/screenshots.
Mirrors the Uzbek design mockup (Malika opa = Faol qo'shni, Rustam ota the
elder, real posts). Run once against a fresh DB:
    .venv/Scripts/python.exe demo_seed.py
"""

from datetime import datetime, timedelta

from app import models
from app.db import Base, SessionLocal, engine
from app.seed import seed

NOW = datetime(2026, 7, 20, 9, 0, 0)
THIS_MONTH = "2026-07"
LAST_MONTH = "2026-06"
UP = "/api/uploads/"


def img(n):
    return UP + n


def run():
    Base.metadata.create_all(bind=engine)
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
    post("otabek", "event", "Karimovlarda to'y — barchamiz taklifdamiz", 240,
         event_date=NOW + timedelta(days=1), body="Shanba kuni kechqurun. Xush kelibsiz!")
    post("toshpolat", "announcement", "Shanba kuni umumiy hashar — 8:00 da guzarda", 600,
         body="Ko'chani obodonlashtiriamiz. Barcha xonadonlardan bir kishi kutamiz.")
    hashar = post("gulnora", "share", "O'tgan hashardan xotira 💚", 1440, body="O'tgan hashardan xotira",
                  image_path=img("post_hashar.jpg"))
    db.add(models.PostResponse(post_id=hashar.id, user_id=users["otabek"].id, message="Ajoyib kun edi"))

    db.commit()
    n_users = db.query(models.User).count()
    n_posts = db.query(models.Post).count()
    db.close()
    print(f"demo seeded: {n_users} users, {n_posts} posts, Yoshlik active, Malika = Faol qo'shni")


if __name__ == "__main__":
    run()
