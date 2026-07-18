/* ============ Rendering ============ */
const head=document.getElementById("panelHead");
const body=document.getElementById("panelBody");

/* Geteilter HTML-Baustein: Thema-Tags einer Entwicklung; ohne Themen ein
   Unkategorisiert-Tag (Story-Karten im Feed und im Standort-Detail). */
function topicTags(topics){
  return (topics&&topics.length)
    ? topics.map(t=>`<span class="topic-tag">${esc(t)}</span>`).join(" ")
    : `<span class="topic-tag">Unkategorisiert</span>`;
}
/* Geteilter HTML-Baustein: horizontales Karussell (Slides + Navigation bei >1
   Meldung). Verdrahtung uebernimmt wireCarousel. */
function carouselHTML(items){
  const slides=items.map(m=>`<div class="car-slide">${storyItemInner(m)}</div>`).join("");
  return `<div class="carousel"><div class="car-track">${slides}</div></div>
    ${items.length>1?navBar(items.length):""}`;
}
/* Liste auf limit kuerzen, gerenderte Karten + ggf. eine "+ N weitere"-Restzeile.
   restText ist der je Liste unterschiedliche Satzrest hinter "+ N " (nicht vereinheitlicht). */
function truncated(list,limit,mapFn,restText){
  const shown=list.slice(0,limit);
  const rest=list.length-shown.length;
  return shown.map(mapFn).join("")+
    (rest>0?`<div class="empty">+ ${fmtNum(rest)} ${restText}</div>`:"");
}

/* Gemeinsames Feed-Gate von globalFeed und devFeedList: je (such-)sichtbarem Standort
   alle Entwicklungen, deren Thema passt und (bei Top-Filter) die Top-Schwelle erreicht.
   Feed laeuft bewusst NICHT ueber devVisible (eigener Top-Gate, Zeitraum erst je Meldung).
   Liefert {f,d}-Paare in Feats- und Entwicklungs-Reihenfolge. */
function visibleDevelopments(feats){
  const out=[];
  feats.forEach(f=>{
    (f.properties.developments||[]).forEach(d=>{
      if(!topicMatch(d.topics))return;
      if(!personalienAllowed(d)||!processAllowed(d))return;
      if(state.topOnly&&!devTop(d))return;
      out.push({f,d});
    });
  });
  return out;
}

/* Globaler Feed: Einzelmeldungen aller (such-)sichtbaren Standorte, themen-/zeitgefiltert.
   `feats` wird vom Aufrufer einmal gefiltert übergeben (kein erneuter Voll-Scan).
   Eigene Item-/Sortier-Logik (von bereichData genutzt) — NICHT mit devFeedList mergen. */
function globalFeed(feats){
  const out=[];
  visibleDevelopments(feats).forEach(({f,d})=>{
    d.items.forEach(m=>{if(inRange(m.datum))out.push({...m,topics:d.topics,loc:f});});
  });
  out.sort((a,b)=>b.datum.localeCompare(a.datum));
  return out;
}

/* Globaler Feed gebuendelt: pro sichtbarer Entwicklung hoechstens eine Karte.
   Eine Entwicklung ist sichtbar (visibleDevelopments) und hat mindestens eine Meldung im
   Zeitraum. Items werden auf den Zeitraum gefiltert, juengste zuerst.
   (Logik aus varianten/feed-ohne-auswahl.html `devFeed`, hier 1:1 fuer die Hauptansicht.) */
function devFeedList(feats){
  const out=[];
  visibleDevelopments(feats).forEach(({f,d})=>{
    const items=(d.items||[]).filter(m=>inRange(m.datum)).sort((a,b)=>b.datum.localeCompare(a.datum));
    if(!items.length)return;
    out.push({loc:f,topics:d.topics,items,latest:items[0],count:items.length,top:devTop(d)});
  });
  out.sort((a,b)=>b.latest.datum.localeCompare(a.latest.datum));
  return out;
}
/* Globaler/Bereichs-Feed dedupliziert: dieselbe Meldung/Entwicklung haengt in den
   Realdaten an mehreren Kliniken (derselbe Artikel ist mehreren Standorten zugeordnet) und ergaebe
   sonst je Haus eine eigene Karte. Entwicklungen mit gleichem Leitartikel (URL, sonst normalisierter
   Titel) werden zu EINER Karte zusammengefasst: Repraesentant ist die reichste Kette (meiste
   Meldungen), die uebrigen betroffenen Haeuser erscheinen als klickbares "Betrifft N Standorte". */
function feedKey(x){const u=safeUrl(x.latest&&x.latest.url);return u?("u:"+u):("t:"+searchNorm((x.latest&&x.latest.titel)||""));}
function dedupeFeed(list){
  const byKey=new Map(),order=[];
  for(const x of list){
    const k=feedKey(x);
    if(!byKey.has(k)){byKey.set(k,{...x,clinics:[x.loc].filter(Boolean)});order.push(k);}
    else{const e=byKey.get(k);
      if(x.loc&&!e.clinics.includes(x.loc))e.clinics.push(x.loc);
      if(x.count>e.count){const clinics=e.clinics;Object.assign(e,x);e.clinics=clinics;}   // reichste Kette fuehrt
    }
  }
  return order.map(k=>byKey.get(k));
}
/* Eine (ggf. deduplizierte) Entwicklung als Story-Karte mit horizontalem Karussell
   (wie im Standort-Detail, wischbar). Bei einer Klinik traegt data-loc die Standort-ID fuer den
   Karten-Klick; bei mehreren Kliniken steht statt der Ort-Marke das "Betrifft N Standorte"-Badge
   mit klickbarer Standortliste (Karten-Klick dann deaktiviert). */
