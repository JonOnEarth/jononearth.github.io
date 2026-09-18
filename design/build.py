#!/usr/bin/env python3
"""Render the Cosmic Notebook pages; Python standard library only.

    python3 design/build.py                # preview in design/: public variant, fonts linked as files
    python3 design/build.py --stars        # preview with Leave a star, the constellation, owner.html
    python3 design/build.py --embed-fonts  # inline the fonts so the preview works when opened from disk
    python3 design/build.py --site _site   # also assemble the deployable site (home as index.html,
                                           # indexable, redirects for old URLs, 404 page, needed assets)
"""

import argparse
import base64
import html
import json
import re
import shutil
from pathlib import Path
from string import Template

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "_source"
SITE_URL = "https://jononearth.github.io"
PAGES = {
    "notebook.html": ("notebook.html", "Home", "Peng Wu works on trustworthy AI: privacy, safety, and reliability through Bayesian learning, distributed intelligence, and human-centered systems."),
    "research.html": ("research.html", "Research", "Trustworthy AI research: privacy in distributed learning, safety and cognitive security, and reliable multi-agent decision-making."),
    "projects.html": ("projects.html", "Projects", "AI agents for advertising at AgentMark.ai, resilient sensing, and human-state modeling by Peng Wu."),
    "publications.html": ("publications.html", "Publications", "Selected papers by Peng Wu, with topic filters, publication details, and paper links."),
    "about.html": ("about.html", "About", "Peng Wu: trustworthy AI researcher, Chief Scientist at AgentMark.ai, and sci-fi fan. Ph.D. with Pau Closas at Northeastern University."),
}
HOME = "notebook.html"  # published as index.html
FONT_FACES = [
    ("dm-sans.woff2", "DM Sans", "normal", "100 1000"),
    ("instrument-serif.woff2", "Instrument Serif", "normal", "400"),
    ("instrument-serif-italic.woff2", "Instrument Serif", "italic", "400"),
]
PRELOADED_FONTS = ("dm-sans.woff2", "instrument-serif.woff2")  # the italic face is below the fold
STAR_BLOCK = re.compile(r"\{\{#stars\}\}\n?(.*?)\{\{/stars\}\}\n?", re.S)
# Everything the five public pages reference; the site build refuses to ship a dangling reference.
SITE_ASSETS = [
    "fonts", "fonts.css", "alternatives.css", "notebook-pages.css", "play.css", "mini-games.css", "personal.css",
    "alternatives.js", "site.js", "dialogs.js", "rover-engine.js", "mini-games.js",
    "mark.svg", "distributed-learning.svg", "peng-wu-560.jpg", "peng-wu-1120.jpg",
]
# Paths from the earlier Jekyll site that outside links may still use.
REDIRECTS = {
    "publications": "publications.html", "cv": "about.html", "about": "about.html",
    "talks": "index.html", "teaching": "index.html", "portfolio": "index.html", "talkmap": "index.html",
}
NOT_FOUND = '''<header class="page-heading">
  <h1>Not found</h1>
  <p>There is no page at this address. Try the <a href="/">homepage</a>, <a href="/research.html">research</a>, <a href="/projects.html">projects</a>, <a href="/publications.html">publications</a>, or <a href="/about.html">about</a>.</p>
</header>'''


