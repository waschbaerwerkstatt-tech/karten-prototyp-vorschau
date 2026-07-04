/* ============ Daten laden, dann Layer aufbauen ============ */
async function loadKliniken(){
  // Bevorzugt die beim Deploy eingebettete (mit-verschlüsselte) GeoJSON; nur lokal
  // bleibt der Marker stehen und wir fetchen die Datei vom Dev-Server.
  const el=document.getElementById("kliniken-data");
  const raw=el?el.textContent.trim():"";
  if(raw.charAt(0)==="{")return JSON.parse(raw);
  // no-store: der Prototyp-Export wird neu erzeugt; alte gecachte geojson würde sonst alles grau zeigen.
  return fetch("data/kliniken.geojson",{cache:"no-store"}).then(r=>r.json());
}
async function start(){
  DATA=await loadKliniken();
  FEATS=DATA.features;
  FEATS.forEach(f=>{f.properties.entFiltered=0;byId.set(f.properties.standort_id,f);});
  // Normalisierten Such-Blob je Feature vorberechnen: Name, Träger, Ort, Region
  // plus je Entwicklung deren Themen und je Meldung deren Schlagzeile.
  FEATS.forEach(f=>{const p=f.properties;const parts=[p.name,p.traeger,p.city,p.region];(p.developments||[]).forEach(d=>{(d.topics||[]).forEach(t=>parts.push(t));(d.items||[]).forEach(m=>parts.push(m.titel));});p._searchBlob=searchNorm(parts.join(" "));});
  addClinicLayers();
  renderPanel();
  goHome(0);
}
if(map.isStyleLoaded())start();
else map.on("load",start);
