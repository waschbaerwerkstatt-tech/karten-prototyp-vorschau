/* ============ Linse 3: Markt & Wettbewerb ============
   Sicht des Fokus-Hauses im räumlichen Markt: zwei Bausteine, NIE zu einem Score
   verrechnet — Wettbewerbsdruck (wer drückt auf mich) und Marktausschöpfung (hole
   ich, was meine Lage erwarten lässt). Alles je Leistungsfamilie; Hausebene nur
   aggregiert. Autoritative Methodik: docs/prd/krankenhausdaten-analyse.md,
   Abschnitt „Markt & Wettbewerb (Linse 3)". Sprachregeln hart: Leistungsfamilie
   (nie Leistungsgruppe), Leistungsanteil im räumlichen Markt (nie Marktanteil),
   Verteilungs-/Realisierungslücke (nie Potenzial).
   ponytail: alle Zahlen deterministischer Mock — Platzhalter fürs Analyse-Backend
   (Isochronen je Fahrzeit-Stufe, Zensus-Überlappung, QB-Volumina, Bundesraten).
   Volumina skalieren mit der Hausgröße (Referenz = uke, dort exakt); Druck/Referenz/
   Angebot bleiben konstant — das Schaufenster beweist die Erzähllogik, nicht die Zahl.
   SPEC-NOTIZ: Kopfzahl/Y-Achse „Ausschöpfung" = Ist ÷ Erreichbarkeits-Referenz
   (nur so trägt die 100%-Linie); die im PRD ebenfalls genannte Zerlegung
   Leistungsanteil × Marktrealisierung wird im Drilldown getrennt gezeigt, nicht
   als Produkt gleichgesetzt (Kalibrier-/Spec-Frage, s. Handoff). */
const STUFE_KM={30:20,60:38,90:54};   // Mock-Skalierung der Fahrzeit-Stufen auf Ring-Radien
/* Leistungsfamilien-Katalog des Fokus-Hauses (Referenzwerte uke). Fundamentaldaten je
   Familie; alle Markt-Kennzahlen werden daraus abgeleitet. Bewusst so gesetzt, dass die
   Erzählung prüfbar ist: eine Familie je Quadrant, Killercase (größter Bubble im
   kritischen Feld), alle drei Fahrzeit-Stufen, ein induzierbar- (dünn) und ein
   Substitutions-Fall (dicht). „endo" trägt exakt das PRD-Rechenbeispiel. */
/* Drei prospektive Signale je Familie bleiben STRUKTURELL GETRENNT (Beschluss §5.2, Leitplanke 3),
   nie zu einem Score verrechnet:
   - demografie: {deltaPct,zieljahr} — demografiegewichtete Markt-Projektion, Horizont +10 Jahre,
     Annahme „Nutzungsraten konstant" (wird in der UI ausgewiesen). UI-Name: „Demografie".
   - ambulantisierung: {stufe 0..4, anteilPct} — IGES-Potenzialklassifikation (AOP-Gutachten §115b),
     ordinal, als Harvey Ball dargestellt (Viertel-Stufen). Provenienz „gutachterlich".
   - fortschritt: {text,quelle}|null — kuratierte Annotation „Verfahrenswandel bekannt", nur wo eine
     benennbare Verschiebung existiert; sonst null (keine erfundenen Grade).
   lgSchwelle: {lg,wert}|null — nur wo Familie ≙ amtliche Leistungsgruppe mit Mindestvorhaltezahl
   (einzige Stelle, an der „LG" statt „Leistungsfamilie" steht: expliziter Querverweis auf die Schwelle).
   fallzahlJahre: QB-Jahrestrend (Referenz uke), in marktFamilien() hausgrößen-skaliert; letzter Wert ≈ ist. */