def render_publication(paper, compact=False):
    title = html.escape(paper["title"])
    url = html.escape(paper.get("url", ""), quote=True)
    if url:
        title = f'<a href="{url}">{title}</a>'
    authors = paper["authors"]
    shortened = compact and len(authors) > 4
    if shortened:
        authors = authors[:1]
    names = [f"<strong>{html.escape(name)}</strong>" if name == "Peng Wu" else html.escape(name) for name in authors]
    author_text = ", ".join(names) + (" et al." if shortened else "")
    venue = html.escape(paper["short_venue"] if compact else paper["venue"])
    status = f'<div class="status">{html.escape(paper["status"])}</div>' if paper.get("status") else ""
    award = f'<div class="award">{html.escape(paper["award"])}</div>' if paper.get("award") else ""
    action = ""
    if url:
        label = html.escape(paper.get("link_label", "Paper"))
        action = f'<a class="pub-action" href="{url}" aria-label="{label}: {html.escape(paper["title"], quote=True)}">{label} <span aria-hidden="true">↗</span></a>'
    topics = html.escape(" ".join(paper["topics"]), quote=True)
    paper_id = html.escape(paper["id"], quote=True)
    return f'''<article class="publication-row" id="{paper_id}" data-topics="{topics}">
      <div class="pub-year">{paper["year"]}</div>
      <div><h3>{title}</h3><p class="pub-authors">{author_text}</p><div class="pub-venue">{venue}</div>{status}{award}</div>
      {action}
    </article>'''


def render_notebook_publication(paper):
    """Show the idea first, with complete citation details available on demand."""
    title = html.escape(paper["title"])
    url = html.escape(paper["url"], quote=True)
    paper_id = html.escape(paper["id"], quote=True)
    status = f'<div class="status">{html.escape(paper["status"])}</div>' if paper.get("status") else ""
    names = [
        f"<strong>{html.escape(name)}</strong>" if name == "Peng Wu" else html.escape(name)
        for name in paper["authors"]
    ]
    return f'''<article class="notebook-paper" id="paper-{paper_id}">
      <div class="paper-date"><span>{paper["year"]}</span><span>{html.escape(paper["short_venue"])}</span></div>
      <div>
        <h3><a href="{url}">{title} <span aria-hidden="true">↗</span></a></h3>
        <p class="paper-takeaway">{html.escape(paper["summary"])}</p>
        {status}
        <details class="paper-details"><summary>Authors &amp; publication details<span class="sr-only">: {title}</span></summary><p>{", ".join(names)}</p><p>{html.escape(paper["venue"])} · {paper["year"]}</p></details>
      </div>
    </article>'''


def write_font_css(embed):
    """fonts.css links the woff2 files; fonts-embedded.css inlines them for file:// previews."""
    lines = ["/* Generated by build.py. Fonts licensed under SIL OFL; see fonts/. */"]
    for filename, family, style, weight in FONT_FACES:
        if embed:
            data = base64.b64encode((ROOT / "assets" / "fonts" / filename).read_bytes()).decode("ascii")
            src = f'url("data:font/woff2;base64,{data}")'
        else:
            src = f'url("fonts/{filename}")'
        lines.append(
            f'@font-face {{font-family:"{family}";font-style:{style};font-weight:{weight};'
            f'font-display:swap;src:{src} format("woff2");}}'
        )
    name = "fonts-embedded.css" if embed else "fonts.css"
    (ROOT / "assets" / name).write_text("\n".join(lines) + "\n", encoding="utf-8")
    return name


def scripts(names):
    return "\n  ".join(f'<script src="assets/{name}.js" defer></script>' for name in names)


def redirect_page(target):
    url = f"{SITE_URL}/{'' if target == 'index.html' else target}"
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url={url}">'
            f'<link rel="canonical" href="{url}"><meta name="robots" content="noindex"><title>Peng Wu</title></head>'
            f'<body><p>This page has moved to <a href="{url}">{url}</a>.</p></body></html>\n')


def check_site(site_dir):
    """Every local link, asset, srcset entry, and CSS url() in the site must resolve."""
    missing = set()
    for page in site_dir.rglob("*.html"):
        text = page.read_text(encoding="utf-8")
        refs = re.findall(r'(?:href|src)="(assets/[^"#?]+)"', text)
        refs += [part.strip().split()[0] for group in re.findall(r'srcset="([^"]+)"', text) for part in group.split(",")]
        refs += [ref.lstrip("/") for ref in re.findall(r'href="(/?[a-z0-9-]+\.html)', text)]
        for ref in refs:
            if not (site_dir / ref).exists():
                missing.add(f"{page.relative_to(site_dir)} -> {ref}")
    for css in (site_dir / "assets").glob("*.css"):
        for ref in re.findall(r'url\("?([^")]+)"?\)', css.read_text(encoding="utf-8")):
            if not ref.startswith("data:") and not (site_dir / "assets" / ref).exists():
                missing.add(f"{css.name} -> {ref}")
    if missing:
        raise SystemExit("Site references missing files:\n  " + "\n  ".join(sorted(missing)))


