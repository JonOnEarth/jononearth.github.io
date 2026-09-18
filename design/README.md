# Peng Wu — the Cosmic Notebook and design alternatives

The Cosmic Notebook is the current direction for a more personal website,
informed by Peng's interest in Foundation and The Three-Body Problem. It now
preserves the five detailed pages, with small invitations that open research
games in popups. Projects contains descriptions and links without demos.
Trustworthy AI—privacy, safety, security, and reliability—is
the central research theme.
The other two interactive directions remain available for comparison.
See [_source/design-direction.md](_source/design-direction.md) for the research
references, content decisions, and résumé privacy preference.

## Open the design

Build and serve from the repository (Python standard library only):

```sh
python3 design/build.py            # public variant: no visitor stars
python3 design/build.py --stars    # local preview: Leave a star, constellation, owner log
python3 design/server.py
```

Then visit **http://127.0.0.1:4174/notebook.html** for the Cosmic Notebook
homepage; `npm run design:preview` builds with `--stars` and starts the same
server. The shared navigation connects the full [Research](research.html),
[Projects](projects.html), [Publications](publications.html), and
[About](about.html) pages, and [index.html](index.html) compares the three
directions.

The default build is the public variant: no **Leave a star** button, homepage
constellation, footer link, after-game button, or star scripts, because GitHub
Pages cannot run the star API. `--stars` restores all of them for local review;
the [owner log](http://127.0.0.1:4174/owner.html) is generated only in that build
and uses the key in `local/cosmic-notebook/owner-key`. Data stays in the
git-ignored `local/` directory, outside the files the website can serve. See
[PLAY.md](PLAY.md) for the games, storage modes, checks, and the remaining
public-hosting step.

To open the HTML files straight from disk instead of through the server, build
with `--embed-fonts`: Chrome does not load font files from `file://` otherwise.
External paper links require internet access.

## Choose a direction

- **[The Observatory](observatory.html):** midnight blue, warm planetary light,
  a friendly introduction, and moving orbits with a pause control.
- **[The Cosmic Notebook](notebook.html):** warm paper, a personal introduction
  and portrait, detailed work, and a three-sun sketch you can remix.
- **[A Signal from Earth](signal.html):** a retro radio interface with a working
  tuning slider, short project records, and personal sci-fi interests.

The homepage introduces trustworthy AI, current roles, research themes, applied
work, five featured papers, and personal interests. The dedicated pages retain
and expand the original detailed content:

- Research: three themes in the same order on every page: privacy
  (Bayesian/federated learning), safety (mixed reality and cognitive security),
  and reliability (multi-agent decisions), with supporting papers and a future agenda.
- Projects: AI agents for advertising at AgentMark.ai, resilient sensing/navigation, and human-state assurance,
  with contributions and project details.
- Publications: eleven selected records, full author lists, explicit publication
  statuses, topic filters, search, and a Scholar link to the broader record.
- About: biography, Ph.D. work with Pau Closas, current roles, education, and a
  short sci-fi note. Teaching, mentoring, and service sections are omitted.
- Research popup games: pair six moons, explore a planet with three rovers, and
  review three uncertain launches.
  Each has a clear goal, visible feedback, a retry, and a connection to the work.
- Stars (`--stars` builds only): a visible constellation of visitor names, with
  an optional name-only check-in. No comments or automatic recording of game activity.

Scholar, GitHub, LinkedIn, and email are quiet footer links. There is no contact
banner or résumé download. The earlier homepage design remains in
`first-draft.html` as a visual reference; its navigation leads to the new pages.

## Design

- The selected Notebook uses a real portrait, direct first-person writing,
  readable research rows, and quieter project layouts. DM Sans body text is
  paired with Instrument Serif for introductions; color is concentrated in the
  interactive examples. The alternatives retain their own palettes and layouts.
- Original SVG illustrations and local interactions. The solar systems and radio
  are imaginary toys, not physical simulations or live communications.
- Responsive layouts, keyboard navigation, reduced-motion support, and simple
  links to the work and contact information.
- Plain HTML, CSS, and JavaScript, with no frontend runtime dependencies.
- An optional Python/SQLite local server for persistent shared stars and history.

## Edit

- `assets/alternatives.css`: styles for the three concepts and comparison page.
- `assets/notebook-pages.css`: the shared navigation, trustworthy-AI
  emphasis, and styles for the detailed Research/Projects/Publications/About pages.
- `assets/personal.css`: the selected Notebook’s visual refinement, including
  the portrait introduction, research index, typography, and simpler page layouts.
- `assets/alternatives.js`: orbit controls, the remix button, and radio dial.
- `_source/concepts.html`: the design comparison page.
- `_source/notebook-layout.html`: shared header, footer, metadata, and navigation
  for all five public Cosmic Notebook pages and the private owner view.
- `_source/notebook.html`, `research.html`, `projects.html`, `publications.html`,
  `about.html`, and `owner.html`: editable content for those pages.
- `_source/mini-games.json` and `assets/mini-games.js`: puzzle copy and interaction.
- `assets/mini-games.css`: popup invitations, games, and the named constellation.
- `assets/dialogs.js`: consistent keyboard focus wrapping in the native popups.
- `_source/star-widget.html` and `assets/stars.js`: the shared star dialog,
  included only by `build.py --stars`.
- `tools/portrait.py`: one-off Pillow script that crops and resizes the portrait
  into `assets/peng-wu-560.jpg` and `assets/peng-wu-1120.jpg`.
- `assets/rover-engine.js`: seeded planet generation, observations, movement,
  collision resolution, and mission results; independently testable.
- `_source/play.html` and `assets/play.js`: archived standalone prototype sources.
  The generated `play.html` redirects to the rover popup. `play.css` still supplies
  the rover tiles and owner-view styles.
- `assets/cosmic-api.js` and `cosmic-config.js`: shared storage adapter and
  explicitly labeled browser-only fallback.
- `server.py` and `assets/owner.js`: persistent local API and private owner log.
- `_source/concept-layout.html`, `observatory.html`, and `signal.html`: the other
  two visual directions, including inline SVG artwork.
- `_source/publications.json`: shared publication metadata, including the short
  summaries used by the Cosmic Notebook. The selected IDs are in `build.py`.
- `assets/site.js`: publication filtering/search, also used by the first draft.
- `assets/styles.css`: visual styles for the first-draft homepage only.

After changing a source HTML file or publication data, regenerate the pages:

```sh
python3 design/build.py            # public variant
python3 design/build.py --stars    # preview variant with visitor stars
```

Regeneration requires only Python's standard library. CSS and JavaScript edits
are visible immediately on reload. Add `--embed-fonts` when the pages will be
opened from disk rather than served.

Screenshots in `previews/` are local artifacts and are not committed (about
11 MB). The comparison page uses three of them as thumbnails. The September 2026
pass was checked with headless Chrome at 1440 and 390px across all five public
pages in both build variants: no console or network errors, no horizontal
overflow, all three research games opened and finished, and the star dialog
opened in the `--stars` build.

## Content sources

The biography and selected accomplishments follow `../../Resume_PengWu/new.tex`,
and publication metadata follows that repository's `cv/references.bib`. The
trustworthy-AI narrative also draws on the research statements in that repository.
The user supplied the company update to AgentMark.ai and the focus on AI agents
for advertising. The About biography highlights learning from incomplete
information, distributed systems, and safe decision-making.
Completed contributions and future directions are distinguished; formal privacy
work is not presented as a result of the existing federated-learning papers.
The portrait uses Peng’s supplied `me.jpeg`, cropped to 4:5 and resized by
`tools/portrait.py` into `assets/peng-wu-560.jpg` and `assets/peng-wu-1120.jpg`
(about 60 KB and 190 KB). The full-resolution original is not in the repository;
rerun the script against it to regenerate. The résumé is private: do not bundle
résumé/CV PDFs or add a public download link. The résumé repository is a reference
for selected content, not a set of files to publish.
Publication statuses reproduce the supplied bibliography and should be maintained
alongside it. The Cosmic Notebook features four published papers and one preprint
on the homepage, and eleven selected records on the Publications page, not the
complete bibliography. The multi-robot active-inference preprint was added from
its [arXiv record](https://arxiv.org/abs/2609.17384), including the full author order
and a clear preprint label.

## Deploy

`python3 design/build.py --site _site` assembles the deployable site: Home as
`index.html`, canonical links instead of `noindex`, no comparison link, a 404
page, redirect pages for the old Jekyll URLs (`/publications/`, `/cv/`, `/about/`,
`/talks/`, `/teaching/`, `/portfolio/`, `/talkmap/`), and only the assets the
pages reference; the build fails on a dangling reference. The GitHub Actions
workflow in `.github/workflows/pages.yml` runs the checks and this build on every
push to `master` and publishes the result with GitHub Pages (source: GitHub
Actions). The old Jekyll files remain in the repository but are no longer served.
The published site never includes the star feature; see [PLAY.md](PLAY.md).

Fonts are bundled under the SIL Open Font License; license files are in
`assets/fonts/`. `assets/fonts.css` links the woff2 files and the layout preloads
the two faces used above the fold. `build.py --embed-fonts` writes
`assets/fonts-embedded.css` with the fonts inlined and links that instead, for
direct `file://` opening without browser font CORS errors.