const FAM_KATALOG=[
  {key:"kard", name:"Koronarintervention",              sys:"OPS", stufe:60, zeit:false, erwartet:3000, realisiert:2500, referenz:0.27, ist:480, angebot:"dicht", druck:92, share:0.12,
    demografie:{deltaPct:7,zieljahr:2036},  ambulantisierung:{stufe:2,anteilPct:25}, fortschritt:{text:"Interventionelle Verfahren (Katheter-gestützt, u. a. TAVI) ersetzen zunehmend offen-chirurgische Eingriffe.",quelle:"Deutscher Herzbericht"}, lgSchwelle:{lg:"Interventionelle Kardiologie",wert:200}, fallzahlJahre:[400,420,445,465,480]},
  {key:"endo", name:"Elektive Endoprothetik",           sys:"OPS", stufe:60, zeit:false, erwartet:1000, realisiert:800,  referenz:0.30, ist:180, angebot:"dicht", druck:70, share:0.07,
    demografie:{deltaPct:12,zieljahr:2036}, ambulantisierung:{stufe:3,anteilPct:42}, fortschritt:{text:"Ambulante Verlagerung planbarer Endoprothesen-Eingriffe (Kurzlieger, Enhanced-Recovery-Pfade) zieht Volumen aus dem stationären Sektor.",quelle:"AWMF-Leitlinie / Endoprothesenregister EPRD"}, lgSchwelle:{lg:"Endoprothetik",wert:100}, fallzahlJahre:[260,240,215,195,180]},
  {key:"kolo", name:"Kolorektale Eingriffe",            sys:"OPS", stufe:60, zeit:false, erwartet:1400, realisiert:1250, referenz:0.26, ist:240, angebot:"dicht", druck:58, share:0.08,
    demografie:{deltaPct:6,zieljahr:2036},  ambulantisierung:{stufe:2,anteilPct:28}, fortschritt:null, lgSchwelle:null, fallzahlJahre:[235,242,238,244,240]},
  {key:"stroke",name:"Schlaganfall-Akutbehandlung",     sys:"ICD", stufe:30, zeit:true,  erwartet:900,  realisiert:850,  referenz:0.35, ist:340, angebot:"dicht", druck:80, share:0.06,
    demografie:{deltaPct:14,zieljahr:2036}, ambulantisierung:{stufe:0,anteilPct:2},  fortschritt:null, lgSchwelle:{lg:"Stroke Unit",wert:150}, fallzahlJahre:[290,305,318,330,340]},
  {key:"geburt",name:"Geburtshilfe",                    sys:"OPS", stufe:30, zeit:false, erwartet:1200, realisiert:1150, referenz:0.30, ist:400, angebot:"dicht", druck:40, share:0.09,
    demografie:{deltaPct:-8,zieljahr:2036}, ambulantisierung:{stufe:0,anteilPct:3},  fortschritt:null, lgSchwelle:{lg:"Geburtshilfe",wert:250}, fallzahlJahre:[520,480,450,420,400]},
  {key:"geri", name:"Geriatrische Komplexbehandlung",   sys:"OPS", stufe:30, zeit:false, erwartet:1600, realisiert:1500, referenz:0.22, ist:300, angebot:"dicht", druck:35, share:0.07,
    demografie:{deltaPct:22,zieljahr:2036}, ambulantisierung:{stufe:1,anteilPct:12}, fortschritt:null, lgSchwelle:null, fallzahlJahre:[230,255,275,290,300]},
  {key:"uro",  name:"Uro-Onkologie",                    sys:"ICD", stufe:90, zeit:false, erwartet:600,  realisiert:380,  referenz:0.25, ist:70,  angebot:"duenn", druck:22, share:0.04,
    demografie:{deltaPct:10,zieljahr:2036}, ambulantisierung:{stufe:3,anteilPct:38}, fortschritt:null, lgSchwelle:null, fallzahlJahre:[110,108,70,72,70]},
  {key:"pank", name:"Pankreaschirurgie",                sys:"OPS", stufe:90, zeit:false, erwartet:320,  realisiert:210,  referenz:0.40, ist:95,  angebot:"duenn", druck:18, share:0.02,
    demografie:{deltaPct:4,zieljahr:2036},  ambulantisierung:{stufe:1,anteilPct:8},  fortschritt:null, lgSchwelle:{lg:"Pankreaschirurgie",wert:40}, fallzahlJahre:[90,93,91,96,95]}];
const medianOf=a=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;};

/* Abgeleitete Markt-Kennzahlen je Familie für ein Haus (Volumina hausgrößen-skaliert). */
function marktFamilien(hid){
  const SF=CLINICS[hid].fallVoll/CLINICS.uke.fallVoll;
  return FAM_KATALOG.map(f=>{
    const ist=Math.round(f.ist*SF), erwartet=Math.round(f.erwartet*SF), realisiert=Math.round(f.realisiert*SF);
    const erreichbarkeitsReferenz=f.referenz*realisiert;                      // erwartetes Eigenvolumen (Referenzanteil × realisierter Markt)
    const ausschoepfung=ist/erreichbarkeitsReferenz;                          // Ist ÷ Erreichbarkeits-Referenz (Kopfzahl/Y-Achse)
    const leistungsanteil=ist/realisiert;                                     // gemessen: eigenes Ist ÷ Marktmenge
    const marktrealisierung=realisiert/erwartet;                              // geschätzt: realisiert ÷ erwartet
    const verteilungsluecke=Math.round(erreichbarkeitsReferenz-ist);          // reale Fälle bei Wettbewerbern
    const realisierungsluecke=Math.round(f.referenz*(erwartet-realisiert));   // stationär gar nicht stattfindend
    const fallzahlJahre=f.fallzahlJahre.map(v=>Math.round(v*SF));              // QB-Jahrestrend hausgrößen-skaliert (letzter Wert ≈ ist)
    return {...f,ist,erwartet,realisiert,erreichbarkeitsReferenz,ausschoepfung,leistungsanteil,
      marktrealisierung,verteilungsluecke,realisierungsluecke,fallzahlJahre};
  });
}
/* Quadrant einer Familie relativ zu Druck-Median (x) und Ausschöpfung 100 % (y). */
function famQuadrant(f,med){const hd=f.druck>=med,ha=f.ausschoepfung>=1;
  return hd?(ha?"umkaempft":"kritisch"):(ha?"festung":"potenzial");}
