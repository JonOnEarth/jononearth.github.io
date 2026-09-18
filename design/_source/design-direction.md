# Direction after the first preview

## Confirmed preferences

- The first design feels too serious and strict.
- Keep the relaxed visual style, but restore more professional context. The
  first three concept homepages were too sparse; brevity is not a hard word limit.
- The résumé document must not be public. Do not bundle a résumé PDF or add a
  CV download. The user has requested substantial professional content on the
  website; selected biography, education, and experience are appropriate.
- The audience includes academic and industry visitors.
- Sci-fi is a real personal interest and a possible source of character.
- The user likes Foundation and The Three-Body Problem and prefers the Cosmic
  Notebook from the three alternatives.
  Keep these as visual inspiration only. The public personal note should simply
  say Peng is a sci-fi fan, without a reading shelf or named favorites.
- The user explicitly prefers the original multiple-page content and more detail.
  Use Home, Research, Projects, Publications, and About; do not compress the site
  into a single short page or remove substantial sections for brevity.
- Emphasize trustworthy AI, especially privacy and safety, with security,
  robustness, and reliability connected to the actual research.

## Current structure (supersedes the earlier single-page edit)

`notebook.html` is the homepage. `research.html`, `projects.html`,
`publications.html`, and `about.html` now share the Cosmic Notebook layout and
navigation, with the original detailed material restored and expanded.

The homepage explicitly says “I work on trustworthy AI.” Research connects
privacy/information sharing to distributed learning, safety/security to mixed
reality, and reliability to posterior fusion and multi-agent decisions. Future
work on formal privacy is identified as a direction, not a completed guarantee.
Do not imply that federated learning alone guarantees privacy or that a model
verification result guarantees safety in every real-world condition.

The user's latest content edits keep the detailed pages while simplifying About:
retain the biography, current roles, and education; remove teaching, mentoring,
the “Beyond my own projects” section (talks and recognition), and professional
service. The personal note is one sentence: “Outside work, I’m a sci-fi fan.”
The résumé file remains private, and no prominent contact call to action is restored.

Make the Ph.D. with Pau Closas prominent in the opening biography. Connect the
doctoral work on Bayesian data fusion and distributed learning to the broader
question of learning from incomplete information and making decisions safely.
Do not present safety as a guarantee established by the dissertation.

Use AgentMark.ai for the company previously called Cactivate, as corrected by
the user. Describe Peng's work as building AI agents for advertising and link to
https://www.agentmark.ai/. Keep the existing Chief Scientist title; do not carry
old product usage numbers or a product-specific founding date into the new copy.

## Reference sites reviewed

