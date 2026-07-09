function setFocus(id,opts={}){
  if(!CLINICS[id])return;
  STATE.focus=id;
  if(STATE.lens===4&&opts.mapClick)STATE.flowHaus=id;
  if(STATE.lens===4)STATE.reformLg=window.ReformLens.selectedLg(id,STATE.reformLg);
  closeSearchResults();
  renderPanel(); paintCluster(); frameCluster();   // Refit bei jedem Wechsel (#1)
}
function setLens(n){
  STATE.lens=n;
  if(n!==4){STATE.flowHaus=null;STATE.szenario=null;}
  else STATE.reformLg=window.ReformLens.selectedLg(STATE.focus,STATE.reformLg);
  document.querySelectorAll("#lensSeg button").forEach(b=>b.classList.toggle("on",+b.dataset.lens===n));
  const l2=n===2;
  if(l2&&STATE.dienstart==="aerztlich"&&!STATE.selDept) STATE.selDept=extremeDept(STATE.focus);  // Karte + Steckbrief direkt gefüllt
  renderPanel(); paintCluster();
}
/* Szenario-Zustand liegt flüchtig in STATE.szenario = {ebene, korb}. null = Basis.
   Reform-Steuerung normalisiert lazy, damit die STATE-Initialisierung schlank (szenario:null) bleibt. */
