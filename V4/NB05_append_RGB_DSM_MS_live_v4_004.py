# NB05 extension / A — Train the 17-channel RGB+DSM+MS arm only.
# Paste at the END of the already-running NB05 Colab session.
# Reuses existing globals, saved 1,392 chips and NB03 RGB A weights.
import torch,torch.nn as nn,torch.nn.functional as F
import segmentation_models_pytorch as smp
from torch.utils.data import DataLoader,Dataset
from pathlib import Path
import numpy as np,pandas as pd,json,hashlib,os,gc,time
from IPython.display import display
assert 'CACHES' in globals() and 'EVAL' in globals() and 'model_A' in globals(),(
    'Run existing NB05 setup/training/inference cells first in this runtime.')
assert len(CACHES)==18 and set(CACHES.fold)=={0,1,2}
assert DEVICE=='cuda' and torch.cuda.is_available(),'GPU required'
MODE_BOTH='BOTH'
def fusion_model_both(fold):
    base=model_A(fold).state_dict()
    net=smp.Unet(encoder_name='resnet18',encoder_weights=None,in_channels=17,classes=1)
    state=net.state_dict()
    for k,v in state.items():
        if k=='encoder.conv1.weight':
            assert base[k].shape[1]==3 and v.shape[1]==17
            v[:,:3]=base[k]
            v[:,3:]=0
        else:
            assert k in base and base[k].shape==v.shape,k
            v.copy_(base[k])
    net.load_state_dict(state,strict=True)
    return net

class JointDatasetBoth(Dataset):
    def __init__(self,rows,mu,sd,augment):
        self.rows=rows;self.mu=np.asarray(mu)[:,None,None]
        self.sd=np.asarray(sd)[:,None,None];self.augment=augment
    def __len__(self):return len(self.rows)
    def __getitem__(self,i):
        q=self.rows[i]
        rgb=q['rgb'].astype('float32').transpose(2,0,1)/255.
        dsm=np.clip((q['dsm'].astype('float32')-self.mu)/self.sd,-6,6)
        ms=q['ms'].astype('float32')
        x=np.concatenate([rgb,dsm,ms],axis=0)
        assert x.shape==(17,256,256)
        y=q['y'].astype('float32');w=q['w'].astype('float32')
        if self.augment:
            k=int(torch.randint(4,(1,)).item())
            x=np.rot90(x,k,axes=(1,2));y=np.rot90(y,k);w=np.rot90(w,k)
            if torch.rand(())<.5:
                x=x[:,:,::-1];y=y[:,::-1];w=w[:,::-1]
        return torch.from_numpy(np.ascontiguousarray(x)),torch.from_numpy(np.ascontiguousarray(y)),torch.from_numpy(np.ascontiguousarray(w))

