import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildApartment, setCutaway, modelStats, PARAMETERS } from './source/model.js';

const $=id=>document.getElementById(id), query=new URLSearchParams(location.search);
const capture=query.has('capture'), studio=query.has('source');
if(capture)document.body.classList.add('capture');
const state={cut:true,labels:true,rotate:false,view:'overview',ready:false};
let renderer,scene,camera,controls,model,resizeObserver,environmentTarget;
const stage=document.querySelector('.stage');
const roomLabels=[];
let needsRender=true, lastT=0, transition=null;
const v=(a)=>new THREE.Vector3(...a);
const presets={
  overview:{number:'00 / OVERVIEW',title:'空間を、ひと目で。',direction:[-8,10,11],target:[.27,.12,.18],whole:true},
  top:{number:'00 / FLOOR PLAN',title:'間取りのつながり。',direction:[0,15,.001],target:[0,0,0],whole:true},
  ldk:{number:'01 / LIVING · DINING · KITCHEN',title:'LDKから、キッチンへ。',position:[-.34,1.77,-.18],target:[2.48,1.12,-2.24],interior:true},
  bedroom:{number:'02 / BEDROOM',title:'窓と収納のある洋室。',position:[2.19,1.70,1.39],target:[-.14,1.04,2.46],interior:true},
  wash:{number:'03 / SANITARY',title:'水まわりを見渡す。',direction:[-5,9,7],target:[-1.6,.55,1.85],distance:6.5},
  entry:{number:'04 / ENTRANCE',title:'玄関とシューズ収納。',direction:[5,8,-7],target:[-1.33,.65,-2.73],distance:5.0},
  front:{direction:[0,5,15],target:[.27,.12,.18],whole:true},
  back:{direction:[0,5,-15],target:[.27,.12,.18],whole:true},
  left:{direction:[-15,5,0],target:[.27,.12,.18],whole:true},
  right:{direction:[15,5,0],target:[.27,.12,.18],whole:true},
  bath:{position:[-1.36,1.74,2.07],target:[-1.35,.96,3.08],interior:true},
  kitchen:{position:[.35,1.55,-1.40],target:[2.49,1.10,-2.0],interior:true},
};

function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function showError(e){console.error(e);$('loading').hidden=true;$('error').hidden=false;$('error-message').textContent=location.protocol==='file:'?'ファイルを直接開くことはできません。READMEのローカルサーバー手順、またはGitHub Pagesを使用してください。':`読み込みエラー: ${e.message||e}。Safariなどの新しいブラウザで開き直してください。`;window.__ROOM_ERROR__=String(e);}
function demand(){needsRender=true;}

