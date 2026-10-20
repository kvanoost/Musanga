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
var map = ui.Map();
map.setOptions('SATELLITE');
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

panel.add(header).add(intro).add(progress).add(featureLabel).add(answerLabel);

function countAnswers() { return Object.keys(answers).length; }
function render(i) {
  index = ((i % total) + total) % total;
  var id = ids[index];
  var cid = Number(cids[index]);
  var thisPolygon = polygons.filter(ee.Filter.eq(idField, id));
  var thisCircle = circles.filter(ee.Filter.eq('circle_id', cid));
  var allCirclePolygons = polygons.filter(ee.Filter.eq('circle_id', cid));

  var rgb = ee.Image(RGB_ASSETS[cid]);
  map.layers().reset([
    ui.Map.Layer(rgb, {bands: ['b1', 'b2', 'b3'], min: 0, max: 255}, 'UAV RGB — circle ' + cid, true),
    ui.Map.Layer(thisCircle.style({color: '00FFFF', fillColor: '00000000', width: 2}), {}, 'Nadine circle', true),
    ui.Map.Layer(allCirclePolygons.style({color: 'FFFF00', fillColor: '00000000', width: 1}), {}, 'Other verification polygons', true),
    ui.Map.Layer(thisPolygon.style({color: 'FF0000', fillColor: 'FF000022', width: 3}), {}, 'Selected: ' + id, true)
  ]);
  map.centerObject(thisPolygon, 21);
  progress.setValue('Polygon ' + (index + 1) + ' / ' + total + '  ·  classified ' + countAnswers() + ' / ' + total);
  featureLabel.setValue('ID: ' + id + '    |    Circle: ' + cid);
  answerLabel.setValue('Current label: ' + (answers[id] || 'Unreviewed'));
  downloadLink.setValue('');
  infoLabel.setValue('');
}
function classify(value) {
  answers[ids[index]] = value;
  render(index + 1);
}
function makeButton(name, fn) {
  return ui.Button({label: name, onClick: fn, style: {stretch: 'horizontal'}});
}
var nav = ui.Panel({layout: ui.Panel.Layout.flow('horizontal')});
nav.add(makeButton('◀ Previous', function() {render(index - 1);}));
nav.add(makeButton('Next ▶', function() {render(index + 1);}));
panel.add(nav);
panel.add(makeButton('MUSANGA', function() {classify('musanga');}));
panel.add(makeButton('NON-MUSANGA', function() {classify('non_musanga');}));
panel.add(makeButton('UNCERTAIN / SKIP', function() {classify('uncertain');}));
panel.add(makeButton('Clear current label', function() {
  delete answers[ids[index]];
  render(index);
}));

function exportCSV() {
  var features = ids.map(function(id, i) {
    return ee.Feature(null, {
      verification_id: String(id),
      circle_id: Number(cids[i]),
      classification: answers[id] || 'unreviewed'
    });
  });
  var fc = ee.FeatureCollection(features);
  infoLabel.setValue('Preparing CSV…');
  fc.getDownloadURL({format: 'CSV', selectors: ['verification_id', 'circle_id', 'classification'],
    filename: 'musanga_verification_47'}, function(url, error) {
    if (error) {
      infoLabel.setValue('CSV error: ' + error);
      return;
    }
    downloadLink.setValue('⬇ Download verification CSV');
    downloadLink.setUrl(url);
    infoLabel.setValue('Ready: ' + countAnswers() + ' / ' + total + ' polygons classified. Click the link.');
  });
}
panel.add(makeButton('Prepare CSV download', exportCSV));
panel.add(downloadLink);
panel.add(infoLabel);
panel.add(ui.Label('Important: the app does not save answers automatically. Download the CSV before closing or refreshing.',
  {color: '#A33', whiteSpace: 'pre-wrap', margin: '12px 0 0 0'}));
ui.root.clear();
ui.root.add(ui.SplitPanel({firstPanel: panel, secondPanel: map, orientation: 'horizontal', wipe: false}));
render(0);
