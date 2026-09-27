/**
 * Apartment study v1.0 — parametrically reconstructed from the supplied floor plan
 * and visual samples of IMG_0494.MOV. NOT a measured / photogrammetric model.
 * Coordinates before centering: plan right = +X, plan down = +Z, up = +Y.
 * Materials are MeshStandardMaterial; textures are deterministic local canvases.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

export const PARAMETERS = Object.freeze({
  version: '1.0', units: 'metres',
  width: 6.0, depth: 7.0, westInset: 1.10,
  partitionZ: 3.80, bedroomWest: 2.90, bathNorth: 5.40,
  closetWest: 2.15, ceilingHeight: 2.40, outerWall: 0.15,
  innerWall: 0.10, finishedFloor: 0.18, cutHeight: 1.02,
  assumedDoorHeight: 2.02, arMiniatureScale: 0.10,
  note: 'All metric dimensions are assumptions. Room labels 10.4 / 6 jo come from the reference plan.'
});

function rng(seed=35172) { return () => {seed = (1664525*seed+1013904223)>>>0; return seed/4294967296;}; }
function canvas(w,h) {const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function texture(c,name) { const t=new THREE.CanvasTexture(c);t.name=name;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4; return t; }

function woodTexture(vertical=false, dark=false) {
  const c=canvas(vertical?512:1024,1024),ctx=c.getContext('2d'),r=rng(vertical?827:195);
  ctx.fillStyle=dark?'#715043':'#a57b57';ctx.fillRect(0,0,c.width,c.height);
  const bands=vertical?5:18, bw=c.width/bands;
  for(let i=0;i<bands;i++){
    const lum=dark?21+9*r():(vertical?29+8*r():30+12*r());
    ctx.fillStyle=`hsl(${dark?25:26}, ${dark?24:36}%, ${lum}%)`;
    ctx.fillRect(i*bw,0,bw,c.height);
    for(let k=0;k<55;k++){
      const x=i*bw+r()*bw;
      ctx.strokeStyle=`rgba(${r()>.45?'45,27,14':'232,196,155'},${.025+r()*.10})`;
      ctx.lineWidth=.35+r()*1.5;ctx.beginPath();ctx.moveTo(x,0);
      for(let y=0;y<=1024;y+=32)ctx.lineTo(x+Math.sin(y/110+i*7+k)*(.4+r()*1.2),y);
      ctx.stroke();
    }
    ctx.fillStyle='rgba(40,23,12,0.24)';ctx.fillRect(i*bw,0,1,1024);
    if(!vertical){
      const offset=(i%3)*250+120;
      for(let y=offset;y<1024;y+=740){ctx.fillStyle='rgba(42,26,12,0.25)';ctx.fillRect(i*bw,y,bw,1.6);}
    }
  }
  return texture(c,vertical?'generated_walnut_vertical':'generated_walnut_floor');
}
function tileTexture(dark=false) {
  const c=canvas(512,512),ctx=c.getContext('2d'),r=rng(dark?855:885);
  const base=dark?105:215;
  ctx.fillStyle=`rgb(${base},${base+(dark?0:1)},${base-5})`;ctx.fillRect(0,0,512,512);
  for(let i=0;i<9000;i++){const g=(r()-.5)*30;ctx.fillStyle=`rgba(${base+g},${base+g},${base+g-6},.35)`;ctx.fillRect(r()*512,r()*512,1+r()*3,1+r()*2);}
  ctx.strokeStyle=dark?'#c2bdb5':'#e9e6de';ctx.lineWidth=3;
  for(let v=0;v<=512;v+=256){ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v,512);ctx.stroke();ctx.beginPath();ctx.moveTo(0,v);ctx.lineTo(512,v);ctx.stroke();}
  return texture(c,dark?'generated_entry_tiles':'generated_wet_floor');
}
function palette() {
  const m=(name,color,extra={})=>{const a=new THREE.MeshStandardMaterial({color,roughness:.72,metalness:0,...extra});a.name=name;return a;};
  return {
    wall:m('Warm white plaster','#eeeae2'),
    exterior:m('Foundation stone','#b8b4aa'),
    floor:m('Walnut plank floor','#ffffff',{map:woodTexture(false),roughness:.59}),
    timber:m('Brown timber doors','#ffffff',{map:woodTexture(true),roughness:.57}),
    trim:m('Walnut skirting and frames','#78553b', {roughness:.58}),
    entry:m('Grey entry tiles','#ffffff',{map:tileTexture(true)}),
    tile:m('Ivory wet-area floor','#ffffff',{map:tileTexture(false),roughness:.74}),
    bathwood:m('Dark brown bath accent','#a18477',{map:woodTexture(true,true),roughness:.39}),
    white:m('White enamel','#fafaf3',{roughness:.28}),
    cabinet:m('White cabinet fronts','#eaece8',{roughness:.46}),
    steel:m('Brushed stainless steel','#a9b2b4',{metalness:.78,roughness:.32}),
    black:m('Black IH glass','#1d242a',{metalness:.12,roughness:.23}),
    burner:m('IH cooking rings','#646c6d',{metalness:.2,roughness:.55}),
    mirror:m('Mirror approximation','#a8b9ba',{metalness:.8,roughness:.23}),
    glazing:m('Frosted glazing approximation','#c5d8db',{roughness:.35,metalness:.04}),
    doorgray:m('Grey entry door','#bbc0bc',{roughness:.61}),
    dark:m('Recesses and shadow gaps','#484c4b'),
    light:m('Light diffuser','#fcf4dc',{roughness:.48}),
  };
}

export function buildApartment({merge=true}={}) {
  const P=PARAMETERS, M=palette(), raw=new THREE.Group();raw.name='Apartment_1LDK_estimated';
  const F=P.finishedFloor,H=P.ceilingHeight,C=P.cutHeight;
  raw.position.set(-3,F,-3.5);
  let currentZone='shell';
  const nameCounts={};
  function add(geo,mat,x,y,z,name='part',layer='base',rot=0) {
    const a=new THREE.Mesh(geo,mat);a.position.set(x,y,z);a.rotation.y=rot;
    a.name=name+'_'+(nameCounts[name]=(nameCounts[name]||0)+1);
    a.userData={zone:currentZone,layer};a.castShadow=true;a.receiveShadow=true;raw.add(a);return a;
  }
  function box(name,x,y,z,w,h,d,mat=M.wall,{rot=0,cut=true}={}) {
    if(Math.min(w,h,d)<=0)return;
    if(cut && y-h/2<C && y+h/2>C){
      const lo=y-h/2,hi=y+h/2;
      add(new THREE.BoxGeometry(w,C-lo,d),mat,x,(lo+C)/2,z,name,'base',rot);
      return add(new THREE.BoxGeometry(w,hi-C,d),mat,x,(C+hi)/2,z,name,'upper',rot);
    }
    return add(new THREE.BoxGeometry(w,h,d),mat,x,y,z,name,y-h/2>=C-.0001?'upper':'base',rot);
  }
  function rbox(name,x,y,z,w,h,d,mat=M.white,radius=.035) {
    return add(new RoundedBoxGeometry(w,h,d,3,Math.min(radius,w/4,h/4,d/4)),mat,x,y,z,name,y-h/2>=C?'upper':'base');
  }
  function cyl(name,x,y,z,r,len,mat=M.steel,axis='y',r2=r) {
    const mesh=add(new THREE.CylinderGeometry(r,r2,len,20),mat,x,y,z,name,y-len/2>C?'upper':'base');
    if(axis==='x')mesh.rotation.z=Math.PI/2;if(axis==='z')mesh.rotation.x=Math.PI/2;return mesh;
  }
  function sphere(name,x,y,z,sx,sy,sz,mat=M.white){
    const g=new THREE.SphereGeometry(1,24,16);g.scale(sx,sy,sz);return add(g,mat,x,y,z,name,y-sy>C?'upper':'base');
  }
  function pipe(name,points,r=.012,mat=M.steel){
    const ps=points.map(p=>new THREE.Vector3(...p));const curve=new THREE.CatmullRomCurve3(ps);
    return add(new THREE.TubeGeometry(curve,20,r,8,false),mat,0,0,0,name,Math.min(...points.map(p=>p[1]))>=C?'upper':'base');
  }
  function wall(axis,p,a,b,holes=[],th=P.outerWall,zone='shell',mat=M.wall){
    currentZone=zone;
    function segment(a,b,bottom,top){
      if(b-a<.001 || top-bottom<.001)return;
      if(axis==='x')box('Wall', (a+b)/2,(bottom+top)/2,p,b-a,top-bottom,th,mat);
      else box('Wall',p,(bottom+top)/2,(a+b)/2,th,top-bottom,b-a,mat);
      if(bottom===0 && zone!=='bath'){
        for(const side of [-1,1]){
          if(axis==='x')box('Skirting',(a+b)/2,.035,p+side*(th/2+.007),b-a,.07,.014,M.trim);
          else box('Skirting',p+side*(th/2+.007),.035,(a+b)/2,.014,.07,b-a,M.trim);
        }
      }
    }
    let last=a;
    for(const hole of [...holes].sort((x,y)=>x.a-y.a)){
      segment(last,hole.a,0,H);segment(hole.a,hole.b,0,hole.bottom||0);segment(hole.a,hole.b,hole.top||P.assumedDoorHeight,H);last=hole.b;
    }
    segment(last,b,0,H);
  }
  function window(axis,p,a,b,bottom,top,zone='shell'){
    currentZone=zone;const len=b-a,mid=(a+b)/2;
    const bb=(name,u,y,w,h,d,mat)=>axis==='x'?box(name,u,y,p,w,h,d,mat):box(name,p,y,u,d,h,w,mat);
    for(const side of [-1,1])bb('Window_wood_jamb',side<0?a:b,(bottom+top)/2,.065,top-bottom+.09,.19,M.trim);
    bb('Window_wood_sill',mid,bottom,len+.12,.06,.21,M.trim);bb('Window_wood_head',mid,top,len+.12,.055,.18,M.trim);
    for(const s of [a+.04,b-.04,mid])bb('Window_aluminium_stile',s,(bottom+top)/2,.028,top-bottom-.06,.052,M.steel);
    for(const y of [bottom+.035,top-.035])bb('Window_aluminium_rail',mid,y,len-.055,.024,.05,M.steel);
    bb('Window_glass',mid,(bottom+top)/2,len-.06,top-bottom-.07,.012,M.glazing);
    if(zone==='bedroom'){
      if(axis==='x')cyl('Curtain_rail',mid,top+.10,p-.13,.012,len+.22,M.steel,'x');
      else cyl('Curtain_rail',p-.13,top+.10,mid,.012,len+.22,M.steel,'z');
    }
  }
  function frame(axis,p,a,b,height=P.assumedDoorHeight,mat=M.trim){
    const c=(a+b)/2,w=b-a;
    for(const u of [a,b]){ if(axis==='x')box('Door_jamb',u,height/2,p,.055,height,.15,mat);else box('Door_jamb',p,height/2,u,.15,height,.055,mat);}
    if(axis==='x')box('Door_header',c,height,p,w+.10,.07,.16,mat);else box('Door_header',p,height,c,.16,.07,w+.10,mat);
  }
  function doorLeaf(x,z,width,angle,mat=M.timber,height=2.0){
    const centerX=x+Math.cos(angle)*width/2,centerZ=z-Math.sin(angle)*width/2;
    box('Door_leaf',centerX,height/2,centerZ,width,height,.040,mat,{rot:angle});
    const hx=x+Math.cos(angle)*(width-.12),hz=z-Math.sin(angle)*(width-.12);
    const handle=box('Door_handle',hx,1.00,hz-.040,.12,.023,.034,M.steel,{rot:angle});
    return handle;
  }
  function floor(name,x0,x1,z0,z1,mat,top=0){
    currentZone=name;box('Finished_floor',(x0+x1)/2,top-.05,(z0+z1)/2,x1-x0,.10,z1-z0,mat,{cut:false});
  }
  function roundPath(w,d,r,Path=THREE.Shape){
    const s=new Path();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);return s;
  }
  function basin(name,x,bottom,z,w,d,depth,mat=M.white,r=.09){
    const shape=roundPath(w,d,r);shape.holes.push(roundPath(w-.13,d-.13,r*.65,THREE.Path));
    const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.010,bevelThickness:.01,curveSegments:10});g.rotateX(-Math.PI/2);
    add(g,mat,x,bottom,z,name);rbox(name+'_bottom',x,bottom+.02,z,w-.10,.045,d-.10,mat,.03);
  }

  // Foundation follows the L-shaped perimeter. No presentation ground is exported.
  currentZone='foundation';
  box('Base_main',3.55,-.14,3.5,5.05,.08,7.15,M.exterior,{cut:false});
  box('Base_wet_wing',.5125,-.14,5.4,1.175,.08,3.35,M.exterior,{cut:false});
  floor('ldk',2.23,5.925,.075,3.75,M.floor);
  floor('ldk',1.175,2.23,1.65,3.75,M.floor);
  floor('entry',1.175,2.23,.075,1.65,M.entry,-.07);
  floor('bedroom',2.95,5.925,3.85,6.925,M.floor);
  floor('wash',1.15,2.85,3.85,5.35,M.tile);
  floor('toilet',.075,1.05,3.875,5.35,M.tile);
  floor('bath',.075,2.10,5.45,6.925,M.tile);
  floor('closet',2.20,2.85,5.45,6.925,M.floor);

  // Outer wall openings: topology from the plan; vertical dimensions estimated.
  wall('x',0,1.10,6,[{a:1.28,b:2.10,top:2.02},{a:3.05,b:4.85,bottom:.92,top:2.05}]);
  wall('z',1.10,0,3.80,[]);
  wall('x',3.80,0,1.10,[]);
  wall('z',0,3.80,7,[{a:4.13,b:4.68,bottom:1.20,top:1.90}]);
  wall('x',7,0,6,[{a:3.28,b:4.92,bottom:.58,top:2.03}]);
  wall('z',6,0,7,[{a:1.24,b:2.10,bottom:1.18,top:1.92},{a:4.46,b:5.78,bottom:.92,top:2.02}]);
  window('x',0,3.05,4.85,.92,2.05,'ldk');
  window('z',6,1.24,2.10,1.18,1.92,'ldk');
  window('z',0,4.13,4.68,1.20,1.90,'toilet');
  window('x',7,3.28,4.92,.58,2.03,'bedroom');
  window('z',6,4.46,5.78,.92,2.02,'bedroom');
  currentZone='entry';frame('x',0,1.28,2.10,2.02,M.doorgray);doorLeaf(1.31,0,.76,-Math.PI/2.8,M.doorgray);
  box('Entry_threshold',1.69,-.045,.03,.86,.045,.16,M.steel,{cut:false});

  // Entrance, shoe cabinet, and the small internal entry opening.
  wall('x',1.65,1.10,2.25,[],.10,'entry');
  wall('z',2.25,0,1.65,[{a:.17,b:1.12,top:2.04}],.10,'entry');
  currentZone='entry';frame('z',2.25,.17,1.12);doorLeaf(2.25,.20,.87,-.07,M.timber);
  box('Shoe_cabinet',1.70,.98,1.365,.91,1.96,.46,M.timber);
  for(const x of [1.477,1.923]){
    box('Shoe_front',x,.75,1.12,.435,1.46,.028,M.timber);
    box('Shoe_upper_front',x,1.75,1.12,.435,.45,.028,M.timber);
    sphere('Shoe_knob',x+(.01),1.45,1.085,.025,.025,.018,M.steel);
  }
  box('Shoe_toe_kick',1.7,.055,1.18,.84,.11,.35,M.dark);

  // LDK / bedroom sliding partition, washroom door, sanitary partitions.
  wall('x',3.80,1.10,6,[{a:1.25,b:2.02,top:2.02},{a:3.00,b:5.10,top:2.05}],.10,'partition');
  currentZone='partition';frame('x',3.8,1.25,2.02);doorLeaf(1.27,3.79,.72,Math.PI/2.5);
  frame('x',3.80,3.00,5.10,2.05);
  box('Sliding_panel_back',4.53,1.015,3.785,1.04,2.03,.033,M.timber);
  box('Sliding_panel_front',4.65,1.015,3.835,1.04,2.03,.033,M.timber);
  box('Sliding_recess_handle',4.20,1.0,3.857,.022,.15,.010,M.steel);
  box('Sliding_door_track',4.05,.009,3.8,2.12,.018,.095,M.steel,{cut:false});
  wall('z',1.10,3.80,5.40,[{a:4.0,b:4.78,top:2.0}],.10,'wash');
  wall('x',5.40,0,2.90,[{a:1.17,b:1.98,top:2.00}],.10,'bath');
  wall('z',2.90,3.80,7,[{a:5.50,b:6.86,top:2.03}],.10,'closet');
  wall('z',2.15,5.40,7,[],.10,'bath');
  currentZone='toilet';frame('z',1.10,4.0,4.78);doorLeaf(1.1,4.03,.71,-Math.PI/2.55);
  currentZone='bath';frame('x',5.40,1.17,1.98,2,M.white);
  box('Bath_folding_door',1.82,.985,5.43,.35,1.97,.033,M.glazing,{rot:.60});
  box('Bath_folding_door',1.80,.985,5.22,.35,1.97,.033,M.glazing,{rot:-.60});
  box('Bath_handle',1.70,.96,5.20,.018,.19,.045,M.white);

  // Wall-mounted kitchen, located on the right-hand wall in the plan.
  currentZone='kitchen';
  box('Kitchen_plinth',5.64,.08,1.43,.55,.16,2.12,M.steel);
  box('Kitchen_carcass',5.63,.445,1.43,.62,.73,2.17,M.cabinet);
  // Worktop is built around the sink, rather than covering the basin hole.
  box('Worktop_north',5.63,.847,.845,.68,.035,1.09,M.steel);
  box('Worktop_south',5.63,.847,2.20,.68,.035,.58,M.steel);
  box('Worktop_sink_back',5.915,.847,1.66,.11,.035,.54,M.steel);
  box('Worktop_sink_front',5.345,.847,1.66,.11,.035,.54,M.steel);
  basin('Stainless_sink',5.63,.67,1.66,.50,.52,.18,M.steel,.08);
  cyl('Sink_drain',5.63,.704,1.66,.035,.009,M.dark);
  pipe('Kitchen_faucet',[[5.86,.87,1.68],[5.86,1.13,1.68],[5.74,1.18,1.68],[5.66,1.13,1.68]],.017);
  cyl('Mixer_handle',5.87,.93,1.79,.017,.10,M.steel,'z');
  box('IH_glass_top',5.62,.880,.80,.57,.019,.60,M.black);
  for(const [x,z,r] of [[5.46,.66,.106],[5.76,.66,.105],[5.63,.94,.072]]){
    cyl('IH_zone',x,.893,z,r,.003,M.burner);cyl('IH_inner',x,.896,z,r-.009,.003,M.black);
  }
  // Drawer fronts face towards the LDK (negative X).
  for(const z of [.76,1.47,2.14]){
    box('Kitchen_drawer',5.306,.39,z,.025,.52,.65,M.cabinet);
    cyl('Drawer_pull',5.275,.605,z,.012,.37,M.steel,'z');
  }
  box('Grill_black_front',5.286,.733,.69,.026,.15,.42,M.black);
  box('Grill_handle',5.25,.735,.69,.04,.022,.35,M.steel);
  box('Backsplash',5.913,1.15,.67,.018,.57,.93,M.white);
  box('Range_hood',5.655,1.89,.68,.65,.14,.74,M.steel);
  box('Range_hood_filter',5.65,1.81,.68,.50,.018,.56,M.dark);
  box('Range_hood_duct',5.86,2.17,.68,.23,.43,.46,M.steel);
  box('Kitchen_upper_cabinet',5.815,1.995,2.255,.29,.65,.46,M.cabinet);
  // Refrigerator bay remains empty, matching the reference video.
  box('Fridge_socket',5.91,.52,3.09,.018,.13,.09,M.white);

  // Toilet, closed seat, roll holder, and small ventilation panel.
  currentZone='toilet';
  sphere('Toilet_foot',.54,.20,4.965,.195,.205,.25);
  sphere('Toilet_bowl',.54,.365,4.82,.27,.16,.365);
  sphere('Toilet_closed_lid',.54,.502,4.795,.272,.036,.355);
  rbox('Toilet_tank',.54,.60,5.12,.45,.44,.18,M.white,.06);
  rbox('Toilet_tank_lid',.54,.83,5.12,.46,.038,.19,M.white,.018);
  cyl('Flush_button',.71,.77,5.08,.014,.045,M.steel,'x');
  box('Paper_holder_plate',.992,.67,4.43,.035,.08,.17,M.steel);
  cyl('Paper_roll',.95,.66,4.43,.055,.13,M.white,'z');
  box('Toilet_vent',.995,2.15,4.94,.03,.19,.19,M.white);

  // Washroom: three-panel mirror, basin and EMPTY washing-machine tray.
  currentZone='wash';
  rbox('Wash_cabinet',2.55,.37,4.22,.58,.74,.66,M.cabinet,.014);
  // Basin opening is perpendicular to the east wall.
  basin('Wash_basin',2.52,.745,4.22,.58,.63,.095,M.white,.09);
  pipe('Wash_faucet',[[2.73,.84,4.22],[2.73,1.00,4.22],[2.58,1.02,4.22]],.017);
  for(const z of [4.045,4.385])cyl('Wash_handle',2.242,.58,z,.010,.19,M.steel,'z');
  box('Mirror_back',2.818,1.42,4.22,.065,.84,.66,M.cabinet);
  for(let i=0;i<3;i++)box('Mirror_panel',2.777,1.43,4.22+(i-1)*.213,.015,.72,.201,M.mirror);
  box('Mirror_light',2.745,1.88,4.22,.14,.045,.68,M.light);
  box('Washer_tray',2.48,.040,4.98,.65,.08,.65,M.white);
  for(const dx of [-.29,.29])box('Washer_tray_rim',2.48+dx,.09,4.98,.05,.1,.65,M.white);
  for(const dz of [-.29,.29])box('Washer_tray_rim',2.48,.09,4.98+dz,.65,.1,.05,M.white);
  cyl('Washer_drain',2.48,.087,4.98,.047,.009,M.dark);
  cyl('Washer_tap',2.79,1.21,4.98,.028,.15,M.steel,'x');
  box('Washer_shelf',2.55,1.67,4.98,.57,.04,.69,M.cabinet);
  box('Breaker_panel',2.79,2.0,4.93,.09,.34,.31,M.cabinet);
  box('Inspection_hatch',1.65,.006,4.62,.42,.012,.48,M.steel,{cut:false});
  box('Inspection_hatch_inlay',1.65,.012,4.62,.39,.012,.45,M.tile,{cut:false});

  // Bath: compact tub and dark brown accent wall seen in the video.
  currentZone='bath';
  box('Bath_accent',2.091,1.17,6.21,.020,2.34,1.42,M.bathwood);
  basin('Bathtub_shell',.62,.10,6.17,.88,1.34,.46,M.white,.17);
  box('Bath_apron',1.064,.285,6.17,.040,.40,1.25,M.white);
  cyl('Tub_drain',.62,.16,6.45,.035,.007,M.steel);
  box('Bath_mirror',2.063,1.36,6.20,.017,.88,.29,M.mirror);
  box('Bath_mirror_frame',2.08,1.36,6.2,.020,.94,.34,M.white);
  box('Bath_mirror_visible',2.054,1.36,6.2,.018,.87,.28,M.mirror);
  box('Bath_shelf',1.997,.91,6.18,.18,.03,.52,M.white);
  cyl('Shower_mixer',1.99,.72,6.16,.038,.29,M.steel,'z');
  pipe('Shower_hose',[[2.01,.74,6.30],[1.93,.34,6.46],[1.91,.75,6.72],[2.0,1.7,6.72]],.013);
  cyl('Shower_rail',2.017,1.51,6.72,.014,.99,M.steel);
  const head=cyl('Shower_head',1.965,1.90,6.72,.055,.027,M.steel);head.rotation.z=.42;
  box('Bath_controller',2.046,.89,5.68,.035,.12,.22,M.white);
  box('Bath_controller_screen',2.024,.905,5.68,.010,.047,.14,M.dark);
  sphere('Bath_globe_light',1.98,2.04,5.77,.115,.115,.115,M.light);
  cyl('Bath_drying_rail',1.10,2.15,6.73,.014,1.94,M.steel,'x');
  box('Bath_ceiling_vent',1.44,2.325,5.99,.32,.045,.36,M.white);
  // Folded tub cover, not a person / bag / removable belongings.
  for(let i=0;i<9;i++)box('Tub_cover_fold',1.53+i*.014,.42,5.60,.011,.77,.16,M.white,{rot:.12});

  // Bedroom closet: partially open sliding panels, shelf and hanging rail.
  currentZone='closet';frame('z',2.90,5.50,6.86,2.03);
  box('Closet_sliding_panel',2.91,1.005,6.51,.035,2.01,.69,M.timber);
  box('Closet_sliding_panel',2.958,1.005,6.45,.035,2.01,.69,M.timber);
  box('Closet_pull',2.981,1.0,6.18,.012,.15,.023,M.steel);
  box('Closet_shelf',2.52,1.76,6.17,.61,.035,1.41,M.cabinet);
  cyl('Closet_hanging_rail',2.53,1.63,6.17,.013,1.30,M.steel,'z');

  // Air conditioners and electrical details are approximations from video.
  currentZone='bedroom';
  rbox('Bedroom_AC',5.47,2.10,6.80,.78,.29,.23,M.cabinet,.035);
  box('Bedroom_AC_vent',5.47,2.002,6.666,.67,.018,.02,M.dark);
  box('Bedroom_AC_socket',5.02,2.05,6.905,.085,.10,.025,M.white);
  currentZone='ldk';
  rbox('LDK_AC',1.31,2.11,2.36,.24,.29,.80,M.cabinet,.035);
  box('LDK_AC_vent',1.445,2.013,2.36,.020,.018,.67,M.dark);
  box('Ceiling_downstand',3.53,2.28,3.57,4.75,.24,.23,M.wall);
  // Plates intentionally unbranded, with no legible original labels / addresses.
  for(const [zone,x,z,axis] of [['ldk',1.184,2.8,'x'],['bedroom',5.92,6.32,'x'],['bedroom',3.30,6.916,'z']]){
    currentZone=zone;
    box('Outlet_plate',x,.29,z,axis==='x'?.018:.105,.11,axis==='x'?.105:.018,M.white);
    for(const s of [-.022,.022]) box('Outlet_slot',axis==='x'?x-.011:x+s,.29,axis==='x'?z+s:z-.011,axis==='x'?.008:.009,.030,axis==='x'?.009:.008,M.dark);
  }
  currentZone='ldk';box('Wall_control',2.85,1.27,3.739,.10,.14,.019,M.white);
  raw.updateMatrixWorld(true);
  if(!merge)return raw;
  // Merge by material + zone + cutaway layer for low mobile draw-call counts.
  const batches=new Map();
  raw.traverse(o=>{
    if(!o.isMesh)return;
    const k=o.userData.zone+'|'+o.userData.layer+'|'+o.material.name;
    if(!batches.has(k))batches.set(k,{material:o.material,zone:o.userData.zone,layer:o.userData.layer,geometries:[]});
    let g=o.geometry.clone().applyMatrix4(o.matrixWorld);
    if(g.index)g=g.toNonIndexed();
    // Keep one common attribute schema for all primitive geometries.
    for(const a of Object.keys(g.attributes))if(!['position','normal','uv'].includes(a))g.deleteAttribute(a);
    batches.get(k).geometries.push(g);
  });
  const out=new THREE.Group();out.name=raw.name;out.userData={...P,source:'Supplied floor plan and video; manual procedural reconstruction',ceiling:'omitted intentionally'};
  for(const [key,b] of batches){
    const geometry=mergeGeometries(b.geometries,false);if(!geometry)throw new Error('Geometry merge failed: '+key);
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const a=new THREE.Mesh(geometry,b.material);a.name=key.replaceAll('|','__').replaceAll(' ','_');a.userData={zone:b.zone,layer:b.layer};a.castShadow=true;a.receiveShadow=true;out.add(a);
    b.geometries.forEach(g=>g.dispose());
  }
  return out;
}

export function setCutaway(root,enabled=true) {
  root.traverse(o=>{if(o.isMesh && o.userData.layer==='upper')o.visible=!enabled;});
}

export function modelStats(root){
  const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
  let meshes=0,triangles=0;const materials=new Set(),textures=new Set();
  root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;materials.add(o.material.uuid);if(o.material.map)textures.add(o.material.map.uuid);}});
  return {meshes,triangles,materials:materials.size,textures:textures.size,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:size.toArray()},threeRevision:THREE.REVISION};
}
