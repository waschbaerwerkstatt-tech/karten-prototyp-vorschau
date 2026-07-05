/* =====================================================================
   Eingeloggt-Simulation (Demo) — geteilte Marker-Mechanik fuer alle Ansichten.

   Reine Demo, kein Backend: Gesehen-Zustand liegt in sessionStorage,
   Seitenwechsel erhaelt ihn, F5 setzt die Demo zurueck (Navigation-Timing).
   Auf jeder Seite genuegt EIN Include: <script src="[../]eingeloggt.js"></script>.
   Die aktive Ansicht wird aus location.pathname bestimmt.

   Markierbare Eintraege tragen data-eintrag-id. Die aktive Ansicht badged die
   ungesehenen Neu-Eintraege ("Neu"-Pille); Viewport (>=50 %, ~1 s) oder Klick
   raeumt sie ab. Die Kopfnavigation zeigt je NICHT-aktiver Ansicht die
   ungesehene Neu-Zahl (Ecke des Icons + Zahl im Flyout, ab 10 "9+"). Politik
   ist dreistufig: Nav-Zahl = Summe neuer Stellungnahmen, Themenzeile traegt ein
   aggregiertes "N neu", die Stellungnahme im Dossier die Einzelmarke.

   Fest verdrahtet (Demo altert nicht): Nachrichten = die ersten N ungesehenen
   Feed-Eintraege (Demo-Nutzer hat "Alles" abonniert, Beschluss 2); Rechtsprechung
   und Politik = feste ID-Listen.
   ===================================================================== */
