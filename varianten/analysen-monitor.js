const MON_EVENTS = [
  {id:"ev-altona-kard",   typ:"familie", haus:"altona",  familie:"kard",   datum:"2026-05-08",
   titel:"Asklepios Altona listet Koronarintervention neu",
   detail:"Neues Herzkatheter-Angebot auf der Klinik-Website ausgewiesen."},
  {id:"ev-barmbek-endo",  typ:"familie", haus:"barmbek", familie:"endo",   datum:"2026-02-14",
   titel:"Asklepios Barmbek nimmt Endoprothetik-Zentrum in Betrieb",
   detail:"Elektive Endoprothetik neu auf der Website gelistet."},
  {id:"ev-stgeorg-chef",  typ:"chef",    haus:"stgeorg", familie:"geburt", datum:"2025-11-20",
   titel:"Chefarztwechsel Frauenklinik Asklepios St. Georg",
   detail:"Neue Chefaerztin der Frauenklinik — Wirkung auf das Angebot offen (keine Richtungsaussage)."},
  {id:"ev-barmbek-stroke",typ:"familie", haus:"barmbek", familie:"stroke", datum:"2024-12-10",
   titel:"Asklepios Barmbek erweitert Stroke Unit",
   detail:"Schlaganfall-Akutbehandlung neu ausgewiesen (aelteres Ereignis)."},
];
const MON_PERSONALIEN = [
  {typ:"personalie",person:"Dr. Lena Kruse",rolle:"pflegedirektion",richtung:"antritt",standortId:"uke",
   organisation:"UKE",quellArtikelId:"mock-analysen-pers-uke-pflege-20260419",datum:"2026-04-19"},
  {typ:"personalie",person:"Prof. Martin Seidel",rolle:"chefarzt",richtung:"wechsel",standortId:"marien",
   organisation:"Marienkrankenhaus",quellArtikelId:"mock-analysen-pers-marien-geburt-20260307",datum:"2026-03-07"},
  {typ:"personalie",person:"Dr. Sara Petersen",rolle:"chefarzt",richtung:"antritt",standortId:"stgeorg",
   organisation:"Asklepios St. Georg",quellArtikelId:"mock-analysen-pers-stgeorg-frauen-20251120",datum:"2025-11-20"}
];
const MON_TYP={familie:{label:"Leistungsfamilie neu gelistet",icon:"add_business"},
               chef:{label:"Chefarztwechsel",icon:"badge"}};
function monMonthsAgo(iso){const[y,m,d]=iso.split("-").map(Number);const now=new Date();
  return (now.getFullYear()-y)*12+(now.getMonth()-(m-1))-(now.getDate()<d?1:0);}
function monActive(ev){return STATE.monWin!==0 && (STATE.monWin===-1 || monMonthsAgo(ev.datum)<=STATE.monWin);}
function monVisible(){return MON_EVENTS.filter(monActive);}
function monForHaus(hid){return monVisible().filter(e=>e.haus===hid);}          // Istbild: Fakten ueber dieses Haus
function monForFamilie(fk){return monVisible().filter(e=>e.familie===fk);}      // Markt-Linse: Wirkung auf Fokus-Familie
function monHausName(hid){return (CLINICS[hid]||{}).name||hid;}
/* Ein Ereignis als Meldungs-Karte. abraeumbar=true setzt data-eintrag-id -> eingeloggt.js
   badged es (falls die Id in NEU.analysen steht) und raeumt es nach Scroll-out ab; das
   passive Drilldown-Echo laesst es weg (nie "Neu", zaehlt nie mit). Kein Dimmen mehr. */
