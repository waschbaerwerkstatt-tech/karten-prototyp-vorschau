/* ============ Linse 2 · Reiter Pflegedienst ============
   Andere Logik als der ärztliche Dienst: amtliche Pflegelast je Vollkraft
   (Kehrwert des PPQ, § 137j SGB V) als BUNDESWEIT-Perzentil — bereits casemix-
   adjustiert, einzige Rechenreferenz ist der Bundesmedian (keine Peer-Normierung,
   das wäre Doppel-Adjustierung). Wertneutral, keine Ampel. €-Szenario nur zerlegt
   (Menge + Preis), Geschätztes markiert + Spanne. s. docs/prd/pflegedienst-benchmark.md.
   ponytail: alle Zahlen deterministischer Mock (PFL_HAUS + seeded RNG) — Platzhalter
   fürs Pflege-Backend (PPQ-Datei je Standort + § 6a je IK). */
const PFL_MEDIAN=49.7, PFL_SD=9.5;         // Bundesverteilung Pflegelast je Vollkraft (Datenjahr 2024: Median 49,7 · P25–P75 43,4–56,4)
const PFL_KOSTEN_BUND=82000;               // Bundesdurchschnitt Pflegepersonalkosten je Vollkraft (€, Mock)
const PFL_DATENJAHR=2024;
const PFL_BUDGET_REPORT_YEAR=2024;
/* Bundesweite Verteilung der RECHNERISCHEN §6a-Budgetwirkung je Pflege-Vollkraft (€/VK,
   Mock-Bins à 2.000 € von −24.000 bis +8.000): ~80 % der Häuser verlieren bei Konvergenz
   auf den Bundesdurchschnitt — wenige stark (linker Rand), die Masse mittelmäßig
   (Gipfel um −8.000 bis −6.000), nur wenige um null oder im Gewinn. */
const PFL_BUDGET_HIST=[1,2,3,5,8,12,17,23,26,20,13,8, 17,10,5,3];
const PFL_BUDGET_HIST_MIN=-24000, PFL_BUDGET_HIST_BIN=2000;   // 16 Bins, Null-Grenze nach Bin 12
const IK_STANDORTE={"Asklepios Hamburg":3};
/* Pflegelast je Vollkraft + Kostenniveau je Haus (Mock, um Median 50 gestreut, deckt die
   Quadranten Menge×Preis ab; Verbund-IK teilt EINEN Kostensatz, Nur-PPQ-Fall ohne § 6a). */
const PFL_HAUS={
  uke:       {last:41.2, kostenJeVk:90500, prov:"amtlich",    ik:null,               leih:6},    // üppig + teuer   → Menge+/Preis+
  marien:    {last:44.1, kostenJeVk:76200, prov:"amtlich",    ik:null,               leih:5},    // üppig + günstig → Menge+/Preis−
  stgeorg:   {last:55.3, kostenJeVk:89000, prov:"verbund",    ik:"Asklepios Hamburg",leih:11},   // knapp + teuer   → Menge−/Preis+
  altona:    {last:52.0, kostenJeVk:89000, prov:"verbund",    ik:"Asklepios Hamburg",leih:10},
  barmbek:   {last:47.5, kostenJeVk:89000, prov:"verbund",    ik:"Asklepios Hamburg",leih:9},
  albertinen:{last:49.8, kostenJeVk:82200, prov:"amtlich",    ik:null,               leih:4},    // Median/Median  → unauffällig
  bethesda:  {last:57.6, kostenJeVk:80500, prov:"amtlich",    ik:null,               leih:7},
  geesthacht:{last:45.9, kostenJeVk:null,  prov:"geschaetzt", ik:null,               leih:null}  // Nur-PPQ → Preiskomponente geschätzt
};
/* Weitere Häuser im Pflege-Arbeitsmarkt (nur für den Pendelraum, illustrativ) — inkl.
   Spezialklinik-Ausreißer, an dem die Perzentil-Skala (statt min–max) sichtbar trägt. */
const PFL_PENDEL_EXTRA=[
  {name:"Spezialklinik (Herzchirurgie)",last:196, distKm:11},
  {name:"Klinik Umland Nord",           last:60,  distKm:24},
  {name:"Fachkrankenhaus Süd",          last:41,  distKm:16}];

