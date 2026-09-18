import importlib.util
import json
from pathlib import Path
import secrets
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("cosmic_server", Path(__file__).parents[1] / "server.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class UniverseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = server.Universe(self.temp.name)
        self.key = secrets.token_urlsafe(36)
        self.other_key = secrets.token_urlsafe(36)
        self.star = self.store.create_star(self.key, {"name": "<script>test</script>", "color": "sage", "x": 30, "y": 45})

    def tearDown(self):
        self.temp.cleanup()

    def test_idempotent_registration_and_restart_persistence(self):
        repeated = self.store.create_star(self.key, {"name": "Retry", "color": "gold", "x": 60, "y": 65})
        self.assertEqual(repeated["id"], self.star["id"])
        reopened = server.Universe(self.temp.name)
        self.assertEqual(reopened.constellation()["count"], 1)
        self.assertEqual(reopened.me(self.key)["name"], "<script>test</script>")
        self.assertEqual(reopened.owner_key, self.store.owner_key)

    def test_message_and_reply_are_private(self):
        self.store.add_event(self.key, "message", {"request_id": "test_message_00001", "text": "A private question"})
        self.store.owner(self.store.owner_key, {"id": self.star["id"], "text": "A private answer"}, "reply")
        public = json.dumps(self.store.constellation())
        self.assertNotIn("private question", public)
        self.assertNotIn("private answer", public)
        self.assertNotIn("token", public)
        with self.assertRaises(server.APIError):
            self.store.me(self.other_key)
        with self.assertRaises(server.APIError):
            self.store.owner(self.key)
        kinds = [e["kind"] for e in self.store.me(self.key)["events"]]
        self.assertIn("message", kinds)
        self.assertIn("reply", kinds)

    def test_saved_run_retry_does_not_duplicate_history(self):
        result = {"seed": 428, "mode": "shared", "rounds": 12, "found": 2, "coverage": 75, "repeats": 3, "conflicts": 0, "moves": 30, "actions": [[1, 2, None]] * 12}
        body = {"request_id": "test_run_00000001", "result": result}
        self.store.add_event(self.key, "run", body)
        self.store.add_event(self.key, "run", body)
        self.assertEqual(self.store.me(self.key)["runs"], 1)
        result["rounds"] = 2
        with self.assertRaises(server.APIError):
            self.store.add_event(self.key, "run", {**body, "request_id": "test_run_00000002"})

    def test_field_validation_and_moderation(self):
        for color in ["unknown", [], None]:
            with self.assertRaises(server.APIError):
                self.store.create_star(self.other_key, {"name": "Test", "color": color, "x": 20, "y": 30})
        for x in [float("nan"), float("inf"), -10, True]:
            with self.assertRaises(server.APIError):
                self.store.create_star(self.other_key, {"name": "Test", "color": "sage", "x": x, "y": 30})
        self.store.owner(self.store.owner_key, {"id": self.star["id"], "visible": False}, "visibility")
        self.assertEqual(self.store.constellation()["stars"], [])
        self.assertEqual(self.store.constellation()["count"], 1)
        self.assertEqual(self.store.me(self.key)["id"], self.star["id"])

    def test_mini_discoveries_persist_once_and_stay_private(self):
        for game in server.MINI_GAMES:
            body = {"request_id": f"discovery_{game}", "result": {"game": game, "solved": True, "attempts": 2, "title": "untrusted title", "extra": "discard me"}}
            self.store.add_event(self.key, "run", body)
            self.store.add_event(self.key, "run", body)
        profile = server.Universe(self.temp.name).me(self.key)
        self.assertEqual(profile["runs"], len(server.MINI_GAMES))
        events = [event for event in profile["events"] if event["kind"] == "run"]
        self.assertEqual(len(events), len(server.MINI_GAMES))
        for event in events:
            self.assertEqual(event["data"]["title"], server.MINI_GAMES[event["data"]["game"]]["title"])
            self.assertNotIn("extra", event["data"])
        self.assertNotIn("attempts", json.dumps(self.store.constellation()))
        self.assertEqual(self.store.owner(self.store.owner_key)["stars"][0]["runs"], len(server.MINI_GAMES))

    def test_mini_discovery_validation(self):
        valid = {"game": "risk-check", "solved": True, "attempts": 1}
        for invalid in [{"game": []}, {"game": "unknown"}, {"solved": False}, {"solved": 1}, {"attempts": True}, {"attempts": 0}, {"attempts": 100}, {"attempts": "1"}]:
            with self.subTest(invalid=invalid), self.assertRaises(server.APIError):
                self.store.add_event(self.key, "run", {"request_id": "mini_invalid_0001", "result": {**valid, **invalid}})

    def test_private_data_cannot_live_under_static_root(self):
        with self.assertRaises(ValueError):
            server.Universe(server.ROOT / "bad-private-data")

    def test_complete_export_keeps_older_history_without_authentication_keys(self):
        with self.store.connect() as db:
            db.executemany(
                "INSERT INTO events(star_id,kind,data,created_at,request_id) VALUES(?,'message',?,?,?)",
                [(self.star["id"], json.dumps({"text": f"Saved note {i}"}), server.now(), f"fixture_{i}") for i in range(70)],
            )
        recent = self.store.owner(self.store.owner_key)
        complete = self.store.owner(self.store.owner_key, action="export")
        self.assertEqual(len(recent["stars"][0]["events"]), 60)
        self.assertEqual(len(complete["stars"][0]["events"]), 71)
        self.assertNotIn("token_hash", json.dumps(complete))
        self.assertNotIn(self.key, json.dumps(complete))
        with self.assertRaises(server.APIError):
            self.store.owner(self.other_key, action="export")


if __name__ == "__main__":
    unittest.main()