function monEventDetailHtml(ev,abraeumbar=true){
  const t=MON_TYP[ev.typ];
  const idAttr=abraeumbar?` data-eintrag-id="${ev.id}"`:"";
  return `<div class="mon-ev"${idAttr}>
    <div class="mon-ev-top"><span class="mon-ev-typ"><span class="material-symbols-outlined">${t.icon}</span>${t.label}</span>
      <span class="mon-ev-date">${monFmtDate(ev.datum)}</span></div>
    <div class="mon-ev-titel">${ev.titel}</div>
    <div class="mon-ev-tx">${ev.detail}</div>
    <div class="mon-ev-foot"><span class="mon-ev-src"><span class="material-symbols-outlined">open_in_new</span><a href="#" onclick="return false">Quelle</a></span>
      <span class="mon-ev-flag"><span class="material-symbols-outlined">visibility</span>Website-Beobachtung — noch nicht in den amtlichen Zahlen</span></div>
  </div>`;
}
function monFmtDate(iso){const[y,m,d]=iso.split("-");return `${+d}.${+m}.${y}`;}
const MON_PERSONALIE_ROLLE_LABEL={gf:"Geschäftsführung",chefarzt:"Chefarzt",pflegedirektion:"Pflegedirektion",ministerium_verband:"Ministerium/Verband"};
const MON_PERSONALIE_RICHTUNG_LABEL={antritt:"Antritt",abgang:"Abgang",wechsel:"Wechsel"};
function monPersonalieRoleLabel(ev){return MON_PERSONALIE_ROLLE_LABEL[ev.rolle]||ev.rolle;}
function monPersonalieDirectionLabel(ev){return MON_PERSONALIE_RICHTUNG_LABEL[ev.richtung]||ev.richtung;}
function monPersonalieTitle(ev){return `${ev.organisation}: ${monPersonalieRoleLabel(ev)} - ${monPersonalieDirectionLabel(ev)}`;}
function monPersonalieUrl(ev){return `https://example.org/${encodeURIComponent(ev.quellArtikelId)}`;}
function monPersonalienForHaus(hid){
  return MON_PERSONALIEN.filter(e=>e.standortId===hid).slice().sort((a,b)=>b.datum.localeCompare(a.datum));
}
function monPersonEventHtml(ev){
  return `<div class="mon-ev personalie" data-event-schema="ap3-personalie">
    <div class="mon-ev-top"><span class="mon-ev-typ"><span class="material-symbols-outlined">badge</span>Personalie · ${monPersonalieDirectionLabel(ev)}</span>
      <span class="mon-ev-date">${monFmtDate(ev.datum)}</span></div>
    <div class="mon-ev-titel">${monPersonalieTitle(ev)}</div>
    <div class="mon-ev-tx"><b>${ev.person}</b> · ${monPersonalieRoleLabel(ev)}. Lokal beobachtetes Ereignis mit Hausbezug; keine biografische Akte.</div>
    <div class="mon-ev-foot"><span class="mon-ev-src"><span class="material-symbols-outlined">open_in_new</span><a href="${monPersonalieUrl(ev)}" target="_blank" rel="noopener">${ev.quellArtikelId}</a></span>
      <span class="mon-ev-flag"><span class="material-symbols-outlined">schema</span>#373-Felder: person · rolle · richtung · standortId · organisation · quellArtikelId · datum</span></div>
  </div>`;
}
function monPersonalienSection(c){
  const evs=monPersonalienForHaus(c.id);
  if(!evs.length)return "";
  return `<div class="mon-block">
    <div class="mon-block-head"><span class="material-symbols-outlined">badge</span>Lokale Personalien
      <span class="mon-block-hint">Quellenverlinkte Ereignisse am Standort — nur Ereignisfelder, keine Personenakte.</span></div>
    ${evs.map(monPersonEventHtml).join("")}</div>`;
}
/* Beobachtungen im Familien-Drilldown: PASSIVES ECHO. Kein data-eintrag-id -> nie "Neu",
   zaehlt nie mit. Die abraeumbare Quelle derselben Signale ist die Marktraum-Kachel;
   so gibt es keine Doppelzaehlung im "offen"-Zaehler. */
function monFamilieBlock(fk){
  const evs=monForFamilie(fk);
  if(!evs.length)return "";
  return `<div class="mon-block">
    <div class="mon-block-head"><span class="material-symbols-outlined">visibility</span>Beobachtungen im Marktraum
      <span class="mon-block-hint">Website-Signale bei Wettbewerbern — annotieren die Familie, aendern keine Kennzahl. Echo der Marktbeobachtung oben.</span></div>
    ${evs.map(ev=>monEventDetailHtml({...ev,detail:`${monHausName(ev.haus)}: ${ev.detail}`},false)).join("")}</div>`;
}
/* Ist-Bild (Linse 1): "je Krankenhaus ein Signal". Haeuser aus MON_EVENTS zeigen ihre
   echten Signale; jedes andere fokussierte Haus bekommt EIN deterministisch (seeded per
   Haus-Id) synthetisiertes Website-Monitoring-Signal im selben Event-Shape. Synthetische
   Ids stehen nicht in NEU.analysen -> nie "Neu", das ist gewollt. */
const MON_SYNTH_FAM=[
  {familie:"kard",  titel:"Leistungsspektrum Kardiologie auf der Klinik-Website aktualisiert"},
  {familie:"endo",  titel:"Endoprothetik-Angebot auf der Klinik-Website neu beschrieben"},
  {familie:"kolo",  titel:"Viszeralchirurgie-Portfolio auf der Klinik-Website ueberarbeitet"},
  {familie:"geburt",titel:"Geburtshilfe-Seite der Klinik-Website aktualisiert"},
  {familie:"geri",  titel:"Geriatrie-Angebot auf der Klinik-Website neu gelistet"},
];
function monSynthEvent(hid){
  const r=seededRng("mon-synth|"+hid);
  const pick=MON_SYNTH_FAM[Math.floor(r()*MON_SYNTH_FAM.length)];
  const monthsAgo=1+Math.floor(r()*11);                       // innerhalb der letzten ~12 Monate
  const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-monthsAgo);
  const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(5+Math.floor(r()*20)).padStart(2,"0")}`;
  return {id:"ev-synth-"+hid, typ:"familie", haus:hid, familie:pick.familie, datum:iso,
    titel:pick.titel, detail:"Website-Beobachtung: aktualisiertes Leistungsspektrum auf der Klinik-Website erkannt."};
}
/* Website-Signale dieses Hauses, im Ist-Bild unter dem Dynamik-/Signal-Bereich. */
function monHausSection(c){
  const real=monVisible().filter(e=>e.haus===c.id).slice().sort((a,b)=>b.datum.localeCompare(a.datum));
  const evs=real.length?real:[monSynthEvent(c.id)];           // nie leer: je Haus ein Signal
  return `<div class="mon-block">
    <div class="mon-block-head"><span class="material-symbols-outlined">visibility</span>Website-Signale · dieses Haus
      <span class="mon-block-hint">Beobachtungen zu diesem Standort — annotieren nur, ändern keine Kennzahl.</span></div>
    ${evs.map(ev=>monEventDetailHtml(ev,true)).join("")}</div>`;
}

/* ---------- Start ---------- */
/* Deep-Link (Eingeloggt-Teaser): ?haus=<id>&linse=<1-4>&lg=<gruppe> waehlt Haus, Linse und optional Reform-Leistungsgruppe vor. */