const pflPct=last=>clamp(Math.round(100*normCdf((last-PFL_MEDIAN)/PFL_SD)),1,99);
const pflColor=pct=>devColor(((50-pct)/50)*0.40);   // wertneutral: niedrig(üppig)=dicht/kühl, hoch(knapp)=schlank/sand
const mio=e=>(e>=0?"+":"−")+(Math.abs(e)/1e6).toFixed(1).replace(".",",")+" Mio €";
const mioApprox=e=>"≈ "+mio(e);
function pflWort(pct){return pct>=85?"sehr knappe Personaldecke":pct>=62?"eher knappe Personaldecke":
  pct>=40?"durchschnittliche Personaldecke":pct>=18?"eher üppige Personaldecke":"sehr üppige Personaldecke";}
/* Wert (€/VK) → Perzentil in der Mock-Verteilung (kumulierte Bins, linear im Bin). */
function pflegebudgetWirkungPct(wertJeVk){
  const total=PFL_BUDGET_HIST.reduce((a,v)=>a+v,0);
  let below=0;
  for(let i=0;i<PFL_BUDGET_HIST.length;i++){
    const lo=PFL_BUDGET_HIST_MIN+i*PFL_BUDGET_HIST_BIN, hi=lo+PFL_BUDGET_HIST_BIN;
    if(wertJeVk>=hi){below+=PFL_BUDGET_HIST[i];continue;}
    if(wertJeVk>lo)below+=PFL_BUDGET_HIST[i]*(wertJeVk-lo)/PFL_BUDGET_HIST_BIN;
    break;
  }
  return clamp(Math.round(100*below/total),1,99);
}
/* Wert (€/VK), unter dem der gegebene Verteilungsanteil liegt (fuer die Median-Linie). */
function pflegebudgetWirkungQuantil(q){
  const total=PFL_BUDGET_HIST.reduce((a,v)=>a+v,0);
  let cum=0;
  for(let i=0;i<PFL_BUDGET_HIST.length;i++){
    const lo=PFL_BUDGET_HIST_MIN+i*PFL_BUDGET_HIST_BIN;
    if(cum+PFL_BUDGET_HIST[i]>=q*total)
      return lo+PFL_BUDGET_HIST_BIN*(q*total-cum)/PFL_BUDGET_HIST[i];
    cum+=PFL_BUDGET_HIST[i];
  }
  return PFL_BUDGET_HIST_MIN+PFL_BUDGET_HIST.length*PFL_BUDGET_HIST_BIN;
}
function pflegebudgetHistogram(p){
  const wertJeVk=p.total/Math.max(1,p.vk);                    // rechnerisches Gesamtergebnis je Vollkraft
  const pct=pflegebudgetWirkungPct(wertJeVk), max=Math.max(...PFL_BUDGET_HIST);
  const W=520,H=124,pad=18,base=92,barW=(W-pad*2)/PFL_BUDGET_HIST.length;
  const span=PFL_BUDGET_HIST.length*PFL_BUDGET_HIST_BIN;
  const fx=v=>pad+(clamp(v,PFL_BUDGET_HIST_MIN,PFL_BUDGET_HIST_MIN+span)-PFL_BUDGET_HIST_MIN)/span*(W-pad*2);
  const bars=PFL_BUDGET_HIST.map((v,i)=>{
    const x=pad+i*barW+2, h=v/max*58, y=base-h;
    const lo=PFL_BUDGET_HIST_MIN+i*PFL_BUDGET_HIST_BIN;
    return `<rect class="bar${lo>=0?" gewinn":""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW-4).toFixed(1)}" height="${h.toFixed(1)}" rx="2"/>`;
  }).join("");
  const x=fx(wertJeVk), med=fx(pflegebudgetWirkungQuantil(0.5)), zero=fx(0);
  const jeVkTxt=(wertJeVk>=0?"+":"−")+fmt(Math.round(Math.abs(wertJeVk)))+" € je Vollkraft";
  return `<div class="szen-hist">
    <div class="szen-hist-head"><span class="t">bundesweite §6a-Verteilung · rechnerische Budgetwirkung je Pflege-Vollkraft</span>${reportBadge(PFL_BUDGET_REPORT_YEAR,"modell")}</div>
    <svg class="szen-hist-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bundesweite Verteilung der rechnerischen §6a-Budgetwirkung mit Fokus-Haus, Median und Null-Linie">
      ${bars}
      <line class="axis" x1="${pad}" y1="${base}" x2="${W-pad}" y2="${base}"/>
      <line class="zeroline" x1="${zero.toFixed(1)}" y1="${24}" x2="${zero.toFixed(1)}" y2="${base+8}"/>
      <line data-percentile-line class="pctline" x1="${med.toFixed(1)}" y1="${28}" x2="${med.toFixed(1)}" y2="${base+8}"/>
      <circle data-focus-house-marker class="focus-marker" cx="${x.toFixed(1)}" cy="${35}" r="6">
        <title>Fokus-Haus: P${pct} · ${jeVkTxt}</title>
      </circle>
      <text class="lbl" x="${pad}" y="${H-12}" text-anchor="start">starker Verlust</text>
      <text class="lbl" x="${med.toFixed(1)}" y="${H-12}" text-anchor="middle">Median</text>
      <text class="lbl" x="${zero.toFixed(1)}" y="${20}" text-anchor="middle">±0</text>
      <text class="lbl" x="${W-pad}" y="${H-12}" text-anchor="end">Gewinn</text>
    </svg>
    <div class="chart-foot"><span class="material-symbols-outlined">query_stats</span>Rechnerisches Gesamtergebnis des Hauses (${jeVkTxt}, gesamt ${mio(p.total)}) im Bundesvergleich: P${pct}. Rund 80 % der Häuser verlieren rechnerisch bei Konvergenz auf den Bundesdurchschnitt — der Median liegt im Verlustbereich, rechts der Null-Linie stehen nur wenige Gewinner.${prov("modell")}</div>
  </div>`;
}
function reportButtonHtml(){
  const st=window.EG_STUFE||{};
  const ok=!!st.downloads;
  return `<div class="report-actions${ok?"":" stat locked"}">
    <button class="chipbtn${ok?"":" locked"}" data-report-pdf="${ok?"unlocked":"locked"}" type="button" aria-disabled="${ok?"false":"true"}">
      <span class="material-symbols-outlined">${ok?"picture_as_pdf":"lock"}</span>Befund als PDF
    </button>
    <span class="report-toast" id="reportToast"><span class="material-symbols-outlined">info</span>Prototyp: PDF-Erzeugung ist hier nur als Hinweis verdrahtet.</span>
  </div>`;
}
/* Qualifikationsmix „Pflege am Bett" — 14 Berufsgruppen auf 4 + „weitere" zusammengefasst */
const PFL_QUALI_BASE=[
  {k:"Pflegefachkräfte",           p:60, c:"var(--accent)"},
  {k:"mit Fachweiterbildung",      p:11, c:"var(--dicht)"},
  {k:"Pflegehilfskräfte",          p:14, c:"var(--schlank)"},
  {k:"Auszubildende (anteilig)",   p:8,  c:"var(--mid)"},
  {k:"weitere Berufsgruppen",      p:7,  c:"var(--text-faint)"}];