function feedStoryCard(x){
  const clinics=(x.clinics&&x.clinics.length)?x.clinics:[x.loc].filter(Boolean);
  const multi=clinics.length>1;
  const id=(!multi&&x.loc)?esc(x.loc.properties.standort_id):"";
  const tags=topicTags(x.topics);
  // Kopf in EINER Zeile: links Ort (eine Klinik) bzw. kompaktes "Betrifft N Standorte"-Chip
  // (mehrere), rechts das/die Thema-Tag(s). Datum/Zähler stehen ohnehin im Slide bzw. in der Navigation.
  const who=multi
    ? `<button class="multi-badge" type="button" data-action="toggle-affected"><span class="material-symbols-outlined" aria-hidden="true">location_city</span>Betrifft ${clinics.length} Standorte<span class="material-symbols-outlined chev" aria-hidden="true">expand_more</span></button>`
    : `<button class="loc-chip" type="button" data-action="select-location" data-loc="${id}"><span class="material-symbols-outlined" aria-hidden="true">location_on</span>${x.loc?esc(x.loc.properties.name):""}</button>`;
  const affected=multi
    ? `<div class="affected">${clinics.map(c=>`<button class="aff-row" type="button" data-action="select-location" data-loc="${esc(c.properties.standort_id)}"><span class="material-symbols-outlined" aria-hidden="true">location_on</span><b>${esc(c.properties.name)}</b></button>`).join("")}</div>`
    : "";
  return `<div class="story" data-loc="${id}" data-eintrag-id="${esc(feedKey(x))}">
    <div class="story-head">${who}<div class="story-tags">${tags}</div></div>
    ${affected}
    ${carouselHTML(x.items)}
  </div>`;
}
/* Karussell einer Story verdrahten: prev/next/dots blaettern, go(n) setzt translateX,
   aktiven Dot und disabled-Zustaende; Swipe via attachCarouselSwipe. Eine einzelne
   Meldung (kein .car-track oder max<1) bleibt unverdrahtet. */
function wireCarousel(story){
  const carousel=story.querySelector(".carousel");
  const track=story.querySelector(".car-track");
  if(!track)return;
  const max=track.children.length-1;
  if(max<1)return; // einzelne Meldung: nichts zu blättern oder zu wischen
  const prev=story.querySelector(".prev"),next=story.querySelector(".next");
  const dots=[...story.querySelectorAll(".dot")];
  const cb=story.querySelector(".car-count b");
  let i=0;
  const go=n=>{i=Math.max(0,Math.min(max,n));track.classList.remove("dragging");
    track.style.transform=`translateX(${-i*100}%)`;
    dots.forEach((d,k)=>d.classList.toggle("on",k===i));
    if(cb)cb.textContent=i+1;if(prev)prev.disabled=i===0;if(next)next.disabled=i===max;};
  if(prev)prev.addEventListener("click",()=>go(i-1));if(next)next.addEventListener("click",()=>go(i+1));
  dots.forEach((d,k)=>d.addEventListener("click",()=>go(k)));
  go(0);
  attachCarouselSwipe(carousel,track,()=>i,go);
}
/* Story-Karten im Feed verdrahten: Karussell (prev/next/dots/go + Swipe) wie im
   Standort-Detail UND Klick auf die Karte -> selectLocation. Swipe-Guard: ein Klick wird
   unterdrueckt, wenn ein interaktives Element getroffen wurde oder zwischen down/up > 8px
   gewischt wurde. */
function wireFeedStories(){
  body.querySelectorAll(".story").forEach(story=>{
    wireCarousel(story);
    // Swipe-Guard: Pointer-Bewegung zwischen down/up auf der Karte messen.
    let downX=0,downY=0,moved=false;
    story.addEventListener("pointerdown",e=>{downX=e.clientX;downY=e.clientY;moved=false;});
    story.addEventListener("pointerup",e=>{
      if(Math.abs(e.clientX-downX)>8||Math.abs(e.clientY-downY)>8)moved=true;
    });
    story.addEventListener("click",e=>{
      if(e.target.closest("a,button"))return;   // Karussell-Knoepfe/Links nicht abfangen
      if(moved)return;                            // gewischt -> kein Select
      if(story.dataset.loc)selectLocation(story.dataset.loc);
    });
  });
}

/* Der Dossier-Kopf (Titel, Beschreibung, Kennzahlen, Sparkline) stand hier bis 2026-07-18.
   Entfernt mit den kuratierten Dossiers; Begruendung und die offenen Fragen fuer eine
   spaetere Umsetzung: docs/prd/karten-frontend.md, „Zurueckgestellt: kuratierte Dossiers". */

/* Feed ohne Auswahl: gebuendelt je Entwicklung (Karussell-Karten), Top-Entwicklungen
   zuerst (zweistufig wie Variante 3), "Top" = devTop (Kette >= TOP_MIN_MELDUNGEN). */
function renderFeed(){
  const list=dedupeFeed(devFeedList(visibleFeats()));
  const top=list.filter(x=>x.top);
  const rest=list.filter(x=>!x.top);
  const gesamtMeldungen=list.reduce((s,x)=>s+x.count,0);
  head.innerHTML=`
    <div class="eyebrow">Marktbeobachtung</div>
    <h2 class="feed-title">Aktuelle Artikel</h2>
    <div class="feed-sub"><span class="live-dot"></span>${fmtNum(top.length)} Top-Artikel · ${fmtNum(gesamtMeldungen)} Artikel aus ${rangeLabel()}</div>`;

  if(!list.length){
    body.innerHTML=`<div class="empty">Keine Artikelketten im gewählten Zeitraum oder Filter.</div>`;
    return;
  }

  // Vorgangs-Block ganz oben: „Was bewegt sich?“ ist die Einstiegsfrage ohne Auswahl.
  // Zugeklappt kostet er eine Zeile, damit die Artikelliste der Star bleibt.
  let html=vorgangBlock(vorgangList(visibleFeats()),vorgaengeOffen("feed"));
  if(state.topOnly||rest.length===0){
    // Nur Karten, ohne Band-Header (entweder Top-Filter aktiv oder es gibt nur Top-Karten).
    html+=truncated(list,FEED_STORY_LIMIT,feedStoryCard,"weitere Artikelketten — Zeitraum, Thema oder Suche eingrenzen.");
  }else{
    // Zweistufig: Top-Artikel zuerst, dann Weitere Artikel. Gesamt-Karten auf ~40 begrenzt.
    const topBudget=Math.min(FEED_STORY_LIMIT,top.length);
    const budget=FEED_STORY_LIMIT-topBudget;   // Restbudget fuer "Weitere Artikel"
    if(top.length){
      html+=`<div class="feed-band"><span class="material-symbols-outlined" aria-hidden="true">star</span>Top-Artikel<span class="fb-n">${fmtNum(top.length)} Artikelketten</span></div>`;
      html+=truncated(top,topBudget,feedStoryCard,"weitere Top-Artikel.");
    }
    if(rest.length){
      html+=`<div class="feed-band second"><span class="material-symbols-outlined" aria-hidden="true">article</span>Weitere Artikel<span class="fb-n">${fmtNum(rest.length)} Artikelketten</span></div>`;
      html+=truncated(rest,Math.max(0,budget),feedStoryCard,"weitere Artikel — Zeitraum, Thema oder Suche eingrenzen.");
    }
  }
  body.innerHTML=html;
  wireFeedStories();
}