def main(stars=False, embed_fonts=False, site=None):
    write_font_css(embed=False)
    font_css = write_font_css(embed=True) if embed_fonts else "fonts.css"
    if not embed_fonts:
        (ROOT / "assets" / "fonts-embedded.css").unlink(missing_ok=True)
    font_preload = "" if embed_fonts else "\n  ".join(
        f'<link rel="preload" href="assets/fonts/{name}" as="font" type="font/woff2" crossorigin>' for name in PRELOADED_FONTS
    )
    swap_fonts = lambda text: text.replace('href="assets/fonts.css"', f'href="assets/{font_css}"')

    papers = json.loads((SOURCE / "publications.json").read_text(encoding="utf-8"))
    by_id = {paper["id"]: paper for paper in papers}
    featured_ids = ["bayesian-clustered-learning", "cybersickness-verification", "posterior-sharing"]
    featured = "\n".join(render_publication(by_id[paper_id], compact=True) for paper_id in featured_ids)
    notebook_ids = ["exact-fusion-exploration", *featured_ids, "shared-priors"]
    notebook_papers = "\n".join(render_notebook_publication(by_id[paper_id]) for paper_id in notebook_ids)
    all_papers = "\n".join(render_publication(paper) for paper in papers)
    layout = Template((SOURCE / "notebook-layout.html").read_text(encoding="utf-8"))
    star_widget_html = (SOURCE / "star-widget.html").read_text(encoding="utf-8")
    games = json.loads((SOURCE / "mini-games.json").read_text(encoding="utf-8"))
    preview_vars = dict(
        font_css=font_css, font_preload=font_preload, head_extra="",
        robots='<meta name="robots" content="noindex, nofollow">',
        preview_link='<div class="preview-link wrap"><a href="index.html">Design comparison</a></div>',
    )

    def render_game(match, with_star):
        slug = match.group(1)
        game = games[slug]
        game_star = '<button type="button" class="game-star">Leave a star</button>' if with_star else ""
        return f'''<aside class="game-invitation" data-art="{game['art']}" aria-labelledby="{slug}-card-title">
          <div class="game-card-art" aria-hidden="true"><i></i><i></i><i></i><span>✦</span></div>
          <div class="mini-kicker"><span>Interactive example</span><span>{game['duration']}</span></div>
          <h3 id="{slug}-card-title">{html.escape(game['title'])}</h3>
          <p>{html.escape(game['teaser'])}</p>
          <button type="button" class="game-open" data-open-game="{slug}" aria-haspopup="dialog" aria-controls="demo-{slug}">Play the idea <span aria-hidden="true">↗</span></button>
          <noscript><p>Enable JavaScript to open the game.</p></noscript>
        </aside>
        <dialog class="game-dialog" id="demo-{slug}" data-mini-game="{slug}" aria-labelledby="{slug}-title" aria-describedby="{slug}-prompt">
          <header class="game-dialog-head"><div><span class="mini-kicker">A small experiment / {game['duration']}</span><h2 id="{slug}-title">{html.escape(game['title'])}</h2></div><button class="game-close" type="button" aria-label="Close {html.escape(game['title'], quote=True)}" autofocus>×</button></header>
          <div class="game-dialog-body"><p class="game-prompt" id="{slug}-prompt">{html.escape(game['prompt'])}</p><div class="mini-stage"></div><p class="mini-feedback" role="status" aria-live="polite"></p><div class="game-complete" hidden><span aria-hidden="true">✦</span><strong>One more idea explored.</strong>{game_star}</div><div class="game-bottom"><button type="button" class="mini-reset">Start over ↻</button><span class="game-session-note">Close &amp; reopen to continue.</span></div><details class="game-explanation"><summary>The idea behind the game</summary><p>{html.escape(game['connection'])}</p><p class="game-footnote">{html.escape(game['note'])}</p><a href="{html.escape(game['paper'], quote=True)}">Read the research ↗</a></details></div>
        </dialog>'''

    def render_page(output, content, title, description, *, with_stars, site_mode, extra=None):
        """Render one page through the shared layout. Site mode publishes Home as index.html,
        drops the noindex directive and the comparison link, and never includes star UI."""
        home = "index.html" if site_mode else HOME
        links = []
        for route, (_, label, _) in PAGES.items():
            current = ' aria-current="page"' if route == output else ""
            links.append(f'<a href="{home if route == HOME else route}"{current}>{label}</a>')
        content = content.replace("{{featured_publications}}", featured)
        content = content.replace("{{all_publications}}", all_papers)
        content = content.replace("{{publication_count}}", str(len(papers)))
        content = content.replace("{{notebook_publications}}", notebook_papers)
        content = STAR_BLOCK.sub(lambda match: match.group(1) if with_stars else "", content)
        content = re.sub(r"\{\{game:([a-z-]+)\}\}", lambda match: render_game(match, with_stars), content)
        page_scripts = ["cosmic-config", "cosmic-api", "dialogs", "stars", "rover-engine", "mini-games"] if with_stars else ["dialogs", "rover-engine", "mini-games"]
        variables = dict(
            preview_vars,
            title=html.escape(title), description=html.escape(description, quote=True),
            navigation="\n        ".join(links), page=Path(output).stem, content=content,
            star_widget=star_widget_html if with_stars else "",
            star_entry=f'<a class="header-star" href="{home}#constellation" data-open-stars>Leave a star <span aria-hidden="true">✦</span></a>' if with_stars else "",
            star_footer=f'<a href="{home}#leave-a-star" data-open-stars>Leave a star ✦</a>' if with_stars else "",
            page_assets=scripts(page_scripts),
        )
        if site_mode:
            canonical = SITE_URL + "/" + ("" if output == HOME else output)
            variables.update(robots="", preview_link="", head_extra=f'<link rel="canonical" href="{canonical}">')
        if extra:
            variables.update(extra)
        rendered = layout.substitute(variables)
        return rendered.replace(f'href="{HOME}', 'href="index.html') if site_mode else rendered

    for output, (source, title, description) in PAGES.items():
        content = (SOURCE / source).read_text(encoding="utf-8")
        (ROOT / output).write_text(render_page(output, content, title, description, with_stars=stars, site_mode=False), encoding="utf-8")
        print(f"Rendered {output}")

    # Private owner UI: local preview only, no entry in the public navigation, API requires a key.
    owner_path = ROOT / "owner.html"
    if stars:
        owner = layout.substitute(dict(
            preview_vars, title="Visitor history", description="Peng’s private constellation notebook.",
            navigation='\n        '.join(f'<a href="{route}">{label}</a>' for route, (_, label, _) in PAGES.items()),
            page="owner", content=(SOURCE / "owner.html").read_text(encoding="utf-8"),
            star_widget="", star_entry="", star_footer="",
            page_assets=scripts(["cosmic-config", "cosmic-api", "owner"]),
        ))
        owner_path.write_text(owner, encoding="utf-8")
        print("Rendered owner.html")
    elif owner_path.exists():
        owner_path.unlink()
        print("Removed owner.html (build without --stars)")

    # Old bookmarks lead to the popup. The earlier source and saved data remain.
    legacy = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0;url=research.html#demo-rover-coordination"><title>Lost Rovers</title></head><body><p>Lost Rovers has a new home. <a href="research.html#demo-rover-coordination">Open the research game</a>.</p></body></html>'''
    (ROOT / "play.html").write_text(legacy, encoding="utf-8")

    # Keep the original visual direction available as a single reference page.
    first_layout = Template((SOURCE / "layout.html").read_text(encoding="utf-8"))
    first_content = (SOURCE / "home.html").read_text(encoding="utf-8").replace("{{featured_publications}}", featured)
    first_rendered = first_layout.substitute(
        title="First draft",
        description="The original website design direction for Peng Wu.",
        navigation="\n        ".join(f'<a href="{route}">{label}</a>' for route, (_, label, _) in PAGES.items()),
        content=first_content,
    )
    (ROOT / "first-draft.html").write_text(swap_fonts(first_rendered), encoding="utf-8")
    print("Rendered first-draft.html")

    concept_layout = Template((SOURCE / "concept-layout.html").read_text(encoding="utf-8"))
    for slug, title in [
        ("observatory", "The Observatory"),
        ("signal", "A Signal from Earth"),
    ]:
        rendered = concept_layout.substitute(
            title=title,
            slug=slug,
            content=(SOURCE / f"{slug}.html").read_text(encoding="utf-8"),
        )
        (ROOT / f"{slug}.html").write_text(swap_fonts(rendered), encoding="utf-8")
        print(f"Rendered {slug}.html")
    (ROOT / "index.html").write_text(swap_fonts((SOURCE / "concepts.html").read_text(encoding="utf-8")), encoding="utf-8")
    print("Rendered index.html (design comparison)")
    print(f"Preview: {'with visitor stars' if stars else 'public, no visitor stars'}; fonts {'embedded' if embed_fonts else 'linked'}.")

    if site is None:
        return
    if embed_fonts:
        raise SystemExit("--site always links the font files; drop --embed-fonts.")
    site_dir = Path(site).resolve()
    if site_dir in (ROOT, ROOT.parent) or (site_dir / ".git").exists():
        raise SystemExit(f"Refusing to build the site into {site_dir}.")
    if site_dir.exists():
        if any(site_dir.iterdir()) and not (site_dir / ".nojekyll").exists():
            raise SystemExit(f"{site_dir} is not empty and is not a previous site build; refusing to overwrite it.")
        shutil.rmtree(site_dir)
    site_dir.mkdir(parents=True)
    for output, (source, title, description) in PAGES.items():
        content = (SOURCE / source).read_text(encoding="utf-8")
        name = "index.html" if output == HOME else output
        (site_dir / name).write_text(render_page(output, content, title, description, with_stars=False, site_mode=True), encoding="utf-8")
    (site_dir / "404.html").write_text(
        render_page("404.html", NOT_FOUND, "Not found", "This page does not exist.", with_stars=False, site_mode=True,
                    extra=dict(head_extra='<base href="/">', robots='<meta name="robots" content="noindex">')),
        encoding="utf-8")
    for old, new in REDIRECTS.items():
        (site_dir / old).mkdir()
        (site_dir / old / "index.html").write_text(redirect_page(new), encoding="utf-8")
    (site_dir / "assets").mkdir()
    for name in SITE_ASSETS:
        source_path = ROOT / "assets" / name
        if source_path.is_dir():
            shutil.copytree(source_path, site_dir / "assets" / name)
        else:
            shutil.copy2(source_path, site_dir / "assets" / name)
    (site_dir / ".nojekyll").write_text("", encoding="utf-8")
    check_site(site_dir)
    total = sum(path.stat().st_size for path in site_dir.rglob("*") if path.is_file())
    print(f"Site: {site_dir} ({len(PAGES)} pages, 404, {len(REDIRECTS)} redirects, {total // 1024} KB).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--stars", action="store_true", help="include Leave a star, the homepage constellation, and owner.html in the preview")
    parser.add_argument("--embed-fonts", action="store_true", help="inline the fonts so the preview works when opened directly from disk")
    parser.add_argument("--site", metavar="DIR", help="also assemble the deployable site into DIR (replaces a previous site build there)")
    args = parser.parse_args()
    main(stars=args.stars, embed_fonts=args.embed_fonts, site=args.site)
