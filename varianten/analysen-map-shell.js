/* REFORM-DEAKTIVIERT 2026-07-09: Der Leistungsgruppen-Teil der Reform-Linse ist
   vorübergehend stillgelegt (nur das Pflegebudget-Szenario bleibt aktiv); der Nutzer
   nimmt die Arbeit später wieder auf. Die Reform-Karten-Anteile (divergierende
   Färbung, Latent-Ringe, Klick-Flüsse, Legende) bleiben vollständig im Code und
   hängen an diesem einen Schalter. Beschlüsse und Wiederaufnahme-Plan:
   docs/plans/open_frontend-endprodukt-ausbau.md (§ 4.4, § 4.4.1, AP 7).
   Reaktivierung: Flag auf true + DEAKTIVIERT-Stellen in analysen-reform.js öffnen. */
const REFORM_LG_UI_AKTIV=false;

/* ---------- lebende Legende ---------- */
function renderLegend(){
  const l2=STATE.lens===2;
  const l3fam=STATE.lens===3&&STATE.selFamilie&&marktFamilien(STATE.focus).find(f=>f.key===STATE.selFamilie);
  const reformSel=REFORM_LG_UI_AKTIV&&STATE.lens===4?currentReformLg():null;  // null = Summen-Sicht
  const reformSzenaktiv=REFORM_LG_UI_AKTIV&&STATE.lens===4&&STATE.szenario&&((STATE.szenario.ebene||0)>0||(STATE.szenario.korb&&STATE.szenario.korb.length>0));
  let farbe;
  if(REFORM_LG_UI_AKTIV&&STATE.lens===4)
    farbe=reformSel
      ?`<div class="enc-row"><span class="enc-ic"><span class="swatch-div"></span></span><span><b>Farbe</b> erwartete Fallzahl-Veränderung in ${reformSel} · Verlierer tiefrot, Gewinner blau</span></div>`
      :`<div class="enc-row"><span class="enc-ic"><span class="swatch-div"></span></span><span><b>Farbe</b> Summe der erwarteten Fallzahl-Veränderungen über alle betroffenen Gruppen · Verlierer tiefrot, Gewinner blau</span></div>`;
  else if(STATE.lens===3)
    farbe=l3fam
      ?`<div class="enc-row"><span class="enc-ic"><span class="swatch-grad" style="background:linear-gradient(90deg,#6b7486,#d25a5f)"></span></span><span><b>Farbe</b> Wettbewerbsdruck durch das jeweilige Haus · blass = kein eigenes Angebot in ${l3fam.name}</span></div>`
      :`<div class="enc-row"><span class="enc-ic"><span class="swatch-grad neutral"></span></span><span><b>Farbe</b> neutral · Gesamtmarkt (Familie im Panel wählen)</span></div>`;
  else if(l2&&STATE.dienstart==="pflege")
    farbe=`<div class="enc-row"><span class="enc-ic"><span class="swatch-div"></span></span><span><b>Farbe</b> Pflegelast je Vollkraft · Stand im Bundesvergleich (üppig↔knapp)</span></div>`;
  else if(l2) farbe=STATE.selDept
    ?`<div class="enc-row"><span class="enc-ic"><span class="swatch-div"></span></span><span><b>Farbe</b> ärztliche Besetzung vs. üblicher Wert · ${DKEY[STATE.selDept].name}</span></div>`
    :`<div class="enc-row"><span class="enc-ic"><span class="swatch-grad neutral"></span></span><span><b>Farbe</b> Fachabteilung wählen für Farbvergleich</span></div>`;
  else if(STATE.colorMetric) farbe=`<div class="enc-row"><span class="enc-ic"><span class="swatch-grad"></span></span><span><b>Farbe</b> ${METRIC_LABEL[STATE.colorMetric]} · Stand im Bundesvergleich</span></div>`;
  else farbe=`<div class="enc-row"><span class="enc-ic"><span class="swatch-grad neutral"></span></span><span><b>Farbe</b> Kachel im Panel anklicken → Karte färbt nach Bundesvergleich</span></div>`;
  const reachLbl=l3fam?`Marktraum der Familie: ${l3fam.stufe} Min Fahrzeit (Beispieldaten)`
    :(ISO?"in 30 Min Fahrzeit erreichbar":"in ~30 Min erreichbar (vereinfacht als Kreis)");
  const sizeLbl=REFORM_LG_UI_AKTIV&&STATE.lens===4?(reformSel?`Volumen in ${reformSel}`:"Volumen der betroffenen Gruppen"):(l3fam?"Volumen in der Familie":"vollstationäre Fälle");
  const nbhLbl=STATE.lens===3?"im / außerhalb des Marktraums":"in / außerhalb der 30-Min-Nachbarschaft";
  const ringLbl=REFORM_LG_UI_AKTIV&&STATE.lens===4
    ?(reformSel
      ?"amtlicher Status der Gruppe: fester Ring = amtlich, gestrichelter Ring = latent/Modell"
      :"fester Ring = nur amtliche Anteile, gestrichelter Ring = Szenario-/Latent-Anteil in der Summe")
    :"Notfallstufe";
  const flowRow=REFORM_LG_UI_AKTIV&&STATE.lens===4
    ?`<div class="enc-row"><span class="enc-ic"><span class="swatch-reach"></span></span><span><b>Klick-Flüsse</b> nur nach Haus-Klick · Linien zeigen erwartete Zu-/Abflüsse mit Unsicherheit im Tooltip</span></div>`
      +(reformSzenaktiv?`<div class="enc-row szen-flag"><span class="enc-ic"><span class="material-symbols-outlined">science</span></span><span><b>Szenario aktiv</b> — Farben und Wirkungszahlen enthalten Szenario-Anteile</span></div>`:"")
    :"";
  document.getElementById("legendCard").innerHTML=
    `<div class="gt"><span class="material-symbols-outlined">legend_toggle</span>Kodierung · Linse ${STATE.lens}</div>
     <div class="enc-row"><span class="enc-ic"><span class="swatch-size"></span></span><span><b>Größe</b> ${sizeLbl}</span></div>
     ${farbe}
     <div class="enc-row"><span class="enc-ic"><span class="swatch-ring"></span></span><span><b>Ring</b> ${ringLbl}</span></div>
     <div class="enc-row"><span class="enc-ic"><span class="swatch-reach"></span></span><span><b>Fläche</b> ${reachLbl}</span></div>
     ${flowRow}
     <div class="enc-row"><span class="enc-ic"><span class="swatch-nbh"></span></span><span><b>Hell / gedimmt</b> ${nbhLbl}</span></div>
     <div class="geo-div"></div>
     <div class="prov-legend">
       <span class="pl"><span class="pdot bka"></span>Strukturdaten (Bundes-Klinik-Atlas)</span>
       <span class="pl"><span class="pdot qb"></span>Qualitätsbericht</span>
       <span class="pl"><span class="pdot news"></span>Nachrichten</span>
       <span class="pl"><span class="pdot ext"></span>extern · Beispieldaten (noch nicht angebunden)</span>
     </div>`;
}

