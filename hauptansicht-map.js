/* =====================================================================
   Hauptansicht — alle BKA-Standorte als nativer MapLibre-Cluster-Layer.
   Datenquelle: data/kliniken.geojson (real abgeleitet; Steckbrief-Felder
   real aus BKA/QB, Fachabteilungs-Zahl im Prototyp erfunden). Cluster-
   Encoding = Preset 1, fest eingebacken (keine Tweak-UI, kein Halo-Puls).
   Kopfleisten-Filter (Zeitraum/Themen) und Suche wirken auf die Cluster
   selbst: pro Filter wird je Standort eine gefilterte Entwicklungs-Zahl
   gerechnet und die Cluster-Source neu aufgebaut.
   ===================================================================== */
const TODAY=new Date(2026,5,13);
// muss mit CURATED_TOPICS in tools/build_kliniken_geojson.py übereinstimmen (Wert + Reihenfolge).
const TOPICS=["Insolvenz","Investition","Trägerwechsel","Personal","Versorgung","Reform"];
/* Themen, die bereits ein eigenes, reicheres Bedienelement haben — sie erscheinen deshalb
   NICHT als Themen-Chip, weder im Dropdown noch am Standort (2026-07-18):
     Insolvenz, Trägerwechsel -> Gruppe „Laufende Vorgänge" (Verfahren mit Verlauf)
     Personal                 -> Personalien-Pille in der Filterleiste
   TOPICS selbst bleibt vollstaendig: die Themen stehen weiter an den Daten und zaehlen mit,
   nur die doppelte Bedienung faellt weg. */
const TOPICS_ANDERSWO=new Set(["Insolvenz","Trägerwechsel","Personal"]);
const TOPICS_ALS_CHIP=TOPICS.filter(t=>!TOPICS_ANDERSWO.has(t));
/* Symbol je Thema fuer die Menuezeilen im Themen-Dropdown. Bewusst mit Rueckfallwert:
   TOPICS folgt build_kliniken_geojson.py und darf wachsen, ohne dass hier eine Zeile
   ohne Symbol entsteht und aus der Reihe faellt. Keine Kollision mit den Vorgangs-
   symbolen (euro, swap_horiz, block, construction, handshake). */
const TOPIC_ICON={Investition:"savings",Versorgung:"local_hospital",Reform:"policy",
  Insolvenz:"euro",Trägerwechsel:"swap_horiz",Personal:"badge"};
const TOPIC_ICON_FALLBACK="sell";   // dasselbe Symbol wie der Themen-Trigger
const SRC="kliniken";
const FEED_STORY_LIMIT=40;  // globaler Feed gebuendelt: max. so viele Story-Karten rendern (DOM-leicht)
const TOP_MIN_MELDUNGEN=2;  // "Top"-Entwicklung = Kette aus >= so vielen Meldungen; Schwelle an genau einer Stelle (ggf. auf 3 drehen)
/* Deutschland-Ausgangsuebersicht. Die Kamera wird nach dem Load layoutbewusst
   eingerueckt, damit der Mittelpunkt im sichtbaren Kartenfenster links vom
   Artikelpanel liegt und nicht geometrisch im kompletten Viewport. */
const HOME_CENTER=[10.3,51.15], HOME_ZOOM=5.45;

/* ---- Cluster-Encoding: Preset 1, fest eingebacken ---- */
const STOPS_SUM=[1,5,15,35,70];   // summierte Entwicklungen je Cluster
const STOPS_PT =[1,2,4,6,8];      // Entwicklungen einer Einzelklinik
const CLUSTER_RADIUS=50, CLUSTER_MAXZOOM=10;             // Dichte "Standard"
const R_MIN=10,R_MAX=40,SIZE_GAMMA=0.765,SIZE_VMAX=90;   // sizeBy=Entwicklungen, sizeScale 0.7
/* Theme-Paletten (blaue Rampe, grauer Basis-Standort). Dunkel: weicher weißer
   Halo. Hell: dunkler Rand statt Halo (freigegebene Entscheidung), sattere Blautöne. */
const CL_PAL={
  dunkel:{ramp:["#9aa0aa","#284598","#3258bc","#4579db","#5d9af1"],
          halo:"#ffffff",haloOp:0.5,stroke:"#ffffff",strokeW:0,strokeWPt:0,text:"#ffffff",textHalo:"rgba(0,0,0,0.35)"},
  hell:{ramp:["#aab2c0","#7ba0db","#4e7fd2","#2d5cbd","#193f8e"],
        halo:"#1b2330",haloOp:0,stroke:"rgba(20,30,45,0.55)",strokeW:1.4,strokeWPt:1,text:"#ffffff",textHalo:"rgba(0,0,0,0.30)"},
};
let THEME="dunkel";
const pal=()=>CL_PAL[THEME];
const ACCENT=()=>THEME==="hell"?"#2f6fb0":"#a9c6e8";   // Ringfarbe für die Bereichs-Hervorhebung
/* P5: Klinik-Namen als Label ab Zoomstufe (Galerie-Entscheidung 2026-06-18,
   Variante „Klinik-Namen ab Zoomstufe"): Schwelle 8, Markenblau-Familie,
   ruhende Kliniken gestaffelt (LABEL_MINZOOM + LABEL_STAGGER). Anders als im
   Schaufenster bleiben die Punkt-Marker hier nach Nachrichtenlage eingefärbt
   (grau ohne, blaue Rampe mit Entwicklungen, siehe colorExpr/points). Die
   Markenblau-Labels heben nur die Daten-Ebene gegenüber der Geografie ab:
   Kliniken mit Nachrichten hell & halbfett, ruhende in gedämpftem Blaugrau. */
