/* Prototyp-Fixtures fuer Mehr-Standort-Artikelketten.
   Das reale GeoJSON kennt je Artikelkette aktuell nur einen Standort. Diese
   handkuratierten Beziehungen simulieren echte Verbundfaelle fuer die UI. */
const CURATED_MULTI_CLINIC_DEVELOPMENTS={
  "772563":{match:"Gesetz für Universitätsmedizin",partners:["773685","773686"]},
  "772995":{match:"Erhalt von Bremer Krankenhaus",partners:["772828","772978"]},
  "771083":{match:"zieht um",partners:["771080","771084"]},
  "771374":{match:"übernimmt Klinik Hallerwiese",partners:["771375"]},
};

/* AP4: kuratierte Nachrichten-Facetten fuer Personalien und Vorgänge.
   Sie liegen absichtlich neben den generierten Klinikdaten: keine Personen-Stammdaten,
   keine Profile, nur belegte Ereignisse mit stabilen Mock-Artikelreferenzen. */
const CURATED_PERSONALIEN=[
  {typ:"personalie",person:"Dr. Meike Brandt",rolle:"gf",richtung:"antritt",standortId:"771011",
   organisation:"Harzklinikum",quellArtikelId:"mock-artikel-pers-771011-20260528",datum:"2026-05-28"},
  {typ:"personalie",person:"Prof. Jonas Keller",rolle:"chefarzt",richtung:"wechsel",standortId:"773724",
   organisation:"Steinlach-Klinik",quellArtikelId:"mock-artikel-pers-773724-20260412",datum:"2026-04-12"},
  {typ:"personalie",person:"Sabine Wiegand",rolle:"pflegedirektion",richtung:"abgang",standortId:"771374",
   organisation:"Klinik Hallerwiese",quellArtikelId:"mock-artikel-pers-771374-20260318",datum:"2026-03-18"},
];

const CURATED_VORGAENGE=[
  {id:"vorgang-771011-insolvenz",standortId:"771011",typ:"insolvenzverfahren",label:"Insolvenzverfahren",zustand:"Eröffnung (Schutzschirm)",
   titel:"Schutzschirmverfahren Harzklinikum",stand:"2026-06-05",topics:["Insolvenz"],dossier:"insolvenzen",kettenIds:["mock-kette-vorgang-771011-insolvenz"],
   zustandsHistorie:[
    {zustand:"Antrag",datum:"2026-04-10",belegArtikelId:"mock-artikel-vorgang-771011-20260410"},
    {zustand:"Eröffnung (Schutzschirm)",datum:"2026-06-05",belegArtikelId:"mock-artikel-vorgang-771011-20260605"},
   ]},
  {id:"vorgang-771374-traeger",standortId:"771374",typ:"traegerwechsel",label:"Trägerwechsel",zustand:"Verfahren/Verhandlung",
   titel:"Übernahme Klinik Hallerwiese",stand:"2026-05-22",topics:["Trägerwechsel"],dossier:"insolvenzen",kettenIds:["mock-kette-vorgang-771374-traeger"],
   zustandsHistorie:[
    {zustand:"Ankündigung",datum:"2026-04-28",belegArtikelId:"mock-artikel-vorgang-771374-20260428"},
    {zustand:"Verfahren/Verhandlung",datum:"2026-05-22",belegArtikelId:"mock-artikel-vorgang-771374-20260522"},
   ]},
  {id:"vorgang-773724-schliessung",standortId:"773724",typ:"standortschliessung",label:"Standortschließung",zustand:"beschlossen",
   titel:"Schließung Steinlach-Klinik Mössingen",stand:"2026-04-06",topics:["Versorgung"],dossier:"khvvg",kettenIds:["mock-kette-vorgang-773724-schliessung"],
   zustandsHistorie:[
    {zustand:"angekündigt",datum:"2026-03-15",belegArtikelId:"mock-artikel-vorgang-773724-20260315"},
    {zustand:"beschlossen",datum:"2026-04-06",belegArtikelId:"mock-artikel-vorgang-773724-20260406"},
   ]},
  {id:"vorgang-772995-insolvenz-abgeschlossen",standortId:"772995",typ:"insolvenzverfahren",label:"Insolvenzverfahren",zustand:"Sanierung",
   titel:"Insolvenzplan für Bremer Krankenhaus abgeschlossen",stand:"2026-02-14",topics:["Insolvenz"],dossier:"insolvenzen",kettenIds:["mock-kette-vorgang-772995-insolvenz"],
   zustandsHistorie:[
    {zustand:"Eröffnung (Eigenverwaltung)",datum:"2026-01-20",belegArtikelId:"mock-artikel-vorgang-772995-20260120"},
    {zustand:"Sanierung",datum:"2026-02-14",belegArtikelId:"mock-artikel-vorgang-772995-20260214"},
   ]},
];

