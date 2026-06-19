/* ============ Init Controls ============ */
let placeThumbRef=null;
function closeFilterPop(){
  const fb=document.getElementById("filterbar"); if(!fb)return;
  fb.setAttribute("data-open","none");
  const a=document.getElementById("trigTime"),b=document.getElementById("trigTopics");
  if(a)a.classList.remove("active"); if(b)b.classList.remove("active");
}
function syncFilterTriggers(){
  const tl=document.getElementById("trigTimeLabel");
  if(tl)tl.textContent={7:"7 Tage",30:"30 Tage",0:"Alle"}[state.rangeDays];
  const cb=document.getElementById("trigTopicsCount");
  if(cb){const n=state.topics.size; cb.textContent=n; cb.classList.toggle("is-empty",n===0);}
}
(function initFilters(){
  // Zeitraum-Schieberegler: Thumb auf den aktiven Schritt legen, bei Klick umschalten
  const slider=document.getElementById("rangeSlider");
  const thumb=document.getElementById("rangeThumb");
  const steps=[...slider.querySelectorAll(".step")];
  function placeThumb(){
    const active=steps.find(s=>+s.dataset.days===state.rangeDays)||steps[steps.length-1];
    steps.forEach(s=>s.classList.toggle("on",s===active));
    thumb.style.left=active.offsetLeft+"px";
    thumb.style.width=active.offsetWidth+"px";
  }
  steps.forEach(s=>s.addEventListener("click",()=>{
    state.rangeDays=+s.dataset.days;
    placeThumb();
    commitView({mapSync:"unlessFrozen",closeFilters:true});
  }));
  placeThumb(); placeThumbRef=placeThumb;
  window.addEventListener("resize",placeThumb);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(placeThumb);

  const tc=document.getElementById("topicChips");
  tc.innerHTML=TOPICS.map(t=>`<button class="chip" data-topic="${esc(t)}">${esc(t)}<span class="count-soft">0</span></button>`).join("");
  tc.querySelectorAll(".chip").forEach(c=>c.addEventListener("click",()=>toggleTopic(c.dataset.topic)));

  // Top-Filter (Segmented "Alle | Top"): jede Zelle setzt den Zustand explizit
  document.querySelectorAll("#topSeg .topseg-opt").forEach(o=>o.addEventListener("click",()=>setTopOnly(o.dataset.top==="top")));
  // Top-Schalter mobil (Icon-Pille): kippt den Zustand
  const topPill=document.getElementById("topPillMobile");
  if(topPill)topPill.addEventListener("click",()=>setTopOnly(!state.topOnly));
  syncTopOnly();

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
  const trigTime=document.getElementById("trigTime");
  const trigTopics=document.getElementById("trigTopics");
  function toggle(which){
    const cur=fb.getAttribute("data-open")||"none";
    const next=(cur===which)?"none":which;
    fb.setAttribute("data-open",next);
    trigTime.classList.toggle("active",next==="time");
    trigTopics.classList.toggle("active",next==="topics");
    if(next==="time"&&placeThumbRef)placeThumbRef();
  }
  trigTime.addEventListener("click",e=>{e.stopPropagation();toggle("time");});
  trigTopics.addEventListener("click",e=>{e.stopPropagation();toggle("topics");});
  fb.addEventListener("click",e=>e.stopPropagation());
  document.addEventListener("click",closeFilterPop);
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
