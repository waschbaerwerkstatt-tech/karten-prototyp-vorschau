/* ---------- Fachpresse (Krankenhaus-Fachpresse) ----------
   Eigener Korpus, KEINE Akteurs-Position: ein Fachpressebeitrag traegt keine
   pro/neu/con-Haltung. Die Lager-Tendenz ("Erbringer") liegt auf TITELebene
   (Metadatum), nicht je Beitrag. Ein Beitrag kann zu mehreren Vorgaengen gehoeren
   (themen:[ids]) -> erscheint dann unter jedem. "das Krankenhaus" fehlt bewusst
   (DKG-Organ -> laeuft ueber den DKG-Akteur). Fiktiv, plausibel; Deeplinks inaktiv. */
/* anteil = fiktive Surfacing-Quote: welchen Anteil an der GESAMTEN Reformberichterstattung
   des Titels die hier gezeigten Beiträge ausmachen (titelstabil, fenster­unabhängig). */
const PRESSE_SOURCES={
  mk: {kurz:"M&K", lang:"Management & Krankenhaus",               tendenz:"erbringer", anteil:16},
  kma:{kurz:"kma", lang:"Klinik Management aktuell",              tendenz:"erbringer", anteil:12},
  ku: {kurz:"KU",  lang:"KU Gesundheitsmanagement",               tendenz:"erbringer", anteil:13},
  hcm:{kurz:"HCM", lang:"Health&Care Management",                 tendenz:"erbringer", anteil:18},
  fw: {kurz:"f&w", lang:"führen und wirtschaften im Krankenhaus", tendenz:"erbringer", anteil:14}
};
const FACHPRESSE=[
  {quelle:"kma", datum:"2026-06-18", themen:["vorhalte"], titel:"Vorhaltebudgets: Kliniken rechnen mit verschobenem Start", teaser:"Die Branche stellt sich auf einen späteren Wirkbeginn ein — die Kalkulationsgrundlagen gelten in vielen Leistungsgruppen als nicht belastbar.", url:"#"},
  {quelle:"fw",  datum:"2026-06-06", themen:["vorhalte"], titel:"Erlösbasis im Umbruch: Was die Vorhaltefinanzierung für die Liquidität bedeutet", teaser:"Eine Analyse zu den Folgen mengenunabhängiger Budgets für die Hausplanung.", url:"#"},
  {quelle:"mk",  datum:"2026-05-22", themen:["vorhalte"], titel:"Leistungsgruppen als Schlüssel der Vorhaltefinanzierung", teaser:"Wie die Zuordnung zu Leistungsgruppen die künftige Vergütung steuert.", url:"#"},
  {quelle:"ku",  datum:"2026-06-17", themen:["notfall","vorhalte"], titel:"Notfallstufen über Vorhaltebudgets finanziert — Häuser fürchten Doppelbelastung", teaser:"Zwei Reformbaustellen greifen ineinander; kleine Standorte sehen sich besonders unter Druck.", url:"#"},
  {quelle:"mk",  datum:"2026-06-10", themen:["notfall"], titel:"Notfallreform: Konzentration auf höher gestufte Standorte zeichnet sich ab", teaser:"Der Referentenentwurf verschärft die Stufenkriterien für Personal und Ausstattung.", url:"#"},
  {quelle:"kma", datum:"2026-05-30", themen:["notfall"], titel:"Ländlicher Raum: Sorge um die wohnortnahe Notfallversorgung", teaser:"Verlieren kleine Häuser ihre Stufe, droht der Verlust der Notfallversorgung in der Fläche.", url:"#"},
  {quelle:"fw",  datum:"2026-05-12", themen:["ambulant"], titel:"Hybrid-DRG: Für wen sich der Katalog rechnet", teaser:"Die Wirtschaftlichkeit hängt stark am Eingriffsmix des Hauses.", url:"#"},
  {quelle:"hcm", datum:"2026-05-05", themen:["ambulant"], titel:"Ambulantisierung: Prozesse zwischen den Sektoren neu denken", teaser:"Sektorengleiche Vergütung verlangt angepasste Ablauf- und IT-Strukturen.", url:"#"},
  {quelle:"ku",  datum:"2026-06-21", themen:["level1i"], titel:"Level 1i: Rettungsanker oder verdeckter Abbau?", teaser:"Das neue Versorgungsformat wird je nach Lage als Chance oder als Risiko gelesen.", url:"#"},
  {quelle:"mk",  datum:"2026-06-19", themen:["level1i"], titel:"Sektorenübergreifende Einrichtungen: Finanzierung bleibt die offene Flanke", teaser:"Ohne eigene Finanzierungssäule droht Mischkalkulation zulasten der Häuser.", url:"#"},
  {quelle:"hcm", datum:"2026-03-24", themen:["ppr"], titel:"PPR 2.0 wird stufenweise scharf — Häuser ringen um Personal", teaser:"Verbindliche Vorgaben treffen auf einen leergefegten Fachkräftemarkt.", url:"#"},
  {quelle:"fw",  datum:"2026-03-19", themen:["ppr"], titel:"Personalbemessung: Was Sanktionen für die Bettenplanung bedeuten", teaser:"Ohne verfügbare Fachkräfte drohen Bettensperrungen statt mehr Pflege.", url:"#"},
  {quelle:"kma", datum:"2026-02-10", themen:["transparenz"], titel:"Klinik-Atlas: Datenpflege bleibt die eigentliche Daueraufgabe", teaser:"Nach kontroversem Start verlagert sich die Debatte auf Aktualität und Methodik.", url:"#"}
];
const POLITIK_VERFAHREN={
  vorhalte:{
    titel:"KHVVG-Anpassungsgesetz",
    current:"Bundesrat: Stellungnahme erwartet",
    next:"Kabinettsbefassung nach Länderstellungnahme",
    vermittlung:"Vermittlungsausschuss möglich, falls Länder Übergangsfristen blockieren",
    stations:[
      {state:"Referentenentwurf",datum:"2026-05-14",status:"reached",url:"https://example.org/bmg/khvvg-anpassungsgesetz-referentenentwurf",dokument:"Primärdokument"},
      {state:"Kabinett",datum:"2026-06-18",status:"reached",url:"https://example.org/bundesregierung/khvvg-anpassungsgesetz",dokument:"Kabinettsbeschluss"},
      {state:"Anhörung",datum:"2026-06-03",status:"reached",url:"https://example.org/bmg/khvvg-anpassungsgesetz-anhoerung",dokument:"Stellungnahmen"},
      {state:"Lesungen/Ausschuss",datum:"2026-06-27",status:"reached",url:"https://example.org/bundestag/khvvg-anpassungsgesetz",dokument:"Ausschussdrucksache"},
      {state:"Bundesrat",datum:"2026-07-12",status:"current",url:"https://example.org/bundesrat/khvvg-anpassungsgesetz",dokument:"Beratungsdrucksache"},
      {state:"Verkündung",datum:"offen",status:"next",url:"https://example.org/bundesgesetzblatt/khvvg-anpassungsgesetz",dokument:"ausstehend"},
      {state:"Inkrafttreten",datum:"offen",status:"next",url:"https://example.org/khvvg-anpassungsgesetz/inkrafttreten",dokument:"ausstehend"}
    ]
  },
  notfall:{
    titel:"Notfallreform",
    current:"Referentenentwurf: Ressortabstimmung läuft",
    next:"Kabinett nach Ressortabstimmung",
    vermittlung:"Vermittlungsausschuss sichtbar, falls Planungshoheit der Länder strittig bleibt",
    stations:[
      {state:"Referentenentwurf",datum:"2026-06-09",status:"current",url:"https://example.org/bmg/notfallreform-referentenentwurf",dokument:"Entwurf"},
      {state:"Kabinett",datum:"erwartet Q3/2026",status:"next",url:"https://example.org/bundesregierung/notfallreform",dokument:"nächster Schritt"},
      {state:"Anhörung",datum:"offen",status:"next",url:"https://example.org/bmg/notfallreform-anhoerung",dokument:"ausstehend"},
      {state:"Lesungen/Ausschuss",datum:"erwartet Herbst 2026",status:"next",url:"https://example.org/bundestag/notfallreform",dokument:"nächster Schritt"},
      {state:"Bundesrat",datum:"offen",status:"next",url:"https://example.org/bundesrat/notfallreform",dokument:"ausstehend"},
      {state:"Verkündung",datum:"offen",status:"next",url:"https://example.org/bundesgesetzblatt/notfallreform",dokument:"ausstehend"},
      {state:"Inkrafttreten",datum:"offen",status:"next",url:"https://example.org/notfallreform/inkrafttreten",dokument:"ausstehend"}
    ]
  }
};
const POLITIK_PERSONALIEN=[
  {typ:"personalie",person:"Dr. Lena Vogt",rolle:"ministerium_verband",richtung:"wechsel",organisation:"BMG",quellArtikelId:"mock-politik-pers-vorhalte-bmg-20260624",datum:"2026-06-24"},
  {typ:"personalie",person:"Thomas Reuter",rolle:"ministerium_verband",richtung:"antritt",organisation:"DKG",quellArtikelId:"mock-politik-pers-vorhalte-dkg-20260618",datum:"2026-06-18"},
  {typ:"personalie",person:"Prof. Miriam Seidel",rolle:"ministerium_verband",richtung:"antritt",organisation:"DIVI",quellArtikelId:"mock-politik-pers-notfall-divi-20260620",datum:"2026-06-20"}
];
const POLITIK_PERSONALIEN_THEMEN={
  vorhalte:["mock-politik-pers-vorhalte-bmg-20260624","mock-politik-pers-vorhalte-dkg-20260618"],
  notfall:["mock-politik-pers-notfall-divi-20260620"]
};
function presseForThema(themaId,win=WIN){return FACHPRESSE.filter(p=>p.themen.includes(themaId)&&inWin(p.datum,win));}
function presseItem(p,withTags){return {kind:"presse",datum:p.datum,label:PRESSE_SOURCES[p.quelle].kurz,titel:p.titel,teaser:p.teaser,url:p.url,
  vorgaenge:withTags?p.themen.map(id=>(THEMEN.find(t=>t.id===id)||{}).titel).filter(Boolean):null};}

