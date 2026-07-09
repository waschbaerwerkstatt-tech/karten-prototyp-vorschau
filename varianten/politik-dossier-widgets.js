/* ---------- Fiktive, konsistente Gruppen-Kennzahlen ----------
   Deterministisch aus Theme+Gruppe abgeleitet, damit es über Reloads stabil
   bleibt. Dok·30T summieren je Theme exakt auf t.momentum.count (Largest-Remainder).
   Mengen- und Stimmungs-Trend sind hash-basierte Prototyp-Werte. */
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed,min,max){return min+(hash(seed)%(max-min+1));}
function docDist(t){
  // verteilt die sichtbaren Belege proportional zur Akteurszahl auf die beteiligten Gruppen
  const parts=GROUPS.map(g=>membersOf(t,g.key)).filter(m=>m.length).map(m=>m.length);
  if(!parts.length) return {};
  const totalMembers=parts.reduce((a,b)=>a+b,0), total=winAkteure(t).length;
  const exact=parts.map(n=>total*n/totalMembers);
  const floor=exact.map(Math.floor);
  let rem=total-floor.reduce((a,b)=>a+b,0);
  const order=exact.map((e,i)=>({i,frac:e-Math.floor(e)})).sort((a,b)=>b.frac-a.frac);
  for(let k=0;k<rem;k++) floor[order[k].i]++;
  // wieder auf Gruppen-Keys mappen (nur beteiligte)
  const out={}; let j=0;
  GROUPS.forEach(g=>{ if(membersOf(t,g.key).length){ out[g.key]=floor[j++]; } });
  return out;
}
function groupMetrics(t,gkey,docs){
  const seed=t.id+":"+gkey;
  const total=Math.max(1,winAkteure(t).length);
  const dok=docs[gkey]||0;
  const dMenge=Math.min(dok,rng(seed+"#m",0,4)-1); // -1..+3, Anstieg kann den Bestand nicht übersteigen
  const stim=rng(seed+"#s",0,3)-1;              // -1..+2 -> auf -1/0/+1 klemmen
  const stimC=stim<0?-1:stim>0?1:0;
  const anteil=Math.round(dok/total*100);
  return {dok,dMenge,stim:stimC,anteil};
}
function volTrendHtml(d){
  if(d>0) return `<span class="tr up" title="mehr als Vorperiode">▲${d}</span>`;
  if(d<0) return `<span class="tr down" title="weniger als Vorperiode">▼${-d}</span>`;
  return `<span class="tr flat" title="unverändert">±0</span>`;
}
function stimTrendHtml(s){
  if(s>0) return `<span class="stim con" title="Haltung verschärft sich"><span class="material-symbols-outlined">south_east</span>schärfer</span>`;
  if(s<0) return `<span class="stim pro" title="Haltung wird milder"><span class="material-symbols-outlined">north_east</span>milder</span>`;
  return `<span class="stim flat" title="Haltung stabil"><span class="material-symbols-outlined">trending_flat</span>stabil</span>`;
}
function vermutungHtml(v,cls="st-vermutung"){
  if(!v) return "";
  return `<span class="${cls}" title="Vermutung: eigener Layer, nicht als belegte Haltung werten"><span class="material-symbols-outlined">info</span><span><b>Vermutung</b> · <em>${v.achse}: ${v.wert}</em><br>${v.trace}</span></span>`;
}

/* ---------- Mitglieder-Detail (Akkordeon) ---------- */
function stanceRow(a){
  const h=HALT[a.haltung];
  return `
    <div class="stance ${h.cls}">
      <span class="marker"></span>
      <div>
        <div class="st-top"><span class="st-name st-link" data-actor="${a.name}" role="button" tabindex="0" title="Akteursprofil von ${a.name} öffnen">${a.name}</span><span class="st-art">${a.art}</span><span class="st-haltung">${h.label}</span></div>
        <p class="st-oton">${a.oton}</p>
        ${vermutungHtml(a.vermutet)}
        <span class="st-quelle"><span class="material-symbols-outlined">description</span>${a.quelle} · ${fmtDate(a.datum)}</span>
      </div>
    </div>`;
}