/* ---------- Panel-Render ---------- */
function renderPanel(){
  const c=CLINICS[STATE.focus];
  renderBefund(c);
  document.getElementById("lensBody").innerHTML=STATE.lens===4
    ? renderReform(c)
    : STATE.lens===3
    ? renderMarkt(c)
    : STATE.lens===2
    ? (STATE.dienstart==="pflege"?renderPflege(c):renderLens2(c))
    : renderLens1(c);
  renderLegend();
}

/* ============================ Karte ============================ */
let map, hoverPop;
function getCss(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()||"#8ab0d9";}
function circlePolygon(center,km,pts=56){
  const coords=[],dLat=km/110.574,dLon=km/(111.320*Math.cos(center[1]*Math.PI/180));
  for(let i=0;i<=pts;i++){const a=i/pts*2*Math.PI;coords.push([center[0]+dLon*Math.cos(a),center[1]+dLat*Math.sin(a)]);}
  return {type:"Feature",geometry:{type:"Polygon",coordinates:[coords]}};
}
function clusterFC(){
  const nb=new Set(neighborhood(CLINICS[STATE.focus]).map(h=>h.id));
  // Linse 3 mit gewählter Familie: Wettbewerber-Beiträge + Familien-Volumina vorrechnen
  let m3=null;
  if(STATE.lens===3&&STATE.selFamilie){
    const fam=marktFamilien(STATE.focus).find(f=>f.key===STATE.selFamilie);
    if(fam){const wb=familieWettbewerber(STATE.focus,fam);
      m3={fam,byId:Object.fromEntries(wb.map(w=>[w.id,w])),
        maxB:Math.max(0.01,...wb.map(w=>w.beitrag)),
        maxV:Math.max(1,fam.ist,...wb.map(w=>w.volFam))};}
  }
  return {type:"FeatureCollection",features:ARR.map(c=>{
    let color,popval,rOverride=null,inNbhOverride=null;
    if(m3){   // Markt-Linse, Familie gewählt: Farbe = Druck-Beitrag, Größe = Volumen in der Familie
      const fam=m3.fam;
      if(c.id===STATE.focus){color=getCss("--accent");rOverride=6+Math.sqrt(fam.ist)/Math.sqrt(m3.maxV)*22;
        popval="Fokus · "+fmt(fam.ist)+" Fälle in "+fam.name;inNbhOverride=true;}
      else{const w=m3.byId[c.id];
        if(w){inNbhOverride=true;
          if(w.offers){color=druckColor(w.beitrag/m3.maxB);rOverride=6+Math.sqrt(w.volFam)/Math.sqrt(m3.maxV)*22;
            popval="Druck-Beitrag "+(w.beitrag/m3.maxB*100).toFixed(0)+" · "+fmt(w.volFam)+" Fälle in der Familie";}
          else{color="#4a4e57";rOverride=7;popval="kein Angebot in "+fam.name;}}
        else{color=NEUTRAL_FILL;inNbhOverride=false;popval=fmt(c.fallVoll)+" vollstat. Fälle · außerhalb des Marktraums";}}
    }
    else if(REFORM_LG_UI_AKTIV&&STATE.lens===4){
      const rf=window.ReformLens.mapFeature(c.id,currentReformLg(),STATE.szenario);
      color=devColor(rf.deltaRate);rOverride=7+Math.sqrt(rf.volume)/Math.sqrt(2500)*22;
      popval=rf.popval+(rf.scenarioDelta?` · Szenario ${signedScenario(rf.scenarioDelta)}`:"");
      inNbhOverride=nb.has(c.id)||c.id===STATE.focus;
    }
    else if(STATE.lens===3){   // aggregierter Markt: Karte neutral
      color=NEUTRAL_FILL;popval=fmt(c.fallVoll)+" vollstat. Fälle";}
    else if(STATE.lens===2&&STATE.dienstart==="pflege"){
      const pct=pflPct(PFL_HAUS[c.id].last);color=pflColor(pct);popval="Pflegelast je Vollkraft · P"+pct;}
    else if(STATE.lens===2){
      if(STATE.selDept){const dev=deptDev(c.id,STATE.selDept);
        color=devColor(dev);popval=DKEY[STATE.selDept].name+": "+pctSign(dev);}
      else {color=NEUTRAL_FILL;popval="Fachabteilung wählen für Farbvergleich";}
    }
    else if(STATE.colorMetric){color=pctColor(c.pct[STATE.colorMetric]);
      popval="P"+c.pct[STATE.colorMetric]+" · "+METRIC_LABEL[STATE.colorMetric];}
    else {color=NEUTRAL_FILL;popval=fmt(c.fallVoll)+" vollstat. Fälle";}
    const r=rOverride!=null?rOverride:7+Math.sqrt(c.fallVoll)/Math.sqrt(MAXFAELLE)*21;  // Größe = vollstat. Fälle (Default)
    const rfRing=REFORM_LG_UI_AKTIV&&STATE.lens===4?window.ReformLens.mapFeature(c.id,currentReformLg(),STATE.szenario).ring:null;
    return {type:"Feature",geometry:{type:"Point",coordinates:c.coords},
      properties:{id:c.id,name:c.name,color,r,sw:rfRing?(rfRing==="official"?2.3:0):RING[c.notfall],
        reformRing:rfRing,
        focus:c.id===STATE.focus,inNbh:inNbhOverride!=null?inNbhOverride:nb.has(c.id),popval}};
  })};
}
function signedScenario(n){return (n>0?"+":n<0?"−":"±")+fmt(Math.abs(n))+" Fälle/J";}
function ringColor(){return document.documentElement.classList.contains("theme-hell")?"rgba(20,30,45,0.55)":"rgba(255,255,255,0.6)";}
function emptyFC(){return {type:"FeatureCollection",features:[]};}
function reformRingFC(){
  if(!REFORM_LG_UI_AKTIV||STATE.lens!==4)return emptyFC();
  return {type:"FeatureCollection",features:ARR.flatMap(c=>{
    const rf=window.ReformLens.mapFeature(c.id,currentReformLg(),STATE.szenario);
    if(rf.ring!=="latent")return [];
    return [{...circlePolygon(c.coords,1.7),properties:{id:c.id}}];
  })};
}
function flowFeatureCollection(){
  if(!REFORM_LG_UI_AKTIV||STATE.lens!==4||!STATE.flowHaus)return emptyFC();
  const edges=window.ReformLens.flowEdges(STATE.flowHaus,currentReformLg());
  return {type:"FeatureCollection",features:edges.flatMap(e=>{
    const a=CLINICS[e.from],b=CLINICS[e.to];
    if(!a||!b)return [];
    return [{type:"Feature",geometry:{type:"LineString",coordinates:[a.coords,b.coords]},
      properties:{tooltip:e.tooltip,cases:e.cases,width:e.cases>=24?4.6:e.cases>=12?3.2:2.2}}];
  })};
}
function addClusterLayers(){
  if(!map.getSource("cluster")) map.addSource("cluster",{type:"geojson",data:clusterFC()});
  if(!map.getSource("reach")) map.addSource("reach",{type:"geojson",data:activeReach()});
  if(!map.getSource("flows")) map.addSource("flows",{type:"geojson",data:flowFeatureCollection()});
  if(!map.getSource("reform-rings")) map.addSource("reform-rings",{type:"geojson",data:reformRingFC()});
  if(!map.getLayer("reach-fill")){
    map.addLayer({id:"reach-fill",type:"fill",source:"reach",
      paint:{"fill-color":getCss("--accent-strong"),"fill-opacity":0.08}});
    map.addLayer({id:"reach-line",type:"line",source:"reach",
      paint:{"line-color":getCss("--accent-strong"),"line-width":1.4,"line-dasharray":[2,2],"line-opacity":0.6}});
  }
  if(!map.getLayer("flows-line"))
    map.addLayer({id:"flows-line",type:"line",source:"flows",
      paint:{"line-color":getCss("--accent-strong"),"line-width":["get","width"],"line-opacity":0.52}});
  if(!map.getLayer("reform-rings-line"))
    map.addLayer({id:"reform-rings-line",type:"line",source:"reform-rings",
      paint:{"line-color":ringColor(),"line-width":1.8,"line-dasharray":[2,2],"line-opacity":0.9}});
  if(!map.getLayer("cluster-glow"))
    map.addLayer({id:"cluster-glow",type:"circle",source:"cluster",filter:["==",["get","focus"],true],
      paint:{"circle-radius":["+",["get","r"],11],"circle-color":getCss("--accent"),
        "circle-opacity":0.28,"circle-blur":0.8}});
  if(!map.getLayer("cluster-circ"))
    map.addLayer({id:"cluster-circ",type:"circle",source:"cluster",
      paint:{"circle-radius":["get","r"],"circle-color":["get","color"],
        "circle-stroke-width":["get","sw"],"circle-stroke-color":ringColor(),
        "circle-opacity":["case",["get","inNbh"],0.92,0.34]}});
  if(!map.getLayer("cluster-lbl"))
    map.addLayer({id:"cluster-lbl",type:"symbol",source:"cluster",
      layout:{"text-field":["get","name"],"text-size":11,"text-offset":[0,1.4],
        "text-anchor":"top","text-font":["Noto Sans Regular"],"text-allow-overlap":false},
      paint:{"text-color":getCss("--text"),"text-halo-color":getCss("--bg"),"text-halo-width":1.6}});
}
function paintCluster(){
  if(map&&map.getSource("cluster")){
    map.getSource("cluster").setData(clusterFC());
    map.getSource("reach").setData(activeReach());
    if(map.getSource("flows"))map.getSource("flows").setData(flowFeatureCollection());
    if(map.getSource("reform-rings"))map.getSource("reform-rings").setData(reformRingFC());
    map.setPaintProperty("cluster-circ","circle-stroke-color",ringColor());
    if(map.getLayer("reform-rings-line"))map.setPaintProperty("reform-rings-line","line-color",ringColor());
  }
}
/* Karte fittet die Isochrone/Erreichbarkeit des Fokus-Hauses + Panel-Offset (#1) */
function frameCluster(){
  if(!map)return;
  const g=activeReach();
  const b=new maplibregl.LngLatBounds();
  g.geometry.coordinates[0].forEach(p=>b.extend(p));
  const cv=map.getCanvas(), cw=cv.clientWidth, ch=cv.clientHeight;
  const pw=parseFloat(getComputedStyle(document.querySelector(".panel-float")).width)||440;
  // rechtes Padding = Panelbreite, solange links genug Karte bleibt; sonst zentriert (schmal/mobil)
  let pad;
  if(matchMedia("(max-width:760px)").matches){
    const fb=document.querySelector(".filterbar")?.getBoundingClientRect();
    const panel=document.querySelector(".panel-float")?.getBoundingClientRect();
    const top=Math.min(ch*0.34,(fb?.bottom||56)+14);
    const bottom=Math.min(ch*0.62,Math.max(80,ch-(panel?.top||ch)+20));
    const side=Math.min(34,cw*0.08);
    pad={top,bottom,left:side,right:side};
  }else if(cw-pw>220) pad={top:70,bottom:60,left:60,right:pw+50};
  else {const px=Math.min(40,cw*0.1),py=Math.min(40,ch*0.1); pad={top:py,bottom:py,left:px,right:px};}
  map.fitBounds(b,{padding:pad,maxZoom:12,duration:600});
}
function initMap(){
  const dark=!document.documentElement.classList.contains("theme-hell");
  map=new maplibregl.Map({container:"mapHost",style:dark?MAP_STYLE_DUNKEL:MAP_STYLE_HELL,
    center:CLINICS[STATE.focus].coords,zoom:9,attributionControl:{compact:true}});
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),"bottom-left");
  map.on("load",()=>{addClusterLayers();frameCluster();wireMap();});
}
function wireMap(){
  map.on("click","cluster-circ",e=>{const f=e.features[0]; if(f) setFocus(f.properties.id,{mapClick:true});});
  map.on("mouseenter","cluster-circ",()=>map.getCanvas().style.cursor="pointer");
  map.on("mouseleave","cluster-circ",()=>{map.getCanvas().style.cursor="";if(hoverPop){hoverPop.remove();hoverPop=null;}});
  map.on("mousemove","cluster-circ",e=>{
    const f=e.features[0]; if(!f)return;
    if(!hoverPop) hoverPop=new maplibregl.Popup({closeButton:false,closeOnClick:false,offset:12});
    hoverPop.setLngLat(f.geometry.coordinates)
      .setHTML(`<b>${f.properties.name}</b><span class="pop-val">${f.properties.popval}</span>`).addTo(map);
  });
  map.on("mousemove","flows-line",e=>{
    const f=e.features[0]; if(!f)return;
    if(!hoverPop) hoverPop=new maplibregl.Popup({closeButton:false,closeOnClick:false,offset:12});
    hoverPop.setLngLat(e.lngLat).setHTML(`<b>Reform-Fluss</b><span class="pop-val">${f.properties.tooltip}</span>`).addTo(map);
  });
  map.on("mouseleave","flows-line",()=>{if(hoverPop){hoverPop.remove();hoverPop=null;}});
}

/* Offline-Isochrone (Produktion): contour je Haus aus ../varianten/analysen-isochronen.geojson,
   gemappt {id: Feature}. Graceful Fallback auf den Kreis (#2B), wenn die Datei fehlt
   oder ein Haus keine Isochrone hat. */
function applyIso(){ renderPanel(); if(map&&map.getSource("reach")){paintCluster();frameCluster();} }
function loadIso(){
  fetch("../varianten/analysen-isochronen.geojson").then(r=>r.ok?r.json():null).then(fc=>{
    ISO=(fc&&fc.features)?Object.fromEntries(
      fc.features.filter(f=>f.properties&&f.properties.id).map(f=>[f.properties.id,f])):null;
    applyIso();
  }).catch(()=>{ISO=null;applyIso();});
}

/* ---------- Fokus / Linse wechseln ---------- */
