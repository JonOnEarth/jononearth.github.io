# Research games and visitor stars

Three small invitations on Research open larger, accessible game popups.
All demos have been removed from Projects. The project descriptions,
contributions, publication links, and company link remain.

## Preview

```sh
python3 design/build.py --stars
python3 design/server.py
```

`--stars` is required for the star features below; the default build is the
public variant and leaves them out entirely.

- Research: http://127.0.0.1:4174/research.html
- Lost Rovers: http://127.0.0.1:4174/research.html#demo-rover-coordination
- Projects: http://127.0.0.1:4174/projects.html
- Visitor constellation: http://127.0.0.1:4174/notebook.html#constellation
- Private owner view: http://127.0.0.1:4174/owner.html

`npm run design:preview` builds and starts the same server. It binds to loopback.
Private data stays outside the static website in `local/cosmic-notebook/`, which
is ignored by Git. The generated owner key is in `local/cosmic-notebook/owner-key`;
the database is `universe.sqlite3` in that directory. Existing stars and history
survive the redesign. `--port` and `--data-dir` support isolated testing.

## Games

| Game | Interaction | Connection to the work |
| --- | --- | --- |
| Find your constellation | Find all three pairs among six moons; watch average temperature mismatch drop from 15° to 1°. | Personalization and grouping similar clients. |
| Lost Rovers | Explore a 9 × 7 map with three rovers; find three pods in twelve rounds; compare shared and private maps on the same planet. | Information sharing and coordinated exploration. |
| Mission control | Make three launch/hold decisions; collect new evidence and check a risk bound. | Decisions justified by a model and its evidence. |

These are teaching analogies with authored synthetic data. They do not reproduce
the papers, implement formal privacy protection, or provide real safety estimates.
Every popup explains its connection and links to the relevant research.

The games initialize only when opened. Escape or the close button returns focus
to the invitation. Closing and reopening preserves progress while the page stays
loaded. Start over creates a fresh challenge; navigating away or reloading resets
it. All controls support keyboard use and reduced motion. Game activity is not
sent to the server. In `--stars` builds, completion offers an optional link to
Leave a Star.

Lost Rovers uses the existing tested deterministic engine. Each rover observes
its tile and neighboring tiles. Shared mode displays the union of observations
and plans; private mode displays the selected rover's knowledge and plan. Choose
one step per rover, then advance the team. Unplanned rovers wait; conflicting
moves also wait and use a round. Comparing modes reuses the same planet and
starting positions. A player can remember earlier observations, so the comparison
is illustrative rather than a controlled experiment.

Old `play.html` bookmarks redirect to the rover popup. The earlier source files
remain as references, but the old comment interface is not a public page.

## Stars with names

Leave a Star exists only in the `--stars` preview build. The default (public)
build omits the header button, the homepage constellation, the after-game button,
the footer link, the star dialog, and the star scripts, because GitHub Pages
cannot run the API. In the preview build it is visible in the header of every
main page, at the end of a game, and in the homepage constellation. The visitor enters a name or nickname, which
appears beside a star. There are no comment, message, reply, or game-history forms
in the visitor experience. Stars are arranged to keep their names readable.

The same browser key returns the same star; repeat visits do not increase the
count. The counter describes explicit check-ins, not unique people or page views.
The browser holds the key; clearing storage or changing browsers loses access to
that identity. Star colors are assigned locally. Public API responses include
only public star metadata, never private historical events or authentication keys.

The owner view retains check-in history, older saved game results, visibility
controls, and a complete private export. Previous private messages remain in the
existing database/export; no data migration or deletion was performed. The reply
form was removed. Legacy event endpoints remain for compatibility with stored
history and are not used by the current public interface.

| Preview mode | Star storage | What visitors see |
| --- | --- | --- |
| Static HTML, direct file, or port 4173 | Browser local storage | Explicit browser-only label; only that browser's star. |
| Local API on port 4174 | SQLite, shared across browsers using the service | Real local check-ins and names. |
| Browser storage unavailable | Memory in that tab | A temporary-star label. |

An unreachable configured API shows an error; it does not silently substitute
fake counts or browser-only saves. Nicknames render as text, not HTML. Public
stars are limited to the latest 250 visible records; the home page previews twelve
and the popup shows the returned set.

## Public hosting

This remains a local design preview. GitHub Pages cannot run the Python service,
so the default build ships without the star feature.
The checked-in `assets/cosmic-config.js` selects browser-only storage; the local
server serves a connected config. Publishing shared stars requires a hosted,
durable API with HTTPS and protected owner access. No public deployment, paid
service, or external database was created.

## Checks

```sh
node design/tests/rover-engine.test.cjs
python3 -m unittest discover -s design/tests -p 'test_*.py' -v
```

The engine tests cover deterministic maps, movement, collisions, coverage, and a
winning initial mission. Storage tests cover persistence, visitor isolation,
idempotency, field validation, legacy private events, moderation, and exports.
Browser verification covers the research games, map-mode comparison,
wrong answers and retries, popup focus and progress, name-only stars across
visits and browsers, mobile layouts, direct-file fallback, and no-JavaScript
content. Screenshots use isolated test names, not claimed public traffic.