/* ---------- Gruppen-Kacheln ---------- */
function renderTiles(t){
  // Alle 8 Gruppen in fester Rollen-Reihenfolge; unbeteiligte als ausgegraute Kachel.
  const docs=docDist(t);
  let html=`<div class="tilegrid">`;
  GROUPS.forEach(g=>{
    const m=membersOf(t,g.key);
    if(!m.length){
      html+=`<div class="tile tile-off" aria-disabled="true">
        <div class="t-top">
          <span class="t-pos off"><span class="pos-dot"></span></span>
          <span class="t-label">${g.label}</span>
        </div>
        <div class="t-offnote">nicht beteiligt</div>
      </div>`;
      return;
    }
    const ns=netStats(m);
    const km=groupMetrics(t,g.key,docs);
    html+=`<div class="tile" data-gruppe="${g.key}" role="button" tabindex="0" aria-expanded="false">
        <div class="t-top">
          <span class="t-pos ${ns.cls}" title="Netto-Haltung: ${NETLABEL[ns.cls]}"><span class="pos-dot"></span></span>
          <span class="t-label">${g.label}</span>
          <span class="t-n" title="${m.length} ${m.length===1?"Akteur":"Akteure"}">${m.length}</span>
          <span class="t-coh ${ns.einig?"einig":"geteilt"}">${ns.einig?"einig":"geteilt"}</span>
        </div>
        <div class="t-netline ${ns.cls}">${NETLABEL[ns.cls]}</div>
        <div class="t-metrics">
          <div class="met"><span class="mk">Dok·${winLabel()}</span><span class="mv">${km.dok} ${volTrendHtml(km.dMenge)}</span></div>
          <div class="met"><span class="mk">Anteil</span><span class="mv">${km.anteil}%</span></div>
          <div class="met"><span class="mk">Stimmung</span><span class="mv">${stimTrendHtml(km.stim)}</span></div>
        </div>
      </div>`;
  });
  html+=`</div><div class="tilepanel" id="tilepanel"><div class="tp-inner"></div></div>`;
  return html;
}
/* Detailpanel-Inhalt einer Gruppe (O-Töne) */
function buildPanel(t,gkey){
  const g=GROUPS.find(x=>x.key===gkey), m=membersOf(t,gkey), ns=netStats(m);
  const sortedM=[...m].sort((a,b)=>SVAL[a.haltung]-SVAL[b.haltung]);
  return `<div class="tp-card">
      <div class="tp-head">
        <span class="t-pos ${ns.cls}"><span class="pos-dot"></span></span>
        <span class="tp-title">${g.label}</span>
        <span class="t-n">${m.length} ${m.length===1?"Akteur":"Akteure"}</span>
        <span class="tp-net ${ns.cls}">${NETLABEL[ns.cls]}</span>
        <span class="t-coh ${ns.einig?"einig":"geteilt"}">${ns.einig?"einig":"geteilt"}</span>
      </div>
      <div class="tp-stances">${sortedM.map(stanceRow).join("")}</div>
    </div>`;
}