function pflQualiMix(hid){
  const r=seededRng(hid+"|quali");
  const raw=PFL_QUALI_BASE.map(g=>({...g,p:Math.max(2,g.p+(r()-0.5)*8)}));
  const s=raw.reduce((a,g)=>a+g.p,0);
  return raw.map(g=>({...g,p:g.p/s*100}));
}
function pflegeData(hid){
  const h=PFL_HAUS[hid], vk=CLINICS[hid].pflegeVk;
  const pct=pflPct(h.last);
  const mengeFrac=(PFL_MEDIAN-h.last)/PFL_MEDIAN;         // last<median → mehr VK als Bundesmedian-Erwartung → positiv
  const mengeEuro=vk*mengeFrac*PFL_KOSTEN_BUND;
  const estimated=h.prov==="geschaetzt";
  const kostenJeVk=estimated?PFL_KOSTEN_BUND-3000:h.kostenJeVk;   // Schätzung: Zellen-Median Träger×Land (Mock)
  const preisEuro=vk*(kostenJeVk-PFL_KOSTEN_BUND);
  const preisSpanne=estimated?[vk*(-7000),vk*(1000)]:null;       // Schätz-Spanne der Preiskomponente (Richtung: +=teurer)
  // Budgetwirkung der Reform: bei Rückkehr zu Durchschnittspreisen konvergiert die Vergütung gegen den
  // Bundesdurchschnitt. Über dem Benchmark (mehr VK / teurer) → Erstattung SINKT → negativ. mengeEuro/
  // preisEuro bleiben Richtungswerte (für die Synthese-Beschreibung); die Budgetwirkung ist ihre Negation.
  const mengeWirkung=-mengeEuro, preisWirkung=-preisEuro;
  const preisWirkungSpanne=estimated?[-preisSpanne[1],-preisSpanne[0]]:null;
  return {...h,vk,pct,mengeFrac,mengeEuro,preisEuro,preisSpanne,mengeWirkung,preisWirkung,preisWirkungSpanne,kostenJeVk,estimated,
    total:mengeWirkung+preisWirkung,quali:pflQualiMix(hid),ikN:h.ik?IK_STANDORTE[h.ik]:1};
}
function neighborhoodBy(c,km){return ARR.filter(h=>haversineKm(c.coords,h.coords)<=km);}

