
const $=s=>document.querySelector(s),cl=(v,a,b)=>Math.max(a,Math.min(b,v));let blob,cv=document.createElement('canvas'),G;
$('#f').onchange=e=>load(e.target.files[0]);const dz=$('#drop');dz.ondragover=e=>e.preventDefault();dz.ondrop=e=>{e.preventDefault();load(e.dataTransfer.files[0])};
function load(file){if(!file)return;const im=$('#im');im.onload=()=>{const k=Math.min(1,1024/Math.max(im.naturalWidth,im.naturalHeight));cv.width=im.naturalWidth*k;cv.height=im.naturalHeight*k;
cv.getContext('2d').drawImage(im,0,0,cv.width,cv.height);cv.toBlob(b=>{blob=b;$('#run').hidden=false},'image/jpeg',.85);$('#stage').hidden=false;$('#res').hidden=true;
const o=$('#ov');o.width=im.clientWidth;o.height=im.clientHeight;o.getContext('2d').clearRect(0,0,o.width,o.height);$('#st').textContent=''};im.src=URL.createObjectURL(file)}
let code=sessionStorage.getItem('code')||'';
$('#run').onclick=async()=>{$('#st').textContent='Inspecting... (up to 20 seconds)';$('#run').disabled=true;
try{const b64=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result.split(',')[1]);fr.readAsDataURL(blob)});
const r=await fetch('/api/inspect',{method:'POST',headers:{'Content-Type':'application/json','x-access-code':code},body:JSON.stringify({image:b64,mime:'image/jpeg'})});
const j=await r.json().catch(()=>({}));
if(r.status==401){code=prompt('This site needs an access code:')||'';sessionStorage.setItem('code',code);throw{msg:code?'Code saved. Press Inspect again.':'Access code required.'}}
if(!r.ok)throw{msg:({rate_limited:'The free AI quota is used up for now. Try again in a minute (or tomorrow).',server_not_configured:'The site owner has not set the API key yet.',too_large:'That photo is too large.',ai_error:'The AI service had a problem'+(j.status?' (Google code '+j.status+')':'')+(j.detail?': '+j.detail:'')+'.'})[j.error]||'Could not inspect (error '+r.status+').'};
show(j);$('#st').textContent=''}
catch(e){$('#st').textContent=e.msg||('Network problem: '+e.message)}$('#run').disabled=false};
function show(d){const df=(d.defects||[]).filter(x=>x.box&&x.box.length==4),mx=Math.max(0,...df.map(x=>+x.severity||1));
const v=!df.length||d.condition=='intact'?'PASS':mx>=4?'FAIL':'REVIEW';$('#vd').textContent=v;$('#vd').className='badge '+v;$('#ob').textContent=d.object||'object';$('#sm').textContent=d.summary||'';
$('#dl').innerHTML='';df.forEach((x,i)=>{const li=document.createElement('li');li.textContent=`${x.type} (severity ${x.severity}/5): ${x.note||''}`;$('#dl').appendChild(li)});
if(!df.length)$('#dl').textContent='No visible damage found.';$('#res').hidden=false;
const im=$('#im'),o=$('#ov'),g=o.getContext('2d');o.width=im.clientWidth;o.height=im.clientHeight;g.clearRect(0,0,o.width,o.height);
df.forEach((x,i)=>{const[bx,by,bw,bh]=[x.box[0]*o.width,x.box[1]*o.height,x.box[2]*o.width,x.box[3]*o.height],cx=bx+bw/2,cy=by+bh/2,r=Math.max(bw,bh,24);
const gr=g.createRadialGradient(cx,cy,0,cx,cy,r);gr.addColorStop(0,'rgba(255,40,0,.65)');gr.addColorStop(1,'rgba(255,200,0,0)');g.fillStyle=gr;g.fillRect(cx-r,cy-r,2*r,2*r);
g.strokeStyle='#ff3b1f';g.lineWidth=2;g.strokeRect(bx,by,bw,bh);g.fillStyle='#ff3b1f';g.font='bold 14px sans-serif';g.fillText(i+1,bx+3,by+15)});
$('#c3').hidden=false;build3d(d,df)}
function build3d(d,df){if(!window.THREE){$('#c3').hidden=true;return}const box=$('#gl');if(G){G.stop=1;box.querySelector('canvas').remove()}
const H=4,W=()=>box.clientWidth,HH=420,R=new THREE.WebGLRenderer({antialias:true});R.setSize(W(),HH);R.setPixelRatio(Math.min(devicePixelRatio,2));box.prepend(R.domElement);
const S=new THREE.Scene();S.background=new THREE.Color(0x0b0e13);const C=new THREE.PerspectiveCamera(40,W()/HH,.1,100);
S.add(new THREE.AmbientLight(0xffffff,.65));const dl=new THREE.DirectionalLight(0xffffff,.9);dl.position.set(4,8,5);S.add(dl);
const round=d.shape=='round'&&Array.isArray(d.profile)&&d.profile.length>=4,o=d.objectBox||[0,0,1,1],pts=[];let rAt,T=0,ctr=[.5,.5],k=1,Wd=cv.width,Hd=cv.height;
const fl=new THREE.Mesh(new THREE.CircleGeometry(4,48),new THREE.MeshStandardMaterial({color:0x1a2030}));fl.rotation.x=-Math.PI/2;S.add(fl);
if(round){const pr=d.profile.map(p=>[cl(+p[0],0,1),cl(+p[1],.01,.7)]).sort((a,b)=>a[0]-b[0]);
rAt=t=>{for(let i=1;i<pr.length;i++)if(t<=pr[i][0]){const a=pr[i-1],b=pr[i],q=(t-a[0])/Math.max(1e-6,b[0]-a[0]);return a[1]+(b[1]-a[1])*q}return pr[pr.length-1][1]};
S.add(new THREE.Mesh(new THREE.LatheGeometry(pr.map(p=>new THREE.Vector2(p[1]*H,p[0]*H)),48),new THREE.MeshStandardMaterial(Object.assign({roughness:.45,metalness:.1,side:THREE.DoubleSide},wrap(pr,o,d.axis=='horizontal')))))}
else{const poly=silhouette()||[[o[0],o[1]],[o[0]+o[2],o[1]],[o[0]+o[2],o[1]+o[3]],[o[0],o[1]+o[3]]],xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
ctr=[(x0+x1)/2,(y0+y1)/2];k=H/Math.max(1,(y1-y0)*Hd);const sh=new THREE.Shape(poly.map(p=>new THREE.Vector2((p[0]-ctr[0])*Wd*k,(ctr[1]-p[1])*Hd*k)));
T=cl(+d.depth||.25,.03,.9)*Math.max((x1-x0)*Wd,(y1-y0)*Hd)*k;
const body=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:T,bevelEnabled:false}),new THREE.MeshStandardMaterial({color:avg([x0,y0,x1-x0,y1-y0]),roughness:.6}));body.position.set(0,H/2,-T/2);S.add(body);
const fg=new THREE.ShapeGeometry(sh),ps=fg.attributes.position,uv=fg.attributes.uv;for(let i=0;i<ps.count;i++)uv.setXY(i,ctr[0]+ps.getX(i)/(Wd*k),1-(ctr[1]-ps.getY(i)/(Hd*k)));
const front=new THREE.Mesh(fg,new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(cv),roughness:.6}));front.position.set(0,H/2,T/2+.004);S.add(front);const back=new THREE.Mesh(fg.clone(),front.material);back.rotation.y=Math.PI;back.position.set(0,H/2,-T/2-.004);S.add(back)}
const c2=document.createElement('canvas');c2.width=c2.height=128;const x2=c2.getContext('2d'),gr=x2.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,60,0,1)');gr.addColorStop(.4,'rgba(255,200,0,.6)');gr.addColorStop(1,'rgba(255,200,0,0)');x2.fillStyle=gr;x2.fillRect(0,0,128,128);const tex=new THREE.CanvasTexture(c2);
df.forEach(x=>{const cx=x.box[0]+x.box[2]/2,cy=x.box[1]+x.box[3]/2,sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,blending:THREE.AdditiveBlending,depthTest:false,transparent:true}));let th=0,y;
if(round){const hz=d.axis=='horizontal',t=cl(hz?(cx-o[0])/o[2]:1-(cy-o[1])/o[3],0,1),sv=cl(((hz?(cy-o[1])/o[3]:(cx-o[0])/o[2])-.5)*2,-.97,.97),r=rAt(t)*H;th=Math.asin(sv);y=t*H;sp.position.set(r*Math.sin(th),y,r*Math.cos(th))}
else{y=H/2+(ctr[1]-cy)*Hd*k;sp.position.set((cx-ctr[0])*Wd*k,y,T/2+.06)}S.add(sp);pts.push({sp,th,y,x})});
const s={th:round?.6:.5,ph:round?1.25:1.4,r:9,y:H/2},g={...s};let auto=1,drag=0,lx=0,ly=0;const cn=R.domElement;
cn.onpointerdown=e=>{drag=1;lx=e.clientX;ly=e.clientY;cn.setPointerCapture(e.pointerId)};cn.onpointerup=()=>drag=0;
cn.onpointermove=e=>{if(!drag)return;g.th=s.th-=(e.clientX-lx)*.008;g.ph=s.ph=cl(s.ph-(e.clientY-ly)*.008,.3,1.55);lx=e.clientX;ly=e.clientY};
$('#fly').onclick=()=>{if(!pts.length)return;Object.assign(g,{th:pts[0].th,r:4.5,ph:round?1.4:1.5,y:pts[0].y});auto=0;$('#auto').classList.remove('on')};
$('#auto').onclick=e=>{auto=!auto;e.target.classList.toggle('on',auto)};const lab=$('#lab'),v=new THREE.Vector3();
G={};(function loop(t){if(G.stop)return;requestAnimationFrame(loop);if(auto&&!drag)g.th=s.th+=.004;for(const k of['th','ph','r','y'])s[k]+=(g[k]-s[k])*.07;
C.position.set(s.r*Math.sin(s.ph)*Math.sin(s.th),s.y+s.r*Math.cos(s.ph),s.r*Math.sin(s.ph)*Math.cos(s.th));C.lookAt(0,s.y,0);
const p=1+.25*Math.sin(t/260);pts.forEach(q=>q.sp.scale.set(1.2*p,1.2*p,1));
if(pts.length){v.copy(pts[0].sp.position).project(C);lab.style.left=(v.x*.5+.5)*W()+'px';lab.style.top=(-v.y*.5+.5)*HH+'px';lab.textContent='1: '+pts[0].x.type;lab.style.display='block'}else lab.style.display='none';R.render(S,C)})(0)}
function silhouette(){const w=Math.min(160,cv.width),h=Math.round(w*cv.height/cv.width),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(cv,0,0,w,h);const px=x.getImageData(0,0,w,h).data,edge=[];
for(let i=0;i<w;i++)edge.push(i,(h-1)*w+i);for(let j=0;j<h;j++)edge.push(j*w,j*w+w-1);const med=c=>edge.map(i=>px[i*4+c]).sort((a,b)=>a-b)[edge.length>>1],bg=[med(0),med(1),med(2)];
const dist=i=>Math.hypot(px[i*4]-bg[0],px[i*4+1]-bg[1],px[i*4+2]-bg[2]),ed=edge.map(dist).sort((a,b)=>a-b),T=Math.max(34,3*ed[Math.floor(ed.length*.9)]+10),fg=new Uint8Array(w*h);
for(let i=0;i<w*h;i++)fg[i]=dist(i)>T;const out=new Uint8Array(w*h),st=[];edge.forEach(i=>{if(!fg[i]&&!out[i]){out[i]=1;st.push(i)}});
while(st.length){const i=st.pop(),a=i%w,b=(i/w)|0;[[1,0],[-1,0],[0,1],[0,-1]].forEach(([u,v])=>{const X=a+u,Y=b+v;if(X>=0&&Y>=0&&X<w&&Y<h){const j=Y*w+X;if(!fg[j]&&!out[j]){out[j]=1;st.push(j)}}})}
let n=0,cx=0,cy=0;for(let i=0;i<w*h;i++)if(!out[i]){n++;cx+=i%w;cy+=(i/w)|0}if(n<.02*w*h||n>.9*w*h)return null;cx/=n;cy/=n;const poly=[];
for(let a=0;a<64;a++){const t=a/64*2*Math.PI,dx=Math.cos(t),dy=Math.sin(t);let last=0,gap=0;for(let q=1;q<Math.max(w,h);q++){const X=Math.round(cx+dx*q),Y=Math.round(cy+dy*q);if(X<0||Y<0||X>=w||Y>=h)break;if(!out[Y*w+X]){last=q;gap=0}else if(++gap>6)break}
poly.push([(cx+dx*last)/w,(cy+dy*last)/h])}return poly}
function wrap(pr,o,hz){try{const TW=512,TH=256,W0=cv.width,H0=cv.height,src=cv.getContext('2d').getImageData(0,0,W0,H0).data,c=document.createElement('canvas');c.width=TW;c.height=TH;
const g=c.getContext('2d'),im=g.createImageData(TW,TH),n=pr.length,L=hz?o[2]*W0:o[3]*H0,ox=(o[0]+o[2]/2)*W0,oy=(o[1]+o[3]/2)*H0;
for(let j=0;j<TH;j++){const i=(1-j/(TH-1))*(n-1),a=Math.min(n-2,Math.floor(i)),f=i-a,t=pr[a][0]+f*(pr[a+1][0]-pr[a][0]),r=(pr[a][1]+f*(pr[a+1][1]-pr[a][1]))*L;
for(let u=0;u<TW;u++){const sn=Math.sin(2*Math.PI*u/TW);let X=hz?o[0]*W0+t*L:ox+sn*r,Y=hz?oy+sn*r:(o[1]+o[3])*H0-t*L;X=cl(Math.round(X),0,W0-1);Y=cl(Math.round(Y),0,H0-1);
const q=(Y*W0+X)*4,k=(j*TW+u)*4;im.data[k]=src[q];im.data[k+1]=src[q+1];im.data[k+2]=src[q+2];im.data[k+3]=255}}
g.putImageData(im,0,0);return{map:new THREE.CanvasTexture(c)}}catch(e){return{color:avg(o)}}}
function avg(o){try{o=o||[0,0,1,1];const x=cv.getContext('2d').getImageData(cv.width*(o[0]+o[2]*.3),cv.height*(o[1]+o[3]*.3),Math.max(1,cv.width*o[2]*.4),Math.max(1,cv.height*o[3]*.4)).data;
let r=0,g=0,b=0,n=x.length/4;for(let i=0;i<x.length;i+=4){r+=x[i];g+=x[i+1];b+=x[i+2]}return new THREE.Color(r/n/255,g/n/255,b/n/255)}catch(e){return new THREE.Color(0x8899aa)}}
