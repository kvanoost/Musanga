"""NB07 post-inference 6-mosaic VRT reconstruction (no GPU; no tile copies).
Run from Colab with:
 exec(requests.get("https://raw.githubusercontent.com/kvanoost/Musanga/v4/V4/07_reconstruct_vrts.py").text)
"""
from pathlib import Path
from xml.sax.saxutils import escape
from rasterio.windows import Window
from collections import Counter
import os, re, json
import numpy as np, pandas as pd, rasterio

ROOT=next((p for p in (
 Path("/content/drive/MyDrive/Colab Notebooks/Musanga/Final"),
 Path("/content/drive/MyDrive/Musanga/Final")) if p.is_dir()),None)
assert ROOT, "Mount Drive before running"
V4=ROOT/"Outputs/v4"
OUT=V4/"07_RGB_MS_100m_ROI_complete_sensors_v4"
TILES=OUT/"prediction_tiles"
RECON=OUT/"06_reconstructed_mosaics"
RECON.mkdir(parents=True,exist_ok=True)
MODEL="836ab7d77c1c"
POLICY="47890f94c6cf"
HALO=64
TILE=256
NODATA=-9999.0
EXPECTED={
 "Baego.tif":1568,
 "Mos_1_2_transparent_mosaic_group1_georef.tif":18464,
 "Mos_3_4_transparent_mosaic_group1_georef.tif":13816,
 "Mos_5_6_transparent_mosaic_group1_georef.tif":6582,
 "Yangambi_georef.tif":4552,
 "Yoko_kvo_georef.tif":3272,
}
pattern=re.compile(rf"^qa{POLICY}_m{MODEL}_halo{HALO:03d}_r(\d{{5}})_c(\d{{5}})\.tif$")
v31=json.loads((ROOT/"Outputs/V3_1/00_input_audit/00_input_manifest.json").read_text())
MOSAICS={}
for entry in v31["mosaics"]:
 if not str(entry["file"]).endswith(".tif"):continue
 path=Path(entry["path"])
 if not path.exists():path=ROOT/"Data/Ortho_RGB"/entry["file"]
 assert path.is_file(),path
 MOSAICS[entry["file"]]=path
assert set(MOSAICS)==set(EXPECTED),(set(MOSAICS),set(EXPECTED))

def reconstruct(mosaic,expected):
 folder=TILES/Path(mosaic).stem
 assert folder.is_dir(),folder
 with rasterio.open(MOSAICS[mosaic]) as ref:
  width,height=ref.width,ref.height
  transform,crs=ref.transform,ref.crs
 assert crs is not None,mosaic
 entries={}
 extras=Counter()
 for p in folder.glob("*.tif"):
  match=pattern.fullmatch(p.name)
  if not match:
   extras["different_policy_or_name"]+=1
   continue
  row,col=map(int,match.groups())
  assert (row,col) not in entries,(mosaic,"duplicate tile",row,col)
  x,y=col*TILE,row*TILE
  assert 0<=x<width and 0<=y<height,(mosaic,p.name)
  entries[(row,col)]=(p,x,y,min(TILE,width-x),min(TILE,height-y))
 assert len(entries)==expected,(mosaic,"wrong count",len(entries),expected)
 keys=sorted(entries)
 samples=sorted(set((0,len(keys)//4,len(keys)//2,3*len(keys)//4,len(keys)-1)))
 for ix in samples:
  p,x,y,w,h=entries[keys[ix]]
  with rasterio.open(p) as src:
   assert src.count==2 and src.width==w and src.height==h,p
   assert src.crs==crs,p
   assert src.transform.almost_equals(transform*rasterio.Affine.translation(x,y)),p
   assert src.nodata==NODATA and src.tags().get("qa_signature")==POLICY,p
   assert "probability" in (src.descriptions[0] or "").lower(),p
   assert "binary" in (src.descriptions[1] or "").lower(),p
 vrt=RECON/(Path(mosaic).stem+"_Musanga_probability_binary.vrt")
 tmp=vrt.with_suffix(".vrt.partial")
 with open(tmp,"w",encoding="utf-8") as f:
  f.write(f'<VRTDataset rasterXSize="{width}" rasterYSize="{height}">\n')
  f.write(f'  <SRS>{escape(crs.to_wkt())}</SRS>\n')
  f.write("  <GeoTransform>"+", ".join(format(v,".15g") for v in transform.to_gdal())+"</GeoTransform>\n")
  for band,description in ((1,"Musanga probability"),(2,"Musanga binary threshold")):
   f.write(f'  <VRTRasterBand dataType="Float32" band="{band}">\n')
   f.write(f'    <Description>{description}</Description>\n')
   f.write(f'    <NoDataValue>{NODATA}</NoDataValue>\n')
   for key in keys:
    p,x,y,w,h=entries[key]
    rel=os.path.relpath(p,vrt.parent)
    f.write("    <ComplexSource>\n")
    f.write(f'      <SourceFilename relativeToVRT="1">{escape(rel)}</SourceFilename>\n')
    f.write(f'      <SourceBand>{band}</SourceBand>\n')
    f.write(f'      <SourceProperties RasterXSize="{w}" RasterYSize="{h}" DataType="Float32" BlockXSize="{w}" BlockYSize="{h}"/>\n')
    f.write(f'      <SrcRect xOff="0" yOff="0" xSize="{w}" ySize="{h}"/>\n')
    f.write(f'      <DstRect xOff="{x}" yOff="{y}" xSize="{w}" ySize="{h}"/>\n')
    f.write(f'      <NODATA>{NODATA}</NODATA>\n')
    f.write("    </ComplexSource>\n")
   f.write("  </VRTRasterBand>\n")
  f.write("</VRTDataset>\n")
 os.replace(tmp,vrt)
 with rasterio.open(vrt) as virtual:
  assert virtual.count==2 and virtual.width==width and virtual.height==height,mosaic
  assert virtual.crs==crs and virtual.transform.almost_equals(transform),mosaic
  for ix in samples:
   p,x,y,w,h=entries[keys[ix]]
   ww,hh=min(w,32),min(h,32)
   with rasterio.open(p) as tile:
    actual=tile.read(window=Window(0,0,ww,hh))
   predicted=virtual.read(window=Window(x,y,ww,hh))
   assert np.array_equal(actual,predicted,equal_nan=True),(mosaic,p.name)
 print("PASS",mosaic,"tiles",len(entries),"excluded",sum(extras.values()),
       "readbacks",len(samples),flush=True)
 return dict(mosaic=mosaic,tiles=len(entries),excluded=sum(extras.values()),
             width=width,height=height,vrt=str(vrt),status="PASS")
rows=[]
for mosaic,n in EXPECTED.items():
 rows.append(reconstruct(mosaic,n))
 pd.DataFrame(rows).to_csv(OUT/"06_mosaic_reconstruction_manifest.csv",index=False)
assert sum(r["tiles"] for r in rows)==48254
print(pd.DataFrame(rows).to_string(index=False))
print("6/6 FULL-RESOLUTION VIRTUAL MOSAICS VERIFIED; no inference rerun.")