const QUAD_LABEL={kritisch:"kritisch",umkaempft:"umkämpfte Stärke",festung:"Festung",potenzial:"offene Lücke"};
const QUAD_VAR={kritisch:"--bad",umkaempft:"--accent",festung:"--ok",potenzial:"--warn"};
const druckWort=p=>p>=75?"sehr hoch":p>=50?"hoch":p>=25?"moderat":"gering";
function ausblickSwitchHtml(){
  return `<div class="ausblick-head">
    <div class="subh">Ausblick${prov("ext")}</div>
    <div class="lswitch seg" data-ausblick-switch role="tablist" aria-label="Ausblick anzeigen">
      <button data-ausblick="off" class="${STATE.ausblick?'':'on'}" aria-selected="${STATE.ausblick?'false':'true'}">Ist</button>
      <button data-ausblick="on" class="${STATE.ausblick?'on':''}" aria-selected="${STATE.ausblick?'true':'false'}">Ausblick</button>
    </div>
  </div>`;
}
/* Ausblick-Signale bleiben getrennt (kein Score). Hilfsgrößen für die ordinale Ambulantisierung. */
const harveyPct=stufe=>({0:0,1:25,2:50,3:75,4:100})[stufe]||0;   // Viertel-Stufen für den Harvey Ball
const AMB_WORT={0:"kein relevantes Potenzial",1:"gering",2:"moderat",3:"hoch",4:"sehr hoch"};
/* Demografie-Pfeil je Bubble im Quadrant: Richtung = Vorzeichen, Länge ~ |deltaPct|, dezente Farbe. */
function demografiePfeil(f,cx,cy,r){
  const d=f.demografie.deltaPct; if(!d) return "";
  const up=d>0, len=clamp(Math.abs(d)*1.15,7,28);
  const y0=up?cy-r-2:cy+r+2, y1=up?y0-len:y0+len;
  const head=up?`M ${(cx-3).toFixed(1)} ${(y1+4).toFixed(1)} L ${cx.toFixed(1)} ${y1.toFixed(1)} L ${(cx+3).toFixed(1)} ${(y1+4).toFixed(1)}`
                :`M ${(cx-3).toFixed(1)} ${(y1-4).toFixed(1)} L ${cx.toFixed(1)} ${y1.toFixed(1)} L ${(cx+3).toFixed(1)} ${(y1-4).toFixed(1)}`;
  return `<g class="demo-arrow"><title>Demografie: ${d>0?"+":""}${d} % bis ${f.demografie.zieljahr} (Nutzungsraten konstant)</title>`
    +`<line x1="${cx.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="var(--text-dim)" stroke-width="1.4"/>`
    +`<path d="${head}" fill="none" stroke="var(--text-dim)" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/></g>`;
}
/* Zwei Zusatz-Glyphen je Familienzeile bei aktivem Ausblick: Harvey (Ambulantisierung) + ✚ (Fortschritt, nur wo vorhanden). */
function famOutlookGlyphs(f){
  const st=f.ambulantisierung.stufe;
  const amb=`<span class="harvey" style="--harvey:${harveyPct(st)}%" title="Ambulantisierung: ${AMB_WORT[st]} (Stufe ${st}/4, ${f.ambulantisierung.anteilPct} % der Fälle mit attestiertem Potenzial)"></span>`;
  const fort=f.fortschritt?`<span class="progress-marker" title="Verfahrenswandel bekannt: ${f.fortschritt.text} — Quelle: ${f.fortschritt.quelle}">✚</span>`:"";
  return `<span class="fam-outlook">${amb}${fort}</span>`;
}
/* Familien-Drilldown: drei getrennte Ausblick-Karten aus den ehrlichen Feldern (Fortschritt nur wenn vorhanden). */
function familieAusblickSignals(f){
  const d=f.demografie, up=d.deltaPct>=0, st=f.ambulantisierung.stufe;
  const demoCard=`<div class="ausblick-signal">
    <div class="top"><span>Demografie</span><span class="trend-arrow" style="color:var(--text-dim)">${up?"↑":"↓"}</span></div>
    <div class="tx"><b>${d.deltaPct>0?"+":""}${d.deltaPct} % bis ${d.zieljahr}</b> — demografiegewichtete Markt-Projektion für den Marktraum. <span class="ausblick-annahme">Annahme: Nutzungsraten konstant.</span>${prov("ext")}</div>
  </div>`;
  const ambCard=`<div class="ausblick-signal">
    <div class="top"><span>Ambulantisierung</span><span class="harvey" style="--harvey:${harveyPct(st)}%" title="Stufe ${st}/4 · ${f.ambulantisierung.anteilPct} % der Fälle"></span></div>
    <div class="tx">Ambulantes Potenzial <b>${AMB_WORT[st]}</b> (Stufe ${st}/4). <span class="provbadge gutachterlich"><span class="material-symbols-outlined">gavel</span>gutachterlich</span>
      <div class="ausblick-foot">Potenzial-Obergrenze — reale Ambulantisierbarkeit hängt an Kontextfaktoren, die QB-Daten nicht enthalten.</div></div>
  </div>`;
  const fortCard=f.fortschritt?`<div class="ausblick-signal">
    <div class="top"><span>medizinischer Fortschritt</span><span class="progress-marker">✚</span></div>
    <div class="tx"><b>Verfahrenswandel bekannt.</b> ${f.fortschritt.text} <span class="ausblick-quelle" title="${f.fortschritt.quelle}">Quelle: ${f.fortschritt.quelle}</span>${prov("ext")}</div>
  </div>`:"";
  return `<div class="ausblick-panel${f.fortschritt?"":" two"}" aria-label="prospektive Signale">${demoCard}${ambCard}${fortCard}</div>`;
}
/* Regelbasierter Prosa-Satz für den Befund-Kopf — nie ein Score, aus den ehrlichen Feldern gezählt. */
function befundProspectSatz(F){
  const zahl=n=>({0:"keine",1:"eine",2:"zwei",3:"drei",4:"vier",5:"fünf"})[n]||String(n);
  const top=F.slice().sort((a,b)=>b.ist-a.ist).slice(0,5);
  const wachs=top.filter(f=>f.demografie.deltaPct>0).length;
  const ambHoch=F.filter(f=>f.ambulantisierung.stufe>=3).length;
  const teil1=`Demografisch wächst der Markt in <b>${wachs} deiner ${top.length} stärksten Familien</b>`;
  const teil2=ambHoch
    ? `; <b>${zahl(ambHoch)}</b> ${ambHoch===1?"Familie":"Familien"} mit hoher Ambulantisierungs-Exposition (Stufe ≥3).`
    : `; keine Familie mit hoher Ambulantisierungs-Exposition.`;
  return ` ${teil1}${teil2}`;
}
/* Trend-Richtung aus dem QB-Jahrestrend (letzter vs. vorletzter Wert) — lokaler Helper, nicht aus der Reform-Linse. */
function marktTrendWort(a){
  const d=a[a.length-1]-a[a.length-2], rel=d/Math.max(1,a[a.length-2]);
  return rel>0.02?{w:"steigend",ic:"↑"}:rel<-0.02?{w:"fallend",ic:"↓"}:{w:"stabil",ic:"→"};
}
/* Wettbewerber im Marktraum der Familie: Überlappungsgewicht (Nähe-Proxy für geteilte
   Bevölkerung) × Substitutionsfaktor (QB-Volumen-Proxy). Häuser ohne Angebot → Beitrag 0. */