def fit_both(fold,mode,tr,va,mu,sd):
    dest=MODEL_DIR/f'fold{fold}_RGB_{mode}_v1.pt'
    fingerprint=hashlib.sha256(json.dumps(dict(
        base_train_key=TRAIN['training_key'],split=SPLIT_CONTRACT['csv_sha256'],
        mode=mode,fold=fold,epochs=EPOCHS,steps=STEPS,batch=BATCH,lr=LR,
        cache_fingerprints=sorted(CACHES[CACHES.fold.eq(fold)].fingerprint.tolist()),
        seed=SEED),sort_keys=True).encode()).hexdigest()
    if dest.exists():
        ck=torch.load(dest,map_location='cpu',weights_only=False)
        assert ck['fingerprint']==fingerprint and ck['complete']
        print('REUSE trained:',mode,fold);return
    torch.manual_seed(SEED+fold)
    net=fusion_model_both(fold).to(DEVICE)
    opt=torch.optim.AdamW(net.parameters(),lr=LR,weight_decay=1e-4)
    train_ds=JointDatasetBoth(tr,mu,sd,True)
    val_dl=DataLoader(JointDatasetBoth(va,mu,sd,False),batch_size=BATCH,shuffle=False,num_workers=0)
    rng=np.random.default_rng(SEED+fold)
    best=float('inf');best_state=None;best_epoch=0;hist=[]
    for epoch in range(EPOCHS):
        net.train();losses=[];t0=time.perf_counter()
        for step in range(STEPS):
            indexes=rng.integers(0,len(train_ds),size=BATCH)
            batch=[train_ds[int(k)] for k in indexes]
            x,y,w=[torch.stack([q[k] for q in batch]).to(DEVICE) for k in range(3)]
            opt.zero_grad(set_to_none=True)
            with torch.autocast('cuda',enabled=DEVICE=='cuda'):
                logits=net(x)[:,0]
                loss=masked_bce(logits,y,w)
            loss.backward();opt.step()
            losses.append(float(loss.detach().item()))
        val=validate(net,val_dl)
        hist.append(dict(fold=fold,mode=mode,epoch=epoch+1,
                         train_loss=np.mean(losses),inner_val_BCE=val,
                         seconds=time.perf_counter()-t0))
        if val<best:
            best=val;best_epoch=epoch+1
            best_state={k:v.detach().cpu().clone() for k,v in net.state_dict().items()}
        print('TRAIN',fold,mode,epoch+1,'/',EPOCHS,
              'train',round(np.mean(losses),4),'val',round(val,4),flush=True)
    tmp=dest.with_name(dest.name+'.tmp')
    torch.save(dict(fingerprint=fingerprint,complete=True,fold=fold,mode=mode,
                    baseline_training_key=TRAIN['training_key'],state=best_state,
                    norm_mean=mu,norm_std=sd,best_epoch=best_epoch,
                    best_val_BCE=best,history=hist),tmp)
    os.replace(tmp,dest)
    pd.DataFrame(hist).to_csv(MODEL_DIR/f'fold{fold}_{mode}_history.csv',index=False)
    del net,opt;gc.collect();torch.cuda.empty_cache()


# Fast fold load: decompress each NPZ member once per file, rather than
# re-decompressing a large RGB/DSM array for each individual chip.
def read_joint_fold_fast(fold):
    rows=[]
    for rec in CACHES[CACHES.fold.eq(fold)].itertuples():
        with np.load(rec.path,allow_pickle=False) as z:
            assert str(z['fingerprint'].item())==rec.fingerprint
            arrays={k:z[k] for k in ('rgb','dsm','ms','y','w','site','role')}
        n=len(arrays['y'])
        for j in range(n):
            rows.append({k:arrays[k][j] for k in ('rgb','dsm','ms','y','w')}
                        |{'site':str(arrays['site'][j]),
                          'role':str(arrays['role'][j])})
    tr=[q for q in rows if q['role']=='train']
    va=[q for q in rows if q['role']=='val']
    assert len(tr)>=30 and len(va)>=5,(fold,len(tr),len(va))
    return tr,va

# Only M3; do NOT execute the old training loop again.
for fold in range(3):
    # Derive exact training normalization from the original saved DSM arm,
    # ensuring M1, M2 and M3 use the same normalized DSM channels.
    dsm_ck=torch.load(MODEL_DIR/f'fold{fold}_RGB_DSM_v1.pt',
                      map_location='cpu',weights_only=False)
    mu=np.asarray(dsm_ck['norm_mean'],np.float32)
    sd=np.asarray(dsm_ck['norm_std'],np.float32)
    tr,va=read_joint_fold_fast(fold)
    check_mu,check_sd=dsm_norm(tr)
    assert np.allclose(mu,check_mu) and np.allclose(sd,check_sd),(
        'Original DSM normalization differs from live training chips',fold)
    fit_both(fold,MODE_BOTH,tr,va,mu,sd)
    del tr,va;gc.collect();torch.cuda.empty_cache()
print('RGB+DSM+MS trained for three held-out folds; original models untouched.')


# NB05 extension / B — Infer only M3 over the SAME 106 original units,
# of which 92 were RGB+DSM+MS matched in the original report.
# Its 106 resumable result files are saved separately from the original 3 arms.
from contextlib import ExitStack
from rasterio.windows import Window
from rasterio.features import rasterize
from rasterio.windows import transform as window_transform
from shapely.ops import transform as shape_transform
from pyproj import Transformer
from scipy.ndimage import binary_dilation
from sklearn.metrics import roc_auc_score,average_precision_score
BOTH_DIR=OUT/'07_RGB_DSM_MS_heldout_units'
BOTH_DIR.mkdir(parents=True,exist_ok=True)