function reformEnsureSzenario(){
  if(!STATE.szenario||typeof STATE.szenario!=="object"||!Array.isArray(STATE.szenario.korb))
    STATE.szenario={ebene:(STATE.szenario&&STATE.szenario.ebene)||0,korb:[]};
  return STATE.szenario;
}
function reformDefaultLg(hid){
  const gs=window.ReformLens.groups(hid);
  const ent=gs.find(g=>g.status==="amtlich_entzogen");
  return (ent||gs[0]||{}).name||null;
}
/* ---------- Steuerung ---------- */
const searchInput=document.getElementById("clinicSearch");
const searchResults=document.getElementById("searchResults");
const normSearch=s=>(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
function clinicSearchHaystack(c){
  return normSearch([c.full,c.name,c.city,c.region,c.traeger,c.arch,NOTFALL_WORT[c.notfall]].join(" "));
}
function searchClinics(q){
  const nq=normSearch(q).trim();
  if(nq.length<2)return [];
  return ARR.map(c=>{
    const hay=clinicSearchHaystack(c);
    const starts=normSearch(c.full).startsWith(nq)||normSearch(c.city).startsWith(nq);
    return {c,score:(starts?2:0)+(hay.includes(nq)?1:0)};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||b.c.fallVoll-a.c.fallVoll).slice(0,6).map(x=>x.c);
}
function closeSearchResults(){
  searchResults.classList.remove("open");
  document.body.classList.remove("searching");
  searchResults.innerHTML="";
  if(searchInput) searchInput.value="";
}
function renderSearchResults(){
  const hits=searchClinics(searchInput.value);
  const open=searchInput.value.trim().length>=2;
  document.body.classList.toggle("searching",open);
  if(!hits.length){
    searchResults.classList.toggle("open",open);
    searchResults.innerHTML=open
      ?`<button class="search-result active" type="button" disabled><span class="material-symbols-outlined">search_off</span><span><b>Keine Treffer</b><small>Bitte Klinik, Träger oder Ort anders eingeben</small></span></button>`:"";
    return;
  }
  searchResults.innerHTML=hits.map((c,i)=>
    `<button class="search-result${i===0?' active':''}" type="button" data-clinic="${c.id}" role="option">
       <span class="material-symbols-outlined">apartment</span>
       <span><b>${c.full}</b><small>${c.city} · ${c.traeger}</small></span>
       <span class="sr-badge">${fmt(c.fallVoll)}</span>
     </button>`).join("");
  searchResults.classList.add("open");
}
function buildClinicSearch(){
  searchInput.addEventListener("input",renderSearchResults);
  searchInput.addEventListener("focus",renderSearchResults);
  searchInput.addEventListener("keydown",e=>{
    if(e.key==="Escape"){closeSearchResults();searchInput.blur();return;}
    if(e.key==="Enter"){
      const first=searchResults.querySelector("[data-clinic]");
      if(first){e.preventDefault();setFocus(first.dataset.clinic);searchInput.blur();}
    }
  });
  searchResults.addEventListener("click",e=>{
    const hit=e.target.closest("[data-clinic]");
    if(hit)setFocus(hit.dataset.clinic);
  });
}
/* eingeloggt.js meldet ein abgeraeumtes Ereignis -> Aggregate (Karte/Bubble/Zeilen) live nachziehen. */
document.addEventListener("eg:retire",e=>{
  if(e.detail&&e.detail.view==="analysen"){ renderPanel(); }
});
document.getElementById("lensSeg").addEventListener("click",e=>{
  const btn=e.target.closest("button"); if(!btn||btn.disabled)return; setLens(+btn.dataset.lens);
});
// Panel-interne Klicks (Leistungssicht-Toggle + Rangzeilen) einmalig delegieren
// Dienstart-Umschalter liegt jetzt in der Zusammenfassung (#befund)
document.getElementById("befund").addEventListener("click",e=>{
  const di=e.target.closest("[data-dienst]");
  if(di&&!di.disabled)setDienst(di.dataset.dienst);
});
document.getElementById("lensBody").addEventListener("click",e=>{
  const pdf=e.target.closest("[data-report-pdf]");
  if(pdf){
    if(pdf.dataset.reportPdf==="unlocked"){
      const toast=document.getElementById("reportToast");
      if(toast){toast.classList.add("on");clearTimeout(window.__analysenReportToast);window.__analysenReportToast=setTimeout(()=>toast.classList.remove("on"),2400);}
    }
    return;
  }
  const ab=e.target.closest("[data-ausblick]");
  if(ab){STATE.ausblick=ab.dataset.ausblick==="on";renderPanel();return;}
  const gl=e.target.closest("[data-goto-lens]");   // Verweis Pflege → Reform-Linse
  if(gl){setLens(+gl.dataset.gotoLens);return;}
  // Korb: Gruppe/ganzes Haus ins Szenario entnehmen (vor der Zeilen-Auswahl prüfen,
  // damit der Button-Klick nicht auch die LG umschaltet).
  const ka=e.target.closest("[data-reform-korb-add]");
  if(ka){reformEnsureSzenario();
    const hid=ka.dataset.hid||STATE.focus, name=ka.dataset.lg||null;
    if(!STATE.szenario.korb.some(k=>k.hid===hid&&(k.lg||null)===name))
      STATE.szenario.korb.push({hid,lg:name});
    renderPanel();paintCluster();return;}
  const kr=e.target.closest("[data-reform-korb-remove]");
  if(kr){reformEnsureSzenario();STATE.szenario.korb.splice(+kr.dataset.reformKorbRemove,1);
    renderPanel();paintCluster();return;}
  const kz=e.target.closest("[data-reform-korb-reset]");
  if(kz){reformEnsureSzenario();STATE.szenario.korb=[];renderPanel();paintCluster();return;}
  const eb=e.target.closest("[data-reform-ebene]");
  if(eb){reformEnsureSzenario();STATE.szenario.ebene=+eb.dataset.reformEbene;renderPanel();paintCluster();return;}
  const mm=e.target.closest("[data-reform-mapmode]");
  if(mm){if(mm.dataset.reformMapmode==="summe")STATE.reformLg=null;
    else if(!STATE.reformLg)STATE.reformLg=reformDefaultLg(STATE.focus);
    renderPanel();paintCluster();return;}
  const sr=e.target.closest("[data-reform-reset]");
  if(sr){STATE.szenario=null;renderPanel();paintCluster();return;}
  const rlg=e.target.closest("[data-reform-lg]");
  if(rlg){const name=rlg.dataset.reformLg;
    // erneuter Klick auf die aktive Zeile hebt die Auswahl auf -> zurück auf Summe
    STATE.reformLg=(STATE.reformLg===name)?null:window.ReformLens.selectedLg(STATE.focus,name);
    STATE.flowHaus=null;renderPanel();paintCluster();return;}
  const fam=e.target.closest("[data-familie]");    // Linse 3: Leistungsfamilie (Bubble oder Zeile)
  if(fam){setFamilie(fam.dataset.familie);return;}
  const sw=e.target.closest("[data-sicht]");
  if(sw){STATE.leistungssicht=sw.dataset.sicht;renderPanel();return;}
  const tile=e.target.closest("[data-metric]");
  if(tile){const m=tile.dataset.metric;
    STATE.colorMetric=STATE.colorMetric===m?null:m;   // erneuter Klick = wieder neutral
    renderPanel(); paintCluster(); return;}
  const dep=e.target.closest("[data-dept]");          // Linse 2: Fachabteilung wählen
  if(dep){selectDept(dep.dataset.dept);}
});
// Balken-Tooltip (Linse 2) auf demselben delegierten Container
document.getElementById("lensBody").addEventListener("mousemove",e=>{
  const dep=e.target.closest("[data-dept]"); if(dep)devBarTip(e,dep.dataset.dept); else hideTip();
});
document.getElementById("lensBody").addEventListener("mouseleave",hideTip);
// Pendelraum-Radius (Tweak-Regler): Tabelle + Label live nachziehen, ohne den Regler neu zu bauen;
// zusaetzlich zieht der „Arbeitsmarkt"-Punkt im Befund-Kopf mit (renderBefund baut nur den Kopf neu).
document.getElementById("lensBody").addEventListener("input",e=>{
  // Klinikmonitor-Zeitfenster (Linse 3): Live-Label beim Ziehen, ohne Panel-Neurender.
  const ms=e.target.closest("[data-mon-slider]");
  if(ms){const lbl=ms.parentElement.querySelector("[data-mon-lbl]");
    if(lbl)lbl.textContent="Zeitfenster: "+monWinLabel(MON_WIN_STEPS[+ms.value]);return;}
  const t=e.target.closest("[data-tweak='pendel']"); if(!t)return;
  STATE.pendelRadius=+t.value;
  const lbl=document.getElementById("pendelVal"); if(lbl)lbl.textContent=STATE.pendelRadius+" km";
  const strip=document.getElementById("pendelStrip"); if(strip)strip.innerHTML=pendelTableHtml(CLINICS[STATE.focus]);
  renderBefund(CLINICS[STATE.focus]);
});
// Klinikmonitor-Zeitfenster: erst beim Loslassen die Meldungsliste neu rendern.
document.getElementById("lensBody").addEventListener("change",e=>{
  const ms=e.target.closest("[data-mon-slider]"); if(!ms)return;
  STATE.monWin=MON_WIN_STEPS[+ms.value];
  renderPanel();
});

/* ---------- Theme ---------- */
function setTheme(t){
  document.documentElement.className="theme-"+t;
  document.getElementById("themeIcon").textContent=t==="hell"?"light_mode":"dark_mode";
  document.getElementById("themeLabel").textContent=t==="hell"?"Hell":"Dunkel";
  renderPanel();
  if(map){ map.setStyle(t==="hell"?MAP_STYLE_HELL:MAP_STYLE_DUNKEL);
    map.once("styledata",()=>{addClusterLayers();paintCluster();}); }
}
document.getElementById("themeToggle").addEventListener("click",()=>
  setTheme(document.documentElement.classList.contains("theme-hell")?"dunkel":"hell"));

/* ---------- Legende ein-/ausblenden ---------- */
const LEGEND_KEY="analysen-legende-offen";
function setLegendVisible(open){
  document.body.classList.toggle("legend-collapsed",!open);
  const btn=document.getElementById("legendToggle");
  btn.setAttribute("aria-pressed",open?"true":"false");
  btn.setAttribute("aria-label",open?"Legende ausblenden":"Legende einblenden");
  btn.setAttribute("title",open?"Legende ausblenden":"Legende einblenden");
  try{localStorage.setItem(LEGEND_KEY,open?"1":"0");}catch(_){}
}
document.getElementById("legendToggle").addEventListener("click",()=>{
  setLegendVisible(document.body.classList.contains("legend-collapsed"));
});
try{setLegendVisible(localStorage.getItem(LEGEND_KEY)==="1");}catch(_){setLegendVisible(false);}

/* ---------- Bottom-Sheet-Steuerung (Mobile) ---------- */
let sheetState="half";
function sheetDetents(){
  const fb=document.querySelector(".filterbar")?.getBoundingClientRect();
  const cap=innerHeight-Math.round((fb?.bottom||92)+10);
  return {
    peek:112,
    half:Math.round(innerHeight*0.56),
    full:Math.max(Math.round(innerHeight*0.58),Math.min(Math.round(innerHeight*0.88),cap))
  };
}
function applySheet({syncMap=false}={}){
  const panel=document.getElementById("analysisPanel");
  if(!matchMedia("(max-width:760px)").matches){
    panel.style.height="";
    return;
  }
  panel.style.height=sheetDetents()[sheetState]+"px";
  if(syncMap)scheduleMapFrame();
}
(function initSheetDrag(){
  const panel=document.getElementById("analysisPanel");
  const handle=document.getElementById("sheetHandle");
  let dragging=false,startY=0,startH=0;
  function nearest(h){
    const d=sheetDetents();let best="half",bd=Infinity;
    for(const k in d){const dist=Math.abs(d[k]-h);if(dist<bd){bd=dist;best=k;}}
    return best;
  }
  function down(e){
    if(!matchMedia("(max-width:760px)").matches)return;
    dragging=true;startY=e.clientY;startH=panel.getBoundingClientRect().height;
    panel.classList.add("dragging");
    try{handle.setPointerCapture(e.pointerId);}catch(_){}
    e.preventDefault();
  }
  function move(e){
    if(!dragging)return;
    const d=sheetDetents();
    const h=Math.max(d.peek,Math.min(d.full,startH+(startY-e.clientY)));
    panel.style.height=h+"px";
    e.preventDefault();
  }
  function end(){
    if(!dragging)return;
    dragging=false;
    panel.classList.remove("dragging");
    sheetState=nearest(panel.getBoundingClientRect().height);
    applySheet({syncMap:true});
  }
  handle.addEventListener("pointerdown",down);
  handle.addEventListener("pointermove",move);
  handle.addEventListener("pointerup",end);
  handle.addEventListener("pointercancel",end);
  addEventListener("resize",()=>applySheet({syncMap:true}));
  addEventListener("orientationchange",()=>{sheetState="half";applySheet({syncMap:true});});
  applySheet();
})();
