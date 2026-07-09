/* ---------- Fachpresse-Achse (Monitor) ----------
   Master-Liste = "Alle Titel · Monitor" + die 5 Titel als gesammelter Block.
   Dossier = globaler chronologischer Strom (Monitor) bzw. ein einzelner Titel. */
function srcBeitraege(key,win=WIN){return FACHPRESSE.filter(p=>p.quelle===key&&inWin(p.datum,win));}
/* Repräsentativität: Insgesamt-Quote (anteil) wird nach dem Themen-Mix der gezeigten
   Beiträge auf die Streitfragen aufgeteilt -> Streitfragen-Anteile summieren je Titel
   exakt auf anteil. memberships = Summe der Themen-Zuordnungen der gezeigten Beiträge. */
function presseMemberships(key,win=WIN){return srcBeitraege(key,win).reduce((s,p)=>s+p.themen.length,0);}
function presseShareMap(key,win=WIN){
  const items=srcBeitraege(key,win), tot=presseMemberships(key,win), total=PRESSE_SOURCES[key].anteil;
  if(!tot) return {};
  const ids=[...new Set(items.flatMap(p=>p.themen))];
  const rows=ids.map(id=>{
    const n=items.filter(p=>p.themen.includes(id)).length;
    const exact=total*n/tot;
    return {id,val:Math.floor(exact),frac:exact-Math.floor(exact)};
  });
  let rem=total-rows.reduce((s,r)=>s+r.val,0);
  rows.sort((a,b)=>b.frac-a.frac||a.id.localeCompare(b.id));
  for(let i=0;i<rem;i++) rows[i].val++;
  return Object.fromEntries(rows.map(r=>[r.id,r.val]));
}
function presseThemaShare(key,themaId,win=WIN){
  return presseShareMap(key,win)[themaId]||0;
}
function renderPresseListe(){
  const ql=currentSearch.trim();
  const list=visiblePresseSources();
  document.getElementById("listeTitle").textContent="Fachpresse";
  document.getElementById("lcount").textContent=list.length;
  const total=FACHPRESSE.filter(p=>inWin(p.datum)).length;
  const head=ql?"":`<div class="row ${RENDER_MODE==="presse"&&SELECTED_SRC===null?"on":""}" data-src="__all__" role="button" tabindex="0" aria-current="${RENDER_MODE==="presse"&&SELECTED_SRC===null?"true":"false"}">
      <div class="r-top"><span class="r-titel">Alle Titel · Monitor</span><span class="vchip">Übersicht</span></div>
      <div class="r-foot"><span>${total} Beiträge / ${winLabel()}</span></div>
    </div>`;
  document.getElementById("rows").innerHTML=head+(list.map(s=>
    `<div class="row ${RENDER_MODE==="presse"&&s.key===SELECTED_SRC?"on":""}" data-src="${s.key}" role="button" tabindex="0" aria-current="${RENDER_MODE==="presse"&&s.key===SELECTED_SRC?"true":"false"}">
        <div class="r-top"><span class="r-titel">${s.kurz}</span><span class="vchip">Fachpresse</span></div>
        <div class="r-feld">${s.lang}</div>
        <div class="r-foot"><span class="presse-tendenz">Tendenz: Erbringer</span><span class="sep">·</span><span>${s.n} ${s.n===1?"Beitrag":"Beiträge"}/${winLabel()}</span>${s.n?`<span class="sep">·</span><span class="presse-tendenz" title="gezeigte Beiträge als Anteil an der geschätzten Gesamt-Reformberichterstattung des Titels (fiktiv)">zeigt ${s.anteil}%</span>`:""}</div>
      </div>`).join("")||`<div class="ql-empty">Keine Treffer.</div>`);
}
function renderPresseDossier(){
  const dossier=document.getElementById("dossier"), all=SELECTED_SRC===null;
  if(currentSearch.trim() && !visiblePresseSources().length){ renderEmptyDossier("Keine Fachpresse-Treffer","Die aktuelle Suche findet keinen Fachpresse-Titel im gewählten Zeitraum."); return; }
  const list=FACHPRESSE.filter(p=>inWin(p.datum)&&(all||p.quelle===SELECTED_SRC));
  const src=all?null:PRESSE_SOURCES[SELECTED_SRC];
  const tl=list.map(p=>presseItem(p,true));   // im Monitor je Beitrag die Vorgangs-Tags zeigen
  dossier.innerHTML=`
    <button class="dos-back" id="dosBack"><span class="material-symbols-outlined">arrow_back</span>Alle Titel</button>
    <div class="eyebrow">Fachpresse-Monitor</div>
    <div class="dos-head">
      <div>
        <span class="vchip"><span class="material-symbols-outlined">newspaper</span>${all?"Übersicht":"Fachpresse"}</span>
        <h1 class="titel">${all?"Alle Titel · Krankenhaus-Fachpresse":src.kurz}</h1>
      </div>
    </div>
    <div class="standline">
      <span class="meta-item"><span class="material-symbols-outlined">${all?"newspaper":"info"}</span>${all?`${Object.keys(PRESSE_SOURCES).length} Titel`:src.lang}</span>
      <span class="meta-item"><span class="material-symbols-outlined">article</span><b>${list.length}</b> Beiträge / ${winLabel()}</span>
      ${all?"":`<span class="meta-item" title="gezeigte Beiträge als Anteil an der geschätzten Gesamt-Reformberichterstattung des Titels (fiktiv)"><span class="material-symbols-outlined">donut_small</span>zeigt <b>${src.anteil}%</b> der Berichterstattung</span>`}
      <span class="meta-item"><span class="material-symbols-outlined">balance</span>Tendenz: <b>Erbringer-Lager</b></span>
    </div>
    <div class="charline"><span class="material-symbols-outlined">info</span>
      <span>Berichterstattung <b>über</b> die Reformkomplexe — <b>keine</b> Akteurs-Position. Beiträge sind dem jeweiligen Vorgang über Begriffe zugeordnet; Deeplinks führen zur Originalquelle (im Prototyp inaktiv).</span>
    </div>
    <div class="dos-body">
      <div class="pubs">
        <div class="rail-head">
          <h3><span class="material-symbols-outlined">feed</span>Beiträge</h3>
          <span class="rcount">${list.length} · letzte ${winLabel()}</span>
        </div>
        ${timelineHtml(tl)}
      </div>
    </div>`;
}