def get_both_model(fold):
    p=MODEL_DIR/f'fold{fold}_RGB_BOTH_v1.pt'
    ck=torch.load(p,map_location='cpu',weights_only=False)
    assert ck['complete'] and ck['fold']==fold and ck['mode']=='BOTH'
    assert ck['baseline_training_key']==TRAIN['training_key']
    m=fusion_model_both(fold)
    m.load_state_dict(ck['state'],strict=True)
    return {'BOTH':m.to(DEVICE).eval()},np.asarray(ck['norm_mean']),np.asarray(ck['norm_std']),ck['fingerprint']

@torch.inference_mode()
def infer_both(ds,dsm,vrts,unit_geom,models,mu,sd):
    geom=to_ds_geom(unit_geom,ds)
    bounds=rasterio.windows.from_bounds(*geom.bounds,transform=ds.transform)
    row0=max(0,int(np.floor(bounds.row_off))-TILE)
    col0=max(0,int(np.floor(bounds.col_off))-TILE)
    row1=min(ds.height,int(np.ceil(bounds.row_off+bounds.height))+TILE)
    col1=min(ds.width,int(np.ceil(bounds.col_off+bounds.width))+TILE)
    h=row1-row0;ww=col1-col0
    assert h>0 and ww>0 and h*ww<75_000_000,(h,ww)
    sums={'BOTH':np.zeros((h,ww),np.float32)}
    weights=np.zeros((h,ww),np.float32)
    # Tracks agreement that every contributing tile has all auxiliary data valid.
    valid_weight=np.zeros((h,ww),np.float32)
    all_tile_windows=[
        Window(col0+c,row0+r,min(TILE,ww-c),min(TILE,h-r))
        for r in origins(h) for c in origins(ww)]
    provider=SharedContextProvider(ds,dsm,all_tile_windows)
    check_shared_context(provider,str(ds.name),all_tile_windows,n_test=2)
    batch=[]
    def flush():
        if not batch:return
        inp=torch.from_numpy(np.stack([q['both'] for q in batch])).float().to(DEVICE)
        for mode,net in models.items():
            with torch.autocast('cuda',enabled=DEVICE=='cuda'):
                probs=torch.sigmoid(net(inp)[:,0]).float().cpu().numpy()
            for rec,p in zip(batch,probs):
                r,c,hh,wwi=rec['loc']
                sums[mode][r:r+hh,c:c+wwi]+=p[:hh,:wwi]*HANN[:hh,:wwi]
        for rec in batch:
            r,c,hh,wwi=rec['loc']
            kern=HANN[:hh,:wwi]
            weights[r:r+hh,c:c+wwi]+=kern
            valid_weight[r:r+hh,c:c+wwi]+=kern*rec['joint'][:hh,:wwi]
        batch.clear()

    for r in origins(h):
        for c in origins(ww):
            hh=min(TILE,h-r);wi=min(TILE,ww-c)
            win=Window(col0+c,row0+r,wi,hh)
            rgb_data,rgb_ok=rgb_read(ds,win)
            dsm13,dsm_ok=multiscale_tile(ds,dsm,win,provider)
            ms4,ms_ok,flight=choose_complete_flight(vrts,win)
            joint=rgb_ok&dsm_ok&ms_ok
            nr=np.zeros((3,TILE,TILE),np.uint8)
            nd=np.zeros((13,TILE,TILE),np.float32)
            nm=np.zeros((7,TILE,TILE),np.float32)
            nr[:,:hh,:wi]=rgb_data.transpose(2,0,1)
            nd[:3,:hh,:wi]=nr[:,:hh,:wi].astype('float32')/255.
            nd[3:,:hh,:wi]=np.clip(
                (dsm13[3:]-mu[:,None,None])/sd[:,None,None],-6,6)
            nm[:3,:hh,:wi]=nd[:3,:hh,:wi]
            nm[3:,:hh,:wi]=ms4
            batch.append(dict(both=np.concatenate([nd,nm[3:]],axis=0),loc=(r,c,hh,wi),joint=joint))
            if len(batch)>=BATCH_INFER:flush()
    flush()
    assert weights.min()>0
    preds={mode:np.clip(sums[mode]/weights,0,1) for mode in sums}
    common=(valid_weight>=weights-1e-5)
    win=Window(col0,row0,ww,h)
    x,rv=rgb_read(ds,win)
    footprint=burn(geom,ds,win)
    roi=burn(to_ds_geom(ROI_GEOM,ds),ds,win)
    common&=rv&footprint&roi
    return preds,common,win