function familieWettbewerber(hid,f){
  const focus=CLINICS[hid], km=STUFE_KM[f.stufe];
  return ARR.filter(h=>h.id!==hid&&haversineKm(focus.coords,h.coords)<=km).map(h=>{
    const dist=haversineKm(focus.coords,h.coords), r=seededRng(hid+"|"+f.key+"|"+h.id);
    const offers=r()>0.28, weight=clamp(1-dist/km,0.05,1);
    const subst=offers?clamp(0.25+r()*0.7,0,1):0;
    // Familien-Volumen des Wettbewerbers auf gleicher Skala wie das eigene (Familien-Ist × relative Hausgröße)
    const volFam=offers?Math.round(f.ist*(h.fallVoll/focus.fallVoll)*(0.4+r()*0.9)):0;
    return {id:h.id,name:h.name,dist,weight,offers,subst,volFam,beitrag:weight*subst};
  }).sort((a,b)=>b.beitrag-a.beitrag);
}
function trendSpark(values){
  const W=80,H=18,p=2,max=Math.max(...values),min=Math.min(...values),span=Math.max(1,max-min);
  const pts=values.map((v,i)=>[p+i*((W-p*2)/(values.length-1)),H-p-((v-min)/span)*(H-p*2)]);
  const d=pts.map((pt,i)=>(i?"L":"M")+pt[0].toFixed(1)+" "+pt[1].toFixed(1)).join(" ");
  return `<svg class="trend-spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}"/></svg>`;
}
/* Marktstruktur als Inline-SVG: horizontale Balken auf ROHER Fallzahl-Skala, sortiert von
   groß nach klein; kumulierte Versorgungsanteils-Linie über den Balken (obere %-Skala),
   amtliche Mindestvorhaltezahl als senkrechte Linie mit Beschriftung an der unteren
   Fallzahl-Achse (die Schwelle IST eine Fallzahl). */