/* Dienstart-Umschalter als volle-Breite-Tableiste oben in der Zusammenfassung */
function dienstTabs(){
  const opt=(key,ic,lbl)=>`<button data-dienst="${key}" class="${STATE.dienstart===key?'on':''}" role="tab" aria-selected="${STATE.dienstart===key}"><span class="material-symbols-outlined">${ic}</span>${lbl}</button>`;
  return `<div class="diensttabs" role="tablist" aria-label="Dienstart">
    ${opt("aerztlich","stethoscope","Ärztlicher Dienst")}
    ${opt("pflege","monitor_heart","Pflegedienst")}
  </div>`;
}
function setDienst(k){
  if(k===STATE.dienstart)return;
  STATE.dienstart=k;
  if(k==="aerztlich"&&!STATE.selDept) STATE.selDept=extremeDept(STATE.focus);  // ÄD-Kartenfarbe braucht eine Abteilung
  renderPanel(); paintCluster();
}

/* Befund-Kopf Pflege: Highlight = Pflegelast je Vollkraft als bundesweites Perzentil
   (amtlich/hart, auch im Nur-PPQ-Fall); Szenario im Konditional mit benannter Annahme. */
function befundPflege(c){
  const p=pflegeData(c.id), wl=pflWort(p.pct);
  const num=(n,d=1)=>n.toFixed(d).replace(".",",");
  const abwPct=(p.last-PFL_MEDIAN)/PFL_MEDIAN*100;
  const abwTxt=(abwPct>=0?"+":"−")+num(Math.abs(abwPct))+" %";
  const txt=`Personaldecke im Pflegedienst: <b>${wl}</b>. Pflegelast je Vollkraft <b>${num(p.last)}</b> · Bundesmedian ${num(PFL_MEDIAN)} (${abwTxt}). ${p.pct} von 100 Häusern bundesweit haben eine geringere Pflegelast je Vollkraft — die amtliche Kennzahl rechnet die Schwere der Fälle bereits ein (Datenjahr ${PFL_DATENJAHR}).`;
  return {tone:"neutral",label:"PFLEGEDIENST",icon:"monitor_heart",text:txt,
    hlV:"P"+p.pct,hlL:`Pflegelast je Vollkraft · bundesweit · Datenjahr ${PFL_DATENJAHR}`,
    points:synthesePoints(p,c)};
}
function befundReform(c){return window.ReformLens.befund(c);}
function currentReformLg(hid=STATE.focus){
  STATE.reformLg=window.ReformLens.selectedLg(hid,STATE.reformLg);
  return STATE.reformLg;
}
function canUseReformSimulator(hid){
  const st=window.EG_STUFE||{};
  if(st.simulator==="bundesweit")return true;
  return st.simulator==="haus"&&window.EG_USER&&hid===window.EG_USER.favoritKlinikId;
}
function renderReform(c){
  return window.ReformLens.render(c,{
    selectedLg:currentReformLg(c.id),
    scenario:STATE.szenario,
    egStufe:window.EG_STUFE,
    simulatorAllowed:canUseReformSimulator(c.id)
  });
}
/* Kernaussagen der Pflege-Synthese (regelbasiert): Personaldecke, Kostenniveau,
   Arbeitsmarkt — als kompakte Punkte oben im Befund-Kopf. Szenario liegt in der Reform-Linse. */