const LABEL_MINZOOM=8, LABEL_STAGGER=2;
/* Ruhende Standorte (0 Entwicklungen) erscheinen als Einzelpunkt erst ab Detail-Zoom,
   analog zu den ausgeblendeten 0-Clustern. Damit schweben isolierte Insel-Standorte
   (Sylt, Föhr-Amrum, Rügen ...) ohne Cluster-Nachbarn nicht mehr in der Übersicht und
   verschieben auch keinen Cluster-Schwerpunkt. An LABEL_MINZOOM+LABEL_STAGGER gekoppelt,
   damit ruhender Punkt und ruhendes Label gemeinsam auftauchen (kein Label ohne Punkt). */
const IDLE_MINZOOM=LABEL_MINZOOM+LABEL_STAGGER;
const LBL_PAL={
  dunkel:{dev:"#cfe0f7", idle:"#8f9fb5", halo:"rgba(8,12,20,0.92)"},
  hell:  {dev:"#193f8e", idle:"#5a6b86", halo:"rgba(255,255,255,0.92)"},
};
const lblPal=()=>LBL_PAL[THEME];
/* P1: Welt-minus-DE-Maske, Schnitt entlang der echten Küstenlinie inkl. Inseln
   (data/deutschland_maske.geojson → als gestapelte Feder weichgezeichnet).
   Galerie-Entscheidung (Variante „Andere Länder ausgrauen", 2026-06-18):
   Technik 3 „Weiche Maske" — die harte Küstenkante wird per vorberechneter Feder
   (data/deutschland_maske_feather.geojson) aufgefedert. Gewählt: Schrittweite
   „Dicht" (stride 1), Federbreite 16 Stufen. Farbe/Ziel-Deckkraft je Theme
   „Kräftig" / 0,70. */
const MASK_STYLE={dunkel:{color:"#06070a",op:0.70}, hell:{color:"#aeb4bd",op:0.70}};
const FEATHER_SRC="de_feather";
const FEATHER_K=16;       // Federbreite (gestapelte Stufen) — Galerie-Entscheidung „Dicht + 16"
const FEATHER_STRIDE=1;   // „Dicht" = feinster, glattester Verlauf
/* Die zur Laufzeit gestapelten gebackenen Stufen-Indizes (stride·1 … stride·K). */
function featherStepIndices(){const o=[];for(let i=1;i<=FEATHER_K;i++)o.push(i*FEATHER_STRIDE);return o;}
/* Länder-Namens-Layer der Basiskarte (OpenMapTiles place/class=country). Beim
   Maskieren werden alle ausser DE ausgeblendet, damit grosse Fremd-Ländernamen
   nicht halb über das DE-Loch ragen (z. B. „Luxemburg", dessen Schrift bis nach
   Deutschland reicht). Städte-/Ortslabels bleiben und werden rein geometrisch
   von der Maske gedimmt. */
const COUNTRY_LABEL_LAYERS=["label_country_1","label_country_2","label_country_3"];
function baseCountryFilter(id){
  return getCountryLabelFilter(THEME,id);
}
function applyForeignCountryLabelMask(){
  const isoDE=["==",["get","iso_a2"],"DE"];
  COUNTRY_LABEL_LAYERS.forEach(id=>{
    if(!map.getLayer(id)) return;
    const base=baseCountryFilter(id);
    map.setFilter(id, base?["all",base,isoDE]:isoDE);
  });
}

/* ============ State ============ */
const state={selectedId:null,rangeDays:0,topics:new Set(),query:"",topOnly:false,
  personalienFilter:"all", // all | only | without — Default zeigt Personalien plus Artikel
  processFilter:[],        // gewaehlte Vorgangstypen; leer = alle. Seit 2026-07-18 mehrfach
                           // waehlbar (gezaehlte Chips statt Einfachauswahl im Dropdown).
  frozen:null,       // {clusterId, center:[lng,lat], ids:Set<standort_id>, zoom} — eingefrorener Cluster-Bereich (zoom = Karten-Zoom beim Einfrieren)
  bereichTab:"feed", // Umschalter im Bereichs-Panel: feed | kliniken (Endnutzer-Wahl)
  vorgaengeOffen:null, // Vorgangs-Block: null = Vorgabe je Panel-Zustand (nur Standort offen), sonst die Wahl des Nutzers
  period:null,       // kalendarische Suche: {level:"kw"|"monat"|"quartal", value} oder null. Gegenseitig exklusiv zum Tages-Preset (rangeDays).
};

/* ============ Daten ============ */
let DATA=null, FEATS=[];
const byId=new Map();
const fmtNum=n=>(n==null?"–":Number(n).toLocaleString("de-DE"));
const fmtDate=d=>new Date(d).toLocaleDateString("de-DE",{day:"2-digit",month:"short",year:"numeric"});
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* Nur http(s)-Links ausspielen; alles andere (z. B. javascript:) als kein-Link behandeln. */
const safeUrl=u=>/^https?:\/\//i.test(u||"")?u:"";
/* Sprechende Domain fuer die Beschriftung: NUR die registrierbare Domain — ohne
   Subdomain (www., sb., …) und ohne Pfad/Query/Anker. Auch bei Deep-Links wird nur die
   nackte Domain gezeigt; der href bleibt die volle URL. */