/* Sparkline: Meldungen je Monat über 12 Monate (aus den realen Einzelmeldungen). */
function sparkData(f){
  const months=Array.from({length:12},(_,i)=>{const dt=new Date(TODAY.getFullYear(),TODAY.getMonth()-11+i,1);return dt.getFullYear()*12+dt.getMonth();});
  const counts=months.map(()=>0);
  (f.properties.developments||[]).forEach(d=>d.items.forEach(m=>{
    const dt=new Date(m.datum);const key=dt.getFullYear()*12+dt.getMonth();const idx=months.indexOf(key);if(idx>=0)counts[idx]++;
  }));
  return counts;
}

/* Entwicklungen des Standorts, themen-/zeitgefiltert (jüngste zuerst, wie im Export). */
function devList(f){return (f.properties.developments||[]).filter(devVisible);}
/* Kuratierte Themen, die am Standort vorkommen (für die Panel-Chips). */
/* Bewusst TOPICS_ALS_CHIP, nicht TOPICS: sonst boete der Standort ein Thema als Chip an,
   das sich in der Filterleiste gar nicht wieder abwaehlen laesst (dort fehlt der Chip). */
function locTopics(f){const s=new Set();(f.properties.developments||[]).forEach(d=>(d.topics||[]).forEach(t=>s.add(t)));return TOPICS_ALS_CHIP.filter(t=>s.has(t));}

function notfallLabel(n){return {0:"Keine Notfallstufe",1:"Basisnotfall (St. 1)",2:"Erweitert (St. 2)",3:"Umfassend (St. 3)",9:"Spezialversorgung"}[n]||"Notfallstufe k. A.";}
/* Fälle als Kennzahlen-Chip mit Schwärzung: exakter Wert > Größenklasse (geschwärzt) > k. A. */
function faelleChip(p){
  if(p.faelle!=null)return `<span class="id-stat-chip"><span class="material-symbols-outlined" aria-hidden="true">person</span><b>${fmtNum(p.faelle)}</b>&thinsp;Fälle/J.</span>`;
  if(p.faelle_skala!=null)return `<span class="id-stat-chip muted" title="Fallzahl geschwärzt — nur Größenklasse"><span class="material-symbols-outlined" aria-hidden="true">person</span><b>Größenkl. ${p.faelle_skala}/5</b></span>`;
  return `<span class="id-stat-chip muted"><span class="material-symbols-outlined" aria-hidden="true">person</span><b>k. A.</b>&thinsp;Fälle</span>`;
}

function storyItemInner(m){
  const link=safeUrl(m.url);
  const title=link
    ? `<a class="st-link" href="${esc(link)}" target="_blank" rel="noopener">${esc(m.titel)}<span class="material-symbols-outlined st-ext" aria-hidden="true">north_east</span></a>`
    : esc(m.titel);
  const src=link
    ? `<a class="st-src" href="${esc(link)}" target="_blank" rel="noopener"><span class="material-symbols-outlined" aria-hidden="true">newspaper</span>Quelle: ${esc(m.quelle)}<span class="material-symbols-outlined st-ext" aria-hidden="true">north_east</span></a>`
    : `<span class="st-src"><span class="material-symbols-outlined" aria-hidden="true">newspaper</span>Quelle: ${esc(m.quelle)}</span>`;
  return `<div class="st-date">${fmtDate(m.datum)}</div>
    <h4 class="st-title">${title}</h4>
    ${m.teaser?`<div class="st-teaser">${esc(m.teaser)}</div>`:""}
    ${src}`;
}
function navBar(n){
  return `<div class="car-nav">
    <button class="car-btn prev" aria-label="Vorheriger Artikel"><span class="material-symbols-outlined" aria-hidden="true">chevron_left</span></button>
    <div class="dots">${Array.from({length:n},(_,i)=>`<span class="dot ${i===0?'on':''}" data-i="${i}"></span>`).join("")}</div>
    <div class="car-count"><b>1</b>/${n}</div>
    <button class="car-btn next" aria-label="Nächster Artikel"><span class="material-symbols-outlined" aria-hidden="true">chevron_right</span></button>
  </div>`;
}

/* Wischgeste fürs Entwicklungs-Karussell: horizontal blättert die Meldungen,
   vertikal bleibt dem Panel-Scroll überlassen (touch-action:pan-y im CSS).
   Nutzt Pointer-Events, funktioniert also auch mit Maus-Drag am Desktop. */
function attachCarouselSwipe(carousel,track,getIndex,go){
  const lastIdx=()=>track.children.length-1;
  let active=false,axis=null,startX=0,startY=0,w=0,baseX=0;
  carousel.addEventListener("pointerdown",e=>{
    if(e.pointerType==="mouse"&&e.button!==0)return;
    active=true;axis=null;startX=e.clientX;startY=e.clientY;
    w=carousel.clientWidth||1;baseX=-getIndex()*w;
  });
  carousel.addEventListener("pointermove",e=>{
    if(!active)return;
    const dx=e.clientX-startX,dy=e.clientY-startY;
    if(axis===null){
      if(Math.abs(dx)<6&&Math.abs(dy)<6)return;       // noch unentschieden
      axis=Math.abs(dx)>Math.abs(dy)?"x":"y";          // Richtung festlegen
      if(axis==="x"){track.classList.add("dragging");try{carousel.setPointerCapture(e.pointerId);}catch(_){ }}
    }
    if(axis!=="x")return;                               // vertikal: Panel scrollt
    e.preventDefault();
    let off=baseX+dx;const min=-lastIdx()*w;
    if(off>0)off*=0.35; else if(off<min)off=min+(off-min)*0.35;  // Rand-Widerstand
    track.style.transform=`translateX(${off}px)`;
  });
  function release(e){
    if(!active)return;active=false;
    if(axis==="x"){
      const dx=e.clientX-startX,i=getIndex(),thresh=Math.min(64,w*0.2);
      go(dx<=-thresh?i+1:dx>=thresh?i-1:i);            // über Schwelle blättern, sonst zurück
    }
    axis=null;
  }
  carousel.addEventListener("pointerup",release);
  carousel.addEventListener("pointercancel",release);
}