(function () {
  "use strict";

  /* ---- Demo-Nutzer (fiktiv, fest verdrahtet) ---- */
  const EG_USER = window.EG_USER = {
    name: "Dr. Katrin Vogt",
    initialen: "KV",
    favoritKlinikId: "marien",            // eines der 8 HH-Haeuser (analysen-data.js) -> Teaser-Pfad
    favoritKlinikName: "Marienkrankenhaus",
    landkreis: "Hamburg-Nord",
    bundesland: "Hamburg",
  };

  /* ---- Neu-Markierungen je Ansicht ---- */
  const NEU = {
    nachrichten:    { firstN: 4 },                                  // Favoriten-Treffer (Alles)
    rechtsprechung: { ids: ["lsg-hh-9224", "lsg-by-571"] },         // 2 Urteile
    politik:        { ids: ["vorhalte::DKG", "notfall::BDPK", "level1i::Freistaat Bayern"] }, // 3 Stellungnahmen
    // Analysen: Klinikmonitor-Ereignisse mit Wirkung aufs Favoriten-Haus (Beschluss 25/28).
    // Die Ansicht selbst rendert Event-Detail-Elemente mit data-eintrag-id -> hier abgeraeumt.
    analysen:       { ids: ["ev-altona-kard", "ev-barmbek-endo", "ev-stgeorg-chef"] },
  };

  const VIEWS = ["nachrichten", "rechtsprechung", "politik", "analysen"];
  const CONTAINERS = {
    nachrichten:    ["#panelBody"],
    rechtsprechung: ["#reg"],
    politik:        ["#rows", "#dossier"],
    analysen:       ["#panel"],
  };

  function viewOfHref(href) {
    if (!href) return null;
    if (/rechtsprechung/.test(href)) return "rechtsprechung";
    if (/politik/.test(href)) return "politik";
    if (/analysen/.test(href)) return "analysen";
    if (/hauptansicht/.test(href)) return "nachrichten";
    return null;
  }
  const CURRENT = viewOfHref(location.pathname) || "nachrichten";

  /* ---- Gesehen-Zustand + Reload-Reset ---- */
  const KEY = "eingeloggt.gesehen";
  const navEntry = performance.getEntriesByType("navigation")[0];
  if (navEntry && navEntry.type === "reload") sessionStorage.removeItem(KEY); // F5 = Demo-Reset
  const gid = (view, id) => view + ":" + id;
  function seen() {
    try { return new Set(JSON.parse(sessionStorage.getItem(KEY) || "[]")); }
    catch (e) { return new Set(); }
  }
  function markSeen(g) {
    const s = seen();
    if (!s.has(g)) { s.add(g); sessionStorage.setItem(KEY, JSON.stringify([...s])); }
  }

  /* ---- Zaehlung je Ansicht (ansichtsunabhaengig aus dem Zustand) ---- */
  function count(view) {
    const spec = NEU[view];
    if (!spec) return 0;
    const s = seen();
    if (spec.firstN != null) {
      let sc = 0; s.forEach(g => { if (g.indexOf(view + ":") === 0) sc++; });
      return Math.max(0, spec.firstN - sc);
    }
    return spec.ids.filter(id => !s.has(gid(view, id))).length;
  }

  /* ---- Kopfnavigation: Badges je nicht-aktiver Ansicht ---- */
  function renderNav() {
    document.querySelectorAll(".vb-item, .vf-item").forEach(a => {
      const view = viewOfHref(a.getAttribute("href"));
      const active = a.classList.contains("on") || a.getAttribute("aria-current") === "page" || view === CURRENT;
      const c = (view && !active) ? count(view) : 0;
      let b = a.querySelector(".eg-badge");
      if (c > 0) {
        if (!b) { b = document.createElement("span"); b.className = "eg-badge"; a.appendChild(b); }
        b.textContent = c >= 10 ? "9+" : String(c);
      } else if (b) { b.remove(); }
    });
    // Mobile: Sammelpunkt am Menue-Ausloeser
    const brand = document.querySelector(".brand");
    if (brand) {
      const sum = VIEWS.filter(v => v !== CURRENT).reduce((s, v) => s + count(v), 0);
      let d = brand.querySelector(".eg-dot");
      if (sum > 0 && !d) { d = document.createElement("span"); d.className = "eg-dot"; brand.appendChild(d); }
      else if (sum === 0 && d) d.remove();
    }
  }

  /* ---- Viewport-Beobachter: >=50 % ~1 s sichtbar -> gesehen ---- */
  const io = new IntersectionObserver(ents => {
    ents.forEach(e => {
      const el = e.target;
      // "Im Viewport gewesen": >=50 % des Eintrags ODER >=50 % des Viewports bedeckt
      // (grosse Karten erreichen nie 50 % ihrer selbst). Plus ~1 s Karenz.
      const rb = e.rootBounds;
      const viewportFrac = rb && rb.height ? e.intersectionRect.height / rb.height : 0;
      const gesehenGenug = e.isIntersecting && (e.intersectionRatio >= 0.5 || viewportFrac >= 0.5);
      if (gesehenGenug) el._egT = setTimeout(() => retire(el), 1000);
      else clearTimeout(el._egT);
    });
  }, { threshold: [0, 0.25, 0.5, 0.75, 1] });

  function retire(el) {
    const id = el.getAttribute("data-eintrag-id");
    if (!id || el.classList.contains("eg-done")) return;
    el.classList.add("eg-done");
    markSeen(gid(CURRENT, id));
    io.unobserve(el); clearTimeout(el._egT);
    const b = el.querySelector(".eg-neu");
    if (b) { b.classList.add("eg-fade"); setTimeout(() => b.remove(), 400); }
    renderNav();
    if (CURRENT === "politik") applyPolitikAggregat();
    // Ansichten mit eigenen Aggregaten (Analysen: Karten-/Bubble-/Zeilen-Zahlen) live nachziehen.
    document.dispatchEvent(new CustomEvent("eg:retire", { detail: { view: CURRENT, id } }));
  }

  // Kopfzeile je Ansicht, an deren Anfang die "Neu"-Pille inline sitzt
  // (keine Ecken-Ueberlagerung, kein overflow-Clipping).
  const HEAD_SEL = {
    nachrichten:    ".story-head",
    rechtsprechung: ".e-head",
    politik:        ".vtl-top",
  };
  function badgeEntry(el) {
    el.classList.add("eg-has");
    const host = el.querySelector(HEAD_SEL[CURRENT]) || el;
    const b = document.createElement("span");
    b.className = "eg-neu"; b.textContent = "Neu";
    host.insertBefore(b, host.firstChild);
    io.observe(el);
    el.addEventListener("click", () => retire(el), { once: true });
  }

  /* ---- Neu-Markierung der aktiven Ansicht anwenden ---- */
  function applyEntries() {
    const spec = NEU[CURRENT];
    if (!spec) return;
    const s = seen();
    const all = [...document.querySelectorAll("[data-eintrag-id]")];
    let targets;
    if (spec.firstN != null) {
      targets = all.filter(el => !s.has(gid(CURRENT, el.getAttribute("data-eintrag-id")))).slice(0, spec.firstN);
    } else {
      targets = all.filter(el => {
        const id = el.getAttribute("data-eintrag-id");
        return spec.ids.indexOf(id) >= 0 && !s.has(gid(CURRENT, id));
      });
    }
    targets.forEach(el => { if (!el.classList.contains("eg-has")) badgeEntry(el); });
    if (CURRENT === "politik") applyPolitikAggregat();
  }

  /* ---- Politik: aggregiertes "N neu" an der Themenzeile ---- */
  function applyPolitikAggregat() {
    const spec = NEU.politik; if (!spec) return;
    const s = seen();
    document.querySelectorAll(".row[data-id]").forEach(row => {
      const tid = row.getAttribute("data-id");
      const n = spec.ids.filter(id => id.slice(0, id.indexOf("::")) === tid && !s.has(gid("politik", id))).length;
      let tag = row.querySelector(".eg-agg");
      if (n > 0) {
        if (!tag) { tag = document.createElement("span"); tag.className = "eg-agg"; if (getComputedStyle(row).position === "static") row.style.position = "relative"; row.appendChild(tag); }
        tag.textContent = n + " neu";
      } else if (tag) tag.remove();
    });
  }

  /* ---- Avatar (Initialen) ersetzt das Einstellungs-Zahnrad (Beschluss 11) ---- */
  function renderAvatar() {
    const actions = document.querySelector(".actions");
    if (!actions || actions.querySelector(".eg-avatar")) return;
    const gear = actions.querySelector('a[href*="einstellungen"]');
    const href = gear ? gear.getAttribute("href")
      : (CURRENT === "nachrichten" ? "seiten/einstellungen.html" : "einstellungen.html");
    if (gear) gear.remove();   // Zahnrad weicht dem Avatar
    const a = document.createElement("a");
    a.className = "eg-avatar"; a.href = href;
    a.title = "Konto & Einstellungen";
    a.setAttribute("aria-label", "Konto & Einstellungen — " + EG_USER.name);
    a.textContent = EG_USER.initialen;
    actions.appendChild(a);
  }

  /* ---- CSS injizieren (keine separate Datei) ---- */
  function injectCss() {
    const css = `
      .vb-item, .vf-item, .brand { position: relative; }
      .eg-badge { position:absolute; top:-3px; right:-3px; min-width:16px; height:16px; padding:0 4px;
        border-radius:9px; background:var(--accent,#8ab0d9); color:var(--accent-ink,#0b1622);
        font:600 10px/16px Inter,system-ui,sans-serif; text-align:center; letter-spacing:.01em;
        box-shadow:0 0 0 2px var(--panel-solid,#16171c); pointer-events:none; z-index:6; }
      .vf-item .eg-badge { position:static; margin-left:auto; box-shadow:none; }
      .eg-dot { position:absolute; top:5px; right:5px; width:8px; height:8px; border-radius:50%;
        background:var(--accent,#8ab0d9); box-shadow:0 0 0 2px var(--panel-solid,#16171c); }
      .eg-neu { display:inline-flex; align-items:center; flex:none; justify-self:start; vertical-align:middle; margin-right:7px;
        padding:1px 7px; border-radius:999px; background:var(--accent,#8ab0d9); color:var(--accent-ink,#0b1622);
        font:600 10px/1.55 Inter,system-ui,sans-serif; letter-spacing:.02em;
        box-shadow:0 1px 4px rgba(0,0,0,.22); transition:opacity .35s ease; }
      .eg-neu.eg-fade { opacity:0; }
      .eg-agg { position:absolute; bottom:12px; right:14px; z-index:5; padding:1px 8px; border-radius:999px;
        background:var(--accent,#8ab0d9); color:var(--accent-ink,#0b1622);
        font:600 10.5px/1.7 Inter,system-ui,sans-serif; box-shadow:0 2px 6px rgba(0,0,0,.22); }
      .eg-avatar { display:grid; place-items:center; width:40px; height:40px; border-radius:50%; flex:none;
        background:var(--accent,#8ab0d9); color:var(--accent-ink,#0b1622); text-decoration:none;
        font:700 13px/1 Manrope,Inter,system-ui,sans-serif; letter-spacing:.02em;
        border:1px solid transparent; box-shadow:var(--shadow,0 8px 20px rgba(0,0,0,.3)); transition:transform .15s, box-shadow .15s; }
      .eg-avatar:hover { transform:translateY(-1px); box-shadow:0 10px 24px rgba(0,0,0,.35); }
      .eg-avatar:focus-visible { outline:2px solid var(--accent-strong,#a9c6e8); outline-offset:2px; }`;
    const st = document.createElement("style");
    st.id = "eg-style"; st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---- Start ---- */
  function boot() {
    injectCss();
    renderAvatar();
    renderNav();
    applyEntries();
    // Container der aktiven Ansicht beobachten (Feed/Register/Dossier rendern asynchron
    // bzw. neu bei Filterwechsel). ponytail: MutationObserver je Container, debounced;
    // reicht fuer die Demo. Wenn ein Container fehlt, faengt der body-Fallback ihn ab.
    let raf;
    const reapply = () => { clearTimeout(raf); raf = setTimeout(() => { applyEntries(); renderNav(); }, 120); };
    const mo = new MutationObserver(reapply);
    const sels = CONTAINERS[CURRENT] || [];
    let observedAny = false;
    sels.forEach(sel => { const el = document.querySelector(sel); if (el) { mo.observe(el, { childList: true, subtree: true }); observedAny = true; } });
    if (!observedAny && sels.length) mo.observe(document.body, { childList: true, subtree: true });
    // Nachzuegler-Renderer (z. B. Feed nach Karten-Load) noch zweimal einsammeln.
    setTimeout(applyEntries, 600);
    setTimeout(applyEntries, 1800);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