const prettyHost=u=>{
  const host=String(u||"").replace(/^https?:\/\//i,"").replace(/[\/?#].*$/,"").toLowerCase();
  const parts=host.split(".").filter(Boolean);
  if(parts.length<=2)return parts.join(".");
  // Zusammengesetzte Laender-TLDs (z. B. co.uk) behalten drei Labels, sonst zwei.
  const SECOND_LEVEL=new Set(["co","com","org","gov","ac","net"]);
  const last=parts[parts.length-1],penult=parts[parts.length-2];
  const keep=(last.length===2 && SECOND_LEVEL.has(penult))?3:2;
  return parts.slice(-keep).join(".");
};
function daysAgo(iso){return Math.floor((TODAY-new Date(iso))/86400000);}

/* ---- Kalendarische Suche (hierarchische Zeitauswahl) ----
   Genau EINE Periode auf genau EINER Ebene (KW | Monat | Quartal). Keine Spanne, kein Jahr-Level.
   Entscheidung: die wählbaren Perioden werden STATISCH für 2026 generiert (kein Scan der Daten).
   Begründung: Die Datenbasis ist faktisch 2026 bis TODAY; eine feste, kalendarische Liste ist
   robuster und vorhersehbarer als eine aus den Daten abgeleitete (keine Lücken durch leere
   Perioden, keine Abhängigkeit von der Lade-Reihenfolge). Begrenzt auf 2026 bis einschließlich
   TODAY: Quartale Q1/Q2, Monate Jan–Jun, KW bis zur laufenden Woche.
   value-Kodierung pro Ebene: kw="2026-Www" (ISO-Wochennummer), monat="2026-MM", quartal="2026-Qn". */
const PERIOD_YEAR=2026;
/* ISO-8601-Wochennummer (Montag-Start, Woche-1 = Woche mit dem ersten Donnerstag). */
function isoWeek(d){
  const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day=t.getUTCDay()||7;                       // So=7 statt 0
  t.setUTCDate(t.getUTCDate()+4-day);               // auf den Donnerstag der Woche
  const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));
  return {year:t.getUTCFullYear(),week:Math.ceil(((t-y0)/86400000+1)/7)};
}
/* Liefert die wählbaren Perioden je Ebene als [{value,label}] — nur 2026 bis einschließlich TODAY. */
function periodOptions(level){
  const out=[];
  if(level==="quartal"){
    const maxQ=Math.floor(TODAY.getMonth()/3)+1;     // 0..2 -> Q1, 3..5 -> Q2 ...
    for(let q=1;q<=maxQ;q++)out.push({value:`${PERIOD_YEAR}-Q${q}`,label:`Q${q} ${PERIOD_YEAR}`});
  }else if(level==="monat"){
    const MN=["Jan","Feb","März","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
    for(let m=0;m<=TODAY.getMonth();m++)out.push({value:`${PERIOD_YEAR}-${String(m+1).padStart(2,"0")}`,label:`${MN[m]} ${PERIOD_YEAR}`});
  }else{ // "kw"
    const maxW=isoWeek(TODAY).week;                  // laufende Woche einschließlich
    for(let w=1;w<=maxW;w++)out.push({value:`${PERIOD_YEAR}-W${String(w).padStart(2,"0")}`,label:`KW ${w} · ${PERIOD_YEAR}`});
  }
  return out;
}
/* Prüft ein Entwicklungsdatum (iso) gegen die aktive Periode (state.period). */
function inPeriod(iso){
  const p=state.period; if(!p)return true;
  const d=new Date(iso);
  if(d.getFullYear()!==PERIOD_YEAR)return false;     // Datenbasis ist 2026; alles andere fällt raus
  if(p.level==="quartal"){const q=Math.floor(d.getMonth()/3)+1;return p.value===`${PERIOD_YEAR}-Q${q}`;}
  if(p.level==="monat"){return p.value===`${PERIOD_YEAR}-${String(d.getMonth()+1).padStart(2,"0")}`;}
  // KW: ISO-Woche von d mit der gewählten KW vergleichen (Jahr muss ebenfalls 2026 sein).
  const iw=isoWeek(d);
  return iw.year===PERIOD_YEAR && p.value===`${PERIOD_YEAR}-W${String(iw.week).padStart(2,"0")}`;
}
/* Zeitfilter über d.end: aktive Periode hat Vorrang (Exklusivität — Preset ist dann neutral),
   sonst greift der Tages-Preset (rangeDays===0 = "Gesamt" = keine Beschränkung). */
function inRange(iso){
  if(state.period)return inPeriod(iso);
  return state.rangeDays===0 || daysAgo(iso)<=state.rangeDays;
}
function topicMatch(topics){return state.topics.size===0 || (topics||[]).some(t=>state.topics.has(t));}
function devTop(d){return (d.items||[]).length>=TOP_MIN_MELDUNGEN;}   // "Top"-Prädikat: Kettenlänge aus dem Export, kein Daten-Flag
function personalienAllowed(d){
  const isPersonalie=d.ap4Kind==="personalie";
  if(state.personalienFilter==="only")return isPersonalie;
  if(state.personalienFilter==="without")return !isPersonalie;
  return true;
}
const ACTIVE_PROCESS_STATES={
  insolvenzverfahren:new Set(["Antrag","Eröffnung (Eigenverwaltung)","Eröffnung (Schutzschirm)"]),
  traegerwechsel:new Set(["Ankündigung","Verfahren/Verhandlung"]),
  standortschliessung:new Set(["angekündigt","beschlossen","vollzogen"]),
  neubau:new Set(["Ankündigung","Bau"]),          // Inbetriebnahme = abgeschlossen
  kooperation:new Set(["Ankündigung"]),           // Vollzug = abgeschlossen
};
function activeProcessState(v){
  const states=ACTIVE_PROCESS_STATES[v.typ];
  return states?states.has(v.zustand):true;
}
function activeProcessMatch(d,filters=null){
  if(d.ap4Kind!=="vorgang"||!d.vorgang)return false;
  const wanted=filters||(state.processFilter.length?state.processFilter:null);
  if(!wanted||!wanted.length)return true;
  if(!wanted.includes(d.vorgang.typ))return false;
  return activeProcessState(d.vorgang);
}
function processAllowed(d){
  if(!state.processFilter.length)return true;
  return activeProcessMatch(d,state.processFilter);
}
function devVisible(d){return inRange(d.end)&&topicMatch(d.topics)&&personalienAllowed(d)&&processAllowed(d)&&(!state.topOnly||devTop(d));}   // Filter-Kopplung: zählt diese Entwicklung? (deckt Cluster + Panel)
/* Wie devVisible, aber OHNE Themen-Bedingung: für die Label-Zähler je Thema-Chip
   (Zeitraum + Top + Suche zählen mit, die Themen-Auswahl selbst nicht). */
function devVisibleNoTopic(d){return inRange(d.end)&&personalienAllowed(d)&&processAllowed(d)&&(!state.topOnly||devTop(d));}
/* Suchnormalisierung: Groß/klein + Umlaut-Faltung + Akzent-Strippen (kein Fuzzy/Levenshtein). */
function searchNorm(s){return String(s==null?"":s).toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").normalize("NFD").replace(/[̀-ͯ]/g,"");}
function queryOk(f){
  if(!state.query)return true;
  // Mehrwort-UND: Query an Whitespace in Tokens splitten, jedes Token einzeln normalisieren,
  // leere Tokens verwerfen. Treffer NUR, wenn JEDES Token als Substring im (bereits
  // normalisierten) _searchBlob vorkommt. So matcht "Sana Leipzig" auch, wenn beide Teile
  // verteilt im Blob stehen — der Blob wird NICHT erneut normalisiert (liegt schon normalisiert vor).
  const blob=f.properties._searchBlob||"";
  const tokens=state.query.split(/\s+/).map(searchNorm).filter(Boolean);
  if(!tokens.length)return true;   // nur Whitespace -> wie leerer Query
  return tokens.every(t=>blob.includes(t));
}
/* Such-sichtbare Grundgesamtheit: ohne Suche alle Standorte, mit Suche nur Treffer. */
function visibleFeats(){return state.query?FEATS.filter(queryOk):FEATS;}
function countDevs(f){let n=0;const ds=f.properties.developments||[];for(const d of ds)if(devVisible(d))n++;return n;}
/* Kompaktes Label einer Periode (für Trigger-Pille): "KW 24", "Jun 2026", "Q2 2026". */
function periodLabel(p){
  if(!p)return "";
  const opt=periodOptions(p.level).find(o=>o.value===p.value);
  if(opt)return opt.label.replace(" · 2026","").replace(" 2026"," ’26");
  return p.value;
}
// Panel-Text "Artikel aus …": aktive Periode hat Vorrang (Exklusivität), sonst der Tages-Preset.
const rangeLabel=()=>state.period
  ? periodOptions(state.period.level).find(o=>o.value===state.period.value)?.label||state.period.value
  : ({7:"den letzten 7 Tagen",30:"den letzten 30 Tagen",0:"gesamt"}[state.rangeDays]);

/* Label-Zähler je Thema (on-the-fly): Entwicklungen je Thema über alle (such-)sichtbaren
   Standorte, unter Berücksichtigung von Zeitraum+Top+Suche, aber OHNE die Themen-Auswahl selbst. */
function countOnTheFly(){const dev={};for(const t of TOPICS)dev[t]=0;for(const f of visibleFeats()){const ds=f.properties.developments;if(!ds)continue;for(const d of ds){if(!devVisibleNoTopic(d))continue;const tp=d.topics;if(!tp)continue;for(const t of tp){if(dev[t]!==undefined)dev[t]++;}}}return dev;}
/* Frischt sowohl Filterleisten- als auch Panel-Themen-Chips mit der aktuellen Zahl. */
/* Deckt beide Bauformen ab: Menuezeile im Dropdown (.fo-n) und Chip am Standort (.count-soft). */
function updateTopicCounts(){const c=countOnTheFly();document.querySelectorAll("[data-topic]").forEach(ch=>{const s=ch.querySelector(".count-soft,.fo-n");if(s)s.textContent=c[ch.dataset.topic]??0;});}

/* Zaehler der beiden Menue-Dropdowns. Gleiches Muster wie devVisibleNoTopic: der eigene
   Filter zaehlt NICHT mit, sonst stuende auf jeder nicht gewaehlten Zeile eine 0 und man
   saehe nie, was die andere Wahl braechte. */
function devVisibleNoTop(d){return inRange(d.end)&&topicMatch(d.topics)&&personalienAllowed(d)&&processAllowed(d);}
function devVisibleNoPersonalien(d){return inRange(d.end)&&topicMatch(d.topics)&&processAllowed(d)&&(!state.topOnly||devTop(d));}
function countTopOptionen(){
  const n={"0":0,"1":0};
  for(const f of visibleFeats())for(const d of (f.properties.developments||[])){
    if(!devVisibleNoTop(d))continue;
    n["0"]++; if(devTop(d))n["1"]++;
  }
  return n;
}
function countPersonalienOptionen(){
  const n={all:0,only:0,without:0};
  for(const f of visibleFeats())for(const d of (f.properties.developments||[])){
    if(!devVisibleNoPersonalien(d))continue;
    n.all++; if(d.ap4Kind==="personalie")n.only++; else n.without++;
  }
  return n;
}
/* Wie devVisible, aber OHNE die Vorgangs-Bedingung — analog zu devVisibleNoTopic.
   Noetig fuer die Zaehler auf den Vorgangs-Chips: zaehlte man mit aktivem Vorgangsfilter,
   fielen die nicht gewaehlten Typen sofort auf 0 und man saehe nie, was man verpasst. */
function devVisibleNoProcess(d){return inRange(d.end)&&topicMatch(d.topics)&&personalienAllowed(d)&&(!state.topOnly||devTop(d));}
/* Zaehlt sichtbare Vorgaenge je Typ. Nur aktive Verfahrensstaende zaehlen mit — dieselbe
   Regel, nach der auch gefiltert wird (ACTIVE_PROCESS_STATES). */
function countVorgangTypen(){
  const n={};
  for(const t of Object.keys(ACTIVE_PROCESS_STATES))n[t]=0;
  for(const f of visibleFeats()){
    for(const d of (f.properties.developments||[])){
      if(d.ap4Kind!=="vorgang"||!d.vorgang)continue;
      if(!devVisibleNoProcess(d)||!activeProcessState(d.vorgang))continue;
      if(n[d.vorgang.typ]!==undefined)n[d.vorgang.typ]++;
    }
  }
  return n;
}

/* ============ Karte ============ */
const map=new maplibregl.Map({
  container:"map",style:getMapStyle("dunkel"),center:HOME_CENTER,zoom:HOME_ZOOM,minZoom:4.3,maxZoom:16,
  attributionControl:{compact:true}
});
map.addControl(new maplibregl.NavigationControl({showCompass:false}),"bottom-right");

/* Aktuelle FeatureCollection: entFiltered je Feature aktualisieren; bei aktiver
   Suche die Grundgesamtheit auf Treffer reduzieren (Nicht-Treffer verschwinden
   ganz, statt grau zu bleiben). */
function currentCollection(){
  const feats=visibleFeats();
  const fz=state.frozen;
  const processActive=!!state.processFilter.length;
  feats.forEach(f=>{
    f.properties.entFiltered=countDevs(f);   // nur die ausgelieferten Features zählen
    f.properties._frozenMember=(fz&&fz.ids.has(f.properties.standort_id))?1:0;   // P7: speist clusterProperties.frozenCount
    const devs=f.properties.developments||[];
    f.properties._processDimmed=processActive&&!devs.some(d=>activeProcessMatch(d))?1:0;   // AP4: Nichttreffer bleiben als gedimmte Basispunkte sichtbar.
  });
  return {type:"FeatureCollection",features:feats};
}
function rebuildSource(){const s=map.getSource(SRC);if(s)s.setData(currentCollection());}
/* Karte nur neu clustern, wenn kein Bereich eingefroren ist (Option a, Spec 2026-06-14):
   solange ein Bereich aktiv ist, halten Zeitraum/Themen/Top die cluster_id stabil
   (an der die Hervorhebung hängt) und wirken nur auf Feed + Zählung im Panel. */
function rebuildUnlessFrozen(){ if(!state.frozen)rebuildSource(); }

/* Kontinuierliche Cluster-Kreisgröße über die summierten Entwicklungen (ent). */
function clusterRadiusExpr(extra){
  const norm=["max",0,["min",1,["/",["-",["get","ent"],1],SIZE_VMAX-1]]];
  return ["+",R_MIN+extra,["*",R_MAX-R_MIN,["^",norm,SIZE_GAMMA]]];
}
function rampExpr(value,stops,palette){
  const e=["interpolate",["linear"],value];
  for(let i=0;i<stops.length;i++)e.push(stops[i],palette[i]);
  return e;
}
/* 0 Entwicklungen -> grauer Basis-Standort (palette[0]); sonst blaue Rampe. */
function colorExpr(zeroTest,value,stops,palette){
  return ["case",zeroTest,palette[0],rampExpr(value,stops,palette)];
}

function removeClinicLayers(){
  [...featherStepIndices().map(i=>`de-feather-${i}`),
   "cluster-halo","clusters","cluster-active","cluster-count","points-halo","points","points-idle","points-active","points-label-dev","points-label-idle"]
    .forEach(id=>{if(map.getLayer(id))map.removeLayer(id);});
  if(map.getSource(SRC))map.removeSource(SRC);
  if(map.getSource(FEATHER_SRC))map.removeSource(FEATHER_SRC);
}
function addClinicLayers(){
  removeClinicLayers();
  const P=pal();
  // P1 / Technik 3: weiche Welt-minus-DE-Maske zuerst (über der Basiskarte, unter den
  // Klinik-Layern). Statt einer harten Fill werden K gebackene Puffer-Stufen GESTAPELT →
  // Verlauf von Deckkraft 0 an der Küste auf die Ziel-Deckkraft außen. DE bleibt als Loch
  // klar; Orts-/Ländernamen der Nachbarländer werden mitgedimmt.
  const M=MASK_STYLE[THEME];
  const fIdx=featherStepIndices();
  // Per-Layer-Deckkraft fa so, dass n Stapel außen 'op' ergeben: 1-(1-fa)^n=op → fa=1-(1-op)^(1/n).
  const fa = M.op>=1 ? 1 : 1-Math.pow(1-M.op, 1/fIdx.length);
  map.addSource(FEATHER_SRC,{type:"geojson",data:"data/deutschland_maske_feather.geojson"});
  fIdx.forEach(idx=>{
    map.addLayer({id:`de-feather-${idx}`,type:"fill",source:FEATHER_SRC,
      filter:["==",["get","step"],idx],
      paint:{"fill-color":M.color,"fill-opacity":fa,"fill-antialias":true}});
  });
  // Fremd-Ländernamen ganz ausblenden (Luxemburg-Fall: Schrift ragt ins DE-Loch).
  applyForeignCountryLabelMask();
  map.addSource(SRC,{type:"geojson",data:currentCollection(),cluster:true,
    clusterRadius:CLUSTER_RADIUS,clusterMaxZoom:CLUSTER_MAXZOOM,
    clusterProperties:{ent:["+",["get","entFiltered"]],frozenCount:["+",["get","_frozenMember"]]}});

  // Nur Cluster mit mind. einer (gefilterten) Entwicklung werden gezeigt; reine 0-Cluster bleiben aus.
  const clusterShown=["all",["has","point_count"],[">",["get","ent"],0]];
  map.addLayer({id:"cluster-halo",type:"circle",source:SRC,filter:clusterShown,paint:{
    "circle-color":P.halo,"circle-radius":clusterRadiusExpr(5),"circle-blur":0.55,"circle-opacity":P.haloOp}});
  map.addLayer({id:"clusters",type:"circle",source:SRC,filter:clusterShown,paint:{
    "circle-color":colorExpr(["==",["get","ent"],0],["get","ent"],STOPS_SUM,P.ramp),
    "circle-radius":clusterRadiusExpr(0),"circle-opacity":0.95,
    "circle-stroke-width":P.strokeW,"circle-stroke-color":P.stroke}});
  // Hervorhebungs-Ring für den aktiven (eingefrorenen) Cluster; Filter/Sichtbarkeit setzt applyHighlight().
  map.addLayer({id:"cluster-active",type:"circle",source:SRC,filter:["==",["get","cluster_id"],-1],
    layout:{visibility:"none"},paint:{
    "circle-color":"rgba(0,0,0,0)","circle-radius":clusterRadiusExpr(3),
    "circle-stroke-width":3,"circle-stroke-color":ACCENT()}});
  map.addLayer({id:"cluster-count",type:"symbol",source:SRC,filter:clusterShown,layout:{
    "text-field":["to-string",["get","ent"]],"text-font":["Noto Sans Bold"],"text-size":12,"text-allow-overlap":true},
    paint:{"text-color":P.text,"text-halo-color":P.textHalo,"text-halo-width":1}});
  const single=["!",["has","point_count"]];
  // Einzelpunkte nach Aktivität trennen: aktive Standorte (entFiltered>0) immer sichtbar
  // mit Glow + Farbe; ruhende (0 Entwicklungen) als schlichter grauer Punkt erst ab
  // IDLE_MINZOOM, damit isolierte Insel-Standorte die Übersicht nicht zumüllen.
  const singleDev=["all",single,[">",["coalesce",["get","entFiltered"],0],0]];
  const singleIdle=["all",single,["<=",["coalesce",["get","entFiltered"],0],0]];
  map.addLayer({id:"points-halo",type:"circle",source:SRC,filter:singleDev,paint:{
    "circle-color":P.halo,"circle-radius":9,"circle-blur":0.6,"circle-opacity":P.haloOp}});
  map.addLayer({id:"points",type:"circle",source:SRC,filter:singleDev,paint:{
    "circle-color":colorExpr(["==",["get","entFiltered"],0],["get","entFiltered"],STOPS_PT,P.ramp),
    "circle-radius":5,"circle-opacity":["case",["==",["coalesce",["get","_processDimmed"],0],1],0.22,0.95],"circle-stroke-width":P.strokeWPt,"circle-stroke-color":P.stroke}});
  map.addLayer({id:"points-idle",type:"circle",source:SRC,filter:singleIdle,minzoom:IDLE_MINZOOM,paint:{
    "circle-color":P.ramp[0],"circle-radius":5,"circle-opacity":["case",["==",["coalesce",["get","_processDimmed"],0],1],0.16,0.95],
    "circle-stroke-width":P.strokeWPt,"circle-stroke-color":P.stroke}});
  // Hervorhebungs-Ring für die Mitglieder-Punkte (greift, wenn der Cluster beim Reinzoomen zerfällt).
  map.addLayer({id:"points-active",type:"circle",source:SRC,filter:["in",["get","standort_id"],["literal",["__none__"]]],
    layout:{visibility:"none"},paint:{
    "circle-color":"rgba(0,0,0,0)","circle-radius":8,"circle-stroke-width":2.4,"circle-stroke-color":ACCENT()}});
  // P5: Klinik-Namen als Label ab Zoomstufe (Galerie-Entscheidung 2026-06-18). Zwei getrennte
  // Symbol-Layer mit Kollisionserkennung (text-allow-overlap:false): Kliniken mit Nachrichten
  // (entFiltered>0) erscheinen zuerst ab LABEL_MINZOOM hell & halbfett; ruhende Kliniken erst
  // LABEL_STAGGER Stufen später in gedämpftem Blaugrau. Dev-Layer zuerst → gewinnt die Kollision.
  const LB=lblPal();
  const labelLayout={"text-field":["get","name"],"text-size":11,
    "text-offset":[0,1.1],"text-anchor":"top","text-allow-overlap":false,"text-optional":true};
  map.addLayer({id:"points-label-dev",type:"symbol",source:SRC,
    filter:singleDev,minzoom:LABEL_MINZOOM,
    layout:{...labelLayout,"text-font":["Noto Sans Bold"]},
    paint:{"text-color":LB.dev,"text-halo-color":LB.halo,"text-halo-width":1.4}});
  map.addLayer({id:"points-label-idle",type:"symbol",source:SRC,
    filter:singleIdle,minzoom:IDLE_MINZOOM,
    layout:{...labelLayout,"text-font":["Noto Sans Regular"]},
    paint:{"text-color":LB.idle,"text-halo-color":LB.halo,"text-halo-width":1.4}});

  applyHighlight();   // Ring/Dimmen nach (Neu-)Aufbau wiederherstellen (auch nach Theme-Wechsel)
}

/* Deterministischer Wiederaufbau der Klinik-/Masken-Layer nach einem Style-Wechsel.
   setStyle verwirft Source + GL-Layer. Da Hell- und Dunkel-Stil strukturgleich sind,
   faehrt MapLibre ein DIFF — und in diesem Diff-Pfad feuert nachweislich KEIN
   "styledata" (nur "sourcedata"), waehrend isStyleLoaded() erst spaet (wenn die
   Tiles geladen sind) und dann via "sourcedata" auf true springt. Auf
   isStyleLoaded()/styledata zu warten verpasst den Moment komplett -> genau das
   liess Layer/Cluster beim Wechsel auf Hell verschwinden.
   Richtig: nur der GEPARSTE Stil (map.style._loaded) ist noetig, um Source/Layer
   zu setzen — Tiles sind dafuer egal. Im Diff-Pfad ist das direkt nach setStyle
   bereits true -> sofort und synchron aufbauen. Nur im seltenen Vollreload-Pfad
   (Diff scheitert) wird der Stil neu geparst; der frische Stil feuert dann ein
   echtes "styledata" -> darauf nacharmen. addClinicLayers ist idempotent. */
function rebuildClinicLayersWhenReady(){
  if(!DATA) return;                          // vor dem Initial-Load nichts zu tun
  if(map.style && map.style._loaded){        // Stil geparst (Diff-Pfad: schon synchron true)
    if(!map.getSource(SRC)) addClinicLayers();
    return;
  }
  map.once("styledata",rebuildClinicLayersWhenReady);   // Vollreload-Pfad: frischer Stil feuert styledata
}

/* Hervorhebung des eingefrorenen Bereichs (fest "Beide": Ring um den aktiven Cluster
   UND den Rest dimmen). Ohne Bereich: alles auf Normalzustand zurück. */
function setVis(layer,v){if(map.getLayer(layer))map.setLayoutProperty(layer,"visibility",v);}
function applyHighlight(){
  if(!map.getLayer("clusters"))return;
  const fz=state.frozen;
  if(!fz){
    map.setPaintProperty("clusters","circle-opacity",0.95);
    map.setPaintProperty("points","circle-opacity",0.95);
    map.setPaintProperty("points-idle","circle-opacity",0.95);
    map.setPaintProperty("cluster-count","text-opacity",1);
    setVis("cluster-active","none");setVis("points-active","none");
    return;
  }
  const memberPt=["in",["get","standort_id"],["literal",[...fz.ids]]];
  // P7: Hervorhebung an der aggregierten Mitgliederzahl je Cluster (frozenCount) statt an der
  // flüchtigen cluster_id — überlebt Re-Clustering bei Zoom und Theme-Wechsel.
  const hasMember=[">",["coalesce",["get","frozenCount"],0],0];
  const D=0.16;
  map.setPaintProperty("clusters","circle-opacity",["case",hasMember,0.95,D]);
  map.setPaintProperty("points","circle-opacity",["case",memberPt,0.95,D]);
  map.setPaintProperty("points-idle","circle-opacity",["case",memberPt,0.95,D]);
  map.setPaintProperty("cluster-count","text-opacity",["case",hasMember,1,0.28]);
  map.setPaintProperty("cluster-active","circle-stroke-color",ACCENT());
  map.setPaintProperty("points-active","circle-stroke-color",ACCENT());
  map.setFilter("cluster-active",hasMember);
  map.setFilter("points-active",memberPt);
  setVis("cluster-active","visible");setVis("points-active","visible");
}

/* ============ Cluster-/Punkt-Klick: einfrieren statt nur zoomen ============ */
/* Klick auf Cluster -> Bereich einfrieren (Leaves als standort_id-Set). Ein kleiner
   Debounce lässt einen Doppelklick zoomen, statt zugleich einzufrieren. */
let freezeTimer=null;
map.on("click","clusters",e=>{
  const f=map.queryRenderedFeatures(e.point,{layers:["clusters"]})[0];if(!f)return;
  clearTimeout(freezeTimer);
  const cid=f.properties.cluster_id, center=f.geometry.coordinates.slice(), pc=f.properties.point_count;
  freezeTimer=setTimeout(()=>freezeCluster(cid,center,pc),240);
});
map.on("dblclick",()=>{clearTimeout(freezeTimer);});

function freezeCluster(cid,center,pc){
  const src=map.getSource(SRC); if(!src)return;   // Quelle während Theme-Wechsel (setStyle) kurz weg
  // Mitglieder UND Auflöse-Zoom auf der AKTUELLEN Clusterung erfassen (vor dem Rebuild, der die cluster_id wechselt).
  Promise.all([src.getClusterLeaves(cid,pc,0),src.getClusterExpansionZoom(cid).catch(()=>null)]).then(([leaves,ez])=>{
    const ids=new Set(leaves.map(l=>l.properties.standort_id).filter(Boolean));
    state.frozen={clusterId:cid,center,ids,zoom:map.getZoom(),expandZoom:ez};   // Zoom merken; expandZoom für "Ausschnitt zoomen"
    state.selectedId=null; state.bereichTab="feed";
    commitView({mapSync:"rebuild",closeFilters:true,sheet:"half"});   // P7: _frozenMember taggen -> frozenCount je Cluster
  }).catch(()=>{});
}
function clearBereich(){
  state.frozen=null; state.selectedId=null;
  commitView({mapSync:"rebuild",sheet:"half"});   // rebuildSource: _frozenMember zurücksetzen
  goHome(600);   // zurueck zur Ausgangsuebersicht
}
function zoomToBereich(){
  if(!state.frozen)return;
  // clusterId ist nach dem Freeze-Rebuild nicht mehr gültig -> beim Einfrieren gemerkten Auflöse-Zoom nutzen.
  const z=state.frozen.expandZoom||Math.min((state.frozen.zoom||HOME_ZOOM)+2.5,16);
  map.easeTo({center:state.frozen.center,zoom:z,duration:500});
}
/* Suche definiert die Grundgesamtheit neu -> hebt einen aktiven Bereich auf. */
function dropBereich(){ if(state.frozen)state.frozen=null; }

/* Klick auf Einzelklinik -> Standort-Panel (kein Popup). */
["points","points-idle"].forEach(l=>map.on("click",l,e=>{const id=e.features[0].properties.standort_id;if(id)selectLocation(id);}));
["clusters","points","points-idle"].forEach(l=>{
  map.on("mouseenter",l,()=>{map.getCanvas().style.cursor="pointer";});
  map.on("mouseleave",l,()=>{map.getCanvas().style.cursor="";});
});

/* ============ flyTo + Bottom-Sheet ============ */
const mobileMQ=window.matchMedia("(max-width:768px)");
let sheetState="half";
function sheetDetents(){
  // P6: Voll-Sheet so deckeln, dass seine Oberkante UNTER den Filterpills bleibt (Panel ist bottom-verankert).
  const fbCap=innerHeight-Math.round(filterbarBottom())-12;
  return {peek:96,half:Math.round(innerHeight*0.52),full:Math.max(Math.round(innerHeight*0.5),Math.min(Math.round(innerHeight*0.9),fbCap))};
}
/* Unterkante der (ggf. mehrzeilig aufgeklappten) Filterleiste live messen,
   damit der Pin sicher unter den Filterpills bleibt. */
function filterbarBottom(){const fb=document.getElementById("filterbar");if(!fb)return 110;return Math.max(0,fb.getBoundingClientRect().bottom);}
/* Ziel-Panelbreite (deckungsgleich mit CSS: 404px einspaltig, min(58vw,760px) zweispaltig).
   Aus dem Klassenzustand gerechnet, nicht aus dem laufenden Rect — verlässlich auch während
   der Breiten-Transition. Mobile (Bottom-Sheet) hat keinen Spaltenmodus. */
const PANEL_W_NARROW=404;
function panelTargetWidth(){
  const p=document.getElementById("panel");
  return (p&&p.classList.contains("two-col")&&!mobileMQ.matches)
    ? Math.min(innerWidth*0.58,760) : PANEL_W_NARROW;
}
function homePadding(){
  if(mobileMQ.matches){
    const h=sheetDetents()[sheetState];
    return {
      top:Math.round(filterbarBottom()+18),
      right:22,
      bottom:Math.round(h+20),
      left:22,
    };
  }
  return {
    top:124,
    right:Math.round(panelTargetWidth()+44),
    bottom:28,
    left:24,
  };
}
function goHome(duration=0){
  map.easeTo({center:HOME_CENTER,zoom:HOME_ZOOM,padding:homePadding(),duration});
}
function flyTo(f){
  // Rechtes Padding folgt der aktuellen Panelbreite, damit der Pin auch bei breitem
  // (zweispaltigem) Panel im sichtbaren Kartenbereich landet, nicht dahinter.
  let padding={right:Math.round(panelTargetWidth()+26),top:40,bottom:40,left:0};
  if(mobileMQ.matches){
    // Pin ins obere Drittel: kraeftiges bottom-padding schiebt das Zentrum hoch.
    const h=sheetDetents()[sheetState];
    const safeTop=Math.round(filterbarBottom()+16);
    const free=Math.max(0,innerHeight-safeTop-h);
    padding={top:safeTop,bottom:Math.round(h+free*0.62),left:24,right:24};
  }
  const c=f.geometry.coordinates;
  map.flyTo({center:[c[0],c[1]],zoom:Math.max(map.getZoom(),11),speed:0.9,curve:1.5,padding});
}
