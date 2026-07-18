/* ============ Init Controls ============ */
let placeThumbRef=null;
let syncPeriodRef=null;   // füllt/markiert den Kalenderfilter (Ebene + Periode) aus state.period
// Trigger je data-open-Zustand: Zeit/Themen (nur ≤1540px) + Facetten (alle Breiten).
/* Personalien und Vorgaenge fehlen hier bewusst: seit 2026-07-18 sind das eine
   Durchschalt-Pille (#persPill) bzw. gezaehlte Chips (#processChips) — beide ohne
   Dropdown, also ohne Trigger zum Auf-/Zuklappen. */
const FILTER_TRIGGERS={time:"trigTime",topics:"trigTopics"};
function closeFilterPop(){
  const fb=document.getElementById("filterbar"); if(!fb)return;
  fb.setAttribute("data-open","none");
  Object.values(FILTER_TRIGGERS).forEach(id=>{const el=document.getElementById(id);
    if(el){el.classList.remove("active");el.setAttribute("aria-expanded","false");}});
}
function syncFilterTriggers(){
  const tl=document.getElementById("trigTimeLabel");
  // Aktive Kalender-Periode hat Vorrang im Trigger-Label (Exklusivität zum Tages-Preset).
  if(tl)tl.textContent=state.period?periodLabel(state.period):{7:"7 Tage",30:"30 Tage",0:"Alle"}[state.rangeDays];
  // Der Zaehler deckt beide Gruppen des Dropdowns ab: Themen UND laufende Vorgaenge.
  // Sonst filterte eine Vorgangs-Auswahl unsichtbar, sobald das Menue zu ist — die Chips
  // standen frueher offen in der Leiste und waren dort immer erkennbar.
  const cb=document.getElementById("trigTopicsCount");
  if(cb){const n=state.topics.size+state.processFilter.length; cb.textContent=n; cb.classList.toggle("is-empty",n===0);}
}
(function initFilters(){
  // Zeitraum-Schieberegler: Thumb auf den aktiven Schritt legen, bei Klick umschalten
  const slider=document.getElementById("rangeSlider");
  const thumb=document.getElementById("rangeThumb");
  const steps=[...slider.querySelectorAll(".step")];
  // "Kalender" ist ein Slider-Schritt wie 7/30 Tage: aktiv, sobald eine Periode gesetzt ist
  // ODER der Schritt angeklickt wurde (Detail aufgeklappt, aber noch keine Periode gewählt).
  let calMode=!!state.period;
  function placeThumb(){
    const active=calMode
      ? steps.find(s=>s.dataset.cal)
      : (steps.find(s=>!s.dataset.cal&&+s.dataset.days===state.rangeDays)||steps[0]);
    steps.forEach(s=>s.classList.toggle("on",s===active));
    thumb.style.left=active.offsetLeft+"px";
    thumb.style.width=active.offsetWidth+"px";
  }
  steps.forEach(s=>s.addEventListener("click",()=>{
    if(s.dataset.cal){           // "Kalender": nur Detail aufklappen, Filter folgt mit der Periode
      calMode=true;
      placeThumb(); syncPeriod();
      return;                    // kein commit/close — Nutzer wählt erst Ebene + Periode
    }
    state.rangeDays=+s.dataset.days;
    state.period=null;   // Exklusivität: Wahl eines Tages-Presets hebt die Kalender-Periode auf
    calMode=false;
    placeThumb(); syncPeriod();
    commitView({mapSync:"unlessFrozen",closeFilters:true});
  }));
  placeThumb(); placeThumbRef=placeThumb;
  window.addEventListener("resize",placeThumb);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(placeThumb);

  // Kalendarische Suche (Issue #262): Ebenen-Umschalter KW|Monat|Quartal + <select> für die
  // konkrete Periode. Beide schreiben in state.period; analog zum Slider-Handler wird jeweils
  // commitView({mapSync:"unlessFrozen",closeFilters:true}) gefeuert. Exklusivität: setzt eine
  // Periode den Tages-Preset auf "Gesamt" (rangeDays=0) zurück, ein Preset wiederum state.period=null.
  const periodPicker=document.getElementById("periodPicker");
  const periodSeg=document.getElementById("periodSeg");
  const periodSelect=document.getElementById("periodSelect");
  const periodClear=document.getElementById("periodClear");
  // aktuell gewählte Ebene im UI (state.period kennt nur eine GESETZTE Periode, nicht die bloße Ebene).
  let periodLevel=(state.period&&state.period.level)||"monat";
  // Optionen-Liste für die aktive Ebene neu aufbauen; optional eine value vorselektieren.
  function fillPeriodOptions(sel){
    const opts=periodOptions(periodLevel);
    periodSelect.innerHTML=`<option value="">– wählen –</option>`+
      opts.map(o=>`<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
    periodSelect.value=sel||"";
  }
  // Ebenen-Segmente markieren (.on + aria), Select befüllen, Picker-Aktivzustand + Clear-Button spiegeln.
  function syncPeriod(){
    if(state.period)calMode=true;   // extern gesetzte Periode hält den Kalender-Schritt aktiv
    periodPicker.classList.toggle("show",calMode);   // Detail nur im Kalender-Modus sichtbar
    placeThumb();
    periodLevel=(state.period&&state.period.level)||periodLevel;
    periodSeg.querySelectorAll(".period-opt").forEach(o=>{
      const on=o.dataset.level===periodLevel;
      o.classList.toggle("on",on);
      o.setAttribute("aria-checked",String(on));
    });
    const cur=state.period&&state.period.level===periodLevel?state.period.value:"";
    fillPeriodOptions(cur);
    const active=!!state.period;
    periodPicker.classList.toggle("active",active);
    if(periodClear)periodClear.hidden=!active;
  }
  syncPeriodRef=syncPeriod;
  // Ebene wechseln: nur die Ebene umstellen + Optionen neu füllen. Solange keine konkrete Periode
  // gewählt ist, bleibt state.period null (kein Filter). Liegt die aktive Periode auf einer anderen
  // Ebene, wird sie verworfen (genau EINE Periode auf genau EINER Ebene).
  periodSeg.querySelectorAll(".period-opt").forEach(o=>o.addEventListener("click",()=>{
    periodLevel=o.dataset.level;
    if(state.period&&state.period.level!==periodLevel){
      state.period=null;   // Ebene gewechselt -> alte Periode fällt weg
      commitView({mapSync:"unlessFrozen",closeFilters:true});
    }else{
      syncPeriod();        // nur UI: Ebene markieren + Optionen neu füllen
    }
  }));
  periodSelect.addEventListener("change",e=>{
    const v=e.target.value;
    if(v){
      state.period={level:periodLevel,value:v};
      state.rangeDays=0;   // Exklusivität: Tages-Preset auf "Gesamt"/neutral zurück
      placeThumb();        // Slider-Thumb auf "Alle" spiegeln
    }else{
      state.period=null;   // "– wählen –" -> Kalenderfilter aus
    }
    commitView({mapSync:"unlessFrozen",closeFilters:true});
  });
  if(periodClear)periodClear.addEventListener("click",()=>{
    state.period=null;
    calMode=false;   // Kalenderfilter aufheben -> Slider zurück auf den Tages-Preset
    commitView({mapSync:"unlessFrozen",closeFilters:true});
  });
  syncPeriod();

  const tc=document.getElementById("topicChips");
  tc.innerHTML=TOPICS_ALS_CHIP.map(t=>`<button class="chip" data-topic="${esc(t)}">${esc(t)}<span class="count-soft">0</span></button>`).join("");
  tc.querySelectorAll(".chip").forEach(c=>c.addEventListener("click",()=>toggleTopic(c.dataset.topic)));

  // Top-Filter: eine Toggle-Pille „★ Top" kippt den Zustand (alle Breiten).
  const topPill=document.getElementById("topPillMobile");
  if(topPill)topPill.addEventListener("click",()=>setTopOnly(!state.topOnly));
  syncTopOnly();

  const persPill=document.getElementById("persPill");
  if(persPill)persPill.addEventListener("click",cyclePersonalienFilter);
  document.querySelectorAll("#processChips .process-chip").forEach(c=>
    c.addEventListener("click",()=>toggleProcessFilter(c.dataset.process)));
  syncPersonalienFilter();
  syncProcessFilter();

  // Suche: entprellt, damit Cluster-Rebuild + Re-Clustering nicht je Tastendruck läuft.
  const search=document.getElementById("search");
  let searchT=null;
  search.addEventListener("input",e=>{
    state.query=e.target.value.trim();
    clearTimeout(searchT);
    searchT=setTimeout(()=>{dropBereich();commitView({mapSync:"rebuild"});},140);   // Suche definiert Grundgesamtheit neu -> Bereich aufheben
  });
  search.addEventListener("keydown",e=>{
    if(e.key==="Enter"&&state.query){
      // Enter bricht den entprellten Rebuild ab -> Grundgesamtheit hier selbst in Karte spiegeln.
      clearTimeout(searchT);dropBereich();commitView({mapSync:"rebuild"});
      const m=visibleFeats();
      if(m.length)selectLocation(m[0].properties.standort_id);
      else commitView();   // kein Treffer: Bereich-Drop trotzdem ins Panel spiegeln
    }
  });

  document.getElementById("themeToggle").addEventListener("click",()=>{
    setTheme(document.documentElement.classList.contains("theme-hell")?"dunkel":"hell");
  });

  updateTopicCounts();   // Initialaufbau: Filterleisten-Chips mit Anfangszahlen füllen
})();

/* ============ Mobile-Filter: Trigger öffnen/schließen die Optionen ============ */
(function initFilterTriggers(){
  const fb=document.getElementById("filterbar");
  function toggle(which){
    const cur=fb.getAttribute("data-open")||"none";
    const next=(cur===which)?"none":which;
    fb.setAttribute("data-open",next);
    Object.entries(FILTER_TRIGGERS).forEach(([k,id])=>{const el=document.getElementById(id);
      if(el){const on=next===k;el.classList.toggle("active",on);el.setAttribute("aria-expanded",String(on));}});
    if(next==="time"&&placeThumbRef)placeThumbRef();
  }
  Object.entries(FILTER_TRIGGERS).forEach(([k,id])=>{const el=document.getElementById(id);
    if(el)el.addEventListener("click",e=>{e.stopPropagation();toggle(k);});});
  fb.addEventListener("click",e=>e.stopPropagation());
  document.addEventListener("click",closeFilterPop);
  // Offenes Facetten-Dropdown bei Breitenwechsel schließen (Absolut-Position wird sonst schief).
  addEventListener("resize",closeFilterPop);
  syncFilterTriggers();
})();

/* ============ Ansichten-Flyout (alle Breiten) ============ */
/* EIN Overlay-Flyout für Desktop UND Mobile (Issue #256, Folgekommentar 2026-06-17):
   - Desktop: Hover/Fokus der Navgroup öffnet das Flyout rein per CSS (:hover/:focus-within);
     der Klick auf die Brand-Pille „pinnt" es zusätzlich offen (.open) — wichtig für Touch
     und Tastatur, wo es kein Hover gibt.
   - Mobile: kein Hover, dort ist der Klick-Toggle der einzige Auslöser.
   Eigene Schließ-Logik (Klick außerhalb / Escape), die NICHT mit closeFilterPop kollidiert:
   der Brand-Trigger stoppt das Bubbling, der Außen-Klick-Handler schließt nur .open.
   aria-expanded spiegelt nur den gepinnten (.open) Zustand — der reine Hover-Zustand ist
   transient und braucht keine ARIA-Ankündigung. */
(function initViewMenu(){
  const vm=document.getElementById("viewMenu");
  const trigger=document.getElementById("brandTrigger");
  if(!vm||!trigger)return;
  function close(){vm.classList.remove("open");trigger.setAttribute("aria-expanded","false");}
  trigger.addEventListener("click",e=>{
    e.stopPropagation();
    const open=vm.classList.toggle("open");
    trigger.setAttribute("aria-expanded",String(open));
  });
  document.addEventListener("click",e=>{ if(!vm.contains(e.target))close(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&vm.classList.contains("open"))close(); });
  mobileMQ.addEventListener("change",close);   // Breitenwechsel: ein gepinntes Flyout schließen
})();

/* ============ Bottom-Sheet-Steuerung (Mobile) ============ */
function applySheet(){
  const panel=document.getElementById("panel");
  if(!mobileMQ.matches){panel.style.height="";return;}
  panel.style.height=sheetDetents()[sheetState]+"px";
}
(function initSheet(){
  const panel=document.getElementById("panel");
  const handle=document.getElementById("sheetHandle");
  const phead=document.getElementById("panelHead");
  let dragging=false,startY=0,startH=0,capEl=null;
  function nearest(h){
    const d=sheetDetents();let best="half",bd=Infinity;
    for(const k in d){const dist=Math.abs(d[k]-h);if(dist<bd){bd=dist;best=k;}}
    return best;
  }
  // Kopf ist bis zur ERSTEN Trennlinie (.id-stat-row) ziehbar. Im Kopf-Modus
  // duerfen interaktive Elemente und alles ab .id-stat-row (Kennzahlen-Zeile + darunter)
  // klicken statt ziehen; oberhalb (Name/Träger/Ort/Notfallstufe) bleibt Drag-Zone.
  function down(e){
    if(!mobileMQ.matches)return;
    if(e.currentTarget===phead && e.target.closest("button,a,input,select,.subtabs,.id-stat-row"))return;
    dragging=true;startY=e.clientY;startH=panel.getBoundingClientRect().height;
    panel.classList.add("dragging");capEl=e.currentTarget;
    try{capEl.setPointerCapture(e.pointerId);}catch(_){}
  }
  function move(e){
    if(!dragging)return;
    const d=sheetDetents();let h=Math.max(d.peek,Math.min(d.full,startH+(startY-e.clientY)));
    panel.style.height=h+"px";
  }
  function end(){
    if(!dragging)return;dragging=false;panel.classList.remove("dragging");
    sheetState=nearest(panel.getBoundingClientRect().height);applySheet();
  }
  [handle,phead].forEach(el=>{
    el.addEventListener("pointerdown",down);
    el.addEventListener("pointermove",move);
    el.addEventListener("pointerup",end);
    el.addEventListener("pointercancel",end);
  });
  mobileMQ.addEventListener("change",()=>{sheetState="half";applySheet();});
  window.addEventListener("resize",applySheet);
  applySheet();
})();

/* ============ Info-Popup (Erklärung Entwicklung) ============ */
function openInfoModal(){const m=document.getElementById("infoModal");m.classList.add("open");m.setAttribute("aria-hidden","false");}
(function initInfoModal(){
  const modal=document.getElementById("infoModal");
  function close(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");}
  document.getElementById("infoModalClose").addEventListener("click",close);
  modal.addEventListener("click",e=>{if(e.target===modal)close();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal.classList.contains("open"))close();});
  // Persistenter Hilfe-Button oben rechts im Panel-Kopf. Auf Mobile liegt der Kopf
  // in der Drag-Zone des Sheets; stopPropagation bei pointerdown/up verhindert, dass
  // ein Tap auf „?" das Sheet zieht. Der Klick oeffnet das Modal.
  const help=document.getElementById("panelHelp");
  if(help){
    help.addEventListener("pointerdown",e=>e.stopPropagation());
    help.addEventListener("pointerup",e=>e.stopPropagation());
    help.addEventListener("click",e=>{e.stopPropagation();openInfoModal();});
  }
})();

/* ============ Spalten-Umschalter (Desktop): ein- ↔ zweispaltiges Panel ============
   Schmaler Griff am linken Panelrand. Standard ist einspaltig; die Wahl wird gemerkt.
   Beim Umschalten zieht die Karte horizontal mit (panBy um die halbe Breitenänderung),
   damit der sichtbare Kartenausschnitt nicht hinter dem breiter werdenden Panel
   verschwindet. Die Filterleiste bleibt bündig vor der Panelkante. */
const COL_KEY="hauptansicht-panel-cols";
function syncColToggle(){
  const panel=document.getElementById("panel");
  const toggle=document.getElementById("colToggle");
  const fb=document.getElementById("filterbar");
  const on=panel.classList.contains("two-col");
  if(toggle){
    const ico=toggle.querySelector(".ct-ico");
    if(ico)ico.textContent=on?"chevron_right":"chevron_left";
    toggle.setAttribute("aria-label",on?"Panel auf eine Spalte zusammenfassen":"Panel auf zwei Spalten erweitern");
  }
  if(fb) fb.style.right = mobileMQ.matches ? "" : Math.round(panelTargetWidth()+36)+"px";
  if(!state.selectedId&&!state.frozen&&typeof goHome==="function"&&map.isStyleLoaded&&map.isStyleLoaded())goHome(0);
}
function setPanelCols(twoCol){
  const panel=document.getElementById("panel");
  if(panel.classList.contains("two-col")===twoCol)return;
  const before=panelTargetWidth();
  panel.classList.toggle("two-col",twoCol);
  const after=panelTargetWidth();
  syncColToggle();
  // Karte um die halbe Breitenänderung mitziehen (synchron zur .28s-Panel-Transition):
  // der vorher in der sichtbaren Mitte liegende Punkt bleibt sichtbar, statt hinter
  // das Panel zu wandern. panBy(+x) schiebt den Inhalt nach links (Aufklappen).
  const delta=after-before;
  if(delta && !mobileMQ.matches && typeof map!=="undefined"){
    if(!state.selectedId&&!state.frozen&&typeof goHome==="function")goHome(300);
    else if(map.panBy)map.panBy([delta/2,0],{duration:300});
  }
  try{localStorage.setItem(COL_KEY,twoCol?"1":"0");}catch(_){}
}
(function initColToggle(){
  const panel=document.getElementById("panel");
  const toggle=document.getElementById("colToggle");
  if(!panel)return;
  let two=false; try{two=localStorage.getItem(COL_KEY)==="1";}catch(_){}
  panel.classList.toggle("two-col",two);   // Standard einspaltig; gemerkte Wahl überschreibt
  if(toggle)toggle.addEventListener("click",()=>setPanelCols(!panel.classList.contains("two-col")));
  syncColToggle();
  window.addEventListener("resize",syncColToggle);
  mobileMQ.addEventListener("change",syncColToggle);
})();