function setCut(enabled){
  state.cut=!!enabled;setCutaway(model,state.cut);if(renderer)renderer.shadowMap.needsUpdate=true;$('cut-toggle').classList.toggle('selected',state.cut);$('cut-toggle').setAttribute('aria-pressed',state.cut);demand();
}
function fitPosition(direction,target){
  let distance=10;
  const dir=v(direction).normalize();
  const corners=[];for(const [x,z] of [[-1.99,-3.61],[3.11,-3.61],[3.11,3.61],[-3.11,3.61],[-3.11,.19],[-1.99,.19]])for(const y of [0,1.45])corners.push(new THREE.Vector3(x,y,z));
  for(let i=0;i<65;i++){
    camera.position.copy(target).addScaledVector(dir,distance);camera.lookAt(target);camera.updateMatrixWorld(true);
    const max=Math.max(...corners.map(p=>{const q=p.clone().project(camera);return Math.max(Math.abs(q.x)/.91,Math.abs(q.y)/.80);}));
    if(max<=1)break;distance*=1.06;
  }
  return target.clone().addScaledVector(dir,distance);
}
function setView(name,animate=true){
  const p=presets[name]||presets.overview;state.view=name;state.rotate=false;controls.autoRotate=false;
  $('rotate-toggle').classList.remove('selected');$('rotate-toggle').setAttribute('aria-pressed','false');
  const t=v(p.target||[0,.7,0]);const pos=p.position?v(p.position):(p.whole?fitPosition(p.direction,t):t.clone().addScaledVector(v(p.direction).normalize(),p.distance*(camera.aspect<1?1.25:1)));
  setCut(!p.interior);
  camera.fov=p.interior?64:39;camera.updateProjectionMatrix();
  // Re-fit with the new FOV after an interior view.
  if(p.whole)pos.copy(fitPosition(p.direction,t));
  controls.minDistance=p.interior?.30:2;controls.maxDistance=34;controls.maxPolarAngle=p.interior?Math.PI*.89:Math.PI*.495;
  // Avoid fitPosition changing the starting point of a UI transition.
  if(animate && !capture && !matchMedia('(prefers-reduced-motion: reduce)').matches){transition={from:controls.object.position.clone(),fromTarget:controls.target.clone(),to:pos,target:t,start:performance.now()};}
  else{transition=null;camera.position.copy(pos);controls.target.copy(t);controls.update();}
  $('view-number').textContent=p.number||'ROOM STUDY';$('view-title').textContent=p.title||'モデルを確認';
  document.querySelectorAll('.room').forEach(b=>{const active=b.dataset.view===name||(name==='top'&&b.dataset.view==='overview');b.classList.toggle('active',active);b.setAttribute('aria-pressed',active);});
  $('gesture-help').textContent=p.interior?'室内視点 · 「戻す」で全体表示へ':'1本指で回転 · 2本指で拡大・移動';
  demand();if(capture)renderNow();
}
function updateLabels(){
  const show=state.labels&&['overview','top'].includes(state.view)&&!capture;
  $('labels').hidden=!show;if(!show)return;
  const r=stage.getBoundingClientRect();
  for(const item of roomLabels){const q=item.pos.clone().project(camera);item.el.style.left=`${(q.x*.5+.5)*r.width}px`;item.el.style.top=`${(-q.y*.5+.5)*r.height}px`;item.el.hidden=q.z>1||q.z<0||Math.abs(q.x)>1||Math.abs(q.y)>1;}
}
function renderNow(){camera.updateMatrixWorld();renderer.render(scene,camera);updateLabels();needsRender=false;}
function resize(){
  const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  if(model&&['overview','top','front','back','left','right'].includes(state.view))setView(state.view,false);demand();
}
function animate(t){
  requestAnimationFrame(animate);if(document.hidden&&!capture)return;
  const dt=Math.min((t-lastT)/1000,.04);lastT=t;
  if(transition){let u=Math.min(1,(t-transition.start)/650);u=u*u*(3-2*u);camera.position.lerpVectors(transition.from,transition.to,u);controls.target.lerpVectors(transition.fromTarget,transition.target,u);if(u>=1)transition=null;needsRender=true;}
  if(controls.update(dt))needsRender=true;
  if(needsRender||state.rotate)renderNow();
}

async function setup(){
  if(location.protocol==='file:')throw Error('Please use HTTP(S), not file://');
  renderer=new THREE.WebGLRenderer({canvas:$('viewer'),antialias:true,alpha:false,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#f6f4ef');renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  scene=new THREE.Scene();scene.background=new THREE.Color('#f6f4ef');
  camera=new THREE.PerspectiveCamera(39,1,.02,120);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.09;controls.screenSpacePanning=true;
  controls.rotateSpeed=.7;controls.zoomSpeed=.8;controls.autoRotateSpeed=.65;
  controls.addEventListener('change',demand);controls.addEventListener('start',()=>{transition=null;});
  const pmrem=new THREE.PMREMGenerator(renderer);const roomEnvironment=new RoomEnvironment();
  environmentTarget=pmrem.fromScene(roomEnvironment,.035);scene.environment=environmentTarget.texture;scene.environmentIntensity=.32;roomEnvironment.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#fffdf3','#b7b7a5',2.0));
  const sun=new THREE.DirectionalLight('#fff8ea',3.0);sun.position.set(-3,9,6);sun.castShadow=true;sun.shadow.mapSize.set(innerWidth<640?1024:2048,innerWidth<640?1024:2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;sun.shadow.camera.near=.1;sun.shadow.camera.far=25;sun.shadow.normalBias=.025;sun.shadow.bias=-.00007;sun.shadow.radius=3;scene.add(sun);
  const fill=new THREE.DirectionalLight('#e7efff',.80);fill.position.set(6,5,-5);scene.add(fill);
  // Presentation floor is separate from the exported model.
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.ShadowMaterial({opacity:.13}));ground.rotation.x=-Math.PI/2;ground.position.y=-.003;ground.receiveShadow=true;scene.add(ground);
  if(studio){model=buildApartment();$('export-all').hidden=false;}else{
    const gltf=await new GLTFLoader().loadAsync('./models/model.glb',ev=>{if(ev.total)$('loading').querySelector('small').textContent=`3Dモデルを読み込み中… ${Math.round(ev.loaded/ev.total*100)}%`;});model=gltf.scene;
  }
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.map)o.material.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}});
  scene.add(model);
  const labels=[['LDK','10.4帖',[.45,.24,-1.25]],['洋室','6帖',[1.22,.24,1.73]],['洗面','',[-1.13,.27,1.02]],['浴室','',[-1.89,.34,2.69]],['玄関','',[-1.38,.22,-2.84]]];
  for(const [title,small,pos] of labels){const el=document.createElement('div');el.className='room-label';el.innerHTML=`${title}${small?`<small>${small}</small>`:''}`;$('labels').appendChild(el);roomLabels.push({el,pos:v(pos)});}
  resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resize();setView('overview',false);
  $('loading').hidden=true;state.ready=true;
  window.__ROOM__={state,model,scene,camera,renderer,controls,stats:()=>modelStats(model),setView,setCutaway:setCut,render:renderNow,exportAll:()=>exportAll(),
    setCamera:(position,target)=>{transition=null;camera.position.copy(v(position));controls.target.copy(v(target));controls.update();renderNow();},
    image:()=>{renderNow();return renderer.domElement.toDataURL('image/png');},
    resize,
  };
  requestAnimationFrame(animate);renderNow();
}