function marktstrukturHtml(c,f){
  const wb=familieWettbewerber(c.id,f).filter(w=>w.offers);
  const rows=[{id:c.id,name:c.name,volFam:f.ist,focus:true},...wb];
  const totalVol=rows.reduce((a,r)=>a+r.volFam,0)||1;
  const sorted=rows.map(r=>({...r,share:r.volFam/totalVol*100}))
    .sort((a,b)=>b.volFam-a.volFam);                                 // immer groß → klein
  const major=sorted.filter(r=>r.share>=1);
  const tail=sorted.filter(r=>r.share<1);                            // <1 % Versorgungsrelevanz
  // Long Tail nur gruppieren, wenn er mehr als ein Haus fasst — ein Einzelhaus bleibt Einzelbalken.
  const visible=tail.length>=2?[...major,{id:"longtail",name:`Long Tail &lt;1 % (${tail.length} Häuser)`,
    volFam:tail.reduce((a,r)=>a+r.volFam,0),share:tail.reduce((a,r)=>a+r.share,0),longtail:true}]:sorted;
  const schwelle=f.lgSchwelle;
  const maxFall=Math.max(1,...visible.map(r=>r.volFam),schwelle?schwelle.wert*1.1:0);
  const W=520,pl=160,pr=20,rowH=24,bh=15,topBars=40,pctAxisY=12;
  const barW=W-pl-pr, axisY=topBars+visible.length*rowH+6, H=axisY+(schwelle?48:26);
  const fx=v=>pl+(v/maxFall)*barW;              // Fallzahl-Skala (Balken, untere Achse)
  const cx=pct=>pl+(pct/100)*barW;              // kumulierter %-Anteil (Linie, obere Achse)
  let cum=0; const cumPts=[];
  const barEls=visible.map((r,i)=>{
    const y=topBars+i*rowH, bw=Math.max(1.5,fx(r.volFam)-pl);
    cum+=r.share; cumPts.push([cx(Math.min(100,cum)),y+bh/2]);
    const col=r.focus?"var(--accent-strong)":r.longtail?"var(--text-faint)":"var(--accent)";
    const nm=r.longtail?r.name:(r.name.length>24?r.name.slice(0,23)+"…":r.name);
    const tip=`${r.longtail?"Long Tail <1 %":r.name}: ${fmt(r.volFam)} Fälle/Jahr · Versorgungsanteil ${r.share.toFixed(1).replace(".",",")} %`;
    return `<g class="mk-bar${r.focus?" focus":""}${r.longtail?" longtail":""}" data-market-provider-bar${r.focus?" data-focus-provider":""}>`
      +`<title>${tip}</title>`
      +`<text x="${pl-8}" y="${(y+bh/2+3).toFixed(1)}" text-anchor="end" class="mk-nm${r.focus?" focus":""}">${r.focus?"▸ ":""}${nm}</text>`
      +`<rect x="${pl}" y="${y}" width="${bw.toFixed(1)}" height="${bh}" rx="3" fill="${col}"/>`
      +`<text x="${(pl+bw+5).toFixed(1)}" y="${(y+bh/2+3).toFixed(1)}" class="mk-val">${fmt(r.volFam)}</text>`
      +`</g>`;
  }).join("");
  const cumPath=cumPts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const cumDots=cumPts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.4" fill="var(--warn)"/>`).join("");
  // Achsentitel links außen — kollidiert nicht mehr mit den Prozent-Ticks.
  const pctAxis=`<text x="8" y="${pctAxisY}" class="mk-axis-title">Kumuliert %</text>`
    +[25,50,75,100].map(t=>`<g><line x1="${cx(t).toFixed(1)}" y1="${pctAxisY+2}" x2="${cx(t).toFixed(1)}" y2="${topBars-4}" stroke="var(--line)" stroke-dasharray="2 3"/>`
      +`<text x="${cx(t).toFixed(1)}" y="${pctAxisY}" text-anchor="middle" class="mk-axis">${t}</text></g>`).join("");
  const fallAxis=`<line x1="${pl}" y1="${axisY}" x2="${pl+barW}" y2="${axisY}" stroke="var(--line)"/>`
    +[0,Math.round(maxFall/2),Math.round(maxFall)].map(v=>`<text x="${fx(v).toFixed(1)}" y="${axisY+11}" text-anchor="middle" class="mk-axis">${fmt(v)}</text>`).join("")
    +`<text x="${(pl+barW).toFixed(1)}" y="${axisY+23}" text-anchor="end" class="mk-axis-title">Fälle/Jahr →</text>`;
  // Schwellen-Beschriftung unten an der Fallzahl-Achse (dort stehen die Fallzahlen),
  // auf eigener Zeile unter den Ticks und dem Achsentitel; x geklemmt, damit der
  // Text im Bild bleibt.
  const schwelleLblX=schwelle?Math.min(Math.max(fx(schwelle.wert),pl+4),W-130):0;
  const schwelleEl=schwelle
    ? `<g class="mk-schwelle"><line x1="${fx(schwelle.wert).toFixed(1)}" y1="${topBars-2}" x2="${fx(schwelle.wert).toFixed(1)}" y2="${axisY+26}" stroke="var(--bad)" stroke-width="1.4" stroke-dasharray="5 3"/>`
      +`<text x="${schwelleLblX.toFixed(1)}" y="${axisY+38}" text-anchor="${schwelleLblX<W/2?"start":"middle"}" class="mk-schwelle-lbl">Mindestvorhaltezahl (LG ${schwelle.lg}): ${fmt(schwelle.wert)}</text></g>`
    : "";
  const svg=`<svg viewBox="0 0 ${W} ${H}" class="mk-svg" role="img" aria-label="Anbieter-Fallzahlen mit kumuliertem Versorgungsanteil${schwelle?" und amtlicher Mindestvorhaltezahl":""}">`
    +pctAxis+schwelleEl+barEls
    +`<path d="${cumPath}" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-linejoin="round"/>${cumDots}`
    +fallAxis+`</svg>`;
  const schwelleFoot=schwelle
    ? `Rote gestrichelte Linie: amtliche Mindestvorhaltezahl der Leistungsgruppe, beschriftet an der Fallzahl-Achse.`
    : `Für diese Familie gibt es keine eindeutige amtliche Leistungsgruppe — daher keine Schwellen-Linie.`;
  return `<div class="marktstruktur">
    <div class="ausblick-head"><div class="subh">Marktstruktur im gewichteten Fokus-Haus-Marktraum${prov("qb")}</div>${reportBadge(PFL_DATENJAHR,"qb")}</div>
    ${svg}
    <div class="chart-foot"><span class="material-symbols-outlined">stacked_bar_chart</span>Balkenlänge = Fälle je Anbieter in der Familie, sortiert von groß nach klein; sehr kleine Anbieter (&lt;1 % Versorgungsanteil) werden nur dann als Long Tail gruppiert, wenn es mehrere sind. Warme Linie: Kumulierter Versorgungsanteil (obere %-Skala) — so viele Häuser decken zusammen den jeweiligen Anteil. ${schwelleFoot}</div>
  </div>`;
}

/* Befund-Kopf: drei getrennte Kopfzahlen + regelbasierter Satz (kritische Familien). */
function befundMarkt(c){
  const F=marktFamilien(c.id), med=medianOf(F.map(f=>f.druck));
  const sumIst=F.reduce((a,f)=>a+f.ist,0);
  const hausDruck=Math.round(F.reduce((a,f)=>a+f.druck*f.ist,0)/sumIst);
  const hausAuss=Math.round(sumIst/F.reduce((a,f)=>a+f.erreichbarkeitsReferenz,0)*100);
  const vlSum=F.reduce((a,f)=>a+Math.max(0,f.verteilungsluecke),0);
  const krit=F.filter(f=>famQuadrant(f,med)==="kritisch").sort((a,b)=>b.verteilungsluecke-a.verteilungsluecke);
  const nm=krit.slice(0,3).map(f=>`<b>${f.name}</b>`);
  const list=nm.length>=2?nm.slice(0,-1).join(", ")+" und "+nm[nm.length-1]:(nm[0]||"—");
  const txt=krit.length
    ? `Der Wettbewerbsdruck auf dieses Haus ist <b>${druckWort(hausDruck)}</b> — höher als bei ${hausDruck} von 100 Häusern bundesweit. Zugleich erreicht das Haus <b>${hausAuss} %</b> der Fälle, die ihm nach Lage und Erreichbarkeit rechnerisch zustünden (Ausschöpfung). Kritisch — hoher Druck und zugleich zu wenig ausgeschöpft — ${krit.length>1?"sind":"ist"} ${list}: dort gehen heute die meisten Fälle an Wettbewerber.`
    : `Wettbewerbsdruck <b>${druckWort(hausDruck)}</b>, Ausschöpfung <b>${hausAuss} %</b>. In keiner Leistungsfamilie trifft hoher Druck auf zu geringe Ausschöpfung.`;
  const prospectTxt=befundProspectSatz(F);   // regelbasiert, kein Score — hält den Ausblick sichtbar
  return {tone:"neutral",label:"MARKT & WETTBEWERB",icon:"public",
    heads:[
      {v:druckWort(hausDruck),l:`Wettbewerbsdruck · höher als bei ${hausDruck} % der Häuser`},
      {v:hausAuss+" %",l:"Ausschöpfung · erreichte von rechnerisch erwartbaren Fällen"},
      {v:fmt(vlSum),l:`Fälle/Jahr, die heute Wettbewerber behandeln (Verteilungslücke, Schätzung)${prov("ext")}`}],
    text:txt+prospectTxt};
}