function toggleAffectedList(button,list){
  button.classList.toggle("open");
  if(list)list.classList.toggle("open");
}

/* Mehr-Standort-Fixtures liegen in hauptansicht-fixtures.js. Der Renderer
   konsumiert nur den expliziten Fixture-Vertrag: Anker-Standort, Titel-Match,
   Partner-Standort-IDs. */
function multiClinicFor(f,d){
  const c=CURATED_MULTI_CLINIC_DEVELOPMENTS[f.properties.standort_id];
  if(!c)return null;
  const firstTitle=(d.items&&d.items[0]&&d.items[0].titel)||"";
  if(c.match && !firstTitle.includes(c.match))return null;   // nur die passende Entwicklung des Ankers
  const picks=c.partners.map(id=>byId.get(id)).filter(Boolean)
    .map(o=>({self:false,id:o.properties.standort_id,name:o.properties.name}));
  if(!picks.length)return null;   // Partner nicht im Datensatz -> kein Badge
  return [{self:true,id:f.properties.standort_id,name:f.properties.name},...picks];
}

/* Reiner HTML-Bauer fuer den Standort-Kopf: Steckbrief, Kennzahlen-Strip und
   Mini-Sparkline (Meldungen je Monat, fester Max 5). */
function standortHead(p,f){
  // Mini-Sparkline fester Max 5 (Variante A): Balkenhöhen über Standorte vergleichbar,
  // Werte über dem Deckel werden auf voll gekappt — keine Spitze/Max-Unterscheidung.
  const spark=sparkData(f);const CAP=5;
  const miniBars=spark.map(c=>{const v=Math.min(c,CAP);return '<i class="'+(c>0?'hot':'')+'" style="height:'+(3+Math.round(v/CAP*17))+'px"></i>';}).join("");
  let n90=0;(p.developments||[]).forEach(d=>d.items.forEach(m=>{if(daysAgo(m.datum)<=90)n90++;}));
  const url=safeUrl(p.website);
  // Icon-Meta-Zeile: Träger · Ort · (Website) · Notfallstufe (+ optionale Pill-Chips — nichts versteckt).
  // Website ist ein sprechend beschriftetes Glied dieser Zeile (Domain statt Globus-Icon),
  // sitzt platzsparend ohne eigene Zeile direkt unter dem Klinik-Namen.
  const meta=[
    `<span class="id-meta-item"><span class="material-symbols-outlined" aria-hidden="true">apartment</span>${esc(p.traeger||"Träger k. A.")}</span>`,
    `<span class="id-meta-item"><span class="material-symbols-outlined" aria-hidden="true">location_on</span>${esc(p.city)}</span>`,
  ];
  if(url)meta.push(`<a class="id-meta-item id-meta-link" href="${esc(url)}" target="_blank" rel="noopener" title="Website öffnen"><span class="material-symbols-outlined" aria-hidden="true">language</span>${esc(prettyHost(url))}</a>`);
  meta.push(`<span class="id-meta-item pill-chip">${esc(notfallLabel(p.notfall))}</span>`);
  if(p.kinder)meta.push(`<span class="id-meta-item pill-chip">Kinderklinik</span>`);
  if(p.sicherstellung)meta.push(`<span class="id-meta-item pill-chip">Sicherstellungsauftrag</span>`);
  return `
    <div class="id-headrow">
      <button class="back" type="button" data-action="clear-selection"><span class="material-symbols-outlined" aria-hidden="true">arrow_back</span>${state.frozen?"Zurück zum Ausschnitt":"Alle Artikel"}</button>
    </div>
    <div class="eyebrow">${esc(p.region)}</div>
    <h2 class="id-name">${esc(p.name)}</h2>
    <div class="id-meta-row">${meta.join("")}</div>
    <div class="id-stat-row">
      <span class="id-stat-chip"><span class="material-symbols-outlined" aria-hidden="true">bed</span><b>${fmtNum(p.beds)}</b>&thinsp;Betten</span>
      ${faelleChip(p)}
      <span class="id-stat-chip"><span class="material-symbols-outlined" aria-hidden="true">home_health</span><b>${p.abteilungen}</b>&thinsp;Abt.*</span>
      <div class="id-activity">
        <div class="id-act-cap"><b>${n90}</b> Artikel · 90 Tage</div>
        <div class="mini-spark" title="Artikel je Monat">${miniBars}</div>
      </div>
    </div>`;
}
/* Eine Story-Karte im Standort-Detail: Thema-Tags, optionales Mehr-Klinik-Badge
   aus dem Fixture-Asset plus die aufklappbare Standortliste, dann das Karussell. */
function standortStoryCard(f,d){
  const tags=topicTags(d.topics);
  const clinics=multiClinicFor(f,d);
  const multiBadge=clinics?`<button class="multi-badge" type="button" data-action="toggle-affected"><span class="material-symbols-outlined" aria-hidden="true">location_city</span>Betrifft ${clinics.length} Standorte<span class="material-symbols-outlined chev" aria-hidden="true">expand_more</span></button>
      <div class="affected">${clinics.map(c=>c.self
        ? `<div class="aff-row self"><span class="material-symbols-outlined" aria-hidden="true">my_location</span><b>${esc(c.name)}</b></div>`
        : `<button class="aff-row" type="button" data-action="select-location" data-loc="${esc(c.id)}"><span class="material-symbols-outlined" aria-hidden="true">location_on</span><b>${esc(c.name)}</b></button>`).join("")}</div>`:"";
  return `<div class="story">
      <div class="story-head">
        <div class="story-tags">${tags}</div>
      </div>
      ${multiBadge}
      ${carouselHTML(d.items)}
    </div>`;
}
/* ============ Vorgangs-Block „Was bewegt sich?“ ============
   EIN Bauteil fuer alle drei Panel-Zustaende (Feed, Bereich, Standort). Unterschiedlich ist
   nur, WO er sitzt und WIE VIELE Zeilen er zeigt — nie die Bauform. Standardmaessig zu; nur
   im Standort-Zustand startet er offen, weil man dort ohnehin ein einzelnes Haus im Blick hat
   und die Liste meist genau einen Vorgang lang ist.
   Gewaehlt 2026-07-18, siehe varianten/vorgaenge-sidepanel.html. */