function synthesePoints(p,c){
  const T=0.3e6;
  const mengeS=p.mengeEuro>T?`<b>üppiger als der Bundesmedian</b> besetzt`:p.mengeEuro<-T?`<b>knapper als der Bundesmedian</b> besetzt`:`<b>nahe dem Bundesmedian</b> besetzt`;
  const preisWord=p.estimated?`liegen mangels § 6a-Wert nur <b>geschätzt</b> vor`
    :p.preisEuro>T?`liegen <b>über</b> dem Bundesdurchschnitt`:p.preisEuro<-T?`liegen <b>unter</b> dem Bundesdurchschnitt`:`liegen <b>nahe</b> dem Bundesdurchschnitt`;
  const spr=[...neighborhoodBy(c,STATE.pendelRadius).map(h=>pflPct(PFL_HAUS[h.id].last)),
             ...PFL_PENDEL_EXTRA.filter(x=>x.distKm<=STATE.pendelRadius).map(x=>pflPct(x.last))];
  const pMin=Math.min(...spr),pMax=Math.max(...spr);
  const pendelS=(pMax-pMin)>=45?`<b>stark gespreizt</b> (P${pMin}–P${pMax})`:`vergleichsweise <b>homogen</b> (P${pMin}–P${pMax})`;
  return [
    `<b>Personaldecke.</b> Bundesweit P${p.pct} — das Haus ist ${mengeS} (Datenjahr ${PFL_DATENJAHR}).`,
    `<b>Kostenniveau.</b> Die Kosten je Pflege-Vollkraft ${preisWord}.`,
    `<b>Arbeitsmarkt.</b> Im Umkreis von ${STATE.pendelRadius} km ist die Personaldecke der Häuser ${pendelS} — reine Beschreibung, keine Aussage über Personalwechsel.`];
}