/* Quadranten-Chart (Inline-SVG): x = Druck, y = Ausschöpfung, Bubble = eigenes Volumen. */
function quadrantSvg(F,med){
  const W=520,H=320,pl=44,pr=16,pt=26,pb=34,yLo=40,yHi=170;
  const maxIst=Math.max(...F.map(f=>f.ist));
  const fx=v=>pl+(clamp(v,0,100)/100)*(W-pl-pr);
  const fy=a=>pt+(yHi-clamp(a*100,yLo,yHi))/(yHi-yLo)*(H-pt-pb);
  const xMed=fx(med), y100=fy(1);
  const lbl=(x,y,anc,txt)=>`<text x="${x}" y="${y}" text-anchor="${anc}" class="qlabel" fill="var(--text-faint)">${txt}</text>`;
  const bubbles=F.map(f=>{
    const q=famQuadrant(f,med), r=6+Math.sqrt(f.ist)/Math.sqrt(maxIst)*20, v=QUAD_VAR[q], sel=STATE.selFamilie===f.key;
    const bcx=fx(f.druck), bcy=fy(f.ausschoepfung);
    const arrow=STATE.ausblick?demografiePfeil(f,bcx,bcy,r):"";   // nur bei aktivem Ausblick — sonst bleibt der Quadrant ruhig
    return `<circle class="qbub" data-familie="${f.key}" cx="${bcx.toFixed(1)}" cy="${bcy.toFixed(1)}" r="${r.toFixed(1)}" `
      +`fill="var(${v})" fill-opacity="${sel?0.75:0.42}" stroke="${sel?'var(--accent-strong)':`var(${v})`}" stroke-width="${sel?2.5:1.2}">`
      +`<title>${f.name} — Druck P${f.druck}, Ausschöpfung ${Math.round(f.ausschoepfung*100)} %, ${fmt(f.ist)} Fälle/J</title></circle>`
      +arrow;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}">
    <rect x="${pl}" y="${pt}" width="${(W-pl-pr).toFixed(1)}" height="${(H-pt-pb).toFixed(1)}" fill="none" stroke="var(--line)"/>
    <line x1="${xMed.toFixed(1)}" y1="${pt}" x2="${xMed.toFixed(1)}" y2="${H-pb}" stroke="var(--line-strong)" stroke-dasharray="4 3"/>
    <line x1="${pl}" y1="${y100.toFixed(1)}" x2="${W-pr}" y2="${y100.toFixed(1)}" stroke="var(--line-strong)" stroke-dasharray="4 3"/>
    ${lbl(pl+6,pt+13,"start","Festung")}${lbl(W-pr-6,pt+13,"end","umkämpfte Stärke")}
    ${lbl(pl+6,H-pb-6,"start","offene Lücke")}${lbl(W-pr-6,H-pb-6,"end","kritisch")}
    ${bubbles}
    <text x="${(pl-6)}" y="${(y100-4).toFixed(1)}" text-anchor="end" font-size="8" fill="var(--text-faint)">100 %</text>
    <text x="${xMed.toFixed(1)}" y="${H-pb+12}" text-anchor="middle" font-size="8" fill="var(--text-faint)">Druck-Median</text>
    <text x="${((W+pl)/2).toFixed(0)}" y="${H-6}" text-anchor="middle" font-size="9" fill="var(--text-faint)">Wettbewerbsdruck (Perzentil) →</text>
    <text x="12" y="${pt+2}" font-size="9" fill="var(--text-faint)">Ausschöpfung ↑</text>
  </svg>`;
}
function famRow(f,med){
  const q=famQuadrant(f,med), z=f.zeit?" z":"";
  const outlook=STATE.ausblick?famOutlookGlyphs(f):"";   // Zusatz-Glyphen nur bei aktivem Ausblick; ohne bleibt die Zeile ruhig
  return `<div class="famrow${STATE.selFamilie===f.key?' sel':''}" data-familie="${f.key}">
    <div class="fn"><span class="qdot ${q}"></span><span class="fnm">${f.name}</span>${outlook}</div>
    <span class="stufe-badge${z}" title="Marktraum: ${f.stufe} Minuten Fahrzeit${f.zeit?' — zeitkritische Leistung':''}">${f.stufe}′</span>
    <span class="fa"><span class="fal">Ausschöpfung </span>${Math.round(f.ausschoepfung*100)} %</span>
    <span class="fg" title="Verteilungslücke: Fälle pro Jahr, die heute Wettbewerber behandeln">−${fmt(Math.max(0,f.verteilungsluecke))}</span></div>`;
}
function quadrantSection(F,med){
  const rows=F.slice().sort((a,b)=>b.verteilungsluecke-a.verteilungsluecke).map(f=>famRow(f,med)).join("");
  return `
  <section class="dimcard">
    <div class="dimhead"><div class="dimnum">M</div>
      <div class="ht"><h2>Markt-Quadrant</h2><div class="q">Jede Blase ist eine <b>Leistungsfamilie</b> — ein Bündel verwandter Eingriffe oder Diagnosen. Rechts = mehr Wettbewerbsdruck, oben = mehr Ausschöpfung; Blasengröße = eigene Fälle. <em>Familie anklicken → Details, Lücken und Karte.</em></div></div>
      <span class="material-symbols-outlined ic">scatter_plot</span></div>
    ${ausblickSwitchHtml()}
    <div class="quad">${quadrantSvg(F,med)}</div>
    <div class="subh" style="margin-top:14px">Leistungsfamilien — sortiert nach Verteilungslücke (Fälle, die heute an Wettbewerber gehen)${prov("ext")}</div>
    <div class="famlist">${rows}</div>
    <div class="chart-foot"><span class="material-symbols-outlined">balance</span>Druck und Ausschöpfung bleiben <b>zwei getrennte Achsen</b> — sie werden nie zu einer einzigen Punktzahl verrechnet. Gestrichelte Linien: 100 % Ausschöpfung (waagerecht) und mittlerer Druck der Familien (senkrecht).</div>
  </section>`;
}
function marktHint(){
  return `<div class="dimcard" style="padding:13px 15px;display:flex;align-items:center;gap:10px">
    <span class="material-symbols-outlined ic">touch_app</span>
    <span style="font-size:12.5px;color:var(--text-dim)">Ohne Auswahl zeigt die Karte den <b style="color:var(--text)">Gesamtmarkt</b>: das in ~30 Minuten Fahrzeit erreichbare Gebiet und alle Häuser darin. Eine Familie anklicken — dann zeigt die Karte deren eigenen Marktraum, färbt Wettbewerber nach Druck, und das Panel zeigt Zerlegung und Lücken.</span>
  </div>`;
}
/* Zeitfenster-Slider: vier Raststufen. Positionen 0..3 <-> Monate [6,12,24,-1] (alle). */
const MON_WIN_STEPS=[6,12,24,-1];
function monWinIndex(w){const i=MON_WIN_STEPS.indexOf(w);return i<0?1:i;}   // Default 12 (Index 1)
function monWinLabel(w){return w===-1?"alles":`${w} Monate`;}
function monMarketCard(c,F){
  const evs=monVisible().slice().sort((a,b)=>b.datum.localeCompare(a.datum));  // neueste zuerst
  const famHits=new Set(monVisible().map(e=>e.familie));
  const focusHits=monForHaus(c.id).length;
  const zeitraum=STATE.monWin===-1?"insgesamt":`in den letzten ${STATE.monWin} Monaten`;
  const sum=`<b>${fmt(evs.length)}</b> ${evs.length===1?"Signal":"Signale"} ${zeitraum}`+
    ` · <b>${fmt(famHits.size)}</b> ${famHits.size===1?"Leistungsfamilie":"Leistungsfamilien"} berührt`+
    ` · <b>${fmt(focusHits)}</b> ${focusHits===1?"betrifft":"betreffen"} dein Haus`;
  const idx=monWinIndex(STATE.monWin);
  const slider=`<div class="mon-slider">
      <input type="range" min="0" max="3" step="1" value="${idx}" data-mon-slider aria-label="Zeitfenster">
      <span class="mon-slider-lbl" data-mon-lbl>Zeitfenster: ${monWinLabel(STATE.monWin)}</span>
    </div>`;
  const list=evs.length
    ? `<div class="mon-list">${evs.map(ev=>monEventDetailHtml(ev,true)).join("")}</div>`
    : `<div class="mon-empty"><span class="material-symbols-outlined">search_off</span>Im gewählten Fenster keine Signale — Zeitraum erweitern.</div>`;
  return `<section class="dimcard mon-market">
    <div class="dimhead"><div class="dimnum"><span class="material-symbols-outlined" style="font-size:17px">visibility</span></div>
      <div class="ht"><h2>Beobachtung im Marktraum</h2><div class="q">Klinikmonitor-Signale gehören fachlich zur Markt-Linse: Hinweise auf Bewegung bei Wettbewerbern und beim eigenen Haus, ohne rechnerische Wirkung.</div></div>
      <span class="material-symbols-outlined ic">radar</span></div>
    <div class="mon-sum">${sum}</div>
    ${slider}
    ${list}
    <div class="chart-foot"><span class="material-symbols-outlined">balance</span>Die Beobachtung annotiert nur, sie rechnet nicht: keine Zahlenmarker auf der Karte, keine Doppelsteuerung außerhalb der Markt-Linse.</div>
  </section>`;
}
/* Familien-Drilldown: Zerlegung (gemessen/geschätzt getrennt), zwei Lücken (nie addiert),
   Wettbewerberliste (Komponenten einzeln, nach Druck-Beitrag). */
function familieDrilldown(c,f){
  const wb=familieWettbewerber(c.id,f).filter(w=>w.offers);
  const maxB=Math.max(0.01,...wb.map(w=>w.beitrag));
  const wbRows=wb.length?wb.map(w=>{
    return `<div class="wbrow">
      <span class="wn">${w.name}</span>
      <span class="wc">Überlappung ${(w.weight*100).toFixed(0)} %</span>
      <span class="wc">Angebot ${(w.subst*100).toFixed(0)} %</span>
      <span class="wb" style="color:${druckColor(w.beitrag/maxB)}">${(w.beitrag*100).toFixed(0)}</span></div>`;}).join("")
    :`<div class="qs-none">Keine Wettbewerber mit Angebot im Marktraum.</div>`;
  const deutung=f.angebot==="duenn"
    ? `Das Angebot im Marktraum ist <b>dünn</b>: Die fehlenden Fälle sind plausibel eine Angebotslücke — wer das Angebot aufbaut, kann sie <b>gewinnen</b> (offensive Lesart).`
    : `Das Angebot im Marktraum ist <b>dicht</b>: Die fehlenden Fälle werden vermutlich ambulant erledigt oder gar nicht nachgefragt — hier ist <b>wenig zu holen</b> (zurückhaltende Lesart).`;
  const jahre=f.fallzahlJahre, tr=marktTrendWort(jahre);
  const spark=`<div class="mk-trend">
    <span class="mk-trend-lbl">Eigene Fälle/Jahr</span>
    <span class="mk-trend-yr">2019</span>${trendSpark(jahre)}<span class="mk-trend-yr">2023</span>
    <span class="mk-trend-dir"><span class="mk-trend-ic" style="color:var(--text-dim)">${tr.ic}</span>${tr.w}</span>
    <span class="mk-trend-ends">${fmt(jahre[0])} → ${fmt(jahre[jahre.length-1])}</span>
    ${reportBadge(c.qs.jahr,"qb")}
  </div>`;
  return `
  <section class="dimcard">
    <div class="dimhead"><div class="dimnum"><span class="material-symbols-outlined" style="font-size:17px">hub</span></div>
      <div class="ht"><h2>${f.name}</h2><div class="q">Familie nach ${f.sys==="OPS"?"Eingriffen (OPS)":"Diagnosen (ICD)"} · Marktraum = ${f.stufe} Minuten Fahrzeit${f.zeit?' (zeitkritisch)':''} · ${fmt(f.ist)} eigene Fälle/Jahr</div></div>
      <span class="material-symbols-outlined ic">insights</span></div>
    ${spark}
    <div class="subh">Zerlegung — gemessen und geschätzt getrennt</div>
    <div class="synth"><p>Von allen Fällen dieser Familie im Marktraum behandelt das Haus <b>${Math.round(f.leistungsanteil*100)} %</b> — der <b>Leistungsanteil im räumlichen Markt</b>${prov("qb")} <span style="color:var(--text-faint)">(gemessen)</span>. Der Markt insgesamt realisiert <b>${Math.round(f.marktrealisierung*100)} %</b> der Menge, die nach Bevölkerung zu erwarten wäre${prov("ext")} <span style="color:var(--text-faint)">(geschätzt)</span>.</p></div>
    <div class="subh" style="margin-top:14px">prospektive Signale${prov("ext")}</div>
    ${familieAusblickSignals(f)}
    ${marktstrukturHtml(c,f)}
    <div class="subh" style="margin-top:14px">Zwei Lücken — nie addiert</div>
    <div class="szen-comps">
      <div class="szen-comp"><div class="k">Verteilungslücke</div><div class="v">${fmt(Math.max(0,f.verteilungsluecke))}<small> Fälle/J</small></div>
        <div class="x">Fälle, die es im Marktraum real gibt, die aber heute <b>Wettbewerber</b> behandeln. Rechnung: erwartbarer Eigenanteil (${Math.round(f.referenz*100)} %) minus tatsächliche eigene Fälle.
          <div style="margin-top:5px"><span class="provbadge geschaetzt"><span class="material-symbols-outlined">help</span>Schätzer</span></div></div></div>
      <div class="szen-comp"><div class="k">Realisierungslücke</div><div class="v">${fmt(f.realisierungsluecke)}<small> Fälle/J</small></div>
        <div class="x">Fälle, die derzeit <b>gar nicht</b> stationär stattfinden — der Markt bleibt unter der erwartbaren Menge. ${deutung}</div></div>
    </div>
    <div class="luecke-note"><span class="material-symbols-outlined">block</span>Die beiden Lücken nie addieren: Die eine zählt Fälle, die bei Wettbewerbern stattfinden, die andere Fälle, die gar nicht stattfinden — zwei verschiedene Töpfe.</div>
    <div class="subh" style="margin-top:16px">Wettbewerber im Marktraum — nach Druck-Beitrag${prov("bka")}</div>
    <div class="pendtab">
      <div class="wbrow" style="color:var(--text-faint);font-size:9.5px;border:none;text-transform:uppercase;letter-spacing:.03em"><span>Haus</span><span>Bevölkerungs-Überlappung</span><span>Angebotsstärke</span><span style="text-align:right">Druck</span></div>
      ${wbRows}
    </div>
    <div class="chart-foot"><span class="material-symbols-outlined">route</span>Wie stark drückt ein Wettbewerber? Zwei Faktoren, multipliziert: wie viel Bevölkerung er mit dem Haus teilt (Überlappung — hier über die Entfernung angenähert) und wie stark sein eigenes Angebot in dieser Familie ist (aus den Qualitätsberichten). Häuser ohne Angebot üben keinen Druck aus — auf der Karte bleiben sie sichtbar, aber blass.</div>
    ${monFamilieBlock(f.key)}
  </section>`;
}
function renderMarkt(c){
  const F=marktFamilien(c.id), med=medianOf(F.map(f=>f.druck));
  const sel=STATE.selFamilie&&F.find(f=>f.key===STATE.selFamilie);
  return quadrantSection(F,med)+(sel?familieDrilldown(c,sel):marktHint())+monMarketCard(c,F);   // Marktbeobachtung immer als letztes Element
}
function setFamilie(key){
  STATE.selFamilie=STATE.selFamilie===key?null:key;   // erneuter Klick = wieder aggregiert
  renderPanel(); paintCluster(); frameCluster();       // Isochrone-Stufe ändert sich → refit
}