# Original 3-model support is immutable, and each new M3 unit is checked against
# the original per-unit reference cover and common pixel count.
for fold in range(3):
    models,mu,sd,ckhash=get_both_model(fold)
    for z in EVAL[EVAL.fold.eq(fold)].itertuples(index=False):
        original=RESULT_DIR/f'f{fold}_{z.unit_type}_{str(z.unit_id).replace("/","_")}.npz'
        assert original.is_file(),original
        with np.load(original,allow_pickle=False) as old:
            meta0=json.loads(str(old['metadata'].item()))
            result0=json.loads(str(old['results'].item()))
        assert int(meta0['fold'])==fold and meta0['unit_id']==str(z.unit_id)
        dest=BOTH_DIR/original.name
        if dest.is_file():
            with np.load(dest,allow_pickle=False) as saved:
                assert str(saved['checkpoint_hash'].item())==ckhash
                check=json.loads(str(saved['metadata'].item()))
                assert check['unit_id']==str(z.unit_id) and check['n_common']==meta0['n_common']
            print('REUSE M3',z.site,z.unit_type,z.unit_id,flush=True)
            continue
        with ExitStack() as stack:
            rgb=stack.enter_context(rasterio.open(MOSAICS[z.mosaic]))
            dsm=stack.enter_context(rasterio.open(DSM_BY_MOSAIC[z.mosaic]))
            vrts=mosaic_ms_vrts(rgb,stack,z.mosaic)
            predictions,common,win=infer_both(
                rgb,dsm,vrts,REF_UNITS[(str(z.unit_type),str(z.unit_id))],
                models,mu,sd)
            y,mask=truth_mask(str(z.unit_type),rgb,win,common)
            count=int(mask.sum())
            assert count==int(meta0['n_common']),(
                'Common mask differs from previous evaluation',str(z.unit_id),count,meta0['n_common'])
            report={}
            if count:
                truth=y[mask].astype('uint8')
                score,*_=scores(truth,predictions['BOTH'][mask])
                assert np.isclose(score['observed_cover_pp'],
                                  result0['RGB']['observed_cover_pp'],rtol=0,atol=1e-6),(
                    'Reference truth differs from old M0 result',z.unit_id)
                report['BOTH']=score
            metadata=dict(meta0,model='RGB+DSM+MS')
        tmp=dest.with_name(dest.name+'.tmp.npz')
        np.savez_compressed(tmp,checkpoint_hash=np.array(ckhash),
                            metadata=np.array(json.dumps(metadata)),
                            results=np.array(json.dumps(report,default=json_default)))
        os.replace(tmp,dest)
        print('M3 SAVED',z.site,z.unit_type,z.unit_id,'common pixels',count,flush=True)
    del models;gc.collect();torch.cuda.empty_cache()
print('M3 completed and cached for all 106 original units; 92 matched if support unchanged.')


# NB05 extension / C — Four-arm reporting, main metric = equal footprints.
# Reuse original 3-arm saved per-unit metrics (no re-inference).
import matplotlib.pyplot as plt
from IPython.display import display
all_rows=[]
seen_support=[]
for z in EVAL.itertuples(index=False):
    basename=f'f{int(z.fold)}_{z.unit_type}_{str(z.unit_id).replace("/","_")}.npz'
    original=RESULT_DIR/basename
    new=BOTH_DIR/basename
    assert original.exists() and new.exists(),basename
    with np.load(original,allow_pickle=False) as f:
        meta=json.loads(str(f['metadata'].item()))
        original_scores=json.loads(str(f['results'].item()))
    with np.load(new,allow_pickle=False) as f:
        meta4=json.loads(str(f['metadata'].item()))
        both=json.loads(str(f['results'].item()))
    assert int(meta['n_common'])==int(meta4['n_common'])
    seen_support.append(meta)
    scores_by_model={**original_scores,**both}
    if int(meta['n_common'])>0:
        assert set(scores_by_model)=={'RGB','DSM','MS','BOTH'}
    for mode,metric in scores_by_model.items():
        title={'RGB':'RGB','DSM':'RGB+DSM','MS':'RGB+MS','BOTH':'RGB+DSM+MS'}[mode]
        all_rows.append({**meta,'model':title,**metric})
