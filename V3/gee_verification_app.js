// MUSANGA — verification + exhaustive circle digitizing (pilot).
// 60 unique polygons (source NB06: 68 features, 8 duplicate aliases removed).
// Lazy-load each circle's RGB once; cache feature outlines; bright yellow transparent polygon.
// Export classifications of 60 unique polygons; original mapping stays in NB06 CSV.

var ROOT = 'projects/musanga-511110/assets/Verification/';
var POLYGON_ASSET = ROOT + 'verification_unique';
var CIRCLE_ASSET = ROOT + 'circles_6';
var RGB_ASSETS = {
  8: ROOT + 'circle_08_UAV_RGB',
  12: ROOT + 'circle_12_UAV_RGB',
  13: ROOT + 'circle_13_UAV_RGB',
  16: ROOT + 'circle_16_UAV_RGB',
  21: ROOT + 'circle_21_UAV_RGB',
  33: ROOT + 'circle_33_UAV_RGB'
};
var CIRCLE_IDS=[8,12,13,16,21,33];
var EXPECTED={8:10,12:11,13:8,16:10,21:10,33:11};

var data = ee.FeatureCollection(POLYGON_ASSET).getInfo();
if (!data || !data.features || data.features.length !== 60) {
  throw Error('Expected 60 UNIQUE verification features; received ' +
    (data && data.features ? data.features.length : 'no features'));
}
var fields = Object.keys(data.features[0].properties);
var ID_FIELD = fields.indexOf('verify_id')>=0 ? 'verify_id' : null;
if (!ID_FIELD || fields.indexOf('circle_id') < 0) {
  throw Error('Expected verify_id and circle_id. Actual properties: '+fields.join(', '));
}

// Coordinates come from the SAME feature as ID and circle.
// GeoJSON geometry is passed directly to ee.Geometry when displayed.
var rawFC = ee.FeatureCollection(POLYGON_ASSET);
var missingGeometryIds = [];
var allRows = data.features.map(function(feature) {
  var id = String(feature.properties[ID_FIELD]);
  var cid = Number(feature.properties.circle_id);
  var geom = feature.geometry;
  if (!geom || !geom.coordinates || !geom.coordinates.length) {
    // Bulk Earth Engine collection metadata sometimes omits feature geometry.
    // Attempt an independent retrieval by ID before marking unavailable.
    try {
      geom = ee.Feature(rawFC.filter(ee.Filter.eq(ID_FIELD,id)).first())
        .geometry().getInfo();
      if (!geom || !geom.coordinates || !geom.coordinates.length) geom = null;
    } catch (ex) {
      geom = null;
      print('Geometry lookup failed for '+id+':', String(ex));
    }
  }
  if (!geom) {
    missingGeometryIds.push(id);
    return {id:id,cid:cid,geometry:null,extent:null,center:null};
  }
  var xs=[],ys=[];
  function walk(c) {
    if (!Array.isArray(c) || !c.length) return;
    if (typeof c[0] === 'number') {xs.push(c[0]);ys.push(c[1]);}
    else c.forEach(walk);
  }
  walk(geom.coordinates);
  if (!xs.length) {
    missingGeometryIds.push(id);
    return {id:id,cid:cid,geometry:null,extent:null,center:null};
  }
  var extent=[Math.min.apply(null,xs),Math.min.apply(null,ys),
              Math.max.apply(null,xs),Math.max.apply(null,ys)];
  return {id:id,cid:cid,geometry:geom,
    extent:extent,center:[(extent[0]+extent[2])/2,(extent[1]+extent[3])/2]};
}).sort(function(a,b) {return a.id.localeCompare(b.id);});
print('Features with no retrievable polygon geometry:', missingGeometryIds);
var seen={},counts={8:0,12:0,13:0,16:0,21:0,33:0};
allRows.forEach(function(r) {
  if (seen[r.id]) throw Error('Duplicate verify_id: '+r.id);
  seen[r.id]=true;
  if (!Object.prototype.hasOwnProperty.call(counts,r.cid))
    throw Error('Unexpected circle: '+r.cid);
  counts[r.cid]++;
});
Object.keys(EXPECTED).forEach(function(k) {
  if (counts[k]!==EXPECTED[k]) throw Error('Circle '+k+
    ' expected '+EXPECTED[k]+' polygons; received '+counts[k]);
});
var rows=allRows.filter(function(r){return !!r.geometry;});
print('Musanga v10: 60 unique features in 6 circles');
print('Per-circle feature counts:',counts);
print('Missing geometries (excluded from review, flagged in export):',missingGeometryIds);
if (rows.length!==60) print('WARNING: only '+rows.length+' of 60 geometries displayable.');

