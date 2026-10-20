const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const scope={};vm.createContext(scope);
for(const file of ['runtime/crt-motion.js','src/timeline.js','src/motion-clock.js','src/studio-text.js','src/story-intro.js'])vm.runInContext(read(file),scope,{filename:file});
const json=value=>JSON.parse(JSON.stringify(value));
const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
const n=scope.studioNarrativeSettings({introStyle:'story'}),intro=scope.studioStoryDuration(n);
near(intro,5.1);
assert.equal(scope.studioStoryPose(1,intro,n).role,'character');
assert.equal(scope.studioStoryPose(3,intro,n).role,'author');
assert.equal(scope.studioStoryPose(intro,intro,n).role,'show');
for(const time of [0,.08,.4,1,2.499,2.5,2.6,3.5,4.499]){
  const p=scope.studioNarrativePose(time,intro,n);
  for(const key of ['geometry','titleAlpha','info','model'])near(p[key],0);
  assert.equal(p.story.active,true);
}
// Entry is a restrained alpha/position animation, reconstructed solely from
// local time. A repeated seek cannot depend on a previous shot's DOM state.
const first=scope.studioStoryPose(0,intro,n),entering=scope.studioStoryPose(.08,intro,n),settled=scope.studioStoryPose(.7,intro,n);
near(first.alpha,0);assert.ok(entering.alpha>0&&entering.alpha<1);near(settled.alpha,1);
assert.ok(Math.abs(first.shift)>Math.abs(settled.shift));
for(const time of [0,.08,1,2.49,2.5,2.58,4.6,4.8,5.1,19]){
  const expected=json(scope.studioNarrativePose(time,intro,n));
  scope.studioNarrativePose(20,intro,n);scope.studioNarrativePose(0,intro,n);
  assert.deepEqual(json(scope.studioNarrativePose(time,intro,n)),expected,'paused/seek reconstruction is deterministic');
}
const midway=scope.studioNarrativePose(4.8,intro,n),finished=scope.studioNarrativePose(5.1,intro,n);
for(const key of ['geometry','titleAlpha','info','model']){near(midway[key],.5);near(finished[key],1)}
near(midway.story.alpha,.5);near(finished.story.alpha,0);
for(const characterShotEnabled of [false,true])for(const authorShotEnabled of [false,true]){
  const config=scope.studioNarrativeSettings({...n,characterShotEnabled,authorShotEnabled}),duration=scope.studioStoryDuration(config);
  near(duration,(characterShotEnabled?2.5:0)+(authorShotEnabled?2:0)+((characterShotEnabled||authorShotEnabled)?.6:0));
  const p=scope.studioStoryPose(0,duration,config);
  assert.equal(p.role,characterShotEnabled?'character':authorShotEnabled?'author':'show');
  if(!characterShotEnabled&&!authorShotEnabled){near(p.main,1);assert.equal(p.active,false)}
  const zero=scope.studioStoryPose(0,0,config);near(zero.main,1);near(zero.alpha,0);assert.equal(zero.role,'show');
}
// Enabled shots have a minimum duration; switches, not zero-size media, remove
// a shot. Boundaries remain finite for malformed restored inputs.
const dirty=scope.studioNarrativeSettings({introStyle:'story',characterShotDuration:0,authorShotDuration:Infinity,storyTransitionDuration:0,characterEffectStrength:NaN,authorEffectSpeed:-1,characterScale:Infinity,authorScale:999,characterX:-1,authorY:999});
near(dirty.characterShotDuration,.5);near(dirty.authorShotDuration,2);near(dirty.storyTransitionDuration,.15);near(dirty.characterEffectStrength,.3);near(dirty.authorEffectSpeed,.1);near(dirty.characterScale,1.15);near(dirty.authorScale,2.4);near(dirty.characterX,0);near(dirty.authorY,100);
for(const time of [-1,NaN,0,.15,1,30,Infinity]){
  const p=scope.studioStoryPose(time,scope.studioStoryDuration(dirty),dirty);
  for(const [key,value]of Object.entries(p))if(typeof value==='number')assert.ok(Number.isFinite(value),'finite story '+key);
}
for(const corner of ['tl-br','tr-bl','bl-tr','br-tl'])for(const effect of ['none','crt','holo','polar']){
  const config=scope.studioNarrativeSettings({...n,characterCorner:corner,authorCorner:corner,characterEffect:effect,authorEffect:effect});
  assert.equal(config.characterCorner,corner);assert.equal(config.authorCorner,corner);assert.equal(config.characterEffect,effect);assert.equal(config.authorEffect,effect);
}
for(const time of [0,.08,2.49,2.5,2.51,4.5,4.8,5.1]){
  near(scope.studioStoryPose(time,intro,n).flash,0);
  const p=scope.studioStoryPose(time,intro,{...n,storyFlash:true});assert.ok(p.flash>=0&&p.flash<=.7);
}
assert.ok(scope.studioStoryPose(2.5,intro,{...n,storyFlash:true}).flash>.6);