/* Ein Vorgang je Zeile: Typ-Icon, Titel, Mini-Zeitstrahl, Stand. Jeder Schritt des
   Zeitstrahls fuehrt zu seinem Beleg-Artikel — dadurch bleiben die Quellen erreichbar,
   ohne dauerhaft Hoehe zu kosten. */
function vorgangRow(v,standortId){
  const schritte=v.zustandsHistorie||[];
  const letzter=schritte.length-1;
  const tl=schritte.map((t,i)=>{
    const artikel=CURATED_VORGANG_ARTIKEL[t.belegArtikelId]||{};
    const link=safeUrl(artikel.url);
    const cls="node"+(i===letzter?" cur":"");
    const inner=`<span class="dot" aria-hidden="true"></span><span class="lab">${esc(t.zustand)}</span>`;
    const titel=`${fmtDate(t.datum)} · ${t.zustand}${artikel.quelle?` — Beleg: ${artikel.quelle}`:""}`;
    return link
      ? `<a class="${cls}" href="${esc(link)}" target="_blank" rel="noopener" title="${esc(titel)}">${inner}</a>`
      : `<span class="${cls}" title="${esc(titel)}">${inner}</span>`;
  }).join('<span class="seg" aria-hidden="true"></span>');
  // Zeile waehlt den Standort — im Standort-Zustand ist das bereits der aktuelle, dann ohne Wirkung.
  return `<button class="vrow" type="button" data-action="select-location" data-loc="${esc(standortId)}">
    <span class="vico ${esc(v.typ)}"><span class="material-symbols-outlined" aria-hidden="true">${esc(VORGANG_ICON[v.typ]||"account_tree")}</span></span>
    <span class="vmain">
      <span class="vtitle">${esc(v.titel)}</span>
      <span class="mtl">${tl}</span>
    </span>
    <span class="vdate">${esc(fmtDate(v.stand))}</span>
  </button>`;
}
/* gavel gehoert der Rechtsprechung (Viewbar/seiten/rechtsprechung.html) — Vorgaenge nutzen es nicht.
   euro statt money_off: money_off ist ein durchgestrichener Dollar. Ein Durchstrich auf dem
   Euro-Glyph geht nicht — der Strich loescht das runde Zeichen in 16px aus; beim Dollar bleibt
   dessen senkrechter Balken stehen. Zahlungsunfaehigkeit tragen hier Farbe (--warn) und Titel. */
const VORGANG_ICON={insolvenzverfahren:"euro",traegerwechsel:"swap_horiz",standortschliessung:"block",
  neubau:"construction",kooperation:"handshake"};

/* Sammelt sichtbare Vorgaenge ueber mehrere Standorte, jeweils mit ihrem Standort verknuepft.
   devVisible() haelt Zeitraum, Thema, Suche und den Vorgangsfilter der Filterleiste ein. */
function vorgangList(feats){
  const out=[];
  feats.forEach(f=>(f.properties.developments||[]).forEach(d=>{
    if(d.ap4Kind==="vorgang"&&d.vorgang&&devVisible(d))
      out.push({v:d.vorgang,standortId:f.properties.standort_id});
  }));
  return out.sort((a,b)=>String(b.v.stand).localeCompare(String(a.v.stand)));
}

/* Offen-Zustand: null = noch nicht angefasst, dann entscheidet der Panel-Zustand.
   Sobald der Nutzer einmal klickt, gilt seine Wahl ueberall und bleibt erhalten — sonst
   wuerde der Block bei jedem Re-Render wieder zuklappen, waehrend man ihn liest. */
function vorgaengeOffen(mode){
  return state.vorgaengeOffen===null ? mode==="standort" : state.vorgaengeOffen;
}
function vorgangBlock(eintraege,offen){
  if(!eintraege.length)return "";   // kein Vorgang -> kein Block, keine leere Pille
  const n=eintraege.length;
  return `<div class="vblock" data-open="${offen?"true":"false"}">
    <button class="vb-head" type="button" data-action="toggle-vorgaenge" aria-expanded="${offen?"true":"false"}">
      <span class="material-symbols-outlined vb-ico" aria-hidden="true">timeline</span>
      <span class="vb-q">Was bewegt sich?</span>
      <span class="vb-n">${fmtNum(n)} ${n===1?"Vorgang":"Vorgänge"}</span>
      <span class="material-symbols-outlined vb-car" aria-hidden="true">expand_more</span>
    </button>
    <div class="vb-list">${eintraege.map(e=>vorgangRow(e.v,e.standortId)).join("")}</div>
  </div>`;
}
function standortVorgangSection(f){
  const eintraege=(f.properties.developments||[])
    .filter(d=>d.ap4Kind==="vorgang"&&d.vorgang&&devVisible(d))
    .map(d=>({v:d.vorgang,standortId:f.properties.standort_id}));
  return vorgangBlock(eintraege,vorgaengeOffen("standort"));
}
/* Reiner HTML-Bauer fuer den Standort-Body: optionale Themen-Sektion und der
   Meldungs-Verlauf (Story-Karten je sichtbarer Entwicklung). */
function standortBody(f){
  // Themen-Sektion nur, wenn der Standort kuratierte Themen hat (sonst kostet sie nur Höhe).
  const present=locTopics(f);
  const topicSection=present.length?`
    <div class="section topics-at-loc">
      <div class="eyebrow tight">Themen am Standort</div>
      <div class="topic-row tight">${present.map(t=>`<button class="chip ${state.topics.has(t)?'on':''}" data-action="toggle-topic" data-topic="${esc(t)}">${esc(t)}<span class="count-soft">0</span></button>`).join("")}</div>
    </div>`:"";
  const devs=devList(f);
  const totalM=devs.reduce((s,d)=>s+d.items.length,0);
  const storyCards=devs.map(d=>standortStoryCard(f,d)).join("");
  return `${topicSection}
    ${standortVorgangSection(f)}
    <div class="section" style="margin-top:${present.length?16:10}px">
      <div class="timeline-head"><div class="eyebrow">Artikel-Verlauf</div>
        <div class="count">${devs.length} Artikelketten · ${totalM} Artikel</div></div>
      ${devs.length?storyCards:`<div class="empty">Keine Artikelketten im gewählten Zeitraum oder Thema.</div>`}
    </div>
    <div class="proto-note">* Fachabteilungs-Zahl im Prototyp erfunden; übrige Kennzahlen real (BKA/QB).</div>`;
}
/* Analysen-Teaser (Eingeloggt-Demo, Beschluss 15-17): erscheint im Standort-Panel nur
   fuer Haeuser mit Analysen-Daten (die 8 HH-Haeuser; Match ueber den exakten Klinik-
   namen = CLINICS[id].full aus analysen-data.js). Wortleiter + bundesweites Perzentil
   auf Hausebene und die druckstaerkste Leistungsfamilie stammen 1:1 aus der Markt-Linse
   (befundMarkt): hausDruck = fallvolumengewichtetes Mittel der Familien-Druckwerte.
   ponytail: dieser Aggregatwert ist im Mock haus-unabhaengig (P61 "hoch",
   Koronarintervention), daher fest verdrahtet statt nachgerechnet. */
