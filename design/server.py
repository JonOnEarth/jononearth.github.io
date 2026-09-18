#!/usr/bin/env python3
"""Local Cosmic Notebook preview with a persistent SQLite constellation.

Bind only to loopback. Private data lives OUTSIDE the static design directory.
Public hosting should use a production API implementing the documented contract.
"""
import argparse
from collections import defaultdict, deque
from datetime import datetime, timezone
import hashlib
import hmac
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import re
import secrets
import sqlite3
import threading
import time
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
MINI_GAMES = json.loads((ROOT / "_source" / "mini-games.json").read_text(encoding="utf-8"))
COLORS = {"gold", "sage", "lilac", "coral"}
TOKEN = re.compile(r"^[A-Za-z0-9_-]{40,100}$")


class APIError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def clean_text(value, limit, optional=False):
    if not isinstance(value, str) or len(value) > limit or (not optional and not value.strip()):
        raise APIError(400, f"Please use {'up to' if optional else '1–'}{limit} characters.")
    if any(ord(c) < 32 and c not in "\n\t" for c in value):
        raise APIError(400, "That text contains unsupported characters.")
    return value.strip()


class Universe:
    def __init__(self, directory):
        self.directory = Path(directory).resolve()
        if self.directory == ROOT or ROOT in self.directory.parents:
            raise ValueError("Private data must be outside the static design directory.")
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.database = self.directory / "universe.sqlite3"
        self.key_file = self.directory / "owner-key"
        if not self.key_file.exists():
            self.key_file.write_text(secrets.token_urlsafe(36) + "\n")
            self.key_file.chmod(0o600)
        self.owner_key = self.key_file.read_text().strip()
        with self.connect() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS stars (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    token_hash TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL, color TEXT NOT NULL,
                    x REAL NOT NULL, y REAL NOT NULL,
                    created_at TEXT NOT NULL,
                    visible INTEGER NOT NULL DEFAULT 1
                );
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    star_id INTEGER NOT NULL REFERENCES stars(id),
                    kind TEXT NOT NULL CHECK(kind IN ('checkin','run','message','reply')),
                    data TEXT NOT NULL, created_at TEXT NOT NULL,
                    request_id TEXT NOT NULL,
                    UNIQUE(star_id, request_id)
                );
            """)
        self.database.chmod(0o600)
        self.buckets = defaultdict(deque)
        self.rate_lock = threading.Lock()

    def connect(self):
        db = sqlite3.connect(self.database, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys=ON")
        return db

    def rate(self, key, maximum, period=60):
        with self.rate_lock:
            stamp = time.monotonic()
            bucket = self.buckets[key]
            while bucket and bucket[0] < stamp - period:
                bucket.popleft()
            if len(bucket) >= maximum:
                raise APIError(429, "A few too many signals at once. Please try again shortly.")
            bucket.append(stamp)

    def hash_token(self, token):
        if not TOKEN.fullmatch(token or ""):
            raise APIError(401, "Your explorer key is missing or invalid.")
        return hashlib.sha256(token.encode()).hexdigest()

    def authenticate(self, db, token):
        star = db.execute("SELECT * FROM stars WHERE token_hash=?", (self.hash_token(token),)).fetchone()
        if not star:
            raise APIError(401, "This explorer key does not match a star. You can create a new one.")
        return star

    @staticmethod
    def public_star(star):
        return {k: star[k] for k in ("id", "name", "color", "x", "y", "created_at")}

    def visitor(self, db, star, complete=False):
        result = self.public_star(star)
        event_sql = "SELECT kind,data,created_at FROM events WHERE star_id=? ORDER BY id DESC" + ("" if complete else " LIMIT 60")
        events = db.execute(event_sql, (star["id"],)).fetchall()
        result["events"] = [{"kind": r["kind"], "data": json.loads(r["data"]), "created_at": r["created_at"]} for r in events]
        result["runs"] = db.execute("SELECT COUNT(*) FROM events WHERE star_id=? AND kind='run'", (star["id"],)).fetchone()[0]
        result["scout"] = bool(db.execute("SELECT 1 FROM events WHERE star_id=? AND kind='run' AND json_extract(data,'$.found')=3 LIMIT 1", (star["id"],)).fetchone())
        return result

    def constellation(self):
        with self.connect() as db:
            stars = db.execute("SELECT * FROM stars WHERE visible=1 ORDER BY id DESC LIMIT 250").fetchall()
            return {"scope": "local", "count": db.execute("SELECT COUNT(*) FROM stars").fetchone()[0], "stars": [self.public_star(s) for s in stars]}

    def me(self, token):
        with self.connect() as db:
            return self.visitor(db, self.authenticate(db, token))

    def create_star(self, token, body):
        token_hash = self.hash_token(token)
        name = clean_text(body.get("name", ""), 32, optional=True) or "A passing explorer"
        color = body.get("color")
        if not isinstance(color, str) or color not in COLORS:
            raise APIError(400, "Choose one of the four star colors.")
        x, y = body.get("x"), body.get("y")
        if any(type(v) not in (int, float) or not math.isfinite(v) or v < 8 or v > 92 for v in (x, y)):
            raise APIError(400, "Choose a spot inside the sky.")
        with self.connect() as db:
            db.execute("INSERT OR IGNORE INTO stars(token_hash,name,color,x,y,created_at) VALUES(?,?,?,?,?,?)", (token_hash, name, color, x, y, now()))
            star = db.execute("SELECT * FROM stars WHERE token_hash=?", (token_hash,)).fetchone()
            db.execute("INSERT OR IGNORE INTO events(star_id,kind,data,created_at,request_id) VALUES(?,'checkin','{}',?,'checkin')", (star["id"], star["created_at"]))
            return self.visitor(db, star)

    def add_event(self, token, kind, body):
        request_id = body.get("request_id", "")
        if not isinstance(request_id, str) or not re.fullmatch(r"[A-Za-z0-9_-]{16,80}", request_id):
            raise APIError(400, "A valid request ID is required.")
        if kind == "message":
            data = {"text": clean_text(body.get("text"), 400)}
        else:
            data = body.get("result")
            if not isinstance(data, dict):
                raise APIError(400, "Finish a mission before saving it.")
            if "game" in data:
                game = data.get("game")
                if not isinstance(game, str) or game not in MINI_GAMES:
                    raise APIError(400, "Choose an available little game.")
                if data.get("solved") is not True or type(data.get("attempts")) is not int or not 1 <= data["attempts"] <= 99:
                    raise APIError(400, "Finish the puzzle before saving this discovery.")
                data = {"game": game, "title": MINI_GAMES[game]["title"], "solved": True, "attempts": data["attempts"]}
            else:
                # Existing Lost Rovers expeditions stay compatible with the notebook.
                bounds = {"seed": (0, 2**32 - 1), "rounds": (1, 12), "found": (0, 3), "coverage": (0, 100), "repeats": (0, 36), "conflicts": (0, 36), "moves": (0, 36)}
                if any(type(data.get(k)) is not int or not low <= data[k] <= high for k, (low, high) in bounds.items()):
                    raise APIError(400, "The expedition result is incomplete.")
                if data.get("mode") not in ("shared", "private") or (data["rounds"] < 12 and data["found"] != 3):
                    raise APIError(400, "Only finished missions can be saved.")
                actions = data.get("actions")
                if not isinstance(actions, list) or len(actions) != data["rounds"] or any(not isinstance(a, list) or len(a) != 3 or any(v is not None and (type(v) is not int or not 0 <= v < 63) for v in a) for a in actions):
                    raise APIError(400, "The expedition route is incomplete.")
                data = {**{k: data[k] for k in bounds}, "mode": data["mode"], "actions": actions}
        with self.connect() as db:
            star = self.authenticate(db, token)
            self.rate((kind, star["id"]), 20, 3600)
            db.execute("INSERT OR IGNORE INTO events(star_id,kind,data,created_at,request_id) VALUES(?,?,?,?,?)", (star["id"], kind, json.dumps(data), now(), request_id))
            return self.visitor(db, star)

    def owner(self, token, body=None, action=None):
        if not TOKEN.fullmatch(token or "") or not hmac.compare_digest(token, self.owner_key):
            raise APIError(401, "The owner key is not correct.")
        with self.connect() as db:
            if action in ("reply", "visibility"):
                star_id = body.get("id")
                if type(star_id) is not int or not db.execute("SELECT 1 FROM stars WHERE id=?", (star_id,)).fetchone():
                    raise APIError(404, "That star could not be found.")
                if action == "reply":
                    message = clean_text(body.get("text"), 1000)
                    db.execute("INSERT INTO events(star_id,kind,data,created_at,request_id) VALUES(?,'reply',?,?,?)", (star_id, json.dumps({"text": message}), now(), secrets.token_urlsafe(18)))
                elif action == "visibility":
                    if type(body.get("visible")) is not bool:
                        raise APIError(400, "Choose whether this star is visible.")
                    db.execute("UPDATE stars SET visible=? WHERE id=?", (int(body["visible"]), star_id))
                return {"ok": True}
            complete = action == "export"
            stars = db.execute("SELECT * FROM stars ORDER BY id DESC" + ("" if complete else " LIMIT 250")).fetchall()
            return {"scope": "local", "count": db.execute("SELECT COUNT(*) FROM stars").fetchone()[0], "stars": [{**self.visitor(db, s, complete), "visible": bool(s["visible"])} for s in stars]}


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        # No request tokens, visitor IP addresses, or query strings in the log.
        print(f"{self.command} {urlsplit(self.path).path}", flush=True)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Frame-Options", "DENY")
        super().end_headers()

    def check_origin(self):
        port = self.server.server_port
        hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
        if self.headers.get("Host") not in hosts:
            raise APIError(403, "This preview is available on localhost only.")
        origin = self.headers.get("Origin")
        if origin and origin not in {f"http://{h}" for h in hosts}:
            raise APIError(403, "That origin cannot access this preview.")

    def token(self):
        authorization = self.headers.get("Authorization", "")
        return authorization[7:] if authorization.startswith("Bearer ") else ""

    def reply_json(self, status, value):
        data = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def handle_api(self, post=False):
        try:
            self.check_origin()
            path = urlsplit(self.path).path
            body = {}
            if post:
                if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
                    raise APIError(415, "Please send JSON.")
                try:
                    size = int(self.headers.get("Content-Length", "0"))
                except ValueError:
                    raise APIError(400, "Invalid content length.")
                if not 0 < size <= 8192:
                    raise APIError(413, "That signal is too large.")
                try:
                    body = json.loads(self.rfile.read(size))
                except (ValueError, UnicodeDecodeError):
                    raise APIError(400, "The signal was not valid JSON.")
                if not isinstance(body, dict):
                    raise APIError(400, "The signal must be an object.")
            universe = self.server.universe
            if path.startswith("/api/owner"):
                universe.rate(("owner", self.client_address[0]), 60)
            if not post and path == "/api/universe":
                result = universe.constellation()
            elif not post and path == "/api/me":
                result = universe.me(self.token())
            elif post and path == "/api/stars":
                universe.rate(("checkin", self.client_address[0]), 12)
                result = universe.create_star(self.token(), body)
            elif post and path in ("/api/runs", "/api/messages"):
                result = universe.add_event(self.token(), "run" if path.endswith("runs") else "message", body)
            elif not post and path in ("/api/owner", "/api/owner/export"):
                result = universe.owner(self.token(), action="export" if path.endswith("export") else None)
            elif post and path in ("/api/owner/reply", "/api/owner/visibility"):
                result = universe.owner(self.token(), body, path.rsplit("/", 1)[1])
            else:
                raise APIError(404, "That signal has no destination.")
            self.reply_json(200, result)
        except APIError as error:
            self.reply_json(error.status, {"error": error.message})
        except (sqlite3.Error, OSError):
            self.reply_json(503, {"error": "The constellation could not save that signal. Please try again."})

    def do_GET(self):
        if urlsplit(self.path).path.startswith("/api/"):
            self.handle_api()
        else:
            super().do_GET()

    def do_POST(self):
        self.handle_api(post=True)

    def send_head(self):
        try:
            self.check_origin()
        except APIError as error:
            self.reply_json(error.status, {"error": error.message})
            return None
        path = unquote(urlsplit(self.path).path)
        if path == "/assets/cosmic-config.js":
            data = b"window.COSMIC_API = '/api';\n"
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)
            return None
        if path == "/":
            self.path = "/notebook.html"
            path = self.path
        target = (ROOT / path.lstrip("/")).resolve()
        if ROOT not in target.parents or not target.is_file():
            self.send_error(404)
            return None
        relative = target.relative_to(ROOT)
        if not ((len(relative.parts) == 1 and target.suffix == ".html") or relative.parts[0] in ("assets", "previews")):
            self.send_error(404)
            return None
        return super().send_head()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4174)
    parser.add_argument("--data-dir", type=Path, default=ROOT.parent / "local" / "cosmic-notebook")
    args = parser.parse_args()
    universe = Universe(args.data_dir)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), PreviewHandler)
    server.universe = universe
    print(f"Cosmic Notebook: http://127.0.0.1:{args.port}/notebook.html", flush=True)
    print(f"Owner history: http://127.0.0.1:{args.port}/owner.html", flush=True)
    print(f"Owner key is in {universe.key_file} (never served to visitors).", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