// Use the real DOM renderer with small node doubles. This catches visible
// state surviving a backwards seek, per-role assets crossing over, and double
// application of the third-scene dissolve without relying on CSS snapshots.
const node=()=>({style:{setProperty(key,value){this[key]=value},removeProperty(key){delete this[key]}},textContent:'',attributes:{},setAttribute(key,value){this.attributes[key]=value},getAttribute(key){return this.attributes[key]},removeAttribute(key){delete this.attributes[key]}});
scope.getComputedStyle=el=>({fontSize:el.style.fontSize||'80px'});
function storyPart(role){
  const el=node(),image=node(),canvas={width:0,height:0},parts={};el.dataset={storyRole:role};
  Object.defineProperty(image,'src',{get(){return this.attributes.src},set(value){this.attributes.src=value}});
  for(const selector of ['.story-kicker','.story-title','.story-meta-label','.story-meta','.story-shot-number','.story-primary','.story-secondary'])parts[selector]=node();
  el.querySelector=selector=>parts[selector];
  const ctx=new Proxy({clears:0,clearRect(){this.clears++}},{get:(obj,key)=>key in obj?obj[key]:(()=>{})});
  return {el,image,canvas,ctx,parts};
}
const layer=node(),flash=node();layer.clientWidth=1920;layer.clientHeight=1080;layer.querySelector=()=>flash;
const view={key:'district',storyLayer:layer,storyShots:[storyPart('character'),storyPart('author')]};
scope.state={narrative:n,variants:{district:{accent:'#bceb45',background:'dark'}},name:'NOVA',brand:'STUDIO',modelCredit:'MODEL / CREATOR',designCredit:'DESIGN / STUDIO',type:true};
scope.state.typography=scope.studioTypographySettings();
scope.currentSeries=()=>({label:'ATELIER',prefix:'AT',serial:'001',caption:'生来不设限'});
scope.images={introCharacter:'data:image/png;base64,AAAA',introAuthor:'data:image/png;base64,BBBB',model:'data:image/png;base64,CCCC',portrait:'data:image/png;base64,DDDD'};scope.reduced={matches:false};
const draw=time=>{scope.state.time=time;scope.drawStudioStoryIntro(view,scope.studioNarrativePose(time,intro,scope.state.narrative))};
// Keep the overlay painter independently covered below; here media/copy state
// is the observation of interest, so no full canvas implementation is needed.
scope.state.narrative={...n,characterEffect:'none',authorEffect:'none'};
draw(0);assert.equal(layer.style.visibility,'visible');assert.equal(view.storyShots[0].el.style.visibility,'visible');assert.equal(view.storyShots[1].el.style.visibility,'hidden');near(view.storyShots[0].parts['.story-primary'].style.opacity,0);
draw(.08);assert.ok(view.storyShots[0].parts['.story-primary'].style.opacity>0);assert.ok(view.storyShots[0].parts['.story-primary'].style.opacity<1);
draw(1);assert.equal(view.storyShots[0].image.src,scope.images.introCharacter);assert.equal(view.storyShots[0].parts['.story-title'].textContent,'NOVA');near(view.storyShots[0].parts['.story-primary'].style.opacity,1);
scope.state.typography=scope.studioTypographySettings({character:{text:'Nekokaii',case:'uppercase'},copy:{character:{kicker:'CUSTOM CHARACTER'}}});draw(1);assert.equal(view.storyShots[0].parts['.story-title'].textContent,'NEKOKAII');assert.equal(view.storyShots[0].parts['.story-kicker'].textContent,'CUSTOM CHARACTER');scope.state.typography=scope.studioTypographySettings();draw(1);assert.equal(view.storyShots[0].parts['.story-title'].textContent,'NOVA');
draw(2.5);assert.equal(view.storyShots[0].el.style.visibility,'hidden');assert.equal(view.storyShots[1].el.style.visibility,'visible');assert.equal(view.storyShots[1].image.src,scope.images.introAuthor);near(view.storyShots[1].parts['.story-primary'].style.opacity,0);
draw(4.8);near(view.storyShots[1].el.style.opacity,.5);near(view.storyShots[1].parts['.story-primary'].style.opacity,1);
draw(5.1);assert.equal(layer.style.visibility,'hidden');assert.equal(layer.style.display,'none');assert.equal(layer.attributes['aria-hidden'],'true');
draw(1);assert.equal(layer.style.display,'block');assert.equal(layer.style.visibility,'visible');assert.equal(view.storyShots[0].el.style.visibility,'visible');
// A child with explicit visibility:visible can outlive a hidden ancestor. The
// parent must leave layout entirely when jumping from a fully visible poster
// to the showcase or switching to either legacy intro mode.
draw(intro);assert.equal(layer.style.display,'none','jumping directly to showcase removes the poster layer');
const storyConfig=scope.state.narrative;
for(const introStyle of ['model','title']){
  scope.state.narrative=storyConfig;draw(1);assert.equal(layer.style.display,'block');assert.equal(view.storyShots[0].el.style.visibility,'visible');
  scope.state.narrative=scope.studioNarrativeSettings({introStyle});draw(1);
  assert.equal(layer.style.display,'none',introStyle+' mode removes any previously visible story child');assert.equal(layer.attributes['aria-hidden'],'true');
}
scope.state.narrative=storyConfig;draw(1);assert.equal(layer.style.display,'block','returning to story restores its poster layer');
scope.state.narrative.storyPackagingOnly=true;draw(1);assert.equal(view.storyShots[0].image.style.display,'none');assert.equal(view.storyShots[0].image.getAttribute('src'),undefined);
scope.state.narrative.storyPackagingOnly=false;scope.images.introCharacter='';draw(1);assert.equal(view.storyShots[0].image.src,scope.images.model,'role shot falls back to the supplied model');
scope.state.type=false;draw(1);near(view.storyShots[0].parts['.story-primary'].style.opacity,0);near(view.storyShots[0].parts['.story-secondary'].style.opacity,0);assert.equal(view.storyShots[0].image.style.display,'block');scope.state.type=true;
scope.state.narrative.characterCorner='br-tl';draw(.08);assert.equal(view.storyShots[0].el.dataset.corner,'br-tl');assert.ok(view.storyShots[0].parts['.story-primary'].style.transform.startsWith('translateY(-'));
scope.reduced.matches=true;draw(.4);const reducedPaints=view.storyShots[0].ctx.clears;draw(1);assert.equal(view.storyShots[0].ctx.clears,reducedPaints,'reduced motion does not advance the effect paint clock');scope.reduced.matches=false;

