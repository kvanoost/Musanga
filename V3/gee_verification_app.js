// MUSANGA — 47 polygon UAV verification (circles 13, 16, 21, 33)
// Paste into https://code.earthengine.google.com/?project=musanga-511110
// Labels are browser-session-only: download a CSV before closing the app.

var PREFIX = 'projects/musanga-511110/assets/Verification/';
var POLYGONS_ASSET = PREFIX + 'verification_4circles';
var CIRCLES_ASSET = PREFIX + 'circles_4';
var CIRCLE_IDS = [13, 16, 21, 33];
var RGB_ASSETS = {
  13: PREFIX + 'circle_13_UAV_RGB',
  16: PREFIX + 'circle_16_UAV_RGB',
  21: PREFIX + 'circle_21_UAV_RGB',
  33: PREFIX + 'circle_33_UAV_RGB'
};

var rawPolygons = ee.FeatureCollection(POLYGONS_ASSET);
var circles = ee.FeatureCollection(CIRCLES_ASSET);
var polygonFields = rawPolygons.first().propertyNames().getInfo();
print('Verification table fields:', polygonFields);
// ESRI Shapefile limits field names to 10 characters.
// After ZIP upload, verification_id typically becomes 'verificati'.
var idField = polygonFields.indexOf('verification_id') >= 0
    ? 'verification_id'
    : (polygonFields.indexOf('verificati') >= 0 ? 'verificati' : null);
if (!idField) {
  throw new Error('Neither verification_id nor verificati exists. Available fields: ' +
                  polygonFields.join(', '));
}
if (polygonFields.indexOf('circle_id') < 0) {
  throw new Error('Missing circle_id field. Available fields: ' + polygonFields.join(', '));
}
print('Using verification ID field:', idField);
var polygons = rawPolygons.sort(idField);
var ids = polygons.aggregate_array(idField).getInfo();
var cids = polygons.aggregate_array('circle_id').getInfo();
// Fetch centers once. Avoid overlapping asynchronous centerObject requests,
// which can make the map appear stuck on an earlier polygon.
var centers = polygons.map(function(f) {
  return f.set('_review_center', f.geometry().centroid(1).coordinates());
}).aggregate_array('_review_center').getInfo();
var total = ids.length;
if (total !== 47) {
  throw new Error('Expected 47 polygons, found ' + total + '. Check verification_polygons asset.');
}
if (ids.some(function(v) {return !v;})) {
  throw new Error('Missing verification_id. Check table properties.');
}
if (ids.filter(function(v, i) {return ids.indexOf(v) === i;}).length !== total) {
  throw new Error('verification_id values are not unique.');
}
var expected = {13: 16, 16: 10, 21: 10, 33: 11};
CIRCLE_IDS.forEach(function(cid) {
  var n = cids.filter(function(v) {return Number(v) === cid;}).length;
  if (n !== expected[cid]) {
    throw new Error('Circle ' + cid + ': expected ' + expected[cid] + ', found ' + n);
  }
});

var answers = {};
var index = 0;
var finished = false;
var map = ui.Map();
map.setOptions('SATELLITE');
map.setLocked(false, 0, 24);
map.style().set('stretch', 'both');
var panel = ui.Panel({style: {width: '355px', padding: '12px'}});
var header = ui.Label('Musanga — UAV verification', {
  fontWeight: 'bold', fontSize: '20px', margin: '0 0 8px 0'
});
var intro = ui.Label('Classify each red-outlined polygon using the high-resolution UAV RGB. Labels are stored only in this session.',
  {whiteSpace: 'pre-wrap', margin: '0 0 12px 0'});
var progress = ui.Label('', {fontWeight: 'bold'});
var featureLabel = ui.Label('', {fontSize: '15px', fontWeight: 'bold'});
var answerLabel = ui.Label('');
var infoLabel = ui.Label('');
var downloadLink = ui.Label('', {color: 'blue', fontWeight: 'bold'});
var csvBox = ui.Textarea({placeholder: 'Your CSV appears here instantly. You can copy it as a backup.',
  style: {stretch: 'horizontal', height: '125px', shown: false}});
var visited = {};
var jump = ui.Select({items: ids.map(function(id, i) {
  return {label: String(i + 1) + ': ' + String(id), value: String(i)};
}), onChange: function(value) {if (value !== null) render(Number(value));},
  style: {stretch: 'horizontal'}});


panel.add(header).add(intro).add(progress).add(featureLabel).add(answerLabel);