const ANALYSEN_HAEUSER={
  "Universitätsklinikum Hamburg-Eppendorf (UKE)":"uke",
  "Asklepios Klinik St. Georg":"stgeorg",
  "Asklepios Klinik Altona":"altona",
  "Asklepios Klinik Barmbek":"barmbek",
  "Kath. Marienkrankenhaus gGmbH":"marien",
  "Albertinen Krankenhaus-Albertinen Haus":"albertinen",
  "Bethesda Krankenhaus Bergedorf gGmbH":"bethesda",
  "Johanniter-Krankenhaus Geesthacht":"geesthacht",
};
function analysenTeaser(name){
  const hid=ANALYSEN_HAEUSER[name];
  if(!hid)return "";   // Haus ohne Analysen-Daten -> Block erscheint gar nicht
  return `<a class="analysen-teaser" href="seiten/analysen.html?haus=${hid}&linse=3">
    <div class="at-absender"><span class="material-symbols-outlined" aria-hidden="true">insights</span>Analysen · Markt &amp; Wettbewerb</div>
    <div class="at-lead">Wettbewerbsdruck: <b>hoch</b> <span class="at-p">P61 bundesweit</span></div>
    <div class="at-fam">am stärksten unter Druck: <b>Koronarintervention</b></div>
    <span class="at-cta">Zur Markt-Analyse<span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></span>
  </a>`;
}
function renderStandort(f){
  head.innerHTML=standortHead(f.properties,f);
  body.innerHTML=standortBody(f)+analysenTeaser(f.properties.name);
  body.querySelectorAll(".story").forEach(wireCarousel);
}

/* ============ Bereichs-Feed (eingefrorener Cluster) ============ */
function frozenFeats(){return state.frozen?[...state.frozen.ids].map(id=>byId.get(id)).filter(Boolean):[];}
/* Bereichs-Daten: Meldungen je Klinik gruppiert, nach Aktivität sortiert.
   X = Mitglieder mit >=1 sichtbarer Meldung; total = alle Mitglieder im Cluster. */
function bereichData(){
  const feats=frozenFeats();
  const items=globalFeed(feats);
  const perClinic=new Map();   // standort_id -> {f, items:[]}
  items.forEach(m=>{const id=m.loc.properties.standort_id;
    if(!perClinic.has(id))perClinic.set(id,{f:m.loc,items:[]});
    perClinic.get(id).items.push(m);});
  const order=[...perClinic.values()].sort((a,b)=>b.items.length-a.items.length);
  return {feats,items,order,X:order.length,Y:items.length,total:feats.length};
}
function noNewsRow(){return `<div class="kl-rest">Keine Klinik im Bereich hat Artikel im gewählten Zeitraum/Thema.</div>`;}
function restNote(d){return d.total-d.X>0?`<div class="kl-rest">+ ${fmtNum(d.total-d.X)} weitere Standorte im Bereich ohne Artikel im Zeitraum.</div>`:"";}
function klinikListHTML(order){
  return order.map(g=>{const p=g.f.properties;
    return `<button class="kl-row" type="button" data-action="select-location" data-loc="${esc(p.standort_id)}">
      <span class="kl-name"><b>${esc(p.name)}</b><small>${esc([p.traeger,p.city].filter(Boolean).join(" · "))}</small></span>
      <span class="kl-n">${g.items.length}</span>
      <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
    </button>`;}).join("");
}
/* Panel-Inhalt "Umschalter" (GEWÄHLT 2026-06-14): Endnutzer wählt oben selbst
   zwischen gebündeltem Feed und der Klinikliste; Default-Tab = Feed. */
function renderBereich(){
  const d=bereichData();
  // Begriffs-Set "Gewählter Ausschnitt" / Tabs "Artikel / Standorte".
  head.innerHTML=`
    <div class="area-chip">
      <span class="ac-ico"><span class="material-symbols-outlined" aria-hidden="true">lasso_select</span></span>
      <span class="ac-txt"><b>Gewählter Ausschnitt</b><small>${fmtNum(d.total)} Standorte · ${fmtNum(d.Y)} Artikel · ${rangeLabel()}</small></span>
      <button class="ac-btn" type="button" data-action="zoom-area" title="In den Bereich zoomen" aria-label="In den Bereich zoomen"><span class="material-symbols-outlined" aria-hidden="true">zoom_in</span></button>
      <button class="ac-btn" type="button" data-action="clear-area" title="Bereich aufheben" aria-label="Bereich aufheben"><span class="material-symbols-outlined" aria-hidden="true">close</span></button>
    </div>
    <div class="cluster-counts" data-countvar="kompakt"><span><b>${fmtNum(d.X)}</b> Standorte mit Artikel</span></div>`;

  const tab=state.bereichTab||"feed";
  // "Artikel"-Tab zeigt nach Artikelkette gebuendelte Karussell-Karten (feedStoryCard).
  const storyFeed=()=>{
    const list=dedupeFeed(devFeedList(frozenFeats()));
    if(!list.length)return `<div class="empty">Keine Artikelketten in diesem Bereich im gewählten Zeitraum/Thema.</div>`;
    return truncated(list,FEED_STORY_LIMIT,feedStoryCard,"weitere Artikelketten im Bereich.");
  };
  const klinikenBlock=`<div class="kl-list">${d.order.length?klinikListHTML(d.order):noNewsRow()}</div>`+restNote(d);
  // Im Bereich sitzt der Block an derselben Stelle wie im Feed, aber ueber den Tabs:
  // die Zahl in der Pille sagt sofort, ob im Ausschnitt ueberhaupt etwas laeuft.
  body.innerHTML=vorgangBlock(vorgangList(frozenFeats()),vorgaengeOffen("bereich"))
    +`<div class="subtabs" id="bereichTabs">
      <button type="button" data-action="set-area-tab" data-tab="feed" class="${tab==="feed"?"on":""}">Artikel</button>
      <button type="button" data-action="set-area-tab" data-tab="kliniken" class="${tab==="kliniken"?"on":""}">Standorte (${fmtNum(d.X)})</button>
    </div>`+(tab==="feed"?storyFeed():klinikenBlock);

  if(tab==="feed")wireFeedStories();
}