const CURATED_VORGANG_ARTIKEL={
  "mock-artikel-vorgang-771011-20260410":{quelle:"Volksstimme",url:"https://example.org/harzklinikum-schutzschirm",titel:"Harzklinikum beantragt Schutzschirmverfahren"},
  "mock-artikel-vorgang-771011-20260605":{quelle:"MDR",url:"https://example.org/harzklinikum-sanierungsplan",titel:"Sanierungsplan für Harzklinikum liegt vor"},
  "mock-artikel-vorgang-771374-20260428":{quelle:"Nordbayern",url:"https://example.org/hallerwiese-loi",titel:"Neuer Träger verhandelt über Klinik Hallerwiese"},
  "mock-artikel-vorgang-771374-20260522":{quelle:"BR",url:"https://example.org/hallerwiese-pruefung",titel:"Übernahme der Klinik Hallerwiese wird geprüft"},
  "mock-artikel-vorgang-773724-20260315":{quelle:"SWP",url:"https://example.org/steinlach-schliessung-angekuendigt",titel:"Steinlach-Klinik kündigt Schließung an"},
  "mock-artikel-vorgang-773724-20260406":{quelle:"SWP",url:"https://example.org/steinlach-offene-fragen",titel:"Klinik-Aus in Mössingen: Betreiber beantwortet Fragen"},
  "mock-artikel-vorgang-772995-20260120":{quelle:"Weser Kurier",url:"https://example.org/bremen-insolvenzplan",titel:"Gericht bestätigt Insolvenzplan"},
  "mock-artikel-vorgang-772995-20260214":{quelle:"buten un binnen",url:"https://example.org/bremen-verfahren-aufgehoben",titel:"Krankenhaus verlässt Insolvenzverfahren"},
};

const CURATED_DOSSIERS={
  insolvenzen:{label:"Insolvenzen & Trägerwechsel",href:"hauptansicht.html?dossier=insolvenzen",
    description:"Laufende Verfahren, Trägerwechsel und jüngste Zustandswechsel mit Standortbezug.",
    processFilters:["insolvenzverfahren","traegerwechsel"],personalienFilter:"all",
    metrics:{currentVerfahren:2,latestStateChanges:3,trend12m:[1,1,2,2,2,3,3,4,3,3,2,2]}},
  khvvg:{label:"Krankenhausreform (KHVVG)",href:"hauptansicht.html?dossier=khvvg",
    description:"Reformnahe Standortschließungen, Leistungsverschiebungen und belegte Folgen.",
    processFilters:["standortschliessung"],personalienFilter:"all",
    metrics:{currentVerfahren:1,latestStateChanges:2,trend12m:[0,0,1,1,1,1,1,2,2,2,1,1]}},
  personal:{label:"Fachkräftemangel & Personal",href:"hauptansicht.html?dossier=personal",
    description:"Personalien und Personalthemen als belegte Ereignisse, nicht als Vita-Seiten.",
    processFilters:[],personalienFilter:"only",
    metrics:{currentVerfahren:3,latestStateChanges:3,trend12m:[1,2,2,2,3,3,3,2,2,3,3,3]}},
};

const PERSONALIE_ROLLE_LABEL={gf:"Geschäftsführung",chefarzt:"Chefarzt",pflegedirektion:"Pflegedirektion",ministerium_verband:"Ministerium/Verband"};
const PERSONALIE_RICHTUNG_LABEL={antritt:"Antritt",abgang:"Abgang",wechsel:"Wechsel"};
function personalieArticleFromContract(ev){
  const rolle=PERSONALIE_ROLLE_LABEL[ev.rolle]||ev.rolle;
  const richtung=PERSONALIE_RICHTUNG_LABEL[ev.richtung]||ev.richtung;
  return {
    titel:`${ev.organisation}: ${rolle} - ${richtung}`,
    datum:ev.datum,
    quelle:"kuratierter Mock-Artikel",
    url:`https://example.org/${encodeURIComponent(ev.quellArtikelId)}`,
    teaser:`${ev.person} · ${rolle}. Belegtes Personalien-Ereignis mit Standortbezug.`,
    quellArtikelId:ev.quellArtikelId
  };
}
function curatedArticleFromEvidence(ev){
  return {titel:ev.titel,datum:ev.datum,quelle:ev.quelle,url:ev.url,teaser:ev.teaser||"",quellArtikelId:ev.quellArtikelId};
}
function vorgangArticleFromHistoryStep(v,step){
  const artikel=CURATED_VORGANG_ARTIKEL[step.belegArtikelId]||{};
  return curatedArticleFromEvidence({...artikel,datum:step.datum,teaser:`${v.label}: ${step.zustand}`,quellArtikelId:step.belegArtikelId});
}
function applyCuratedAp4Fixtures(feats,byId){
  CURATED_PERSONALIEN.forEach(ev=>{
    const f=byId.get(ev.standortId); if(!f)return;
    const p=f.properties; if(!p.developments)p.developments=[];
    p.developments.push({end:ev.datum,datum:ev.datum,topics:["Personal"],ap4Kind:"personalie",personalie:ev,
      items:[personalieArticleFromContract(ev)]});
  });
  CURATED_VORGAENGE.forEach(v=>{
    const f=byId.get(v.standortId); if(!f)return;
    const p=f.properties; if(!p.developments)p.developments=[];
    p.developments.push({end:v.stand,datum:v.stand,topics:v.topics,ap4Kind:"vorgang",vorgang:v,
      items:v.zustandsHistorie.map(t=>vorgangArticleFromHistoryStep(v,t))});
  });
  feats.forEach(f=>{f.properties.entwicklungen=(f.properties.developments||[]).length;});
}