/* ---------- Hilfen ---------- */
const MOM_ICON={up:"trending_up",flat:"trending_flat",down:"trending_down",new:"fiber_new"};
const MONATE=["Jan.","Feb.","März","Apr.","Mai","Juni","Juli","Aug.","Sep.","Okt.","Nov.","Dez."];
const STREIT_LABEL=["Konsens","kontrovers","stark umstritten"];
const RELEVANZ_LABEL=["niedrig","mittel","hoch"];
function fmtDate(iso){const[y,m,d]=String(iso).split("-").map(Number);return `${d}. ${MONATE[m-1]} ${y}`;}
function normText(value){
  return String(value||"")
    .toLowerCase()
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .trim().replace(/\s+/g," ");
}
function containsNorm(value,query){return normText(value).includes(query);}
function esc(v){ return String(v ?? "").replace(/[&<>"']/g, ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch])); }
const VERFAHREN_STANDARD_STATIONS=["Referentenentwurf","Kabinett","Anhörung","Lesungen/Ausschuss","Bundesrat","Verkündung","Inkrafttreten"];
const VERFAHREN_STATION_POINTS=[
  {x:42,y:54},{x:168,y:54},{x:294,y:54},{x:420,y:54},{x:546,y:54},{x:672,y:54},{x:798,y:54}
];
function renderVerfahrenStepper(verfahren, anchorKey){
  if(!verfahren || !Array.isArray(verfahren.stations) || !verfahren.stations.length) return "";
  const stationByState=new Map(verfahren.stations.map(station=>[station.state,station]));
  const stations=VERFAHREN_STANDARD_STATIONS.map(state=>stationByState.get(state)||{state,datum:"offen",status:"next",dokument:"ausstehend"});
  const stationNodes=stations.map((station,index)=>{
    const status=["reached","current","next"].includes(station.status) ? station.status : "next";
    const point=VERFAHREN_STATION_POINTS[index];
    const aria=`${station.state}: ${station.datum}, ${station.dokument || "Primärdokument"}`;
    const body=`<title>${esc(aria)}</title>
        <circle class="verfahren-node ${status}" cx="${point.x}" cy="${point.y}" r="9"></circle>
        <text class="verfahren-label" x="${point.x}" y="86">${esc(station.state)}</text>
        <text class="verfahren-date" x="${point.x}" y="104">${esc(station.datum)}</text>
        <text class="verfahren-doc" x="${point.x}" y="121">${esc(station.dokument || "Primärdokument")}${status==="next" ? "" : " ↗"}</text>`;
    const attrs=`data-verfahren-station="${esc(station.state)}" data-verfahren-state="${esc(status)}" aria-label="${esc(aria)}"`;
    if(status!=="next" && station.url) return `<a class="verfahren-link" ${attrs} href="${esc(station.url)}" target="_blank" rel="noopener">${body}</a>`;
    return `<g class="verfahren-link" ${attrs}>${body}</g>`;
  }).join("");
  return `<section class="verfahren-stepper" id="verfahren-${esc(anchorKey || verfahren.titel)}" aria-label="Gesetzgebungsverfahren">
    <div class="verfahren-head">
      <div class="verfahren-title"><span class="material-symbols-outlined">account_balance</span>${esc(verfahren.titel)}</div>
      <span class="verfahren-state">${esc(verfahren.current)}</span>
    </div>
    <div class="verfahren-svg-wrap" role="img" aria-label="Standardisiertes Gesetzgebungsverfahren">
      <svg class="verfahren-svg" viewBox="0 0 840 192" aria-hidden="true" focusable="false">
        <line class="verfahren-axis" x1="42" y1="54" x2="798" y2="54"></line>
        <path class="verfahren-branch-line" d="M546 54 C586 76 612 104 612 138"></path>
        <circle class="verfahren-node next" cx="612" cy="138" r="7"></circle>
        <text class="verfahren-branch-label" x="612" y="166">Vermittlungsausschuss</text>
        <text class="verfahren-branch-note" x="612" y="182">optionaler Branch</text>
        ${stationNodes}
      </svg>
    </div>
    <div class="verfahren-branch"><span class="material-symbols-outlined">alt_route</span><span><b>Vermittlungsausschuss</b>: ${esc(verfahren.vermittlung)}</span></div>
    <div class="verfahren-branch"><span class="material-symbols-outlined">event_upcoming</span><span><b>Nächster Schritt</b>: ${esc(verfahren.next)}</span></div>
  </section>`;
}
const POLITIK_PERSONALIE_ROLLE_LABEL={gf:"Geschäftsführung",chefarzt:"Chefarzt",pflegedirektion:"Pflegedirektion",ministerium_verband:"Ministerium/Verband"};
const POLITIK_PERSONALIE_RICHTUNG_LABEL={antritt:"Antritt",abgang:"Abgang",wechsel:"Wechsel"};
function politikPersonalieRoleLabel(p){return POLITIK_PERSONALIE_ROLLE_LABEL[p.rolle]||p.rolle;}
function politikPersonalieDirectionLabel(p){return POLITIK_PERSONALIE_RICHTUNG_LABEL[p.richtung]||p.richtung;}
function renderPolitikPersonalien(themaId){
  const artikelIds=POLITIK_PERSONALIEN_THEMEN[themaId]||[];
  const items=POLITIK_PERSONALIEN.filter(p=>artikelIds.includes(p.quellArtikelId));
  if(!items.length) return "";
  return `<section class="politik-personalien" aria-label="Personalien">
    <div class="blockhead"><h3><span class="material-symbols-outlined">badge</span>Personalien</h3></div>
    <div class="blockhint">Lokale Prototyp-Mocks fuer Ministerien und Verbaende, nur als belegte Ereignisse.</div>
    <div class="politik-personalien-grid">${items.map(p=>`
      <div class="politik-personalie" data-quell-artikel-id="${esc(p.quellArtikelId)}">
        <div class="p-top"><span class="material-symbols-outlined">person</span><span class="p-person">${esc(p.person)}</span></div>
        <div class="p-role">${esc(politikPersonalieRoleLabel(p))} · ${esc(politikPersonalieDirectionLabel(p))} · ${esc(p.organisation)}</div>
        <span class="p-meta">${esc(p.quellArtikelId)} · ${fmtDate(p.datum)}</span>
      </div>`).join("")}</div>
  </section>`;
}
