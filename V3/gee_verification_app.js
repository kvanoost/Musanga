// MUSANGA — verification app, strict one-feature/one-ID mode.
// 47 source records -> 39 unique polygons. Download results BEFORE closing session.
// v4: each displayed geometry is derived from the same exact feature record as its ID.
// No separate array aggregations, no polygon filter lookup and no preloaded selected layers.

var ROOT = 'projects/musanga-511110/assets/Verification/';
var POLYGON_ASSET = ROOT + 'verification_4circles';
var CIRCLE_ASSET = ROOT + 'circles_4';
var RGB_ASSETS = {
  13: ROOT + 'circle_13_UAV_RGB',
  16: ROOT + 'circle_16_UAV_RGB',
  21: ROOT + 'circle_21_UAV_RGB',
  33: ROOT + 'circle_33_UAV_RGB'
};
var EXPECTED = {13:16,16:10,21:10,33:11};
var EXPECTED_UNIQUE = {13:8,16:10,21:10,33:11};
// Exact duplicate geometry pairs established by independent Colab IoU=1 checks.
var DUPLICATE_OF = {};
for (var dupeIndex=0;dupeIndex<8;dupeIndex++) {
  var originalId='C13_V'+('00000'+(11+dupeIndex)).slice(-5);
  var duplicateId='C13_V'+('00000'+(19+dupeIndex)).slice(-5);
  DUPLICATE_OF[duplicateId]=originalId;
}

var data = ee.FeatureCollection(POLYGON_ASSET).getInfo();
if (!data || !data.features || data.features.length !== 47) {
  throw Error('Expected 47 verification features; received ' +
    (data && data.features ? data.features.length : 'no features'));
}
var fields = Object.keys(data.features[0].properties);
var ID_FIELD = fields.indexOf('verification_id') >= 0 ? 'verification_id'
  : fields.indexOf('verificati') >= 0 ? 'verificati' : null;