// Cache image and circle layers, and avoid resetting RGB on every classification.
var CACHED_LAYERS = {};
var activeCircle = null;
CIRCLE_IDS.forEach(function(cid) {
  CACHED_LAYERS[cid] = [
    ui.Map.Layer(ee.Image(RGB_ASSETS[cid]),
      {bands: ['b1', 'b2', 'b3'], min: 0, max: 255},
      'UAV RGB — circle ' + cid, true),
    ui.Map.Layer(circles.filter(ee.Filter.eq('circle_id', cid))
      .style({color: '00FFFF', fillColor: '00000000', width: 2}),
      {}, 'Nadine circle', true),
    ui.Map.Layer(polygons.filter(ee.Filter.eq('circle_id', cid))
      .style({color: 'FFFF00', fillColor: '00000000', width: 1}),
      {}, 'Other verification polygons', true)
  ];
});
function countAnswers() { return Object.keys(answers).length; }
function render(i) {
  // Do not silently wrap to the beginning: this caused repeated reviews.
  if (i < 0 || i >= total) {
    infoLabel.setValue(i >= total ? 'End of 47 polygons. Download CSV or use Previous to revise.' :
      'Already at the first polygon.');
    return;
  }
  index = i;
  finished = false;
  var id = ids[index];
  var cid = Number(cids[index]);
  var thisPolygon = polygons.filter(ee.Filter.eq(idField, id));

  var selectedLayer = ui.Map.Layer(
    thisPolygon.style({color: 'FF0000', fillColor: 'FF000022', width: 3}),
    {}, 'Selected: ' + id, true
  );
  if (activeCircle !== cid) {
    // Switch the background ONLY when moving to another circle.
    var baseLayers = CACHED_LAYERS[cid];
    map.layers().reset([
      baseLayers[0], baseLayers[1], baseLayers[2], selectedLayer
    ]);
    activeCircle = cid;
  } else {
    // Preserve RGB and other layers, so browser/GEE map tiles can be reused.
    map.layers().set(3, selectedLayer);
  }
  // Client-side centering avoids late GEE callbacks moving back to old polygons.
  map.setCenter(centers[index][0], centers[index][1], 22);
  visited[id] = (visited[id] || 0) + 1;
  progress.setValue('Polygon ' + (index + 1) + ' / ' + total +
    ' · classified ' + countAnswers() + ' / ' + total +
    (visited[id] > 1 ? ' · REVISIT' : ''));
  featureLabel.setValue('ID: ' + id + '    |    Circle: ' + cid);
  answerLabel.setValue('Current label: ' + (answers[id] || 'Unreviewed'));
  // Keep previously generated CSV link and copyable backup visible.
  infoLabel.setValue('');
}
function classify(value) {
  answers[ids[index]] = value;
  // Move to next UNREVIEWED polygon; do not reclassify completed IDs.
  for (var j = index + 1; j < total; j++) {
    if (!Object.prototype.hasOwnProperty.call(answers, ids[j])) {
      render(j);
      return;
    }
  }
  if (countAnswers() === total) {
    finished = true;
    progress.setValue('COMPLETE — ' + total + ' / ' + total + ' classified');
    answerLabel.setValue('Last classification saved. Use CSV below or Previous to revise.');
    infoLabel.setValue('Classification complete. Generate and save your CSV.');
  } else {
    infoLabel.setValue('No more unreviewed polygons ahead. Use Jump to ID or export current CSV.');
  }
}
function makeButton(name, fn) {
  return ui.Button({label: name, onClick: fn, style: {stretch: 'horizontal'}});
}
var nav = ui.Panel({layout: ui.Panel.Layout.flow('horizontal')});
nav.add(makeButton('◀ Previous', function() {render(index - 1);}));
nav.add(makeButton('Next ▶', function() {render(index + 1);}));
panel.add(nav);
panel.add(ui.Label('Jump directly to an ID (useful for checking suspected duplicates):'));
panel.add(jump);
panel.add(makeButton('MUSANGA', function() {classify('musanga');}));
panel.add(makeButton('NON-MUSANGA', function() {classify('non_musanga');}));
panel.add(makeButton('UNCERTAIN / SKIP', function() {classify('uncertain');}));
panel.add(makeButton('Clear current label', function() {
  delete answers[ids[index]];
  render(index);
}));

function exportCSV() {
  // Generate 47 rows on the client instantly: no Earth Engine job required.
  // Deliberately include ALL IDs, including unreviewed ones.
  var lines = ['verification_id,circle_id,classification'];
  ids.forEach(function(id, i) {
    lines.push('"' + String(id).replace(/"/g, '""') + '",' +
      String(Number(cids[i])) + ',' + (answers[id] || 'unreviewed'));
  });
  var csv = lines.join('\\n') + '\\n';
  csvBox.setValue(csv);
  csvBox.style().set('shown', true);
  var uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  downloadLink.setValue('⬇ Save CSV (instant link)');
  downloadLink.setUrl(uri);
  infoLabel.setValue('CSV ready instantly: ' + countAnswers() + '/47 classified. ' +
    'Click Save CSV; if your browser blocks data links, copy the CSV from the box below. ' +
    'No server request required.');
}
panel.add(makeButton('Prepare CSV download', exportCSV));
panel.add(downloadLink);
panel.add(infoLabel);
panel.add(csvBox);
panel.add(ui.Label('Important: the app does not save answers automatically. Download the CSV before closing or refreshing.',
  {color: '#A33', whiteSpace: 'pre-wrap', margin: '12px 0 0 0'}));
ui.root.clear();
ui.root.add(ui.SplitPanel({firstPanel: panel, secondPanel: map, orientation: 'horizontal', wipe: false}));
render(0);
