const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const {load,moduleScript}=require('./support/module-script.cjs');
const root=path.join(__dirname,'..'),scope={structuredClone};vm.createContext(scope);
const read=name=>fs.readFileSync(path.join(root,'src',name),'utf8');
for(const file of ['ae-canvas-recorder.js','urban-language-scene.js','design-language-scene.js','dual-language-scene.js'])load(scope,'src/'+file);
vm.runInContext(read('exploration-full-scene.js').replace('/* LEGACY_SERIES_GEOMETRY */',()=>read('studio-geometry.js')),scope);
const names=['district','tuner','arcade'];
const plain=value=>JSON.parse(JSON.stringify(value));
const base={ringStyle:'signature',introProgress:1,transparent:true,grid:false,pattern:'none',floor:false,shadow:false};
function record(key,t=1,extra={},w=1920,h=1080){
  const rec=scope.createAECanvasRecorder();scope.paintExploration(rec.ctx,w,h,t,key,{...base,ringTime:t,...extra});return plain(rec.ops);
}
function topology(ops){return ops.map(op=>[op.kind,op.paths.map(p=>[p.closed,p.v.length,p.i.length,p.o.length])])}
function finite(ops,w,h,label){
  for(const op of ops){
    assert.ok(Number.isFinite(op.alpha)&&op.alpha>=0&&op.alpha<=1,label+' finite opacity');
    assert.ok(Number.isFinite(op.width)&&op.width>=0,label+' finite width');
    for(const p of op.paths){
      assert.equal(p.v.length,p.i.length,label+' incoming handles');assert.equal(p.v.length,p.o.length,label+' outgoing handles');
      for(const point of [...p.v,...p.i,...p.o])assert.ok(point.length===2&&point.every(value=>Number.isFinite(value)&&Math.abs(value)<Math.max(w,h)*64),label+' finite practical coordinates');
    }
  }
}
let cases=0,maxOps=0;
for(const key of names){
  assert.ok(scope.urbanLanguagePalette(key,false));assert.ok(scope.urbanLanguagePalette(key,true));
  assert.notDeepEqual(plain(scope.urbanLanguagePalette(key,false)),plain(scope.urbanLanguagePalette(key,true)),key+' has light and dark palettes');
  const original=record(key);maxOps=Math.max(maxOps,original.length);
  assert.ok(original.length>0&&original.length<=100,key+' signature fits the native AE geometry budget');
  for(const t of [0,.137,1.3,8.5,12,24])assert.deepEqual(topology(record(key,t)),topology(original),key+' maintains fixed path topology through the entire cycle');
  assert.notDeepEqual(record(key,0),record(key,1.3),key+' ring moves');
  assert.notDeepEqual(record(key,0,{introProgress:0}),record(key,1.3,{introProgress:0}),key+' ring already moves during intro');
  assert.deepEqual(record(key,0,{ringTime:2.7}),record(key,11,{ringTime:2.7}),key+' ringTime independently freezes geometry');
  assert.deepEqual(record(key,0,{motion:false}),record(key,11,{motion:false}),key+' still mode freezes geometry');
  const withPaper=record(key,1,{transparent:false});
  assert.equal(withPaper.length,original.length+1,key+' opaque output adds exactly one paper layer');
  assert.deepEqual(withPaper.slice(1),original,key+' transparency preserves all artwork');
  assert.equal(withPaper[0].color,scope.urbanLanguagePalette(key,false).paper,key+' opaque output uses its own paper');
  assert.ok(record(key,1,{accent:'#129acf'}).some(op=>op.color==='#129acf'),key+' custom accent reaches vector geometry');
  for(const pattern of ['dots','grid','mesh','ripple']){
    const one=record(key,1,{grid:true,pattern,ringTime:2.7,gridMotion:.4});
    const two=record(key,4.3,{grid:true,pattern,ringTime:2.7,gridMotion:.4});
    assert.ok(one.length>original.length,key+'/'+pattern+' produces an ambient field');
    assert.notDeepEqual(one,two,key+'/'+pattern+' field moves while the ring is frozen');
    assert.deepEqual(one.slice(-original.length),record(key,1,{ringTime:2.7}),key+'/'+pattern+' field does not change the ring');
    assert.deepEqual(record(key,1,{grid:true,pattern,ringTime:2.7,gridMoving:false}),record(key,4.3,{grid:true,pattern,ringTime:2.7,gridMoving:false}),key+'/'+pattern+' grid has an independent freeze');
    finite(one,1920,1080,key+'/'+pattern);cases++;
  }
  for(const portrait of [false,true])for(const swapped of [false,true])for(const background of ['light','dark'])for(const ringScale of [.6,2.4])for(const introProgress of [0,1]){
    const w=portrait?1080:1920,h=portrait?1920:1080,ops=record(key,2.71,{portrait,swapped,background,ringScale,introProgress,geometryStrength:1.5,cutStrength:1,accent:'#129acf',shadowColor:'#123456'},w,h);
    assert.ok(ops.length>0&&ops.length<=100,key+' retained geometry count');finite(ops,w,h,key+'/'+portrait+'/'+swapped+'/'+background);cases++;
  }
  // Shadows are browser lighting. Verify user colors/toggles reach the canvas
  // while recording native vector shapes for the separate AE shadow controls.
  for(const shadow of [false,true]){
    const rec=scope.createAECanvasRecorder(),assigned=[];
    const ctx=new Proxy(rec.ctx,{set(target,key,value){if(key==='shadowColor')assigned.push(value);target[key]=value;return true}});
    scope.paintExploration(ctx,1920,1080,1,key,{...base,ringTime:1,shadow,shadowStyle:'soft',shadowColor:'#123456',shadowStrength:.8,shadowDepth:1});
    assert.equal(assigned.some(value=>typeof value==='string'&&value.startsWith('rgba(18,52,86,')),shadow,key+' custom shadows respect the toggle');
    assert.deepEqual(plain(rec.ops),original,key+' shadow settings preserve vector topology');
  }
}
assert.equal(scope.paintUrbanLanguage(null,1920,1080,0,'unknown',{}),false,'unknown schemes continue through the existing dispatcher');
assert.equal(scope.paintUrbanLanguage(null,1920,1080,0,'district',{ringStyle:'ring'}),false,'alternate rings continue through the existing dispatcher');
console.log(`PASS: ${cases} urban composition fixtures; ${names.join('/')} fixed topology, independent animation clocks, light/dark, transparency, custom accents/shadows and portrait/swapped limits; largest signature ${maxOps}/100 ops.`);