/* Spalten-Modus (Mauerwerk): den Mauerwerk-Container je Zustand festlegen. Er braucht
   auto-Höhe — CSS-Multicol darf NICHT auf dem höhen-begrenzten Scroller #panelBody liegen,
   sonst entstehen horizontale Überlauf-Spalten. Feed/Bereich: die frisch gerenderten
   flachen Kinder in einen .masonry-Wrapper packen (Event-Listener bleiben beim Verschieben
   erhalten). Standort: die Verlaufs-Section (mit .story/.timeline-head) bekommt .masonry.
   Greift per CSS nur im .two-col-Zustand; das Markup wird trotzdem immer vorbereitet,
   damit der Spalten-Griff ohne Re-Render umschalten kann. */
function applyPanelMasonry(mode){
  body.classList.remove("mode-feed","mode-bereich","mode-standort");
  body.classList.add("mode-"+mode);
  if(mode==="standort"){
    body.querySelectorAll(".section").forEach(sec=>
      sec.classList.toggle("masonry", !!sec.querySelector(".story,.timeline-head")));
    return;
  }
  if(body.firstElementChild&&body.firstElementChild.classList.contains("masonry"))return;
  const wrap=document.createElement("div");
  wrap.className="masonry";
  while(body.firstChild)wrap.appendChild(body.firstChild);
  body.appendChild(wrap);
}

/* Drei Zustände: Standort (selectedId) > Bereich (frozen) > globaler Feed. */
function renderPanel(){
  let mode;
  if(state.selectedId&&byId.has(state.selectedId)){renderStandort(byId.get(state.selectedId));mode="standort";}
  else if(state.frozen){renderBereich();mode="bereich";}
  else {renderFeed();mode="feed";}
  applyPanelMasonry(mode);
  updateTopicCounts();   // Panel- (sofern Standort) und Filterleisten-Chips frisch halten
}

function setSheetState(next){
  if(next)sheetState=next;
  if(mobileMQ.matches)applySheet();
}
function syncControls(){
  syncTopicChips();
  syncFilterTriggers();
  syncTopOnly();
  syncPersonalienFilter();
  syncProcessFilter();
  if(typeof syncPeriodRef==="function")syncPeriodRef();   // Kalenderfilter (Ebene + Periode) spiegeln
  updateTopicCounts();
}
function commitView({mapSync="none",closeFilters=false,sheet=null,flyToFeature=null}={}){
  if(mapSync==="rebuild"){rebuildSource();applyHighlight();}
  else if(mapSync==="unlessFrozen")rebuildUnlessFrozen();
  else if(mapSync==="highlight")applyHighlight();
  renderPanel();
  syncControls();
  if(closeFilters)closeFilterPop();
  if(sheet)setSheetState(sheet);
  if(flyToFeature)flyTo(flyToFeature);
}

function handlePanelAction(e){
  const actionEl=e.target.closest("[data-action]");
  if(!actionEl)return;
  const action=actionEl.dataset.action;
  if(action==="select-location"){
    e.stopPropagation();
    selectLocation(actionEl.dataset.loc);
  }else if(action==="toggle-topic"){
    e.stopPropagation();
    toggleTopic(actionEl.dataset.topic);
  }else if(action==="clear-selection"){
    e.stopPropagation();
    clearSelection();
  }else if(action==="clear-area"){
    e.stopPropagation();
    clearBereich();
  }else if(action==="zoom-area"){
    e.stopPropagation();
    zoomToBereich();
  }else if(action==="toggle-vorgaenge"){
    e.stopPropagation();
    // Direkt am DOM umschalten statt neu zu rendern: sonst springt der Panel-Scroll.
    const block=actionEl.closest(".vblock");
    const offen=block.dataset.open!=="true";
    block.dataset.open=offen?"true":"false";
    actionEl.setAttribute("aria-expanded",String(offen));
    state.vorgaengeOffen=offen;
  }else if(action==="set-area-tab"){
    e.stopPropagation();
    state.bereichTab=actionEl.dataset.tab||"feed";
    commitView();
  }else if(action==="toggle-affected"){
    e.stopPropagation();
    toggleAffectedList(actionEl,actionEl.closest(".story").querySelector(".affected"));
  }
}
head.addEventListener("click",handlePanelAction);
body.addEventListener("click",handlePanelAction);

/* ============ Aktionen ============ */
function selectLocation(id){
  if(!id||!byId.has(id))return;
  state.selectedId=id;
  commitView({closeFilters:true,sheet:"full",flyToFeature:byId.get(id)});
}
function clearSelection(){
  state.selectedId=null;
  commitView({sheet:"half"});
  // Zurueck aus dem Standort in einen eingefrorenen Bereich ("Zurueck zum Ausschnitt"):
  // Karte auf den Cluster-Ausschnitt zuruecksetzen, damit der Cluster wieder als Cluster
  // sichtbar ist. Sonst bleibt sie auf dem Standort-Zoom (>= 11 > clusterMaxZoom) stehen,
  // auf dem der eingefrorene Cluster zerfallen und damit unsichtbar ist.
  if(state.frozen)map.easeTo({center:state.frozen.center,zoom:state.frozen.zoom,duration:500});
}
function toggleTopic(t){
  state.topics.has(t)?state.topics.delete(t):state.topics.add(t);
  commitView({mapSync:"unlessFrozen"});
}
function syncTopicChips(){
  document.querySelectorAll("#topicChips .facet-opt").forEach(c=>{
    const on=state.topics.has(c.dataset.topic);
    c.classList.toggle("on",on);
    c.setAttribute("aria-pressed",String(on));
  });
}
/* Top-Filter: segmentiert, also Zustand SETZEN (nicht flippen). Greift wie jeder Filter
   per UND und zieht Panel/Feed (renderPanel->globalFeed) und Cluster (rebuildUnlessFrozen->devVisible) mit. */
