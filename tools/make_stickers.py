# Вырезает стикеры по контуру (как в Telegram): убирает фон, белая обводка, тень.
import sys, numpy as np
from PIL import Image, ImageOps, ImageFilter
from rembg import remove, new_session
U='/root/.claude/uploads/3d47777e-b0e0-5bd1-af17-7bffe31784fd/'
OUT='photos/stickers/'
# имя: (файл, кроп x0,y0,x1,y1 в долях, поворот)
S={
 'fox':('f5e2ae61',(0.22,0.16,0.62,0.86),0), 'serious':('05254c48',(0,0,1,1),0),
 'aaa':('b93bfc1d',(0.12,0.2,0.9,0.86),0), 'cat':('18d85c8b',(0,0,0.92,1),0),
 'monday':('8272b98b',(0.05,0.08,0.95,0.86),0), 'ski':('0018ad21',(0.33,0.43,0.92,1),0),
 'dino':('193e9dc5',(0.48,0.15,0.9,1),0), 'spider':('20b29270',(0.04,0.25,0.97,0.9),0),
 'art':('d7b6df69',(0.32,0.38,0.54,0.93),0),
 'turbo':('cb0718cf',(0.25,0.05,0.75,1),0), 'coffee':('dea8381c',(0.25,0,1,1),0),
 'paci':('c725867c',(0.1,0.42,1,1),0), 'witch':('5e2bb790',(0.53,0.27,0.95,0.8),0),
 'halloween':('dcec17d6',(0.2,0.27,1,0.95),0), 'sideeye':('89691334',(0,0.15,1,0.75),0),
 'spidey':('f61b3004',(0.27,0.2,0.95,1),0), 'wow':('343958ea',(0.08,0.05,0.97,0.55),0),
 'fist':('c1d75927',(0.28,0.3,0.75,0.72),0), 'spa':('1f7be6af',(0.1,0.08,0.95,0.7),0),
 'siblings':('009acf0e',(0.05,0,0.9,1),-90), 'run':('fefe45ce',(0.03,0.5,0.45,0.9),0),
 'what':('05f62578',(0,0.05,1,0.7),0), 'grumpy2':('f9f356a0',(0,0,1,1),0),
 'cheeks':('862751e1',(0.3,0.15,0.95,1),0), 'notimpressed':('4d616d9a',(0.52,0.38,1,0.92),0),
}
only=sys.argv[1:] or list(S)
sess=new_session('isnet-general-use')
for name in only:
    f,(a,b,c,d),rot=S[name]
    im=ImageOps.exif_transpose(Image.open(U+f+'-image.jpg')).convert('RGB')
    w,h=im.size; im=im.crop((int(a*w),int(b*h),int(c*w),int(d*h)))
    if rot: im=im.rotate(rot,expand=True)
    im.thumbnail((900,900))
    mask=remove(im,session=sess,post_process_mask=True,only_mask=True)
    # оставляем только крупные куски (без мусора)
    from scipy import ndimage
    mb=np.array(mask)>110; lab,n=ndimage.label(mb)
    if n>1:
        sizes=ndimage.sum(mb,lab,range(1,n+1)); keep=[i+1 for i,v in enumerate(sizes) if v>=0.06*sizes.max()]
        mk=np.array(mask); mk[~np.isin(lab,keep)]=0; mask=Image.fromarray(mk)
    cut=im.convert('RGBA'); cut.putalpha(mask)
    al=np.array(cut.split()[3]).astype(np.float32)/255
    # обрезаем по содержимому + поле под обводку
    ys,xs=np.where(al>0.5); 
    if len(xs)==0: print('EMPTY',name); continue
    pad=40
    box=(max(0,xs.min()-pad),max(0,ys.min()-pad),min(cut.width,xs.max()+pad),min(cut.height,ys.max()+pad))
    cut=cut.crop(box); 
    W,H=cut.width+2*pad,cut.height+2*pad
    canvas=Image.new('RGBA',(W,H),(0,0,0,0)); canvas.paste(cut,(pad,pad),cut)
    # заливаем дырки внутри силуэта (рот, глаза)
    from PIL import ImageDraw
    m=canvas.split()[3].point(lambda v:255 if v>110 else 0)
    ImageDraw.floodfill(m,(0,0),128)
    holes=m.point(lambda v:255 if v==0 else 0)
    al=canvas.split()[3]; al.paste(255,(0,0),holes); canvas.putalpha(al)
    A=canvas.split()[3].point(lambda v:255 if v>110 else 0)
    stroke=max(8,int(max(W,H)*0.025))|1
    outline=A.filter(ImageFilter.MaxFilter(stroke)).filter(ImageFilter.MaxFilter(stroke)).filter(ImageFilter.GaussianBlur(1.2)).point(lambda v:255 if v>100 else 0).filter(ImageFilter.GaussianBlur(0.8))
    shadow=outline.filter(ImageFilter.GaussianBlur(6)).point(lambda v:int(v*0.35))
    out=Image.new('RGBA',(W,H),(0,0,0,0))
    sh=Image.new('RGBA',(W,H),(22,17,26,255)); out.paste(sh,(5,7),shadow)
    wt=Image.new('RGBA',(W,H),(255,255,255,255)); out.paste(wt,(0,0),outline)
    out.alpha_composite(canvas)
    bb=out.getbbox(); out=out.crop(bb); out.thumbnail((440,440),Image.LANCZOS)
    out.save(OUT+name+'.webp',quality=84,method=6); print(name,out.size)
