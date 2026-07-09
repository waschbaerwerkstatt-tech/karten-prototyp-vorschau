(function(window){
"use strict";

function reformDeps(overrides={}){
  const root=typeof globalThis!=="undefined"?globalThis:window;
  const base=window.ReformLensDeps||{};
  return {
    format: root.fmt,
    provenance: root.prov,
    reportBadge: root.reportBadge,
    deviationColor: root.devColor,
    pflegeData: root.pflegeData,
    renderPflegeScenario: root.szenHtml,
    ...base,
    ...overrides
  };
}
function rfFmt(value){return reformDeps().format(value);}
function rfProv(cls){return reformDeps().provenance(cls);}
function rfReportBadge(year,cls){return reformDeps().reportBadge(year,cls);}
function rfDevColor(value){return reformDeps().deviationColor(value);}
function rfPflegeData(id){return reformDeps().pflegeData(id);}
function rfPflegeScenario(p,c){return reformDeps().renderPflegeScenario(p,c);}

const REFORM_REPORT_YEAR=2026;
const REFORM_STATUS={
  amtlich_bestaetigt:{label:"amtlich bestätigt",short:"bestätigt",icon:"verified",cls:"status-bestaetigt"},
  amtlich_entzogen:{label:"amtlich entzogen",short:"entzogen",icon:"block",cls:"status-entzogen"},
  latent:{label:"latent",short:"latent",icon:"rule",cls:"status-latent"}
};
const LATENTE_EINSTUFUNG={
  niedrig:{label:"latent niedrig",icon:"remove",cls:"latent-niedrig",rank:3},
  erhoeht:{label:"latent erhöht",icon:"warning",cls:"latent-erhoeht",rank:2},
  hoch:{label:"latent hoch",icon:"priority_high",cls:"latent-hoch",rank:1}
};
// Ebenen-Treppe (kumulativ): 0 Basis (nur amtlich entzogen) · 1 +latent hoch ·
// 2 +latent erhöht · 3 +latent niedrig. rank <= ebene => in der Ebene enthalten.
const EBENEN=[
  {v:0,label:"Basis",kurz:"Basis"},
  {v:1,label:"+latent hoch",kurz:"+hoch"},
  {v:2,label:"+erhöht",kurz:"+erhöht"},
  {v:3,label:"+alle latent",kurz:"+alle"}
];
const TREND={
  up:[520,560,610,680,760],
  flat:[540,548,536,540,540],
  down:[760,735,710,690,650]
};
const precedent=(behoerde,land,datum,konstellation,entscheidung,quelle,url)=>
  ({behoerde,land,datum,konstellation,entscheidung,quelle,url});
const REFORM_PRECEDENTS={
  stroke:[
    precedent("Bezirksregierung Münster","NRW","2025-04-18","Stroke Unit unter Schwelle, nächster Anbieter 22 Min","entzogen","Feststellungsbescheid Warendorf","#nrw-vollzug-stroke-warendorf"),
    precedent("Bezirksregierung Detmold","NRW","2025-05-09","Tele-Stroke-Verbund ohne durchgehende Vorhaltung","entzogen","Feststellungsbescheid Minden","#nrw-vollzug-stroke-minden")],
  geburt:[
    precedent("Bezirksregierung Arnsberg","NRW","2025-03-28","Geburtshilfe unter Mindestvorhaltung, Nachbar 27 Min","entzogen","Feststellungsbescheid Lennestadt","#nrw-vollzug-geburt-lennestadt"),
    precedent("Bezirksregierung Arnsberg","NRW","2025-05-22","Geburtshilfe knapp unter Schwelle, Sicherstellung regional stabil","bestätigt","Feststellungsbescheid Lippstadt","#nrw-vollzug-geburt-lippstadt")],
  endo:[
    precedent("Bezirksregierung Düsseldorf","NRW","2025-02-14","Endoprothetik knapp unter Schwelle, nächster Anbieter 24 Min","entzogen","Feststellungsbescheid Kleve","#nrw-vollzug-endo-kleve"),
    precedent("Bezirksregierung Arnsberg","NRW","2025-04-11","Endoprothetik nahe Schwelle, regionale Ausweichkapazität vorhanden","entzogen","Feststellungsbescheid Soest","#nrw-vollzug-endo-soest")],
  pank:[
    precedent("Bezirksregierung Detmold","NRW","2025-01-30","Pankreaschirurgie deutlich unter Schwelle","entzogen","Feststellungsbescheid Herford","#nrw-vollzug-pank-herford"),
    precedent("Bezirksregierung Arnsberg","NRW","2025-03-06","Pankreaschirurgie unter Schwelle, Maximalversorger im Marktraum","entzogen","Feststellungsbescheid Hagen","#nrw-vollzug-pank-hagen")],
  kard:[
    precedent("Bezirksregierung Düsseldorf","NRW","2025-05-17","HKL-Fälle reichen, Kooperationsnachweis offen","bestätigt mit Auflage","Feststellungsbescheid Essen","#nrw-vollzug-kard-essen"),
    precedent("Bezirksregierung Köln","NRW","2025-06-03","Interventionelle Kardiologie knapp über Schwelle","bestätigt","Feststellungsbescheid Aachen","#nrw-vollzug-kard-aachen")],
  geri:[
    precedent("Bezirksregierung Düsseldorf","NRW","2025-04-02","Geriatrie knapp unter Schwelle, Versorgungslücke im Umland","bestätigt","Feststellungsbescheid Remscheid","#nrw-vollzug-geri-remscheid"),
    precedent("Bezirksregierung Arnsberg","NRW","2025-05-13","Geriatrie über Schwelle, Verbundfälle bereinigt","bestätigt","Feststellungsbescheid Siegen","#nrw-vollzug-geri-siegen")],
  paed:[
    precedent("Bezirksregierung Köln","NRW","2025-02-27","Pädiatrie unter Schwelle, Sicherstellung über Nachbarhaus","entzogen","Feststellungsbescheid Düren","#nrw-vollzug-paed-dueren"),
    precedent("Bezirksregierung Münster","NRW","2025-04-26","Pädiatrie knapp über Schwelle, Vorhaltung bestätigt","bestätigt","Feststellungsbescheid Bocholt","#nrw-vollzug-paed-bocholt")],
  uro:[
    precedent("Bezirksregierung Köln","NRW","2025-03-20","Uro-Onkologie über Schwelle, Tumorboard-Nachweis erbracht","bestätigt","Feststellungsbescheid Bonn","#nrw-vollzug-uro-bonn"),
    precedent("Bezirksregierung Detmold","NRW","2025-05-02","Uro-Onkologie knapp unter Schwelle, Nachbar 19 Min","entzogen","Feststellungsbescheid Bielefeld","#nrw-vollzug-uro-bielefeld")]
};
// LG-Zeile: Fallzahl und Status sind die Rechenbasis; erwartete Deltas werden von der
// Umverteilungs-Engine zur Laufzeit berechnet, NICHT hier handgepflegt.
const lg=(name,status,fallzahl,mindestvorhaltezahl,trend,latenteEinstufung=null,latentRule=null,precedents=[])=>
  ({name,status,fallzahl,mindestvorhaltezahl,trend,latenteEinstufung,latentRule,precedents});
const REFORM_LG={
  uke:[
    lg("Herzchirurgie", "amtlich_bestaetigt", 1280, 600, TREND.up),
    lg("Stroke Unit", "amtlich_bestaetigt", 920, 450, TREND.flat),
    lg("Pankreaschirurgie", "amtlich_bestaetigt", 210, 120, TREND.up),
    lg("Geburtshilfe Level 1", "amtlich_bestaetigt", 2480, 900, TREND.flat),
    lg("Endoprothetik", "latent", 760, 700, TREND.down, "erhoeht",
      "Latent, weil die Fallzahl knapp über der Mindestvorhaltezahl liegt und der Trend rückläufig ist.",
      REFORM_PRECEDENTS.endo),
    lg("Pädiatrische Spezialversorgung", "amtlich_bestaetigt", 1540, 500, TREND.up),
    lg("Geriatrie", "latent", 540, 520, TREND.flat, "niedrig",
      "Latent, weil die Vorhaltung formal erreichbar ist, aber interne Verlagerungen die Fallzahl knapp machen.",
      REFORM_PRECEDENTS.geri)],
  stgeorg:[
    lg("Interventionelle Kardiologie", "amtlich_bestaetigt", 1180, 550, TREND.up),
    lg("Stroke Unit", "amtlich_bestaetigt", 610, 450, TREND.flat),
    lg("Endoprothetik", "latent", 690, 700, TREND.down, "hoch",
      "Latent, weil die Fallzahl die Mindestvorhaltezahl knapp verfehlt und ein lokaler Schwerpunktträger konkurriert.",
      REFORM_PRECEDENTS.endo),
    lg("Geburtshilfe", "amtlich_entzogen", 420, 900, TREND.down),
    lg("Geriatrie", "amtlich_bestaetigt", 820, 520, TREND.up),
    lg("Uro-Onkologie", "latent", 260, 240, TREND.flat, "niedrig",
      "Latent, weil die Fallzahl reicht, aber die Nachweislogik für onkologische Kooperationen offen ist.",
      REFORM_PRECEDENTS.uro)],
  altona:[
    lg("Endoprothetik", "amtlich_bestaetigt", 1120, 700, TREND.up),
    lg("Geriatrie", "amtlich_bestaetigt", 760, 520, TREND.flat),
    lg("Geburtshilfe", "amtlich_bestaetigt", 1320, 900, TREND.flat),
    lg("Stroke Unit", "latent", 470, 450, TREND.down, "erhoeht",
      "Latent, weil die Mindestvorhaltezahl nur knapp überschritten wird und Tele-Stroke-Fälle unklar abgegrenzt sind.",
      REFORM_PRECEDENTS.stroke),
    lg("Pankreaschirurgie", "amtlich_entzogen", 70, 120, TREND.down),
    lg("Interventionelle Kardiologie", "amtlich_bestaetigt", 720, 550, TREND.up)],
  barmbek:[
    lg("Interventionelle Kardiologie", "amtlich_bestaetigt", 860, 550, TREND.flat),
    lg("Endoprothetik", "amtlich_bestaetigt", 940, 700, TREND.up),
    lg("Stroke Unit", "latent", 430, 450, TREND.flat, "niedrig",
      "Latent, weil die Fallzahl knapp unter der Mindestvorhaltezahl liegt, aber regionale Erreichbarkeit stützt.",
      REFORM_PRECEDENTS.stroke),
    lg("Geburtshilfe", "amtlich_entzogen", 510, 900, TREND.down),
    lg("Geriatrie", "amtlich_bestaetigt", 700, 520, TREND.flat),
    lg("Uro-Onkologie", "latent", 230, 240, TREND.down, "erhoeht",
      "Latent, weil ein geringer Fallzahlabstand und parallele Angebote im Stadtraum zusammenkommen.",
      REFORM_PRECEDENTS.uro)],
  marien:[
    lg("Geburtshilfe", "amtlich_bestaetigt", 2120, 900, TREND.up),
    lg("Neonatologie", "amtlich_bestaetigt", 680, 300, TREND.flat),
    lg("Gynäkologische Onkologie", "amtlich_bestaetigt", 390, 220, TREND.up),
    lg("Endoprothetik", "latent", 710, 700, TREND.flat, "niedrig",
      "Latent, weil die Mindestvorhaltezahl knapp erfüllt ist und OP-Kapazität mit Geburtshilfe konkurriert.",
      REFORM_PRECEDENTS.endo),
    lg("Stroke Unit", "amtlich_entzogen", 180, 450, TREND.down),
    lg("Pädiatrische Spezialversorgung", "latent", 520, 500, TREND.up, "niedrig",
      "Latent, weil die Fallzahl reicht, aber der Nachweis der spezialisierten Vorhaltung noch modellhaft bleibt.",
      REFORM_PRECEDENTS.paed)],
  albertinen:[
    lg("Geriatrie", "amtlich_bestaetigt", 1180, 520, TREND.up),
    lg("Endoprothetik", "amtlich_bestaetigt", 840, 700, TREND.flat),
    lg("Interventionelle Kardiologie", "latent", 570, 550, TREND.flat, "niedrig",
      "Latent, weil die Fallzahl knapp über der Mindestvorhaltezahl liegt und Kooperationsfälle bereinigt werden müssen.",
      REFORM_PRECEDENTS.kard),
    lg("Stroke Unit", "amtlich_entzogen", 260, 450, TREND.down),
    lg("Geburtshilfe", "latent", 880, 900, TREND.down, "hoch",
      "Latent, weil die Mindestvorhaltezahl knapp verfehlt wird, aber der Versorgungsraum eine Stabilisierung plausibel macht.",
      REFORM_PRECEDENTS.geburt),
    lg("Uro-Onkologie", "amtlich_bestaetigt", 310, 240, TREND.up)],
  bethesda:[
    lg("Geriatrie", "amtlich_bestaetigt", 690, 520, TREND.flat),
    lg("Endoprothetik", "latent", 650, 700, TREND.down, "hoch",
      "Latent, weil der Abstand zur Mindestvorhaltezahl klein ist und Fälle zu Nachbarhäusern abwandern könnten.",
      REFORM_PRECEDENTS.endo),
    lg("Geburtshilfe", "amtlich_entzogen", 0, 900, TREND.flat),
    lg("Stroke Unit", "amtlich_entzogen", 90, 450, TREND.down),
    lg("Pankreaschirurgie", "amtlich_entzogen", 18, 120, TREND.flat),
    lg("Interventionelle Kardiologie", "latent", 520, 550, TREND.up, "erhoeht",
      "Latent, weil der Trend steigt, die aktuelle Fallzahl aber die Mindestvorhaltezahl noch knapp verfehlt.",
      REFORM_PRECEDENTS.kard)],
  geesthacht:[
    lg("Grundversorgung Innere Medizin", "amtlich_bestaetigt", 980, 500, TREND.flat),
    lg("Geriatrie", "latent", 500, 520, TREND.up, "niedrig",
      "Latent, weil die Fallzahl fast die Mindestvorhaltezahl erreicht und die regionale Erreichbarkeit für Erhalt spricht.",
      REFORM_PRECEDENTS.geri),
    lg("Endoprothetik", "amtlich_entzogen", 360, 700, TREND.down),
    lg("Geburtshilfe", "amtlich_entzogen", 0, 900, TREND.flat),
    lg("Stroke Unit", "amtlich_entzogen", 120, 450, TREND.flat),
    lg("Uro-Onkologie", "latent", 210, 240, TREND.up, "erhoeht",
      "Latent, weil der Abstand zur Mindestvorhaltezahl klein ist und die Verlagerungserwartung schwach positiv bleibt.",
      REFORM_PRECEDENTS.uro)]
};
// Geo + Hausgröße + Anzeigename der Mock-Häuser (aus analysen-data.js gespiegelt).
// Selbstständig im Modul, damit die Engine ohne die Seiten-Globals CLINICS/haversineKm
// läuft (Node-Test rendert das Modul isoliert).
const REFORM_GEO={
  uke:{coords:[9.97476,53.58991],size:75856,name:"UKE Eppendorf"},
  stgeorg:{coords:[10.01616,53.56032],size:26427,name:"Asklepios St. Georg"},
  altona:{coords:[9.90129,53.55427],size:32201,name:"Asklepios Altona"},
  barmbek:{coords:[10.03591,53.6061],size:32136,name:"Asklepios Barmbek"},
  marien:{coords:[10.03016,53.55869],size:27254,name:"Marienkrankenhaus"},
  albertinen:{coords:[9.90544,53.63136],size:29726,name:"Albertinen"},
  bethesda:{coords:[10.23593,53.48621],size:13883,name:"Bethesda Bergedorf"},
  geesthacht:{coords:[10.3854,53.43163],size:6408,name:"Johanniter Geesthacht"}
};
function hausName(hid){return (REFORM_GEO[hid]&&REFORM_GEO[hid].name)||hid;}
function hausSize(hid){return (REFORM_GEO[hid]&&REFORM_GEO[hid].size)||1000;}
function hausCoords(hid){return (REFORM_GEO[hid]&&REFORM_GEO[hid].coords)||[10,53.5];}
function reformHaversine(a,b){
  const R=6371,dLat=(b[1]-a[1])*Math.PI/180,dLon=(b[0]-a[0])*Math.PI/180,
    la1=a[1]*Math.PI/180,la2=b[1]*Math.PI/180,
    h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function distKm(aId,bId){return reformHaversine(hausCoords(aId),hausCoords(bId));}

function reformRows(hid){return REFORM_LG[hid]||REFORM_LG.uke;}
function lgVolume(hid,name){const r=reformRows(hid).find(x=>x.name===name);return r?r.fallzahl:0;}
// selectedLg: null bedeutet "Summe aller Gruppen" (Default). Ein gewünschter Name
// bleibt nur bestehen, wenn das Haus die Gruppe führt; sonst zurück auf Summe.
function selectedLg(hid,wanted){
  if(!wanted)return null;
  return reformRows(hid).some(r=>r.name===wanted)?wanted:null;
}
function lgRow(hid,name){
  const rows=reformRows(hid);
  return rows.find(r=>r.name===name)||rows[0];
}

/* ===================== Umverteilungs-Engine =====================
   Für jedes wegfallende Haus×LG wird die Fallzahl auf die verbleibenden
   Anbieter derselben LG verteilt, gewichtet nach Nähe × Hausgröße.
   Fester Schwund SHRINK geht nicht auf Empfänger über. Summenerhalt per
   Konstruktion: Abfluss = Σ Zuflüsse + Schwund. Karte, Klick-Flüsse, R2 und
   Summen speisen sich aus DIESER Rechnung. */
const SHRINK=0.15;
function keyOf(hid,name){return hid+"|"+name;}
function recipientsFor(name,sourceHid,removedKeys){
  return Object.keys(REFORM_LG).filter(h=>{
    if(h===sourceHid)return false;
    const r=reformRows(h).find(x=>x.name===name);
    return r&&r.status!=="amtlich_entzogen"&&!removedKeys.has(keyOf(h,name));
  });
}
function redistribute(removedSet){
  const removedKeys=new Set(removedSet.map(k=>keyOf(k.hid,k.lg)));
  const inflow={},edges=[];let schwund=0,freed=0;
  for(const {hid,lg:name} of removedSet){
    const V=lgVolume(hid,name);
    freed+=V;
    const sh=V*SHRINK;let remain=V-sh;
    const recips=recipientsFor(name,hid,removedKeys);
    if(!recips.length){schwund+=sh+remain;continue;}
    schwund+=sh;
    const weights=recips.map(rid=>hausSize(rid)/(distKm(hid,rid)+1));
    const wsum=weights.reduce((a,b)=>a+b,0)||1;
    recips.forEach((rid,i)=>{
      const amt=remain*weights[i]/wsum;
      inflow[rid]=inflow[rid]||{};
      inflow[rid][name]=(inflow[rid][name]||0)+amt;
      const dist=distKm(hid,rid),relBand=0.25+Math.min(0.35,dist/70);
      edges.push({from:hid,to:rid,lg:name,cases:amt,relBand});
    });
  }
  return {inflow,edges,schwund,freed,removedKeys};
}
function basisRemovedSet(){
  const set=[];
  for(const hid in REFORM_LG)for(const r of reformRows(hid))
    if(r.status==="amtlich_entzogen")set.push({hid,lg:r.name});
  return set;
}
function scenarioRemovedSet(ebene,korb){
  const seen=new Set(),set=[];
  const push=(hid,name)=>{const k=keyOf(hid,name);if(!seen.has(k)){seen.add(k);set.push({hid,lg:name});}};
  // Ebene: latente Gruppen über ALLE Häuser nach Einstufungs-Rang
  for(const hid in REFORM_LG)for(const r of reformRows(hid)){
    if(r.status==="latent"&&r.latenteEinstufung){
      const rank=LATENTE_EINSTUFUNG[r.latenteEinstufung]?.rank;
      if(rank&&rank<=ebene)push(hid,r.name);
    }
  }
  // Korb: Haus×LG oder ganzes Haus (lg=null -> alle Gruppen des Hauses)
  for(const k of (korb||[])){
    if(!REFORM_LG[k.hid])continue;
    if(k.lg)push(k.hid,k.lg);
    else for(const r of reformRows(k.hid))push(k.hid,r.name);
  }
  return set;
}
function normScenario(s){return {ebene:(s&&s.ebene)||0,korb:(s&&s.korb)||[]};}
function isActive(s){const n=normScenario(s);return n.ebene>0||n.korb.length>0;}
function scenarioSignature(s){
  const n=normScenario(s);
  return n.ebene+"#"+n.korb.map(k=>k.hid+"|"+(k.lg||"*")).sort().join(",");
}
let __expCache={};
function computeExpectation(s){
  const n=normScenario(s);
  const basisSet=basisRemovedSet();
  const basisRes=redistribute(basisSet);
  const basisKeys=basisRes.removedKeys;
  const szSet=scenarioRemovedSet(n.ebene,n.korb).filter(k=>!basisKeys.has(keyOf(k.hid,k.lg)));
  const fullSet=basisSet.concat(szSet);
  const fullRes=redistribute(fullSet);
  return {basisSet,basisRes,basisKeys,szSet,fullSet,fullRes,fullKeys:fullRes.removedKeys,active:isActive(s)};
}
function expectationFor(s){
  const k=scenarioSignature(s);
  return __expCache[k]||(__expCache[k]=computeExpectation(s));
}
function deltaFromResult(res,removedKeys,hid,name){
  if(removedKeys.has(keyOf(hid,name)))return -lgVolume(hid,name); // eigener Abfluss (voller Verlust)
  return (res.inflow[hid]&&res.inflow[hid][name])||0;
}
function houseDeltas(hid,name,s){
  const exp=expectationFor(s);
  const b=deltaFromResult(exp.basisRes,exp.basisKeys,hid,name);
  const f=deltaFromResult(exp.fullRes,exp.fullKeys,hid,name);
  return {basis:b,szenario:f-b,total:f};
}
function audit(s){
  const exp=expectationFor(s);
  const res=exp.active?exp.fullRes:exp.basisRes;
  const distributed=res.edges.reduce((a,e)=>a+e.cases,0);
  return {freed:res.freed,schwund:res.schwund,distributed};
}

/* ===================== öffentliche Read-Models ===================== */
function groups(hid){
  return reformRows(hid).map(r=>({name:r.name,status:r.status,volume:r.fallzahl,delta:Math.round(houseDeltas(hid,r.name,null).basis)}));
}
function mapFeature(hid,lgName,s){
  if(!lgName){ // Summen-Sicht: erwartete Fallzahl-Veränderung über ALLE betroffenen Gruppen
    let basis=0,szen=0,vol=0;
    for(const r of reformRows(hid)){
      const d=houseDeltas(hid,r.name,s);
      if(Math.abs(d.total)>1e-6||Math.abs(d.basis)>1e-6)vol+=r.fallzahl;
      basis+=d.basis;szen+=d.szenario;
    }
    const delta=basis+szen;
    // Ring: gestrichelt (latent), sobald ein Szenario-Anteil zur Hauses-Summe beiträgt,
    // sonst fest (amtlich) — Basis speist sich nur aus amtlich entzogenen Gruppen.
    const dashed=Math.abs(szen)>0.5;
    return {id:hid,lg:null,mode:"summe",status:null,ring:dashed?"latent":"official",
      delta:Math.round(delta),basisDelta:Math.round(basis),scenarioDelta:Math.round(szen),
      volume:Math.max(vol,1),deltaRate:delta/Math.max(vol,100),
      popval:`Summe aller Gruppen: ${signedCases(Math.round(delta))} Fälle/J`+
        (dashed?` · davon Szenario ${signedCases(Math.round(szen))}`:"")};
  }
  const row=lgRow(hid,lgName);
  const d=houseDeltas(hid,row.name,s);
  const ring=row.status==="latent"?"latent":"official"; // Einzel-LG: Ring = amtlicher Status der Zeile
  return {id:hid,lg:row.name,mode:"single",status:row.status,ring,
    delta:Math.round(d.total),basisDelta:Math.round(d.basis),scenarioDelta:Math.round(d.szenario),
    volume:row.fallzahl,deltaRate:d.total/Math.max(row.fallzahl,row.mindestvorhaltezahl,100),
    popval:`${row.name}: ${signedCases(Math.round(d.total))} Fälle/J · ${REFORM_STATUS[row.status].label}`};
}
function flowEdges(hid,lgName,s){
  const exp=expectationFor(s);
  let edges=exp.fullRes.edges;
  if(lgName)edges=edges.filter(e=>e.lg===lgName);
  edges=edges.filter(e=>e.from===hid||e.to===hid);
  return edges.map(e=>{
    const cases=Math.round(e.cases);
    const direction=e.to===hid?"inflow":"outflow";
    const uncertainty=e.relBand<0.35?"niedrig":e.relBand<0.5?"mittel":"hoch"; // ordinal aus relativer Bandbreite
    return {from:e.from,to:e.to,lg:e.lg,cases,uncertainty,direction,
      tooltip:`${direction==="inflow"?"Zufluss":"Abfluss"} ${signedCases(cases)} Fälle/J · ${e.lg} · Unsicherheit ${uncertainty}`};
  }).filter(e=>e.cases>0);
}
// Versorgungswirkung je Gruppe, NIE summiert (Doppelzählung von Personen).
// Bevölkerungswert deterministisch proportional zum entnommenen Volumen der LG.
const SUPPLY_PER_CASE={over30:20,over40:4};
function scenario(s){
  const exp=expectationFor(s);
  const removed=exp.active?exp.fullSet:exp.basisSet;
  const byLg={};
  for(const {hid,lg:name} of removed){
    byLg[name]=byLg[name]||{lg:name,volume:0,over30:0,over40:0,houses:[]};
    const V=lgVolume(hid,name);
    byLg[name].volume+=V;byLg[name].houses.push(hid);
  }
  const perLg=Object.values(byLg).map(g=>({
    lg:g.lg,volume:g.volume,houses:g.houses,
    over30:Math.round(g.volume*SUPPLY_PER_CASE.over30),
    over40:Math.round(g.volume*SUPPLY_PER_CASE.over40)
  })).sort((a,b)=>b.volume-a.volume);
  const head=perLg.length?{value:perLg[0].over30,lg:perLg[0].lg,groups:perLg.length}:{value:0,lg:null,groups:0};
  const houseNames=[...new Set(removed.map(r=>r.hid))].map(hausName);
  return {active:exp.active,perLg,head,houses:houseNames,
    supply:{over30:head.value,over40:perLg.length?perLg[0].over40:0}};
}
const REFORM_QUALITY={
  trefferquotePct:81,
  fehlerband:"Fehlerband ±18 Fälle/Jahr im mittleren Segment",
  scatter:[
    {id:"stgeorg|Stroke Unit",haus:"St. Georg",lg:"Stroke Unit",expected:20,actual:18},
    {id:"albertinen|Geriatrie",haus:"Albertinen",lg:"Geriatrie",expected:62,actual:58},
    {id:"bethesda|Endoprothetik",haus:"Bethesda",lg:"Endoprothetik",expected:-32,actual:-48},
    {id:"barmbek|Geburtshilfe",haus:"Barmbek",lg:"Geburtshilfe",expected:-74,actual:-69},
    {id:"marien|Geburtshilfe",haus:"Marien",lg:"Geburtshilfe",expected:54,actual:42},
    {id:"altona|Pankreaschirurgie",haus:"Altona",lg:"Pankreaschirurgie",expected:-44,actual:-51}
  ],
  outliers:[
    {id:"bethesda-endo",haus:"Bethesda",lg:"Endoprothetik",title:"weniger gewonnen als erwartet",text:"weniger gewonnen als erwartet — parallele Insolvenz im Nachbarkreis zog Fälle anders ab."},
    {id:"marien-geburt",haus:"Marien",lg:"Geburtshilfe",title:"weniger gewonnen als erwartet",text:"weniger gewonnen als erwartet — Personalengpass begrenzte die Aufnahmekapazität trotz positiver Modelllage."}
  ]
};
function quality(){return REFORM_QUALITY;}

/* ===================== Darstellung ===================== */
function reformCounts(rows){return rows.reduce((a,r)=>{a[r.status]=(a[r.status]||0)+1;return a;},{});}
function trendMeta(t){const d=Array.isArray(t)&&t.length>=2?t[t.length-1]-t[t.length-2]:0;
  return d>0?["trending_up","steigend"]:d<0?["trending_down","fallend"]:["trending_flat","stabil"];}
function signedCases(n){n=Math.round(n);return (n>0?"+":n<0?"−":"±")+rfFmt(Math.abs(n));}
function reformStatusBadge(row){
  const status=typeof row==="string"?row:row.status, m=REFORM_STATUS[status];
  const title=typeof row==="string"?m.label:(row.latentRule||m.label);
  return `<span class="qs-badge ${m.cls}" title="${title}"><span class="material-symbols-outlined">${m.icon}</span>${m.label}</span>`;
}
function latentEinstufungBadge(row){
  if(row.status!=="latent"||!row.latenteEinstufung)return "";
  const m=LATENTE_EINSTUFUNG[row.latenteEinstufung];
  return m?` <span class="qs-badge latent-einstufung ${m.cls}" title="Latente Einstufung: ${m.label}"><span class="material-symbols-outlined">${m.icon}</span>${m.label}</span>`:"";
}
function reformRowProvenance(row){
  return row.status==="latent"
    ?`<span class="provbadge modell"><span class="material-symbols-outlined">rule</span>regelbasiert · Präzedenz</span>`
    :`<span class="provbadge amtlich"><span class="material-symbols-outlined">verified</span>amtlich</span>`;
}
function precedentLabel(p){
  return `${p.behoerde} · ${p.land} · ${p.datum} · ${p.konstellation} → ${p.entscheidung}`;
}
/* ============================================================================
   DEAKTIVIERT 2026-07-09: Der Leistungsgruppen-Teil der Reform-Linse (Status-
   Kachel R1, Umverteilungs-Erwartung R2, Modellgüte, Ebenen-Szenario/Korb und
   die Reform-Karten-Färbung) ist vorübergehend stillgelegt — der Nutzer arbeitet
   später daran weiter. NICHTS davon löschen: Daten, Engine und Kacheln bleiben
   vollständig im Modul und werden von assert() weiter geprüft, damit der
   schlafende Code nicht verrottet. Beschlüsse und Wiederaufnahme-Plan:
   docs/plans/open_frontend-endprodukt-ausbau.md (§ 4.4, § 4.4.1, AP 7).
   Reaktivierung: in befund() und render() die markierten Original-Zeilen wieder
   einhängen und in analysen-map-shell.js die REFORM-DEAKTIVIERT-Blöcke öffnen.
   ============================================================================ */
function befundLeistungsgruppen(c){   // DEAKTIVIERT — Original-Befund des LG-Kerns, s. Kommentar oben
  const rows=reformRows(c.id), counts=reformCounts(rows);
  const latent=rows.filter(r=>r.status==="latent").sort((a,b)=>a.fallzahl/a.mindestvorhaltezahl-b.fallzahl/b.mindestvorhaltezahl);
  const latentText=latent.length
    ?`Latent ${latent.length===1?"ist":"sind"} ${latent.slice(0,2).map(r=>`<b>${r.name}</b>`).join(latent.length>1?", ":"")}${latent.length>2?` und ${latent.length-2} weitere`:``}: dort entscheiden Regelabstand, Trend und Präzedenzfälle.`
    :"Keine latente Leistungsgruppe im Mock.";
  const txt=`Reform-Kern nach Leistungsgruppen: <b>${counts.amtlich_bestaetigt||0}</b> amtlich bestätigt, <b>${counts.amtlich_entzogen||0}</b> amtlich entzogen, <b>${counts.latent||0}</b> latent. ${latentText} Amtliche Status und Modellerwartung bleiben getrennt; es wird kein Gesamtscore gebildet.`;
  return {tone:"neutral",label:"REFORM",icon:"balance",text:txt,
    heads:[
      {v:rfFmt(counts.amtlich_bestaetigt||0),l:`amtlich bestätigte Leistungsgruppen · ${rfReportBadge(REFORM_REPORT_YEAR,"amtlich")}`},
      {v:rfFmt(counts.amtlich_entzogen||0),l:"amtlich entzogene Leistungsgruppen"},
      {v:rfFmt(counts.latent||0),l:"latente Leistungsgruppen mit Regel und Präzedenzfällen"}]};
}
function befund(c){
  // Aktiver Rumpf-Befund, solange nur das Pflegebudget-Szenario läuft.
  // Reaktivierung LG-Kern: return befundLeistungsgruppen(c);
  void befundLeistungsgruppen;
  const txt=`Die Reform-Linse zeigt aktuell nur das <b>Pflegebudget-Szenario (§ 6a)</b>: rechnerische Budgetwirkung der Konvergenz auf den Bundesdurchschnitt, zerlegt in Menge und Preis. Die Leistungsgruppen-Auswertung (amtlicher Status, Umverteilungs-Erwartung, Modellgüte, Schließungs-/Ebenen-Szenario) ist vorübergehend deaktiviert und wird später wieder aufgenommen.`;
  return {tone:"neutral",label:"REFORM",icon:"balance",text:txt,
    heads:[
      {v:"§ 6a",l:"Pflegebudget-Szenario — Menge- und Preis-Zerlegung in der Kachel unten"},
      {v:"pausiert",l:"Leistungsgruppen-Auswertung · Plan: docs/plans/open_frontend-endprodukt-ausbau.md"}]};
}
function reformThresholdDeviation(r){
  return (r.fallzahl-r.mindestvorhaltezahl)/Math.max(r.mindestvorhaltezahl,1);
}
function reformThresholdBarColor(r){
  const dev=reformThresholdDeviation(r);
  return dev>=0?"var(--accent)":rfDevColor(dev);
}
function scenarioBadge(text){
  return `<span class="scenario-flag"><span class="material-symbols-outlined">science</span>${text}</span>`;
}
function reformMapPille(selected){
  const summe=!selected;
  return `<div class="reform-mappille" role="group" aria-label="Karten-Färbung">
    <span class="mp-lbl">Karte färbt:</span>
    <button class="mp-opt${summe?" on":""}" data-reform-mapmode="summe" aria-pressed="${summe}">Summe aller Gruppen</button>
    <button class="mp-opt${summe?"":" on"}" data-reform-mapmode="single" aria-pressed="${!summe}"${summe?' title="Zeile unten wählen"':""}>gewählte Gruppe${selected?`: ${selected}`:""}</button>
  </div>`;
}
function reformStatusCard(c,selected,s){
  const rows=reformRows(c.id).slice().sort((a,b)=>(a.fallzahl/a.mindestvorhaltezahl)-(b.fallzahl/b.mindestvorhaltezahl));
  const counts=reformCounts(rows);
  const max=Math.max(...rows.map(r=>Math.max(r.fallzahl,r.mindestvorhaltezahl)));
  const ebeneSet=new Set(scenarioRemovedSet(normScenario(s).ebene,[]).map(k=>keyOf(k.hid,k.lg)));
  const summary=Object.keys(REFORM_STATUS).map(k=>
    `<span class="qs-badge ${REFORM_STATUS[k].cls}"><span class="material-symbols-outlined">${REFORM_STATUS[k].icon}</span>${rfFmt(counts[k]||0)} ${REFORM_STATUS[k].short}</span>`).join("");
  const bars=rows.map(r=>{
    const [ic,tw]=trendMeta(r.trend), fPct=Math.min(100,r.fallzahl/max*100), tPct=Math.min(100,r.mindestvorhaltezahl/max*100);
    const on=r.name===selected;
    const inEbene=ebeneSet.has(keyOf(c.id,r.name));
    const korbAction=inEbene
      ?`<span class="korb-hint" title="Diese Gruppe ist über die Ebene bereits im Szenario">bereits im Szenario (Ebene)</span>`
      :`<button class="korb-add" data-reform-korb-add data-hid="${c.id}" data-lg="${r.name}" title="Gruppe ins Szenario entnehmen"><span class="material-symbols-outlined">remove_circle</span>entnehmen</button>`;
    return `<div class="reform-row ${r.status}${on?" sel":""}" data-reform-lg="${r.name}" role="button" tabindex="0" aria-pressed="${on}">
      <div class="lg">${r.name}<small>${reformStatusBadge(r)}${latentEinstufungBadge(r)} ${reformRowProvenance(r)} ${korbAction}</small></div>
      <div class="bar-track" title="${rfFmt(r.fallzahl)} Fälle; Mindestvorhaltezahl ${rfFmt(r.mindestvorhaltezahl)}">
        <div class="bar-fill" style="width:${fPct.toFixed(1)}%;background:${reformThresholdBarColor(r)}"></div>
        <span class="threshold-marker" style="left:${tPct.toFixed(1)}%" title="Mindestvorhaltezahl ${rfFmt(r.mindestvorhaltezahl)}"></span>
      </div>
      <div class="casecount">${rfFmt(r.fallzahl)} / ${rfFmt(r.mindestvorhaltezahl)}</div>
      <div class="trend"><span class="material-symbols-outlined">${ic}</span>${tw}</div>
    </div>`;}).join("");
  const latent=rows.filter(r=>r.status==="latent").map(r=>
    `<details>
      <summary>${r.name}: ${LATENTE_EINSTUFUNG[r.latenteEinstufung]?.label||"latent"} · Regel und Präzedenzfälle</summary>
      <div class="rule">${r.latentRule}</div>
      <div class="precedents">${r.precedents.map(p=>`<a href="${p.url}" data-reform-precedent target="_blank" rel="noopener">${precedentLabel(p)} · Quelle: ${p.quelle}</a>`).join("")}</div>
    </details>`).join("");
  return `<section class="dimcard">
    <div class="dimhead"><div class="dimnum">R1</div>
      <div class="ht"><h2>Leistungsgruppen-Status</h2><div class="q">Amtlicher Status je Leistungsgruppe, sortiert nach Abstand zur Mindestvorhaltezahl. Zeile anklicken färbt die Karte nach dieser Gruppe; erneuter Klick zurück auf die Summe.</div></div>
      <span class="material-symbols-outlined ic">fact_check</span></div>
    <div class="reform-status-summary">${summary}${rfReportBadge(REFORM_REPORT_YEAR,"amtlich")}</div>
    ${reformMapPille(selected)}
    <div class="reform-bars">${bars}</div>
    <details class="qs-details reform-latent" open><summary>Latente Leistungsgruppen: Regel und Präzedenzfälle anzeigen</summary>${latent}</details>
    <div class="chart-foot"><span class="material-symbols-outlined">verified</span>R1 zeigt amtliche oder statusnahe Fakten. Modell-Erwartungen stehen getrennt in R2.</div>
  </section>`;
}
function bandCells(delta,max,extraClass){
  const lo=delta*0.75, hi=delta*1.25; // Fehlerband ±25 % auf den Zufluss
  const pos=v=>(50+(v/max)*50);
  const left=Math.max(0,Math.min(pos(lo),pos(hi))), right=Math.min(100,Math.max(pos(lo),pos(hi)));
  return `<div class="band-track" title="Erwartungsband ${signedCases(lo)} bis ${signedCases(hi)} Fälle/J">
    <span class="band-range ${extraClass}" style="left:${left.toFixed(1)}%;width:${(right-left).toFixed(1)}%"></span>
    <span class="band-point ${extraClass}" style="left:${pos(delta).toFixed(1)}%"></span>
  </div>`;
}
function reformExpectationCard(c,s){
  const active=isActive(s);
  const data=reformRows(c.id).map(r=>{const d=houseDeltas(c.id,r.name,s);return {name:r.name,basis:d.basis,szen:d.szenario,total:d.total};});
  const max=Math.max(10,...data.flatMap(d=>[Math.abs(d.basis)*1.25,Math.abs(d.total)*1.25]));
  const expRows=data.slice().sort((a,b)=>a.total-b.total).map(d=>{
    const cls=d.total>=0?"gain":"loss";
    const basisPart=`<div class="exp-part basis"><span class="delta">${signedCases(d.basis)}${active?"<small> Basis</small>":"<small> Fälle/J</small>"}</span>${bandCells(d.basis,max,"")}</div>`;
    const szenPart=(active&&Math.abs(d.szen)>=1)
      ?`<div class="exp-part szen"><span class="delta">${signedCases(d.szen)}<small> Szenario</small></span>${bandCells(d.szen,max,"szenario")}</div>`
      :"";
    return `<div class="reform-exp-row ${cls}">
      <div class="lg">${d.name}</div>
      <div class="exp-parts">${basisPart}${szenPart}</div>
    </div>`;}).join("");
  const sumBasis=data.reduce((a,d)=>a+d.basis,0), sumSzen=data.reduce((a,d)=>a+d.szen,0);
  const totalLine=active
    ?`<span class="v">Basis ${signedCases(sumBasis)} · im Szenario zusätzlich ${signedCases(sumSzen)} Fälle/J</span>`
    :`<span class="v">${signedCases(sumBasis)} Fälle/J</span>`;
  return `<section class="dimcard">
    <div class="dimhead"><div class="dimnum">R2</div>
      <div class="ht"><h2>Umverteilungs-Erwartung</h2><div class="q">Modellerwartung je Leistungsgruppe: erwarteter Gewinn oder Verlust an Fällen mit Fehlerband. Keine Statusentscheidung.${active?" Basis und Szenario getrennt ausgewiesen (Szenario gestrichelt)." :""}</div></div>
      <span class="material-symbols-outlined ic">swap_horiz</span></div>
    <div class="szen">
      ${active?scenarioBadge("Szenario aktiv – Basis und Szenario getrennt"):""}
      <div class="reform-exp">${expRows}</div>
      <div class="szen-total">${totalLine}<span class="l">Summe der Modellerwartungen · <a class="model-link" href="#modell-nrw-vollzug">Modell — kalibriert am NRW-Vollzug</a>${rfProv("modell")}</span></div>
      <div><span class="provbadge modell"><span class="material-symbols-outlined">functions</span>Modell — kalibriert am NRW-Vollzug</span> <span class="provbadge amtlich"><span class="material-symbols-outlined">verified</span>Statusbasis aus R1 getrennt</span></div>
    </div>
    <div class="chart-foot"><span class="material-symbols-outlined">balance</span>R2 ist ein Modell, nicht amtlich. Plus/Minus beschreibt erwartete Fallverlagerung nach Reformlogik; das Fehlerband bleibt sichtbar.</div>
  </section>`;
}
function modelQualityCard(){
  const q=quality(), pts=q.scatter, W=260,H=150,p=18;
  const vals=pts.flatMap(d=>[d.expected,d.actual]), min=Math.min(...vals,-80), max=Math.max(...vals,80);
  const x=v=>p+(v-min)/(max-min)*(W-p*2), y=v=>H-p-(v-min)/(max-min)*(H-p*2);
  const dots=pts.map(d=>`<circle cx="${x(d.expected).toFixed(1)}" cy="${y(d.actual).toFixed(1)}" r="4.5"><title>${d.haus} · ${d.lg}: Erwartung ${signedCases(d.expected)}, Ist ${signedCases(d.actual)}</title></circle>`).join("");
  const outs=q.outliers.map(o=>`<details class="reform-outlier"><summary>${o.haus} · ${o.lg}: ${o.title}</summary><p>${o.text}</p></details>`).join("");
  return `<section class="dimcard" id="modell-nrw-vollzug">
    <div class="dimhead"><div class="dimnum">Q</div>
      <div class="ht"><h2>Modellgüte NRW</h2><div class="q">Erwartung vs. Ist je Haus×Gruppe im NRW-Mock. Ausreißer bleiben erklärbar statt weggeglättet.</div></div>
      <span class="material-symbols-outlined ic">query_stats</span></div>
    <div class="qgrid">
      <div class="stat"><div class="k">Trefferquote${rfProv("modell")}</div><div class="v">${q.trefferquotePct}<small>%</small></div><div class="statline">Richtung korrekt im NRW-Vollzug</div></div>
      <div class="stat"><div class="k">Fehlerband${rfProv("modell")}</div><div class="v">±18<small> Fälle</small></div><div class="statline">${q.fehlerband}</div></div>
    </div>
    <svg class="reform-scatter" viewBox="0 0 ${W} ${H}" role="img" aria-label="Streudiagramm Erwartung gegen Ist">
      <line class="mx-50" x1="${p}" y1="${H-p}" x2="${W-p}" y2="${p}"></line>
      ${dots}
    </svg>
    <div class="scale"><span>weniger als erwartet</span><span>Diagonale = perfekte Prognose</span><span>mehr als erwartet</span></div>
    ${outs}
  </section>`;
}
function ebenenRegler(s){
  const cur=normScenario(s).ebene;
  const btns=EBENEN.map(e=>
    `<button class="ebene-opt${e.v===cur?" on":""}" data-reform-ebene="${e.v}" aria-pressed="${e.v===cur}" title="${e.label}">${e.label}</button>`).join("");
  return `<div class="scenario-ebenen" role="group" aria-label="Szenario-Ebene">
    <div class="ebene-lbl">Ebene <span class="material-symbols-outlined" title="Kumulative Statusfilter über alle Häuser">stairs</span></div>
    <div class="ebene-seg">${btns}</div>
  </div>`;
}
function korbChips(s){
  const korb=normScenario(s).korb;
  if(!korb.length)return `<div class="korb-empty">Korb leer — Gruppen über „entnehmen" (R1) oder ganzes Haus unten hinzufügen.</div>`;
  const chips=korb.map((k,i)=>
    `<span class="korb-chip">${hausName(k.hid)}${k.lg?` · ${k.lg}`:" · ganzes Haus"}<button data-reform-korb-remove="${i}" title="Aus dem Korb entfernen" aria-label="Entfernen">✕</button></span>`).join("");
  return `<div class="korb-chips">${chips}<button class="korb-reset" data-reform-korb-reset>Korb zurücksetzen</button></div>`;
}
function versorgungBlock(s){
  const sc=scenario(s);
  if(!sc.active){
    return `<div class="versorg-hint"><span class="material-symbols-outlined">info</span>Ohne Szenario keine G-BA-Wirkungszahlen. Ebene wählen oder Gruppen in den Korb legen.</div>`;
  }
  const rows=sc.perLg.map(g=>
    `<div class="versorg-row"><span class="vl">${g.lg}</span><span class="vv">+${rfFmt(g.over30)}<small> außerhalb 30 Min</small></span><span class="vv sub">+${rfFmt(g.over40)}<small> außerhalb 40 Min</small></span><span class="provbadge modell"><span class="material-symbols-outlined">functions</span>Modell</span></div>`).join("");
  return `<div class="versorg">
    <div class="qgrid">
      <div class="stat"><div class="k">größter Einzelwert${rfProv("modell")}</div><div class="v">+${rfFmt(sc.head.value)}<small> Pers.</small></div><div class="statline">${sc.head.lg||""} · außerhalb 30 Pkw-Min (G-BA)</div></div>
      <div class="stat"><div class="k">betroffene Gruppen${rfProv("modell")}</div><div class="v">${rfFmt(sc.head.groups)}</div><div class="statline">je Gruppe getrennt — keine Personen-Summe</div></div>
    </div>
    <div class="versorg-list">${rows}</div>
    <div class="chart-foot"><span class="material-symbols-outlined">verified</span>Schwellenlogik G-BA 30/40 Pkw-Minuten. Bevölkerungszahlen je Gruppe getrennt, nie addiert (Doppelzählung von Personen).</div>
  </div>`;
}
function scenarioCard(c,opts,s){
  const allowed=opts.simulatorAllowed!=null?opts.simulatorAllowed:!!(opts.egStufe&&["haus","bundesweit"].includes(opts.egStufe.simulator));
  const active=isActive(s);
  if(!allowed){
    return `<section class="dimcard">
      <div class="dimhead"><div class="dimnum">S</div>
        <div class="ht"><h2>Szenario</h2><div class="q">Ebenen-Treppe und Korb entnehmen Gruppen kumulativ und rechnen die Umverteilung neu.</div></div>
        <span class="material-symbols-outlined ic">route</span></div>
      <div class="stat locked"><div class="k">Szenario-Rechner${rfProv("modell")}</div><div class="v blurred">gesperrt</div><div class="statline">ab haus-scharfer Analysen-Stufe; beliebige Häuser bundesweit ab Mandat-Stufe</div></div>
    </section>`;
  }
  const badge=active
    ?`<div class="scenario-badge">${scenarioBadge("Szenario aktiv")}<span class="sb-detail">Ebene: ${EBENEN[normScenario(s).ebene].label}${scenario(s).houses.length?` · ${scenario(s).houses.join(", ")}`:""}</span><button data-reform-reset>Szenario beenden ✕</button></div>`
    :"";
  return `<section class="dimcard">
    <div class="dimhead"><div class="dimnum">S</div>
      <div class="ht"><h2>Szenario</h2><div class="q">Ebenen-Treppe (kumulativ) plus Korb einzelner Entnahmen. Flüchtig, kein Speichern. Gerechnet wird über alle Häuser.</div></div>
      <span class="material-symbols-outlined ic">route</span></div>
    ${badge}
    ${ebenenRegler(s)}
    <div class="scenario-korb">
      <div class="korb-head">Korb <button class="chipbtn" data-reform-korb-add data-hid="${c.id}"><span class="material-symbols-outlined">domain_disabled</span>${hausName(c.id)} ganz schließen</button></div>
      ${korbChips(s)}
    </div>
    ${versorgungBlock(s)}
  </section>`;
}
function render(c,opts={}){
  const p=rfPflegeData(c.id);
  const intro=`
  <div class="dimcard" style="padding:14px 16px">
    <div style="font-size:13px;line-height:1.5;color:var(--text-dim)">
      <b style="color:var(--text)">Reform-Linse</b> — aktuell nur das <b style="color:var(--text)">Pflegebudget-Szenario (§ 6a)</b>.
      Die Leistungsgruppen-Auswertung (Status, Umverteilungs-Erwartung, Modellgüte, Szenario) ist
      vorübergehend deaktiviert und wird später wieder aufgenommen.
    </div>
  </div>`;
  /* DEAKTIVIERT 2026-07-09 (s. Block-Kommentar über befundLeistungsgruppen; Plan:
     docs/plans/open_frontend-endprodukt-ausbau.md § 4.4.1 / AP 7). Original-Komposition:
  const s=opts.scenario||null; // {ebene,korb} | null (= Basis)
  const selected=opts.selectedLg||null; // null = Summen-Sicht
  return intro+reformStatusCard(c,selected,s)+reformExpectationCard(c,s)+modelQualityCard()+scenarioCard(c,opts,s)+rfPflegeScenario(p,c);
  */
  void reformStatusCard; void reformExpectationCard; void modelQualityCard; void scenarioCard;
  return intro+rfPflegeScenario(p,c);
}
function assert(){
  const reformSets=Object.values(REFORM_LG);
  console.assert(reformSets.length>=8&&reformSets.every(rows=>rows.length>=6&&rows.length<=10),
    "Reform-Linse: jedes Haus braucht 6-10 Leistungsgruppen");
  console.assert(reformSets.every(rows=>rows.some(r=>r.status==="latent")&&new Set(rows.map(r=>r.status)).size>=2),
    "Reform-Linse: Statusmix oder latente Leistungsgruppe fehlt");
  console.assert(reformSets.every(rows=>rows.filter(r=>r.status==="latent").every(r=>r.latenteEinstufung&&LATENTE_EINSTUFUNG[r.latenteEinstufung]&&r.latentRule&&r.precedents&&r.precedents.length>=2)),
    "Reform-Linse: latenter Eintrag ohne Einstufung, Regel oder zwei Präzedenzfälle");
  console.assert(REFORM_QUALITY.outliers.length>=2&&REFORM_QUALITY.scatter.length>=6,
    "Reform-Linse: Modellgüte braucht Streuung und mindestens zwei Ausreißer");
  console.assert(Object.keys(REFORM_LG).every(h=>REFORM_GEO[h]&&Array.isArray(REFORM_GEO[h].coords)&&REFORM_GEO[h].size>0),
    "Reform-Linse: Geo/Größe fehlt für ein Mock-Haus");
  // Engine-Invarianten: Summenerhalt (Abfluss = Σ Zuflüsse + Schwund) und Netto = −Schwund
  const probes=[null,{ebene:3,korb:[]},{ebene:0,korb:[{hid:"barmbek",lg:null}]}];
  probes.forEach(s=>{
    const a=audit(s);
    console.assert(Math.abs(a.distributed+a.schwund-a.freed)<=1,
      "Reform-Linse: Summenerhalt verletzt (Abfluss ≠ Σ Zuflüsse + Schwund)");
    const net=Object.keys(REFORM_LG).reduce((acc,h)=>acc+mapFeature(h,null,s).delta,0);
    console.assert(Math.abs(net+a.schwund)<=2,
      "Reform-Linse: Netto-Fallzahl-Veränderung ≠ −Schwund");
  });
}

function createReformLens(deps={}){
  window.ReformLensDeps=Object.freeze({...reformDeps(),...deps});
  __expCache={};
  return {befund,render,assert,groups,selectedLg,mapFeature,flowEdges,quality,scenario,audit};
}
window.createReformLens=createReformLens;
window.ReformLens=createReformLens();
})(window);