function setTopOnly(on){
  if(state.topOnly===on)return;
  state.topOnly=on;
  // closeFilters wie bei Zeitraum und Personalien: eine Einfachauswahl ist mit dem Klick
  // fertig. Nur die Themen bleiben offen — dort waehlt man mehrere Chips nacheinander.
  commitView({mapSync:"unlessFrozen",closeFilters:true});
}
/* Der Trigger traegt seinen WERT, nicht seinen Namen — genau wie der Zeitraum: „Alle" im
   Ruhezustand, „Top" sobald nur Top-Artikel gewaehlt sind. Deshalb auch dieselbe
   .ist-ruhe-Regel statt einer eigenen: das Ruhewort faellt mobil weg, der gewaehlte Wert
   bleibt stehen. Der gefuellte Akzentstern (.hat-wahl) laeuft absichtlich zusaetzlich
   mit — er traegt auf einen Blick, das Wort genau, und mobil im Ruhezustand steht er
   allein. */
function syncTopOnly(){
  const trig=document.getElementById("trigTop");
  if(!trig)return;
  const label=document.getElementById("trigTopLabel");
  if(label)label.textContent=state.topOnly?"Top":"Alle";
  trig.classList.toggle("ist-ruhe",!state.topOnly);
  trig.classList.toggle("hat-wahl",state.topOnly);
  trig.setAttribute("aria-label",state.topOnly?"Top: nur Top-Artikel":"Top: alle Artikel");
  const n=countTopOptionen();
  document.querySelectorAll("#topPop .facet-opt").forEach(o=>{
    o.classList.toggle("on",(o.dataset.top==="1")===state.topOnly);
    const z=o.querySelector(".fo-n"); if(z)z.textContent=fmtNum(n[o.dataset.top]??0);
  });
}

function setPersonalienFilter(value){
  const next=["all","only","without"].includes(value)?value:"all";
  if(state.personalienFilter===next)return;
  state.personalienFilter=next;
  commitView({mapSync:"unlessFrozen",closeFilters:true});
}
/* Beschriftung des Zustands — im Trigger (wo Platz ist) und im aria-label dieselbe.
   „inkl." statt „mit": „mit Personalien" liess offen, ob die Artikel oder die Personalien
   gemeint sind. Die Optionen im Dropdown tragen exakt diese Woerter. */
const PERSONALIEN_WORT={all:"inkl.",only:"nur",without:"ohne"};
/* Welcher Strom ist im jeweiligen Zustand AUS (= durchgestrichen)?
   pers = Personalien (badge), news = Artikel (newspaper). */
const PERSONALIEN_OFF={
  all    :{pers:false,news:false},   // beide Stroeme sichtbar
  only   :{pers:false,news:true },   // nur Personalien -> Artikel aus
  without:{pers:true ,news:false}    // ohne Personalien -> Personalien aus
};
function syncPersonalienFilter(){
  const trig=document.getElementById("trigPers");
  if(!trig)return;
  const s=state.personalienFilter;
  const off=PERSONALIEN_OFF[s];
  trig.querySelector('[data-gi="pers"]').classList.toggle("off",off.pers);
  trig.querySelector('[data-gi="news"]').classList.toggle("off",off.news);
  const beschriftung=`${PERSONALIEN_WORT[s]} Personalien`;
  const wort=document.getElementById("persWort");
  if(wort)wort.textContent=beschriftung;
  trig.setAttribute("aria-label",`Personalien-Filter: ${beschriftung}`);
  const n=countPersonalienOptionen();
  document.querySelectorAll("#persPop .facet-opt").forEach(o=>{
    o.classList.toggle("on",o.dataset.pers===s);
    const z=o.querySelector(".fo-n"); if(z)z.textContent=fmtNum(n[o.dataset.pers]??0);
  });
}
/* Vorgangstypen sind seit 2026-07-18 gezaehlte Chips und damit frei kombinierbar
   (gewaehlt als Variante A, siehe varianten/personalien-vorgaenge.html). Leere Auswahl
   heisst „alle" — es gibt bewusst keinen eigenen „Alle"-Chip, weil das Abwaehlen des
   letzten Typs schon dorthin zurueckfuehrt. */
function toggleProcessFilter(typ){
  if(!typ)return;
  const aktiv=state.processFilter.slice();
  const i=aktiv.indexOf(typ);
  if(i>=0)aktiv.splice(i,1); else aktiv.push(typ);
  state.processFilter=aktiv;
  // Auswahl und eingefrorener Bereich bleiben stehen — genau wie bei toggleTopic. Beide
  // Chip-Gruppen liegen im selben Dropdown und muessen sich gleich anfuehlen.
  commitView({mapSync:"unlessFrozen"});
}
function syncProcessFilter(){
  const zahlen=countVorgangTypen();
  document.querySelectorAll("#processChips .facet-opt").forEach(c=>{
    const typ=c.dataset.process;
    const on=state.processFilter.includes(typ);
    c.classList.toggle("on",on);
    c.setAttribute("aria-pressed",String(on));
    const n=c.querySelector(".fo-n");
    if(n)n.textContent=fmtNum(zahlen[typ]??0);
    // Typ ohne Treffer bleibt sichtbar, aber gedaempft: die 0 ist selbst eine Aussage.
    c.classList.toggle("leer",(zahlen[typ]??0)===0&&!on);
  });
}

function setTheme(t){
  THEME=t;
  document.documentElement.className="theme-"+t;
  document.getElementById("themeIcon").textContent=t==="hell"?"light_mode":"dark_mode";
  document.getElementById("themeLabel").textContent=t==="hell"?"Hell":"Dunkel";
  map.setStyle(getMapStyle(t));
  // setStyle verwirft Source+GL-Layer (Diff-Pfad: Source/Custom-Layer fallen raus, Basis
  // wird nur umgefaerbt). Den Wiederaufbau deterministisch anstossen, statt auf das richtige
  // styledata-Event zu hoffen -> rebuildClinicLayersWhenReady baut im Diff-Pfad sofort auf
  // (Stil ist synchron bereit) und armt sich im Vollreload-Pfad selbst nach.
  rebuildClinicLayersWhenReady();
}