var answers={},index=0,currentCircle=null;
// Initialize these once, not inside show(). Image layers are retained between
// polygon transitions in the same circle, avoiding unnecessary mosaic reloads.
var circleLayers={};
var selectedLayers={};
function getCircleLayers(cid) {
  if (!circleLayers[cid]) {
    // Lazily create RGB + boundary only for a visited circle.
    circleLayers[cid]=[
      ui.Map.Layer(ee.Image(RGB_ASSETS[cid]),
        {bands:['b1','b2','b3'],min:0,max:255},
        'UAV RGB circle '+cid,true),
      ui.Map.Layer(
        ee.FeatureCollection(CIRCLE_ASSET)
          .filter(ee.Filter.eq('circle_id',cid))
          .style({color:'00FFFF',fillColor:'00000000',width:2}),
        {},'Nadine circle boundary',true)
    ];
  }
  return circleLayers[cid];
}
function getSelectedLayer(r) {
  if (!selectedLayers[r.id]) {
    // Cached per-ID, sourced from that ID's geometry. No ID-to-polygon lookup.
    var feature=ee.Feature(ee.Geometry(r.geometry),{verify_id:r.id});
    selectedLayers[r.id]=ui.Map.Layer(
      ee.FeatureCollection([feature]).style({
        color:'FFFF00',fillColor:'00000000',width:3
      }),{},'ACTIVE POLYGON: '+r.id,true
    );
  }
  return selectedLayers[r.id];
}
var map=ui.Map();
map.setOptions('SATELLITE');
map.setLocked(false,0,24);
var side=ui.Panel({style:{width:'510px',padding:'10px'}});
var verifyPanel=ui.Panel({style:{stretch:'horizontal'}});
var digitizePanel=ui.Panel({style:{stretch:'horizontal',shown:false}});
var appMode='verify';
var progress=ui.Label('',{fontWeight:'bold'});
var idLabel=ui.Label('',{fontWeight:'bold',fontSize:'16px'});
var coordLabel=ui.Label('',{fontSize:'11px'});
var status=ui.Label('');
var csvLink=ui.Label('',{color:'blue'});
var csvPreview=ui.Label('',{whiteSpace:'pre-wrap',fontSize:'10px',shown:false});
var jump=ui.Select({
  items:rows.map(function(r,i) {return {label:(i+1)+' / '+rows.length+': '+r.id,value:String(i)};}),
  onChange:function(value) {if(value!==null) show(Number(value));},
  style:{stretch:'horizontal'}
});
side.add(ui.Label('Musanga Explorer — crowns & circle annotation',
  {fontSize:'19px',fontWeight:'bold'}));
side.add(ui.Label('Choose an objective. Verification answers and drawn crowns are session-local.'));
var objective=ui.Select({
  items:[
    {label:'1 — Verify existing crowns (60)',value:'verify'},
    {label:'2 — Exhaustively delineate Musanga in a circle',value:'digitize'}
  ],
  value:'verify',
  onChange:function(value){setObjective(value);},
  style:{stretch:'horizontal'}
});
side.add(objective);
side.add(verifyPanel);
side.add(digitizePanel);
verifyPanel.add(ui.Label('Bright yellow outline = active verification polygon (transparent fill).'));
verifyPanel.add(progress);verifyPanel.add(idLabel);verifyPanel.add(coordLabel);
verifyPanel.add(jump);