/* ---------- Veröffentlichungs-Zeitstrahl ---------- */
const TLMON=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
// dayNum() lebt jetzt in politik.html (bei den Datums-Konstanten), damit es vor der
// Ladezeit-Nutzung (const _now) definiert ist; hier nur genutzt.
function shortDate(iso){const[,m,d]=iso.split("-").map(Number);return `${d}. ${TLMON[m-1]}`;}
function timelineHtml(items){
  // Gleichmäßig gepackte Timeline (neueste oben), Seiten alternierend. Karten werden
  // über Mindestabstände gepackt (NICHT zeitproportional) -> beide Achsen gleich dicht.
  // Größere zeitliche Lücken zwischen aufeinanderfolgenden Karten werden durch ein
  // gestricheltes Schienensegment angedeutet (Höhe ~ Lückendauer, gedeckelt).
  // items: {datum,haltung,kern,beleg,label} — label = Akteur (Thema-Achse) bzw. Vorgang (Akteurs-Achse).
  if(!items.length) return `<div class="ql-empty" style="padding:18px 2px">Keine Veröffentlichungen im gewählten Zeitraum.</div>`;
  items=[...items].sort((a,b)=>b.datum.localeCompare(a.datum));
  const nodes=items.map((a,i)=>{
    const presse=a.kind==="presse";
    const cls=presse?"presse":HALT[a.haltung].cls, side=i%2===0?"side-right":"side-left";
    const gap=i>=1?dayNum(items[i-1].datum)-dayNum(a.datum):0;    // Lücke zum (neueren) Vorgänger, in Tagen
    const card=presse
      ? `<span class="vtl-card presse">
          <span class="vtl-top"><span class="vtl-date">${shortDate(a.datum)}</span><span class="vtl-name">${a.label}</span><span class="vtl-tag"><span class="material-symbols-outlined">newspaper</span>Fachpresse</span></span>
          <span class="vtl-kern vtl-head">${a.titel}</span>
          <span class="vtl-teaser">${a.teaser}</span>
          ${a.vorgaenge&&a.vorgaenge.length?`<span class="vtl-vtags">${a.vorgaenge.map(v=>`<span class="vtl-vtag">${v}</span>`).join("")}</span>`:""}
          ${a.share?`<span class="vtl-share" title="Anteil dieser Streitfrage an der geschätzten Gesamt-Reformberichterstattung von ${a.label} (fiktiv)"><span class="material-symbols-outlined">donut_small</span>${a.share}% der ${a.label}-Berichterstattung</span>`:""}
          <span class="vtl-link"><span class="material-symbols-outlined">open_in_new</span>Zum Beitrag</span>
        </span>`
      : `<span class="vtl-card">
          <span class="vtl-top"><span class="vtl-date">${shortDate(a.datum)}</span><span class="vtl-name">${a.label}</span><span class="vtl-halt">${HALT[a.haltung].label}</span></span>
          <span class="vtl-kern">${a.kern}</span>
          ${vermutungHtml(a.vermutet,"vtl-vermutung")}
          <span class="vtl-src">${a.beleg}</span>
        </span>`;
    return `<div class="vtl-node ${cls} ${side}" data-gap="${gap}"${a.eid?` data-eintrag-id="${a.eid}"`:""} title="${presse?a.label:a.beleg} · ${fmtDate(a.datum)}">
        <span class="vtl-dot"></span>
        ${card}
      </div>`;
  }).join("");
  // Positionen, Schiene und Lücken-Zacken werden NACH dem Einfügen aus den echten
  // Kartenhöhen berechnet -> layoutTimeline(). Hier nur Knoten + leere Schiene.
  return `
    <div class="vtl">
      <div class="vtl-spine"></div>
      ${nodes}
    </div>
    <div class="tllegend">
      <span class="lg-item"><span class="lg-dot pro"></span>Dafür</span>
      <span class="lg-item"><span class="lg-dot neu"></span>Mit Auflagen</span>
      <span class="lg-item"><span class="lg-dot diff"></span>Differenziert</span>
      <span class="lg-item"><span class="lg-dot con"></span>Dagegen</span>
      <span class="lg-item"><span class="lg-ring"></span>Fachpresse</span>
      <span class="lg-item"><span class="lg-dash"></span>Vermutung (nicht belegt)</span>
      <span class="lg-span">${shortDate(items[items.length-1].datum)} – ${shortDate(items[0].datum)}</span>
    </div>`;
}
function zigzagSvg(){
  // kleine, dezente Zacke (3 Knicke, Amplitude 3px), gleiche Strichstärke/Farbe wie die Schiene.
  return '<svg width="8" height="16" viewBox="0 0 8 16" aria-hidden="true"><polyline points="4 0 7 4 1 8 7 12 4 16" fill="none" stroke="var(--line-strong)" stroke-width="2" stroke-linejoin="round"/></svg>';
}
/* ---------- Timeline-Packung (nach dem Einfügen) ----------
   Packt die absolut positionierten Karten dicht (neueste oben), Seiten alternierend,
   anhand der ECHTEN Kartenhöhen statt einer geratenen Konstante (Akteurs-Karten sind
   höher als Thema-Karten). Gleiche Seite (i,i-2): Vorgänger-Höhe + Puffer; Nachbar
   (i-1, Gegenseite): nur knapp. Größere Lücken (data-gap > Schwelle) öffnen einen schmalen
   freien Querstreifen (STRIP) und tragen dort mittig eine kleine Zacke + "ca. X Wochen"
   auf der (immer freien) Seite der oberen Karte. Idempotent -> bei Re-Render/Resize erneut. */
// Karten ändern ihre Höhe noch NACH dem ersten Paint (Web-/Icon-Font lädt nach,
// Breakpoint ändert Breite). Ein ResizeObserver packt die Timeline jedes Mal neu,
// sobald sich eine Kartenhöhe einpegelt — robuster als das einmalige fonts.ready.
// (Unsere Schreibzugriffe ändern nur top/Höhe der Schiene, nicht die Karten-Höhe
//  -> kein Re-Entrancy-Loop.)
let _tlRoot=null;
let _tlFrame=0;
const _tlObs = window.ResizeObserver
  ? new ResizeObserver(()=>scheduleTimelineLayout(_tlRoot))
  : null;
