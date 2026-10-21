// MUSANGA — six-circle verification v9.
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
print('Musanga v9: 60 unique features in 6 circles');
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
side.add(ui.Label('Musanga — verification (v9 · fast review)',{fontSize:'19px',fontWeight:'bold'}));
side.add(ui.Label('Bright yellow outline = active polygon (fully transparent fill). Images are kept loaded within each circle.'));
side.add(progress);side.add(idLabel);side.add(coordLabel);
side.add(jump);

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
side.add(btn('Prepare CSV download',makeCSV));
side.add(csvLink);side.add(status);side.add(csvPreview);
side.add(ui.Label('Answers remain only in this browser session. Export before exiting.',
  {color:'#a22'}));
ui.root.clear();
ui.root.add(ui.SplitPanel({firstPanel:side,secondPanel:map,orientation:'horizontal',wipe:false}));
show(0);