- [Nicky Case](https://ncase.me/): a short, conversational introduction and
  projects organized around what visitors can play, read, and watch. The useful
  lesson is to introduce a person through their interests and work.
- [Josh Comeau](https://www.joshwcomeau.com/about-josh/): personal details and
  small interactive elements alongside professional background. The useful
  lesson is that playfulness can coexist with readable, conventional navigation.
- [Bartosz Ciechanowski](https://ciechanow.ski/): interactive explanations of
  physical systems, including orbital motion. A small explorable idea could
  connect Peng's scientific work with his interest in sci-fi.
- [Andrej Karpathy's reading list](https://karpathy.ai/books.html): opinions on
  sci-fi books provide personality beyond a research biography. Peng's own
  favorites would be needed for an authentic reading shelf.
- [Bruno Simon](https://bruno-simon.com/): an explorable 3D portfolio. This is an
  ambitious end of the interaction spectrum; its existence does not establish
  that a whole 3D world is useful for Peng's visitors.
- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/):
  show an overview first and offer detail when a visitor seeks it.

These are qualitative references, not evidence that one style improves hiring
outcomes or works for every audience.

## Earlier single-page content edit (retained as design history)

The current structure and latest content choices above take precedence over
this earlier version, including its mentoring and favorite-book suggestions.

- A conversational introduction, followed by current roles and affiliations.
- Three research themes, each with a plain-language question and short
  explanation, linked to a relevant publication on the page.
- Applied work: Cactivate with concrete contribution details, plus sensing and
  navigation research. Put the PLANS award beside the work it recognizes.
- Four selected papers with title, venue, year, and a one-sentence explanation.
  Full author lists and bibliographic details are expandable; Scholar links to
  the full publication record. No search interface for only four papers.
- A short background with the Ph.D., prior physics and optical engineering,
  current research, and mentoring. No full job timeline or student roster.
- A sci-fi note with the two user-confirmed favorites. Do not invent reviews,
  current reading habits, personal photos, or additional favorite works.
- No “Say hello” or other prominent contact calls to action. Keep email and
  professional profiles as simple footer links.
- Keep the résumé private, and omit a separate awards/service inventory,
  repeated mission statements, and empty blog/news sections.

The aim is enough substance for both academic and industry visitors, with a
clear overview and optional detail. This adapts the progressive-disclosure idea
in the NN/G reference; it is an editorial choice, not a universal word-count rule.
Potential later additions: a real project demo, a public talk with slides or a
recording, or Peng's own short sci-fi notes. Add them when there is actual content.

## Visual direction

A friendly, lightly sci-fi personal space: approachable type, some color,
readable sections, and one optional playful interaction. Ordinary links should
remain easy to find and use on phones and with a keyboard.

Keep the light paper and remixable three-sun illustration from the Cosmic
Notebook. Use normal navigation labels and concentrate color in the interactive
examples instead of wrapping every content section in a pastel note.

Three clickable alternatives now exist: `observatory.html`, `notebook.html`, and
`signal.html`. `index.html` is the comparison gallery. The expanded
Cosmic Notebook is now the main design under development; the other
two concepts remain shorter references.

## September 2026 refinement: a more personal design

The user asked for online research and a design that feels less AI-generated.
The design judgment here is that repeated pastel boxes, decorative labels,
manufactured paper effects, and vague slogans made the earlier version feel
templated. This is a subjective assessment, not an AI-detection claim.

References reviewed for this pass:

- [Maggie Appleton](https://maggieappleton.com/): a clear introduction and work
  organized around actual essays and notes. Applied here as a person-first
  homepage, with Peng’s own portrait and specific research taking precedence.
- [Frank Chimero, The Web’s Grain](https://frankchimero.com/blog/2015/the-webs-grain/):
  let the arrangement of the content inform its container. Applied here with
  research rows, paired applied projects, and citation lists rather than the
  same card layout repeated across the site.
- [Nielsen Norman Group, Visual Hierarchy in UX](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/):
  use scale, contrast, and grouping to guide attention. Applied here by limiting
  large display type to introductions and reserving richer color for interactions.

Implementation: the header uses Peng’s actual name; Home opens with his photo,
trustworthy-AI focus, and current roles. Page headings and copy are more direct.
Fake tape, shadows, arbitrary rotation, the top preview banner, and redundant
project summaries are removed from the selected direction. The comparison link
remains in the footer. Existing details, paper metadata, five-page navigation,
research games, and named stars remain. Projects still has no demos. No personal
stories, photos, activity, or credentials have been invented.

The sci-fi character lives in optional, working interactions: the orbital sketch,
three research games, and the visitor constellation. No copied reference-site
assets, new dependencies, external analytics, or public résumé were introduced.

## Games in popups; a constellation of names

Research keeps detailed content with three small invitations that open native
game dialogs. The user prefers popups to embedded game controls and has asked
to remove all demos from Projects. Projects retains its full descriptions,
contributions, paper links, and company link without game invitations or dialogs.

The rover popup restores the larger exploration map with shared/private modes
and same-planet comparison. The other research games show grouping error and
three risk decisions. All data is
fictional; do not imply a paper replication or a real safety/privacy guarantee.
Closing a popup preserves its progress until navigation or reload.

Leave a Star must be easy to find: header button, homepage constellation, and an
optional action after a game. It now requires only a name/nickname and displays
that name beside a star. The user explicitly removed comments. Remove message,
reply, and saved-discovery UI from the public experience. Do not automatically
record game actions. Retain existing data and the private owner history/export;
this redesign does not authorize deleting old visitor records.

Counts represent real check-ins, never fabricated visits or unique humans.
Static previews identify browser-only storage; the local Python/SQLite server
supports shared stars for review. Public backend hosting is not deployed.

## Privacy edits already made

- Removed the copied résumé PDF and every download/reference link to it.
- The initial short About biography has now been expanded at the user's request;
  this does not restore a public résumé file.
- Removed the first draft's repeated contact banners and About “Say hello” button.
- Kept the source résumé in its original repository; no publishing was performed.