if (!ID_FIELD || fields.indexOf('circle_id') < 0) {
  throw Error('Missing ID or circle_id. Actual properties: ' + fields.join(', '));
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
var seen={};var counts={13:0,16:0,21:0,33:0};
allRows.forEach(function(r) {
  if (seen[r.id]) throw Error('Duplicate verification ID: '+r.id);
  seen[r.id]=true;
  if (!(r.cid in counts)) throw Error('Unexpected circle '+r.cid);
  counts[r.cid]++;
});
Object.keys(EXPECTED).forEach(function(k) {
  if (counts[k] !== EXPECTED[k]) throw Error('Wrong polygon count in circle '+k);
});
// Verify every known duplicate exists and has same circle and near-identical geometry.
Object.keys(DUPLICATE_OF).forEach(function(duplicateId) {
  var originalId=DUPLICATE_OF[duplicateId];
  var a=allRows.filter(function(r){return r.id===originalId;})[0];
  var b=allRows.filter(function(r){return r.id===duplicateId;})[0];
  if(!a || !b || a.cid!==13 || b.cid!==13) throw Error('Missing/misassigned duplicate '+duplicateId);
  var dx=(a.center[0]-b.center[0])*111320*Math.cos(a.center[1]*Math.PI/180);
  var dy=(a.center[1]-b.center[1])*110574;
  if(Math.sqrt(dx*dx+dy*dy)>0.01) throw Error('Duplicate geometry changed: '+duplicateId);
});
var rows=allRows.filter(function(r){return !DUPLICATE_OF[r.id] && r.geometry;});
var missingCanonical=allRows.filter(function(r){return !DUPLICATE_OF[r.id] && !r.geometry;});
if(rows.length+missingCanonical.length!==39) throw Error('Incorrect source polygon count after deduplication');
if(missingCanonical.length) print('UNAVAILABLE for classification (source geometry missing):',
  missingCanonical.map(function(r){return r.id;}));
var uniqueCounts={13:0,16:0,21:0,33:0};
rows.forEach(function(r){uniqueCounts[r.cid]++;});
Object.keys(EXPECTED_UNIQUE).forEach(function(k){
  if(uniqueCounts[k]+missingCanonical.filter(function(r){return String(r.cid)===String(k);}).length!==EXPECTED_UNIQUE[k])throw Error('Wrong unique count in circle '+k);
});
print('47 source IDs / 39 canonical IDs / '+rows.length+' displayable geometries / 8 duplicate pairs.');
print('Duplicate ID mapping:',DUPLICATE_OF);

// Geometry audit: exact duplicate shapes, and bounding boxes closer than 0.25 m.
var equalShapes=[],closeBoxes=[];
rows.forEach(function(a,i) {
  rows.slice(i+1).forEach(function(b) {
    if (a.cid !== b.cid) return;
    if (JSON.stringify(a.geometry) === JSON.stringify(b.geometry)) {
      equalShapes.push(a.id+' = '+b.id);
    }
    var dx=(a.center[0]-b.center[0])*111320*Math.cos(a.center[1]*Math.PI/180);
    var dy=(a.center[1]-b.center[1])*110574;
    if (Math.sqrt(dx*dx+dy*dy)<0.25) closeBoxes.push(a.id+' ~ '+b.id);
  });
});
print('NB06 v5 — deduplicated direct geometry mode. Unique feature count:',rows.length);
print('Exact duplicate geometry pairs:',equalShapes);
print('Specific pair C13_V00012/C13_V00020:', allRows.filter(function(r){return r.id==='C13_V00012'||r.id==='C13_V00020';}).map(function(r){return {id:r.id,center:r.center,extent:r.extent};}));
print('Nearly identical centers (<0.25 m):',closeBoxes);
print('Selected features (first 16):',rows.slice(0,16).map(function(r) {
  return {id:r.id,circle:r.cid,center:r.center,extent:r.extent};
}));

var answers={},index=0,currentCircle=null;
// Initialize these once, not inside show(). Image layers are retained between
// polygon transitions in the same circle, avoiding unnecessary mosaic reloads.
var circleLayers={};
[13,16,21,33].forEach(function(cid) {
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
});
var map=ui.Map();
map.setOptions('SATELLITE');
map.setLocked(false,0,24);
var side=ui.Panel({style:{width:'365px',padding:'10px'}});
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
side.add(ui.Label('Musanga — verification (v7 · faster mosaics)',{fontSize:'19px',fontWeight:'bold'}));
side.add(ui.Label('The RED polygon is the only active candidate. Missing source geometries are excluded and flagged in CSV.'));
side.add(progress);side.add(idLabel);side.add(coordLabel);
side.add(jump);

function show(n) {
  if(n<0 || n>=rows.length) {
    status.setValue(n>=rows.length?'End of displayable polygons. Download CSV.':'Already at first polygon.');
    return;
  }
  index=n;
  var r=rows[index];
  var geometry=ee.Geometry(r.geometry);
  // Draw each selected polygon from its own actual geometry and ID.
  var selected=ee.FeatureCollection([ee.Feature(geometry,{id:r.id})]);
  var selectedLayer=ui.Map.Layer(
    selected.style({color:'FF0000',fillColor:'FF000055',width:4}),
    {},'ACTIVE POLYGON: '+r.id,true
  );

  if (currentCircle !== r.cid) {
    // Changing circles: change the UAV mosaic and circle boundary once.
    // Keep the image layer object stable while reviewing this circle.
    var baseLayers=circleLayers[r.cid];
    map.layers().reset([baseLayers[0],baseLayers[1],selectedLayer]);
    currentCircle=r.cid;
  } else {
    // Same circle: preserve the RGB + boundary layer objects and their tiles.
    // Replace ONLY the red selected polygon layer.
    map.layers().set(2,selectedLayer);
  }
  map.setCenter(r.center[0],r.center[1],22);
  idLabel.setValue(r.id+'   (circle '+r.cid+')');
  coordLabel.setValue('Longitude '+r.center[0].toFixed(7)+
    ' | Latitude '+r.center[1].toFixed(7));
  progress.setValue('Candidate '+(index+1)+'/'+rows.length+' | classified '+Object.keys(answers).length+'/'+rows.length
    +' | '+(answers[r.id] || 'UNREVIEWED'));
  status.setValue('');
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
side.add(nav);
side.add(btn('Musanga',function(){record('musanga');}));
side.add(btn('Non-Musanga',function(){record('non_musanga');}));
side.add(btn('Uncertain',function(){record('uncertain');}));
side.add(btn('Clear current answer',function(){delete answers[rows[index].id];show(index);}));

function csvEscape(value) {return '"'+String(value).replace(/"/g,'""')+'"';}
function makeCSV() {
  // Export ALL original 47 identifiers, including the eight aliases, but
  // ask the user to classify only 39 unique crown geometries.
  var lines=['verification_id,circle_id,classification,canonical_id,is_duplicate'];
  allRows.forEach(function(r) {
    var canonical=DUPLICATE_OF[r.id] || r.id;
    lines.push(csvEscape(r.id)+','+r.cid+','+(r.geometry ? (answers[canonical]||'unreviewed') : 'missing_geometry')+
      ','+csvEscape(canonical)+','+(DUPLICATE_OF[r.id] ? 'true':'false'));
  });
  var csv=lines.join('\n')+'\n';
  csvPreview.setValue(csv);
  csvPreview.style().set('shown',true);
  csvLink.setValue('Download 47-row CSV (39 unique + 8 aliases)');
  csvLink.setUrl('data:text/csv;charset=utf-8,'+encodeURIComponent(csv));
  status.setValue('47 original IDs preserved; 8 duplicates inherit their canonical answer.');
}
side.add(btn('Prepare CSV download',makeCSV));
side.add(csvLink);side.add(status);side.add(csvPreview);
side.add(ui.Label('Answers remain only in this browser session. Export before exiting.',
  {color:'#a22'}));
ui.root.clear();
ui.root.add(ui.SplitPanel({firstPanel:side,secondPanel:map,orientation:'horizontal',wipe:false}));
show(0);
