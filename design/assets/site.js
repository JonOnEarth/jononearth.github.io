(() => {
  "use strict";

  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector("#primary-navigation");
  const mobile = window.matchMedia("(max-width: 620px)");

  function setMenu(open, returnFocus = false) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Close −" : "Menu +";
    document.body.classList.toggle("menu-open", open);
    if (returnFocus) toggle.focus();
  }

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      if (event.key === "Escape") setMenu(false, true);
      if (event.key === "Tab") {
        const links = [...nav.querySelectorAll("a")];
        const last = links[links.length - 1];
        if (event.shiftKey && document.activeElement === toggle) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          toggle.focus();
        }
      }
    });
    mobile.addEventListener("change", () => setMenu(false));
  }

  const publicationList = document.querySelector("[data-publications]");
  if (!publicationList) return;

  const articles = [...publicationList.querySelectorAll("[data-topics]")];
  const filters = [...document.querySelectorAll("[data-filter]")];
  const search = document.querySelector("#publication-search");
  const resultCount = document.querySelector("#result-count");
  const empty = document.querySelector("#empty-state");
  const reset = document.querySelector("#reset-filters");
  let topic = "all";

  function updatePublications() {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const article of articles) {
      const matchesTopic = topic === "all" || article.dataset.topics.split(" ").includes(topic);
      const matchesQuery = article.textContent.toLocaleLowerCase().includes(query);
      article.hidden = !(matchesTopic && matchesQuery);
      if (!article.hidden) visible += 1;
    }
    resultCount.textContent = `${visible} of ${articles.length} selected publications`;
    empty.hidden = visible !== 0;
    for (const filter of filters) {
      filter.setAttribute("aria-pressed", String(filter.dataset.filter === topic));
    }
  }

  for (const filter of filters) {
    filter.addEventListener("click", () => {
      topic = filter.dataset.filter;
      updatePublications();
    });
  }
  search.addEventListener("input", updatePublications);
  reset.addEventListener("click", () => {
    topic = "all";
    search.value = "";
    updatePublications();
    search.focus();
  });
  updatePublications();
})();