FOUR=pd.DataFrame(all_rows)
SUPPORT4=pd.DataFrame(seen_support)
assert len(SUPPORT4)==106 and SUPPORT4.n_common.gt(0).sum()==92
assert len(FOUR)==92*4
assert FOUR.groupby(['unit_type','unit_id']).model.nunique().eq(4).all()
assert FOUR.groupby(['unit_type','unit_id']).n_pixels.nunique().eq(1).all()
assert FOUR.groupby(['unit_type','unit_id']).observed_cover_pp.apply(
    lambda a:np.ptp(a.to_numpy(float))<1e-6).all()
FOUR.to_csv(OUT/'08_four_arm_equal_footprint_unit_metrics.csv',index=False)

metrics=[]
for label,g in [('ALL',FOUR),*list(FOUR.groupby('site'))]:
    for model,part in g.groupby('model'):
        metrics.append(dict(Site=label,Model=model,**summarize(part,'Equal units')))
MAIN4=pd.DataFrame(metrics)
MAIN4.to_csv(OUT/'08_four_arm_primary_performance.csv',index=False)
print('FOUR-ARM PRIMARY PERFORMANCE — 92 identical matched footprints')
display(MAIN4.round(3))

P=FOUR.pivot_table(index=['site','unit_type','unit_id','spatial_group'],
                   columns='model',
                   values=['observed_cover_pp','predicted_cover_pp'],aggfunc='first')
P.columns=[f'{a}_{b}' for a,b in P.columns]
P=P.reset_index()
rng=np.random.default_rng(20261119)
bootstrap=[]
for model in ('RGB+DSM','RGB+MS','RGB+DSM+MS'):
    delta=np.abs(P[f'predicted_cover_pp_{model}']-P['observed_cover_pp_RGB'])
    delta-=np.abs(P['predicted_cover_pp_RGB']-P['observed_cover_pp_RGB'])
    pair=P.assign(delta=delta)
    groups=pair.spatial_group.unique()
    draws=[]
    for _ in range(1000):
        sampled=rng.choice(groups,len(groups),replace=True)
        pieces=[pair[pair.spatial_group.eq(g)].delta.to_numpy(float) for g in sampled]
        draws.append(np.concatenate(pieces).mean())
    bootstrap.append(dict(Model=model,delta_MAE_pp=float(delta.mean()),
        CI95_low=float(np.percentile(draws,2.5)),
        CI95_high=float(np.percentile(draws,97.5))))
BOOT4=pd.DataFrame(bootstrap)
BOOT4.to_csv(OUT/'08_four_arm_group_bootstrap.csv',index=False)
display(BOOT4.round(3))

colors={'Baego':'#2477ad','MOS':'#d58632','Yangambi':'#37966d','Yoko':'#aa4aaa'}
fig,axs=plt.subplots(2,2,figsize=(12,11),sharex=True,sharey=True,constrained_layout=True)
for ax,mode in zip(axs.flat,('RGB','RGB+DSM','RGB+MS','RGB+DSM+MS')):
    data=FOUR[FOUR.model.eq(mode)]
    for site,part in data.groupby('site'):
        ax.scatter(part.observed_cover_pp,part.predicted_cover_pp,
                   s=34,alpha=.7,color=colors[site],label=site)
    ax.plot([0,100],[0,100],'k--',lw=1)
    ax.set(xlim=(-2,102),ylim=(-2,102),title=mode,
           xlabel='Reference Musanga cover (%)',ylabel='Predicted cover (%)')
    ax.grid(alpha=.15)
axs.flat[0].legend(frameon=False)
fig.savefig(OUT/'08_four_arm_equal_footprint_scatter.png',dpi=200,bbox_inches='tight')
plt.show()

cover=FOUR[(FOUR.site=='MOS')&(FOUR.observed_cover_pp>40)]
print('MOS high-cover >40% (all four models)')
display(pd.DataFrame([dict(Model=m,**summarize(q,'Equal units'))
    for m,q in cover.groupby('model')]).round(3))
print('Saved M3 and four-arm comparison:',OUT)