// Invisible during the two posters is not paused: ring/text/border clocks
// continue through the third-scene dissolve and the indefinitely held showcase.
const variants={poster:{ringSpeed:1.7,textMotionSpeed:.8},quiet:{ringSpeed:0,textMotionSpeed:1.2}},edges={top:{direction:'negative',duration:32},bottom:{direction:'positive',duration:38}},clock=scope.createMotionClock(0,variants,edges);
let time=0;
for(let frame=0;frame<1800;frame++){
  time=scope.studioAdvanceTime(time,.04,intro,n);scope.advanceMotionClock(clock,.04,variants,edges);
  const pose=scope.studioNarrativePose(time,intro,n);
  if(clock.elapsed>intro+.001)for(const key of ['geometry','info','titleAlpha','model'])near(pose[key],1);
}
near(time,intro+12);near(clock.elapsed,72,1e-8);near(clock.rings.poster,72*1.7,1e-8);near(clock.rings.quiet,0);near(clock.texts.poster,72*.8,1e-8);near(clock.edges.top,-72/32,1e-8);near(clock.edges.bottom,72/38,1e-8);

// Record the production effect painter without a browser. The entire operation
// trace must be seekable; moving the shot's local time animates every effect.
function effectTrace(options,width=1920,height=1080){
  const trace=[],gradient=()=>({addColorStop:(...args)=>trace.push(['stop',...args])});
  const target={createLinearGradient:(...args)=>(trace.push(['linear',...args]),gradient()),createRadialGradient:(...args)=>(trace.push(['radial',...args]),gradient()),getTransform:()=>({a:1,b:0,c:0,d:1,e:0,f:0}),measureText:()=>({width:100})};
  const ctx=new Proxy(target,{get:(obj,key)=>key in obj?obj[key]:(...args)=>trace.push([String(key),...args]),set:(obj,key,value)=>{trace.push(['set',String(key),typeof value==='object'?'gradient':value]);obj[key]=value;return true}});
  scope.studioPaintStoryEffect(ctx,width,height,options);
  for(const operation of trace)for(const value of operation)if(typeof value==='number')assert.ok(Number.isFinite(value),'effect contains no nonfinite coordinates');
  return trace;
}
const paintCalls=trace=>trace.filter(op=>['fill','stroke','fillRect','strokeRect','drawImage'].includes(op[0]));
let effectsTested=0;
for(const effect of ['crt','holo','polar'])for(const dark of [false,true])for(const portrait of [false,true]){
  const options={effect,time:.35,strength:.3,speed:.7,accent:'#d077e7',dark},width=portrait?1080:1920,height=portrait?1920:1080;
  const expected=effectTrace(options,width,height);assert.ok(paintCalls(expected).length>0,effect+' produces a visible overlay');
  effectTrace({...options,time:2.5},width,height);
  assert.deepEqual(effectTrace(options,width,height),expected,effect+' is deterministic after seeking');
  assert.notDeepEqual(effectTrace({...options,time:.83},width,height),expected,effect+' moves on the shot clock');
  assert.ok(paintCalls(effectTrace({...options,strength:0},width,height)).length===0,'zero strength disables '+effect);
  effectsTested++;
}
assert.equal(paintCalls(effectTrace({effect:'none',time:1,strength:1,speed:1,accent:'#3055ed',dark:true})).length,0);