// The high-resolution close-up is always on, and automatically updates.
// It uses original RGB pixel values from the uploaded clipped orthomosaic.
// The bright yellow crown boundary is rendered over the same geometry as map.
var inspector=ui.Panel({style:{stretch:'horizontal'}});
var closeupCache={};  // cache thumbnail widgets per ID + selected viewing mode
var inspectMode=ui.Select({
  items:[
    {label:'Whole crown + context',value:'whole'},
    {label:'Centre ×2',value:'double'}
  ],
  value:'whole',
  onChange:function(value) { showCloseup(); },
  style:{stretch:'horizontal'}
});
function showCloseup() {
  var r=rows[index];
  var mode=inspectMode.getValue() || 'whole';
  var key=r.id+'_'+mode;
  inspector.clear();
  if(closeupCache[key]) {
    inspector.add(closeupCache[key]);
    return;
  }
  var panel=ui.Panel({style:{stretch:'horizontal'}});
  panel.add(ui.Label('Loading '+r.id+' ...'));
  inspector.add(panel);

  // View rectangle centred on the actual polygon extent, with a context
  // margin. No spatial reprojection of the polygon is needed.
  var latitude=r.center[1];
  var metresPerLon=111320*Math.cos(latitude*Math.PI/180);
  var metresPerLat=110574;
  var widthM=(r.extent[2]-r.extent[0])*metresPerLon;
  var heightM=(r.extent[3]-r.extent[1])*metresPerLat;
  var frameM=Math.max(3,Math.max(widthM,heightM)*1.4);
  var scaleFactor=mode==='double'?2:1;
  var halfM=frameM/(2*scaleFactor);
  var region=ee.Geometry.Rectangle([
    r.center[0]-halfM/metresPerLon,
    r.center[1]-halfM/metresPerLat,
    r.center[0]+halfM/metresPerLon,
    r.center[1]+halfM/metresPerLat
  ],null,false);

  // Overlay exactly the same polygon geometry used in the map, with
  // an unfilled yellow outline. Paint occurs in the thumbnail render grid.
  var rgb=ee.Image(RGB_ASSETS[r.cid]).visualize({
    bands:['b1','b2','b3'],min:0,max:255
  });
  var crown=ee.FeatureCollection([ee.Feature(ee.Geometry(r.geometry))]);
  var outline=ee.Image().byte().paint(crown,1,3)
      .selfMask().visualize({palette:['FFFF00']});
  var picture=ui.Thumbnail({
    image:rgb.blend(outline),
    params:{region:region,dimensions:'1100x1100',format:'png'},
    style:{width:'470px',height:'470px',margin:'4px 0 4px 0'}
  });
  panel.clear();
  panel.add(ui.Label(r.id+' — '+(mode==='double'?'Centre ×2':'Whole crown + context')+
    ' | frame '+(frameM/scaleFactor).toFixed(1)+' m'));
  panel.add(picture);
  panel.add(ui.Label('Yellow = selected crown boundary, no fill. Native imagery is not downsampled in NB06.',
    {color:'gray',fontSize:'11px'}));
  closeupCache[key]=panel;
}
verifyPanel.add(ui.Label('Magnified crown (automatic)',
  {fontWeight:'bold',fontSize:'14px'}));
verifyPanel.add(inspectMode);
verifyPanel.add(inspector);

function show(n) {
  if(n<0 || n>=rows.length) {
    status.setValue(n>=rows.length?'End of displayable polygons. Download CSV.':'Already at first polygon.');
    return;
  }
  index=n;
  var r=rows[index];
  var selectedLayer=getSelectedLayer(r);

  if (currentCircle !== r.cid) {
    // Changing circles: change the UAV mosaic and circle boundary once.
    // Keep the image layer object stable while reviewing this circle.
    var baseLayers=getCircleLayers(r.cid);
    map.layers().reset([baseLayers[0],baseLayers[1],selectedLayer]);
    currentCircle=r.cid;
  } else {
    // Same circle: preserve the RGB + boundary layer objects and their tiles.
    // Replace ONLY the red selected polygon layer.
    map.layers().set(2,selectedLayer);
  }
  map.setCenter(r.center[0],r.center[1],24);
  idLabel.setValue(r.id+'   (circle '+r.cid+')');
  coordLabel.setValue('Longitude '+r.center[0].toFixed(7)+
    ' | Latitude '+r.center[1].toFixed(7));
  progress.setValue('Candidate '+(index+1)+'/'+rows.length+' | classified '+Object.keys(answers).length+'/'+rows.length
    +' | '+(answers[r.id] || 'UNREVIEWED'));
  status.setValue('');
  showCloseup();  // Refresh automatically when moving to another crown.
  // Polygon ID and coordinates above identify the current feature.
}
function record(label) {
  answers[rows[index].id]=label;
  if(index<rows.length-1) show(index+1);
  else {
    progress.setValue('End of '+rows.length+': '+Object.keys(answers).length+'/'+rows.length+' classified');
    status.setValue('Final polygon recorded. Prepare CSV below.');
  }
}
function btn(name,fn) {
  return ui.Button({label:name,onClick:fn,style:{stretch:'horizontal'}});
}
var nav=ui.Panel({layout:ui.Panel.Layout.flow('horizontal')});
nav.add(btn('◀ Previous',function(){show(index-1);}));
nav.add(btn('Next ▶',function(){show(index+1);}));
verifyPanel.add(nav);
verifyPanel.add(btn('Musanga',function(){record('musanga');}));
verifyPanel.add(btn('Non-Musanga',function(){record('non_musanga');}));
verifyPanel.add(btn('Uncertain',function(){record('uncertain');}));
verifyPanel.add(btn('Clear current answer',function(){delete answers[rows[index].id];show(index);}));

