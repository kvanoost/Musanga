// MUSANGA — verification app, strict one-feature/one-ID mode.
// 47 polygons, 4 circles. Download results BEFORE closing session.
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
var rows = data.features.map(function(feature) {
  var id = String(feature.properties[ID_FIELD]);
  var cid = Number(feature.properties.circle_id);
  if (!feature.geometry || !feature.geometry.coordinates) {
    throw Error('Missing geometry for ' + id);
  }
  var xs=[],ys=[];
  function walk(c) {
    if (typeof c[0] === 'number') {xs.push(c[0]);ys.push(c[1]);}
    else c.forEach(walk);
  }
  walk(feature.geometry.coordinates);
  var extent=[Math.min.apply(null,xs),Math.min.apply(null,ys),
              Math.max.apply(null,xs),Math.max.apply(null,ys)];
  return {id:id,cid:cid,geometry:feature.geometry,
    extent:extent,center:[(extent[0]+extent[2])/2,(extent[1]+extent[3])/2]};
}).sort(function(a,b) {return a.id.localeCompare(b.id);});

var seen={};var counts={13:0,16:0,21:0,33:0};
rows.forEach(function(r) {
  if (seen[r.id]) throw Error('Duplicate verification ID: '+r.id);
  seen[r.id]=true;
  if (!(r.cid in counts)) throw Error('Unexpected circle '+r.cid);
  counts[r.cid]++;
});
Object.keys(EXPECTED).forEach(function(k) {
  if (counts[k] !== EXPECTED[k]) throw Error('Wrong polygon count in circle '+k);
});

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
print('NB06 v4 — direct geometry mode. Feature count:',rows.length);
print('Exact duplicate geometry pairs:',equalShapes);
print('Specific pair C13_V00012/C13_V00020:', rows.filter(function(r){return r.id==='C13_V00012'||r.id==='C13_V00020';}).map(function(r){return {id:r.id,center:r.center,extent:r.extent};}));
print('Nearly identical centers (<0.25 m):',closeBoxes);
print('Selected features (first 16):',rows.slice(0,16).map(function(r) {
  return {id:r.id,circle:r.cid,center:r.center,extent:r.extent};
}));

var answers={},index=0,currentCircle=null;
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
  items:rows.map(function(r,i) {return {label:(i+1)+' / 47: '+r.id,value:String(i)};}),
  onChange:function(value) {if(value!==null) show(Number(value));},
  style:{stretch:'horizontal'}
});
side.add(ui.Label('Musanga — verification (v4)',{fontSize:'19px',fontWeight:'bold'}));
side.add(ui.Label('The RED polygon is the only active candidate. Other verification polygons are intentionally hidden.'));
side.add(progress);side.add(idLabel);side.add(coordLabel);
side.add(jump);

function show(n) {
  if(n<0 || n>=rows.length) {
    status.setValue(n>=rows.length?'End of 47. Download your CSV.':'Already at first polygon.');
    return;
  }
  index=n;
  var r=rows[index];
  var geometry=ee.Geometry(r.geometry);
  // Intentionally rebuild selected geometry on every navigation;
  // correctness takes priority over marginal redraw speed.
  var circle=ee.FeatureCollection(CIRCLE_ASSET).filter(ee.Filter.eq('circle_id',r.cid));
  var selected=ee.FeatureCollection([ee.Feature(geometry,{id:r.id})]);
  var rgb=ee.Image(RGB_ASSETS[r.cid]);
  map.layers().reset([
    ui.Map.Layer(rgb,{bands:['b1','b2','b3'],min:0,max:255},
                 'UAV RGB circle '+r.cid,true),
    ui.Map.Layer(circle.style({color:'00FFFF',fillColor:'00000000',width:2}),{},
                 'Nadine circle boundary',true),
    ui.Map.Layer(selected.style({color:'FF0000',fillColor:'FF000055',width:4}),{},
                 'ACTIVE POLYGON: '+r.id,true)
  ]);
  map.setCenter(r.center[0],r.center[1],22);
  idLabel.setValue(r.id+'   (circle '+r.cid+')');
  coordLabel.setValue('Longitude '+r.center[0].toFixed(7)+
    ' | Latitude '+r.center[1].toFixed(7));
  progress.setValue('Candidate '+(index+1)+'/47 | classified '+Object.keys(answers).length+'/47'
    +' | '+(answers[r.id] || 'UNREVIEWED'));
  status.setValue('');
  print('SHOW',r.id,'circle',r.cid,'bbox',r.extent);
}
function record(label) {
  answers[rows[index].id]=label;
  if(index<rows.length-1) show(index+1);
  else {
    progress.setValue('End of 47: '+Object.keys(answers).length+'/47 classified');
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
  var lines=['verification_id,circle_id,classification'];
  rows.forEach(function(r) {
    lines.push(csvEscape(r.id)+','+r.cid+','+(answers[r.id]||'unreviewed'));
  });
  var csv=lines.join('\n')+'\n';
  csvPreview.setValue(csv);
  csvPreview.style().set('shown',true);
  csvLink.setValue('Download 47-row CSV');
  csvLink.setUrl('data:text/csv;charset=utf-8,'+encodeURIComponent(csv));
  status.setValue('CSV prepared immediately. Click download link; if blocked, select and copy the preview.');
}
side.add(btn('Prepare CSV download',makeCSV));
side.add(csvLink);side.add(status);side.add(csvPreview);
side.add(ui.Label('Answers remain only in this browser session. Export before exiting.',
  {color:'#a22'}));
ui.root.clear();
ui.root.add(ui.SplitPanel({firstPanel:side,secondPanel:map,orientation:'horizontal',wipe:false}));
show(0);