// Package independent editable story layers rather than baking them into the
// primary showcase. The real host validator and JSX serialization are used.
const aeScope={TextEncoder,Uint8Array,DataView,Blob,structuredClone,atob};vm.createContext(aeScope);
const jsx=read('runtime/ae-import-template.jsx').replace('/* CRT_MOTION_FUNCTION */',()=>read('runtime/crt-motion.js'));
vm.runInContext(read('runtime/export-packages.js').replace('__STUDIO_AE_TEMPLATE__',()=>JSON.stringify(jsx)).replace('__STUDIO_ASSET_NOTICES__',()=>JSON.stringify('QA notices')).replace('__STUDIO_OBS_LAYER_SERVER__',()=>JSON.stringify(read('runtime/obs-layer-server.mjs'))).replace('__STUDIO_OBS_LAYER_CONTROL__',()=>JSON.stringify(read('runtime/obs-layer-control.html'))),aeScope);
const textLayer=(name,text)=>({kind:'text',name,text,fontFamily:'Arial',fontSize:80,weight:700,tracking:0,x:400,y:200,w:600,h:100,entry:0,opacity:1,color:[1,1,1,1]});
const scene={version:1,name:'Story QA',design:'district',width:1920,height:1080,fps:30,intro:5.1,duration:17.1,showDuration:12,speed:1,offset:0,background:[.1,.1,.1,1],ink:[1,1,1,1],accent:[1,.2,.3,1],transparent:false,frame:'horizontal',frameThickness:60,layers:[textLayer('角色名字','NOVA')],geometry:[],warnings:[],motion:{enabled:true,style:'refined',amount:.55,speed:1},shadow:{enabled:true,color:[0,0,0,1],strength:.5,depth:1,soft:false},pattern:{kind:'dots',opacity:.05,moving:true,amount:.15},edges:{top:{direction:'negative',duration:32},bottom:{direction:'positive',duration:38}},borderText:{top:'TEST',bottom:'TEST'},narrative:{introStyle:'story',nameReveal:'show',nameDelay:.65,transitionStart:4.5,transitionDuration:.6,infoDuration:.6,endingTransitionDuration:.8},story:{enabled:true,transitionStart:4.5,transitionDuration:.6,packagingOnly:false,flash:false,shots:[{role:'character',start:0,duration:2.5,corner:'tl-br',effect:'polar',strength:.3,effectSpeed:.7,layers:[textLayer('片头角色 · 名字','NOVA')]},{role:'author',start:2.5,duration:2,corner:'tr-bl',effect:'holo',strength:.3,effectSpeed:.7,layers:[textLayer('片头作者 · 名字','YOUR STUDIO')]}]}};
const built=aeScope.buildStudioAEFiles({scene,assets:[]});
assert.equal(built.scene.story.shots.length,2);assert.equal(built.scene.layers.length,1);
assert.equal(built.scene.story.shots[0].layers[0].text,'NOVA');assert.equal(built.scene.story.shots[1].layers[0].text,'YOUR STUDIO');
new vm.Script(built.files.find(file=>file.name==='IMPORT_TO_AE.jsx').data);
for(const marker of ['Shot Start','Shot Duration','editable poster','Effect Strength'])assert.ok(built.files[0].data.includes(marker),'JSX contains '+marker);
for(const field of ['start','duration','strength','effectSpeed']){
  const bad=structuredClone(scene);bad.story.shots[0][field]='0;alert(1)';assert.throws(()=>aeScope.buildStudioAEFiles({scene:bad,assets:[]}),/数值|片头|镜头/);
}
const missing=structuredClone(scene);missing.story.shots[0].layers=[{kind:'image',name:'shot image',asset:'assets/asset-001.png',x:0,y:0,w:100,h:100,fit:'cover'}];assert.throws(()=>aeScope.buildStudioAEFiles({scene:missing,assets:[]}),/缺失/);
console.log(`PASS: production two-shot/third-scene visibility, diagonal copy entry and media fallback, toggles and zero boundaries, deterministic paused seeking, reduced motion, continuous independent clocks, ${effectsTested} effect cases and separately editable AE story layers.`);