function csvEscape(value) {return '"'+String(value).replace(/"/g,'""')+'"';}
function makeCSV() {
  // Source list already contains unique polygons only (60).
  // The 68-to-60 duplicate provenance mapping is retained by NB06 in
  // verification_68_source_mapping.csv, not fabricated in this app.
  var lines=['verify_id,circle_id,classification'];
  allRows.forEach(function(r) {
    lines.push(csvEscape(r.id)+','+r.cid+','+
      (r.geometry ? (answers[r.id]||'unreviewed') : 'missing_geometry'));
  });
  var csv=lines.join('\n')+'\n';
  csvPreview.setValue(csv);
  csvPreview.style().set('shown',true);
  csvLink.setValue('Download 60-row classifications CSV');
  csvLink.setUrl('data:text/csv;charset=utf-8,'+encodeURIComponent(csv));
  status.setValue('60 unique IDs in CSV; the separate NB06 mapping preserves all 68 source IDs.');
}
verifyPanel.add(btn('Prepare CSV download',makeCSV));
verifyPanel.add(csvLink);verifyPanel.add(status);verifyPanel.add(csvPreview);
verifyPanel.add(ui.Label('Answers remain only in this browser session. Export before exiting.',
  {color:'#a22'}));

////////////////////////////////////////////////////////////////
// OBJECTIVE 2 — EXHAUSTIVE MUSANGA CROWN DIGITIZATION
////////////////////////////////////////////////////////////////
// Earth Engine App drawing layers are session-local. GeoJSON download is
// intentionally explicit; nothing is written to the user's Drive or EE Assets.
var circleInfo=ee.FeatureCollection(CIRCLE_ASSET).getInfo();
var circleGeometries={};
var circleCenters={};
function centreFromGeoJSON(geom) {
  var xs=[],ys=[];
  function scan(v) {
    if (!Array.isArray(v) || !v.length)return;
    if(typeof v[0]==='number'){xs.push(v[0]);ys.push(v[1]);}
    else v.forEach(scan);
  }
  scan(geom.coordinates);
  if(!xs.length)throw Error('Empty circle geometry');
  return [(Math.min.apply(null,xs)+Math.max.apply(null,xs))/2,
          (Math.min.apply(null,ys)+Math.max.apply(null,ys))/2];
}
circleInfo.features.forEach(function(f) {
  var id=Number(f.properties.circle_id);
  if(CIRCLE_IDS.indexOf(id)<0)return;
  circleGeometries[id]=f.geometry;
  circleCenters[id]=centreFromGeoJSON(f.geometry);
});
CIRCLE_IDS.forEach(function(cid){
  if(!circleGeometries[cid])throw Error('Missing GEE circle geometry '+cid);
});

var tools=map.drawingTools();
tools.setLinked(false);
tools.setDrawModes(['polygon']);
tools.setShown(false);
var annotationLayers={};
CIRCLE_IDS.forEach(function(cid){
  annotationLayers[cid]=tools.addLayer([],
    'Musanga crowns — circle '+cid,'#00FF00',false,false);
});
var activeDigitCircle=13;
var digitStatus=ui.Label('',{whiteSpace:'pre-wrap'});
var digitCounts=ui.Label('',{fontWeight:'bold'});
var geojsonLink=ui.Label('',{color:'blue'});
var geojsonPreview=ui.Label('',{fontSize:'10px',whiteSpace:'pre-wrap',shown:false});
var reviewer=ui.Textbox({placeholder:'Reviewer name / code (optional)',
  style:{stretch:'horizontal'}});
var circlePicker=ui.Select({
  items:CIRCLE_IDS.map(function(cid){return {label:'Circle '+cid,value:String(cid)};}),
  value:'13',
  onChange:function(value){activateDigitCircle(Number(value));},
  style:{stretch:'horizontal'}
});
digitizePanel.add(ui.Label('Objective 2 — exhaustive annotation of one entire circle',
  {fontWeight:'bold',fontSize:'15px'}));
digitizePanel.add(ui.Label(
  'Draw every visible Musanga crown in the selected circle. Green polygons are YOUR new annotations; cyan shows the circle boundary. Use the map drawing toolbar to edit vertices or erase polygons.'));
digitizePanel.add(circlePicker);
digitizePanel.add(reviewer);
digitizePanel.add(digitCounts);
function annotationCount(cid) {
  return annotationLayers[cid].geometries().length();
}
function refreshDigitCounts() {
  var total=0;
  CIRCLE_IDS.forEach(function(cid){total+=annotationCount(cid);});
  digitCounts.setValue('Circle '+activeDigitCircle+': '+annotationCount(activeDigitCircle)+
    ' drawn crowns | total: '+total+' across 6 circles');
}
function digitMessage(message){digitStatus.setValue(message);}
function activateDigitCircle(cid){
  if (!annotationLayers[cid])throw Error('Unsupported annotation circle: '+cid);
  tools.stop();
  activeDigitCircle=cid;
  CIRCLE_IDS.forEach(function(id){annotationLayers[id].setShown(id===cid);});
  tools.setSelected(annotationLayers[cid]);
  var layers=getCircleLayers(cid);
  map.layers().reset([layers[0],layers[1]]);
  currentCircle=null; // restore the active verification outline on returning
  map.setCenter(circleCenters[cid][0],circleCenters[cid][1],20);
  if(appMode==='digitize')tools.setShown(true);
  refreshDigitCounts();
  digitMessage('Circle '+cid+' ready. Zoom in, then press Draw new crown. '+
    'Draw all Musanga crowns, including those crossing the cyan boundary. '+
    'Their geometries will be clipped to the circle when exported.');
  geojsonLink.setValue('');
  geojsonLink.setUrl('');
}
tools.onDraw(function(){refreshDigitCounts();geojsonLink.setValue('');});
tools.onEdit(function(){refreshDigitCounts();geojsonLink.setValue('');});
tools.onErase(function(){refreshDigitCounts();geojsonLink.setValue('');});
digitizePanel.add(btn('Draw new Musanga crown',function(){
  tools.setSelected(annotationLayers[activeDigitCircle]);
  tools.setShape('polygon');
  tools.draw();
  digitMessage('Click around the crown in the UAV map. Double-click to finish.');
}));
digitizePanel.add(btn('Stop drawing / edit existing crowns',function(){
  tools.stop();
  digitMessage('Select an existing green polygon in the map toolbar to edit or erase it.');
}));
digitizePanel.add(btn('Undo most recently drawn polygon in this circle',function(){
  tools.stop();
  var list=annotationLayers[activeDigitCircle].geometries();
  if(list.length()){
    list.remove(list.length()-1);
    refreshDigitCounts();
    geojsonLink.setValue('');
    digitMessage('Last polygon removed. Export again after edits.');
  } else digitMessage('There are no polygons in this circle.');
}));
digitizePanel.add(ui.Label('Export polygons as GeoJSON',
  {fontWeight:'bold',fontSize:'14px'}));
digitizePanel.add(ui.Label(
  'Exports all six circle layers as one GeoJSON FeatureCollection. Only the portion within each circle is saved. Export before closing or refreshing this browser tab.'));
function exportDigitization(){
  tools.stop();
  var features=[],skipped=[],indexByCircle={};
  CIRCLE_IDS.forEach(function(cid){
    indexByCircle[cid]=0;
    var geometries=annotationLayers[cid].geometries();
    for(var i=0;i<geometries.length();i++){
      try{
        // Clip each hand-drawn crown exactly at the assigned circle boundary.
        var clipped=ee.Geometry(geometries.get(i)).intersection(
          ee.Geometry(circleGeometries[cid]),ee.ErrorMargin(0.1));
        var area=clipped.area(0.1).getInfo();
        if(!area || area<=0){skipped.push('circle '+cid+' polygon '+(i+1));continue;}
        var geo=clipped.getInfo();
        indexByCircle[cid]++;
        features.push({type:'Feature',properties:{
          crown_id:'C'+cid+'_M'+('00000'+indexByCircle[cid]).slice(-5),
          circle_id:cid,class_name:'Musanga',annotation_method:'manual_exhaustive',
          reviewer:reviewer.getValue()||'',
          area_m2:Number(area.toFixed(2)),
          annotation_status:'draft'
        },geometry:geo});
      }catch(err) {
        skipped.push('circle '+cid+' polygon '+(i+1)+': '+String(err));
      }
    }
  });
  if(skipped.length){
    digitMessage('EXPORT NOT READY: '+skipped.length+
      ' polygon(s) failed or fell outside their circle. Check: '+skipped.join('; '));
    geojsonLink.setValue('');return;
  }
  // Use Earth Engine's actual file-download endpoint, not a data: URI.
  // A data: URI frequently opens GeoJSON directly in the browser instead.
  if (!features.length) {
    digitMessage('No crowns have been drawn yet. Draw at least one polygon before exporting.');
    geojsonLink.setValue('');
    geojsonLink.setUrl('');
    return;
  }
  var fc=ee.FeatureCollection(features.map(function(f){
    return ee.Feature(ee.Geometry(f.geometry), f.properties);
  }));
  geojsonLink.setValue('Preparing GeoJSON file download ...');
  geojsonLink.setUrl('');
  digitMessage('Creating an actual .geojson download link for '+features.length+
    ' crown polygons. Please wait.');
  fc.getDownloadURL({
    format:'geojson',
    filename:'Musanga_exhaustive_crown_annotations'
  },function(downloadUrl,error){
    if(error || !downloadUrl){
      geojsonLink.setValue('');
      geojsonLink.setUrl('');
      digitMessage('GeoJSON export failed: '+String(error||'No download URL returned')+
        '. Your drawn crowns remain in this browser session.');
      return;
    }
    geojsonLink.setValue('Download '+features.length+' crowns (.geojson file)');
    geojsonLink.setUrl(downloadUrl);
    digitMessage('File ready. Click the blue download link; your browser will '+
      'download Musanga_exhaustive_crown_annotations.geojson. '+
      'Drawings remain session-local until exported.');
  });
}
digitizePanel.add(btn('Prepare GeoJSON download',exportDigitization));
digitizePanel.add(geojsonLink);
digitizePanel.add(digitStatus);
digitizePanel.add(ui.Label(
  'Pilot: no persistent storage or collaboration sync. Draw/edit in the main map; '+
  'the magnified thumbnail belongs to Objective 1 only.',
  {color:'#a22'}));

function setObjective(mode){
  appMode=mode;
  tools.stop();
  verifyPanel.style().set('shown',mode==='verify');
  digitizePanel.style().set('shown',mode==='digitize');
  if(mode==='digitize'){
    activateDigitCircle(activeDigitCircle);
    tools.setShown(true);
  }else{
    tools.setShown(false);
    CIRCLE_IDS.forEach(function(cid){annotationLayers[cid].setShown(false);});
    currentCircle=null;
    show(index);
  }
}

ui.root.clear();
ui.root.add(ui.SplitPanel({firstPanel:side,secondPanel:map,orientation:'horizontal',wipe:false}));
// Start with Yoko circle 13, preserving sorted order within that circle.
var firstCircle13=-1;
for (var i=0;i<rows.length;i++) {
  if (rows[i].cid===13) {firstCircle13=i;break;}
}
if(firstCircle13<0)throw Error('No review polygons for circle 13');
show(firstCircle13);
