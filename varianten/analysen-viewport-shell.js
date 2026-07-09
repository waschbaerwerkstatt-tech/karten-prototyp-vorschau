/* ---------- Ansichtswechsler ---------- */
function setViewMenuOpen(open){
  document.getElementById("viewMenu").classList.toggle("open",open);
  document.getElementById("brandTrigger").setAttribute("aria-expanded",open?"true":"false");
}
document.getElementById("brandTrigger").addEventListener("click",()=>setViewMenuOpen(!document.getElementById("viewMenu").classList.contains("open")));
addEventListener("keydown",e=>{if(e.key==="Escape")setViewMenuOpen(false);});
document.addEventListener("click",e=>{
  if(!e.target.closest("#viewMenu"))setViewMenuOpen(false);
  if(!e.target.closest(".search"))closeSearchResults();
});
let _mapFrameResize;
function scheduleMapFrame(){
  clearTimeout(_mapFrameResize);
  _mapFrameResize=setTimeout(()=>{ if(map){ map.resize(); frameCluster(); } },120);
}
function settleInitialViewport(){
  try{document.activeElement&&document.activeElement.blur&&document.activeElement.blur();}catch(_){}
  [120,420,900,1600].forEach(t=>setTimeout(()=>{
    applySheet();
    scheduleMapFrame();
  },t));
}
addEventListener("resize",scheduleMapFrame);
addEventListener("orientationchange",scheduleMapFrame);
if(window.visualViewport) visualViewport.addEventListener("resize",scheduleMapFrame);
addEventListener("pageshow",settleInitialViewport);
