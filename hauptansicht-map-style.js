/* Adapter um das generierte styles.js-Asset.
   Die Hauptansicht spricht nur ueber diese Funktionen mit den globalen
   MAP_STYLE_HELL/MAP_STYLE_DUNKEL-Konstanten. */
function getMapStyle(theme){
  return theme==="hell"?MAP_STYLE_HELL:MAP_STYLE_DUNKEL;
}

function getCountryLabelFilter(theme,layerId){
  const layer=(getMapStyle(theme).layers||[]).find(x=>x.id===layerId);
  return layer?layer.filter:undefined;
}