function scheduleTimelineLayout(root){
  if(!root) return;
  if(_tlFrame) cancelAnimationFrame(_tlFrame);
  _tlFrame=requestAnimationFrame(()=>{_tlFrame=0;layoutTimeline(root);});
}
function mountTimeline(root){
  _tlRoot=root;
  if(_tlObs) _tlObs.disconnect();
  scheduleTimelineLayout(root);
}
function layoutTimeline(root){
  const vtl=root&&root.querySelector(".vtl"); if(!vtl) return;
  const nodes=[...vtl.querySelectorAll(".vtl-node")]; if(!nodes.length) return;
  if(_tlObs) _tlObs.disconnect();
  if(_tlObs) nodes.forEach(n=>_tlObs.observe(n.querySelector(".vtl-card")));  // observe ist idempotent
  const ADJ=26, TOP=6, GAPDAYS=21, SAME_GAP=12, DOT=18, STRIP=24;  // STRIP: freier Querstreifen an einer Lücke
  const singleColumn=window.matchMedia&&window.matchMedia("(max-width:880px)").matches;
  const H=nodes.map(n=>n.querySelector(".vtl-card").getBoundingClientRect().height);
  const tops=[], breaks=[];
  nodes.forEach((n,i)=>{
    let y=TOP, brk=false;
    if(i>=1){
      brk = (+n.dataset.gap) > GAPDAYS;
      let nf = tops[i-1]+ADJ;                                   // dichte Packung (Gegenseite)
      if(brk) nf = Math.max(nf, tops[i-1]+H[i-1]+STRIP);        // freien Streifen unter der oberen Karte öffnen
      if(singleColumn) nf = Math.max(nf, tops[i-1]+H[i-1]+SAME_GAP); // mobil stehen alle Karten in derselben Spalte
      y=Math.max(y, nf);
    }
    if(i>=2) y=Math.max(y, tops[i-2]+H[i-2]+SAME_GAP);          // gleiche Seite: echte Vorgänger-Höhe + Puffer
    tops.push(y);
    n.style.top=y+"px";
    if(brk){
      const bandTop=tops[i-1]+H[i-1];                           // Unterkante der oberen Karte
      const side=nodes[i-1].classList.contains("side-left")?"L":"R";   // Label auf die (immer freie) Seite der oberen Karte
      breaks.push({y:(bandTop+y)/2, side, weeks:Math.round((+n.dataset.gap)/7)});
    }
  });
  const lastY=tops[tops.length-1];
  // Höhe = tiefste Kartenunterkante über ALLE Knoten, nicht nur die letzte:
  // bei alternierenden Seiten kann eine höhere vorletzte Karte tiefer hängen.
  vtl.style.height=(Math.max(...tops.map((t,i)=>t+H[i]))+6)+"px";
  const spine=vtl.querySelector(".vtl-spine");
  if(spine){ spine.style.top=(tops[0]+DOT)+"px"; spine.style.height=Math.max(0,lastY-tops[0])+"px"; }
  vtl.querySelectorAll(".vtl-break").forEach(b=>b.remove());
  const first=vtl.querySelector(".vtl-node");
  breaks.forEach(b=>{
    const s=document.createElement("span");
    s.className="vtl-break brk-"+(b.side==="L"?"left":"right");
    s.style.top=b.y+"px";
    s.innerHTML=zigzagSvg()+`<span class="vtl-gap">ca. ${b.weeks} Wochen</span>`;
    vtl.insertBefore(s,first);
  });
}

/* ---------- Geteilte Kachel-Aufklapp-Logik ----------
   Klick auf den Kachelkörper hebt sie hervor und öffnet das Panel unter dem Raster.
   Klicks auf [data-jump]/[data-actor] werden hier ignoriert (Cross-Nav am Dossier). */
function wireTileExpand(buildPanelFn){
  const grid=document.getElementById("gruppen"); if(!grid)return;
  const panel=grid.querySelector("#tilepanel"), inner=panel.querySelector(".tp-inner");
  let activeKey=null;
  grid.addEventListener("keydown",e=>{
    if(e.target.closest("[data-jump]")||e.target.closest("[data-actor]"))return;
    const tile=e.target.closest(".tile[role='button']");
    if(!tile||!(e.key==="Enter"||e.key===" "))return;
    e.preventDefault();
    tile.click();
  });
  grid.addEventListener("click",e=>{
    if(e.target.closest("[data-jump]")||e.target.closest("[data-actor]"))return;
    const tile=e.target.closest(".tile");
    if(!tile||tile.classList.contains("tile-off"))return;
    const key=tile.dataset.gruppe||tile.dataset.theme;
    if(key===activeKey){ tile.classList.remove("active"); tile.setAttribute("aria-expanded","false"); panel.classList.remove("open"); activeKey=null; return; }
    grid.querySelectorAll(".tile").forEach(x=>{x.classList.remove("active");x.setAttribute("aria-expanded","false");});
    tile.classList.add("active");
    tile.setAttribute("aria-expanded","true");
    inner.innerHTML=buildPanelFn(key);
    hydrateIcons(inner);
    panel.classList.add("open");
    activeKey=key;
  });
}

/* ---------- Themen-Dossier ---------- */