/* Baustein 1: PPQ-Benchmark + Qualifikationsmix */
function ppqBenchHtml(p){
  const wl=pflWort(p.pct);
  const num=(n,d=1)=>n.toFixed(d).replace(".",",");
  const abwPct=(p.last-PFL_MEDIAN)/PFL_MEDIAN*100;
  const abwTxt=(abwPct>=0?"+":"−")+num(Math.abs(abwPct))+" %";
  const bars=p.quali.map(g=>`<span style="width:${g.p.toFixed(1)}%;background:${g.c}"></span>`).join("");
  const leg=p.quali.map(g=>`<span class="qm"><span class="sw" style="background:${g.c}"></span>${g.k} <b>${Math.round(g.p)} %</b></span>`).join("");
  return `
  <section class="dimcard">
    <div class="dimhead"><div class="dimnum">1</div>
      <div class="ht"><h2>Pflegelast je Vollkraft</h2>
        <div class="q">Wie viel Pflegeaufwand trägt eine Pflege-Vollkraft? Amtliche Kennzahl (abgeleitet aus dem Pflegepersonalquotienten, § 137j SGB V); die Schwere der Fälle ist bereits eingerechnet. Verglichen wird mit allen Häusern bundesweit.</div></div>
      ${reportBadge(PFL_DATENJAHR,"amtlich")}
      <span class="material-symbols-outlined ic">monitor_heart</span></div>
    <div class="pplead"><span class="v" title="P${p.pct}: ${p.pct} von 100 Häusern bundesweit haben eine geringere Pflegelast je Vollkraft">P${p.pct}</span><span class="l">${wl}</span><span class="datenjahr">Datenjahr ${PFL_DATENJAHR}</span></div>
    <div class="pplead-sub">Pflegelast je Vollkraft <b>${num(p.last)}</b> · Bundesmedian ${num(PFL_MEDIAN)} (${abwTxt})</div>
    <div class="chart-foot"><span class="material-symbols-outlined">balance</span>Die Kennzahl wertet nicht. Hohe Pflegelast = knappe Personaldecke, niedrige = üppige. Beides ist doppeldeutig: üppig kann „gut versorgt" oder „unwirtschaftlich" heißen, knapp kann „effizient" oder „unterbesetzt" heißen.</div>
    <div class="subh" style="margin-top:14px">Qualifikationsmix „Pflege am Bett"${prov("news")}</div>
    <div class="qmix">${bars}</div>
    <div class="qmix-leg">${leg}</div>
  </section>`;
}
/* Baustein 2: Peer-Illustration — nur Anzeige-Kontext, geht in keine Rechnung */
function peerIllusHtml(c){
  let peers=ARR.filter(h=>h.id!==c.id&&h.arch===c.arch);
  if(peers.length<3) peers=ARR.filter(h=>h.id!==c.id);
  const rows=peers.slice(0,4).map(h=>{const pct=pflPct(PFL_HAUS[h.id].last);
    return `<div class="illrow"><span class="nm">${h.name}</span><span class="pc">P${pct}</span><span class="sw" style="background:${pflColor(pct)}"></span></div>`;}).join("");
  return `
  <section class="dimcard">
    <div class="dimhead"><div class="dimnum">2</div>
      <div class="ht"><h2>Vergleichshäuser</h2><div class="q">Häuser mit ähnlichem Leistungsprofil und lokale Wettbewerber — <em>nur zum Einordnen</em>.</div></div>
      ${reportBadge(PFL_DATENJAHR,"amtlich")}
      <span class="material-symbols-outlined ic">groups</span></div>
    <div class="illus">
      <div class="ill-h"><span class="material-symbols-outlined" style="font-size:14px">visibility</span>zur Einordnung · geht in keine Rechnung ein</div>
      ${rows}
    </div>
    <div class="chart-foot"><span class="material-symbols-outlined">balance</span>Gerechnet wird allein gegen den <b>Bundesmedian</b>: Die Pflegelast berücksichtigt die Fallschwere bereits — sie zusätzlich an ähnlichen Häusern zu normieren, hieße doppelt zu korrigieren.</div>
  </section>`;
}
/* Baustein 3: Pendelraum — Verteilung im 30-Min-Fahrzeitraum, Radius als Tweak-Regler */
function tweakHtml(){
  return `<div class="tweak"><span class="material-symbols-outlined" style="font-size:16px">directions_car</span>
    Pendelraum-Radius (Näherung für die Fahrzeit)
    <input type="range" min="10" max="40" step="2" value="${STATE.pendelRadius}" data-tweak="pendel" aria-label="Pendelraum-Radius"/>
    <b id="pendelVal">${STATE.pendelRadius} km</b></div>`;
}
let PENDEL_PREV=0;   // Anzahl zuletzt gezeigter Zeilen — nur neu hinzukommende werden eingeblendet
function pendelTableHtml(c){
  // Sortierung nach Entfernung (nah→fern): mit wachsendem Radius kommen entferntere Haeuser
  // unten dazu, das macht die schrittweise Erweiterung anschaulich.
  const rows=[
    ...neighborhoodBy(c,STATE.pendelRadius).map(h=>({name:h.name,last:PFL_HAUS[h.id].last,
      km:haversineKm(c.coords,h.coords),focus:h.id===c.id})),
    ...PFL_PENDEL_EXTRA.filter(x=>x.distKm<=STATE.pendelRadius).map(x=>({name:x.name,last:x.last,
      km:x.distKm,focus:false}))
  ].map(o=>({...o,pct:pflPct(o.last)})).sort((a,b)=>a.km-b.km);
  const trs=rows.map((o,i)=>{
    const isNew=i>=PENDEL_PREV;   // Zeile war beim vorigen Radius noch nicht sichtbar
    const kmTxt=o.focus?"–":(o.km<10?o.km.toFixed(1):Math.round(o.km))+" km";
    const here=o.focus?`<span class="here">hier</span>`:"";
    return `<div class="pendrow${o.focus?" focus":""}${isNew?" new":""}">`
      +`<span class="nm">${o.name}${here}</span>`
      +`<span class="pc" style="color:${pflColor(o.pct)}">P${o.pct}</span>`
      +`<span class="wt">${pflWort(o.pct)}</span>`
      +`<span class="km">${kmTxt}</span></div>`;
  }).join("");
  PENDEL_PREV=rows.length;
  const grad=`<span style="display:inline-block;width:18px;height:8px;border-radius:2px;vertical-align:middle;background:linear-gradient(90deg,var(--dicht),var(--mid) 50%,var(--schlank))"></span>`;
  return `<div class="pendtab">${trs}
    <div class="pendcaps"><span>${grad} üppig↔knapp besetzt</span><span>${rows.length} ${rows.length===1?"Haus":"Häuser"} im Radius</span></div></div>`;
}
function pendelHtml(c){
  PENDEL_PREV=0;   // Voll-Render der Kachel: alle Zeilen einmal ruhig einblenden
  return `
  <section class="dimcard">
    <div class="dimhead"><div class="dimnum">3</div>
      <div class="ht"><h2>Pendelraum</h2><div class="q">Wie ist die Pflege-Personaldecke bei den Häusern verteilt, die für Pflegekräfte in Pendel-Reichweite liegen? Eigenes Haus ist markiert.</div></div>
      ${reportBadge(PFL_DATENJAHR,"amtlich")}
      <span class="material-symbols-outlined ic">pin_drop</span></div>
    ${tweakHtml()}
    <div id="pendelStrip">${pendelTableHtml(c)}</div>
    <div class="chart-foot"><span class="material-symbols-outlined">straighten</span>Spalte P: Stand im Bundesvergleich (P74 = knapper besetzt als 74 von 100 Häusern). So verzerrt ein extremer Ausreißer — etwa eine Spezialklinik — die Skala nicht. Sortiert nach Entfernung; reine Beschreibung des lokalen Arbeitsmarkts.</div>
  </section>`;
}
/* Baustein 4: Pflegebudget-Szenario — nie eine Zahl allein, immer Menge + Preis + Provenienz */
function szenHtml(p,c){
  const badge=p.prov==="amtlich"
    ?`<span class="provbadge amtlich"><span class="material-symbols-outlined">verified</span>amtlich · Datenjahr ${PFL_DATENJAHR}</span>`
    :p.prov==="verbund"
    ?`<span class="provbadge verbund"><span class="material-symbols-outlined">account_tree</span>Verbundwert — ein gemeinsamer Wert für ${p.ikN} Standorte (${p.ik})</span>`
    :`<span class="provbadge geschaetzt"><span class="material-symbols-outlined">help</span>geschätzt — typischer Wert vergleichbarer Häuser (Trägerart × Bundesland)</span>`;
  const preisVal=p.estimated?mioApprox(p.preisWirkung):mio(p.preisWirkung);
  const preisSpanne=p.estimated?`<div class="x">Spanne ${mio(p.preisWirkungSpanne[0])} … ${mio(p.preisWirkungSpanne[1])}</div>`:"";
  const totalVal=p.estimated?mioApprox(p.total):mio(p.total);
  // Herleitung Menge: Pflegelast je VK vs. Bundesmedian → rechnerische VK-Differenz gegenüber der Median-Erwartung.
  const num=(n,d=1)=>n.toFixed(d).replace(".",",");
  const signPct=v=>(v>=0?"+":"−")+num(Math.abs(v))+" %";
  const mengeAbwPct=(p.last-PFL_MEDIAN)/PFL_MEDIAN*100;      // last<median → negativ → Personaldecke üppiger
  const vkDiff=Math.round(p.vk*p.mengeFrac);                 // +: mehr Pflege-VK als der Bundesmedian erwarten ließe
  const mengeRicht=vkDiff>0?"mehr":vkDiff<0?"weniger":"gleich viele";
  const mengeSatz=vkDiff===0
    ?`Die Personaldecke entspricht rechnerisch dem Bundesmedian.`
    :`Rechnerische ${vkDiff>0?"Mehr":"Minder"}ausstattung: rund <b>${fmt(Math.abs(vkDiff))} Pflege-Vollkräfte</b> ${mengeRicht}, als der Bundesmedian für die Fallschwere dieses Hauses erwarten ließe (von ${fmt(p.vk)} Pflege-Vollkräften).`;
  const mengeWirkSatz=vkDiff>0
    ?`Unter Durchschnittspreisen entfiele die Finanzierung dieser Mehrausstattung — das ergibt den Betrag.`
    :vkDiff<0
    ?`Unter Durchschnittspreisen würde die höhere Median-Ausstattung vergütet — das ergibt den Betrag.`
    :`Unter Durchschnittspreisen bleibt die Mengenkomponente neutral.`;
  // Herleitung Preis: Kosten je Pflege-VK vs. Bundesdurchschnitt.
  const preisAbwPct=(p.kostenJeVk-PFL_KOSTEN_BUND)/PFL_KOSTEN_BUND*100;
  return `
  <section class="dimcard">
    <div class="dimhead"><div class="dimnum"><span class="material-symbols-outlined" style="font-size:17px">savings</span></div>
      <div class="ht"><h2>Pflegebudget-Szenario</h2>
        <div class="q">Warum käme dieses Haus im Durchschnittspreis-Modell auf ein Plus oder Minus? Die Antwort wird <em>immer in zwei Gründe zerlegt</em> — mehr/weniger Personal (Menge) und teureres/günstigeres Personal (Preis) — und nie zu einer Zahl vermischt.</div></div>
      <span class="material-symbols-outlined ic">savings</span></div>
    <div class="szen">
      <div class="szen-comps">
        <div class="szen-comp"><div class="k">davon Personaldecke</div><div class="v">${mio(p.mengeWirkung)}</div>
          <div class="x">Menge: Pflegelast je Vollkraft <b>${num(p.last)}</b> (Bundesmedian ${num(PFL_MEDIAN)}, ${signPct(mengeAbwPct)}). ${mengeSatz} ${mengeWirkSatz} · je Standort berechnet
            <div style="margin-top:5px"><span class="provbadge amtlich"><span class="material-symbols-outlined">verified</span>amtlich (PPQ)</span></div></div></div>
        <div class="szen-comp"><div class="k">davon Kostenniveau</div><div class="v">${preisVal}</div>
          <div class="x">Preis: Kosten je Pflege-Vollkraft <b>${fmt(p.kostenJeVk)} €</b> (Bundesdurchschnitt ${fmt(PFL_KOSTEN_BUND)} €, ${signPct(preisAbwPct)})${p.estimated?" — geschätzt":""}. Unter Durchschnittspreisen würde der Bundesdurchschnitt vergütet statt der tatsächlichen Kosten, angewandt auf ${fmt(p.vk)} Pflege-Vollkräfte${p.estimated?" (Kostenniveau geschätzt)":""}${preisSpanne}
            <div style="margin-top:5px">${badge}</div></div></div>
      </div>
      <div class="szen-total"><span class="v">${totalVal}</span><span class="l">rechnerisches Ergebnis pro Jahr bei unveränderter Personalstruktur${p.estimated?" · Kostenniveau geschätzt":""}</span></div>
    </div>
    ${pflegebudgetHistogram(p)}
    ${reportButtonHtml()}
    <div class="chart-foot"><span class="material-symbols-outlined">info</span>Bereits abgezogen: Hilfskraft-Anteile, die seit 2025 nicht mehr über das Pflegebudget abrechenbar sind (geschätzt). Zur Einordnung: Leiharbeit stellt ${p.leih==null?"n/v":p.leih+" %"} der Pflege-Vollkräfte (Wert gilt für den gesamten Abrechnungsverbund).</div>
  </section>`;
}
/* dezenter Verweis auf das ausgelagerte Szenario (jetzt Reform-Linse) */
function reformLinkHtml(){
  return `
  <div class="dimcard reform-link" data-goto-lens="4" role="button" tabindex="0" title="Zur Reform-Linse wechseln" style="cursor:pointer;display:flex;align-items:center;gap:10px">
    <span class="material-symbols-outlined ic">savings</span>
    <span style="font-size:12.5px;color:var(--text-dim)">Pflegebudget-Szenario (§ 6a) <b style="color:var(--text)">→ jetzt in der Reform-Linse</b></span>
  </div>`;
}
function renderPflege(c){
  const p=pflegeData(c.id);
  return ppqBenchHtml(p)+peerIllusHtml(c)+pendelHtml(c)+reformLinkHtml();
}
