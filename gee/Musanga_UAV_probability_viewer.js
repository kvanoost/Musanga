// Musanga UAV viewer — use in https://code.earthengine.google.com/
// After the Colab asset-ingestion tasks have COMPLETED.
// Assets are private until shared through Earth Engine permissions.
var root = 'projects/baresoil-479921/assets/musanga_uav';
var names = ['Baego', 'Yoko', 'Yangambi', 'MOS_1_2'];
var app = ui.Panel({style: {width: '335px', padding: '12px'}});
app.add(ui.Label('Musanga | UAV probability viewer', {fontSize: '18px', fontWeight: 'bold'}));
app.add(ui.Label('RGB orthomosaic + U-Net probability + binary map. Zoom in to view fine canopy details.'));
var site = ui.Select({items: names, value: 'Baego', style: {stretch: 'horizontal'}});
var threshold = ui.Slider({min:0,max:1,value:0.5,step:0.05,style:{stretch:'horizontal'}});
var opacity = ui.Slider({min:0,max:1,value:0.65,step:0.05,style:{stretch:'horizontal'}});
var status = ui.Label('Select a site and adjust the threshold.');
app.add(ui.Label('Site')); app.add(site);
app.add(ui.Label('Binary probability threshold'));app.add(threshold);
app.add(ui.Label('Overlay opacity'));app.add(opacity);
app.add(ui.Label('Layers (toggle on the map): RGB, probability heatmap, binary detections.'));
app.add(ui.Label('Probability is scaled 0–10000; 65535 is NoData. Binary is a thresholded probability pixel map, not individual-crown polygons.',{fontSize:'11px',color:'#555'}));
app.add(status);
ui.root.widgets().reset([app, Map]);
ui.root.setLayout(ui.Panel.Layout.Flow('horizontal'));
Map.setOptions('SATELLITE');
function draw() {
  Map.layers().reset([]);
  var s=site.getValue();
  var rgb=ee.Image(root+'/'+s+'_RGB');
  var encoded=ee.Image(root+'/'+s+'_Musanga_probability').select(0);
  var probability=encoded.updateMask(encoded.neq(65535)).divide(10000).clamp(0,1);
  var binary=probability.gte(threshold.getValue()).selfMask();
  var opacityValue=opacity.getValue();
  Map.addLayer(rgb.select([0,1,2]),{min:0,max:255},s+' | UAV RGB',true,1);
  Map.addLayer(probability,{min:0,max:1,palette:['#17336b','#3e9bb2','#f3df64','#f28e35','#bf2f35']},
               s+' | Musanga probability',true,opacityValue);
  Map.addLayer(binary,{palette:['#ff00d4']},s+' | Binary Musanga',false,opacityValue);
  status.setValue(s+' | threshold ≥ '+threshold.getValue().toFixed(2)+
    ' | Turn probability/binary layers on or off in the map Layers menu.');
  Map.centerObject(rgb.geometry(),17);
}
site.onChange(draw);threshold.onChange(draw);opacity.onChange(draw);draw();