function toBase64(bytes){let str='';for(let i=0;i<bytes.length;i+=32768)str+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(str);}
async function store(name,bytes,type){
  if(window.__saveArtifact){await window.__saveArtifact(name,toBase64(bytes));return;}
  const url=URL.createObjectURL(new Blob([bytes],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
async function exportAll(){
  const old=state.cut;setCut(false);model.updateMatrixWorld(true);
  const {GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
  const {USDZExporter}=await import('three/addons/exporters/USDZExporter.js');
  const button=$('export-all');button.disabled=true;button.textContent='書き出しています…';
  try{
    const full=model.clone(true);setCutaway(full,false);full.updateMatrixWorld(true);
    const glb=await new GLTFExporter().parseAsync(full,{binary:true,onlyVisible:true,maxTextureSize:2048});
    await store('model.glb',new Uint8Array(glb),'model/gltf-binary');
    const usdz=await new USDZExporter().parseAsync(full,{quickLookCompatible:true,maxTextureSize:2048,onlyVisible:true});
    await store('model.usdz',new Uint8Array(usdz),'model/vnd.usdz+zip');
    const mini=full.clone(true);setCutaway(mini,true);mini.name='Apartment_miniature_1_to_10';mini.scale.setScalar(PARAMETERS.arMiniatureScale);mini.updateMatrixWorld(true);
    const miniUsdz=await new USDZExporter().parseAsync(mini,{quickLookCompatible:true,maxTextureSize:2048,onlyVisible:true});
    await store('model-mini.usdz',new Uint8Array(miniUsdz),'model/vnd.usdz+zip');
    return {glbBytes:glb.byteLength,usdzBytes:usdz.byteLength,miniUsdzBytes:miniUsdz.byteLength,stats:modelStats(full)};
  }finally{setCut(old);button.disabled=false;button.textContent='制作モード：3形式を生成';}
}

document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{if(state.ready)setView(b.dataset.view);}));
$('top-view').addEventListener('click',()=>state.ready&&setView('top'));
$('reset-view').addEventListener('click',()=>state.ready&&setView('overview'));
$('cut-toggle').addEventListener('click',()=>state.ready&&setCut(!state.cut));
$('rotate-toggle').addEventListener('click',()=>{if(!state.ready)return;transition=null;state.rotate=!state.rotate;controls.autoRotate=state.rotate;$('rotate-toggle').classList.toggle('selected',state.rotate);$('rotate-toggle').setAttribute('aria-pressed',state.rotate);demand();});
$('labels-toggle').addEventListener('click',()=>{state.labels=!state.labels;$('labels-toggle').classList.toggle('selected',state.labels);$('labels-toggle').setAttribute('aria-pressed',state.labels);demand();});
$('info-open').addEventListener('click',()=>$('info').showModal());$('info-close').addEventListener('click',()=>$('info').close());$('info').addEventListener('click',e=>{if(e.target===$('info')){$('info').close();}});
$('ar-link').addEventListener('click',()=>{if(!(/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.maxTouchPoints>1&&/Mac/.test(navigator.platform)))toast('USDZファイルを取得します。AR表示はiPhone / iPadでお試しください。');});
$('share-link').addEventListener('click',async()=>{const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('openExternalBrowser','1');try{await navigator.clipboard.writeText(url.href);toast('LINEで送る共有リンクをコピーしました');}catch{prompt('このURLをコピーしてLINEへ送ってください',url.href);}});
$('export-all').addEventListener('click',()=>exportAll().then(()=>toast('3形式を書き出しました')).catch(e=>toast(`書き出しエラー: ${e.message}`)));
setup().catch(showError);
