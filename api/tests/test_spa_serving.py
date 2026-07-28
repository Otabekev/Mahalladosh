"""Same-origin serving of the built PWA (#43).

The SPA catch-all matches every path, so the risk is that it swallows the API. These
tests pin the boundary. They run whether or not web/dist exists: in development it
does not, and the block is simply absent — which must also not break anything.
"""

from app.main import WEB_DIST


def test_an_unknown_api_path_is_json_not_the_html_shell(db, world, client):
    """The important one. If the catch-all answered /api/... with index.html, every
    client would get a 200 full of HTML where it expected JSON, and the failure would
    surface as a parse error somewhere far away from the cause."""
    r = client.get("/api/definitely-not-a-route")
    assert r.status_code == 404
    assert "text/html" not in r.headers.get("content-type", "")


def test_the_api_still_answers_normally(db, world, as_user):
    assert as_user(world.neighbor).get("/api/posts").status_code == 200


def test_health_is_reachable(db, world, client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_a_deep_link_returns_the_app_when_a_build_is_present(db, world, client):
    """A PWA route typed fresh — /app/mahalla — is not a file on disk, so it has to
    fall through to index.html or the app 404s on every refresh."""
    r = client.get("/app/mahalla")
    if WEB_DIST.is_dir():
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "")
    else:
        assert r.status_code == 404  # no build in a dev checkout; nothing to serve
