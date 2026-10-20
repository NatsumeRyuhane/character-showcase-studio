const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),root=path.join(__dirname,'..');
const scope={structuredClone};vm.createContext(scope);const read=file=>fs.readFileSync(path.join(root,'src',file),'utf8');
vm.runInContext(fs.readFileSync(path.join(root,'runtime/crt-motion.js'),'utf8'),scope);
for(const name of ['ae-canvas-recorder.js','ae-geometry-motion.js','urban-language-scene.js','design-language-scene.js','dual-language-scene.js','timeline.js'])vm.runInContext(read(name),scope);
vm.runInContext(read('exploration-full-scene.js').replace('/* LEGACY_SERIES_GEOMETRY */',()=>read('studio-geometry.js')),scope);
const capture=(paint,duration,options={})=>scope.captureStudioAEGeometry(paint,duration,{yield:async()=>{},...options});
function interpolate(op,time){const list=op.samples;let n=0;while(n+1<list.length&&list[n+1].time<time)n++;const a=list[n],b=list[Math.min(n+1,list.length-1)],f=b.time>a.time?(time-a.time)/(b.time-a.time):0,mix=(x,y)=>x+(y-x)*f;
 return {...op,alpha:mix(a.alpha,b.alpha),width:mix(a.width,b.width),paths:a.paths.map((p,i)=>({...p,...Object.fromEntries(['v','i','o'].map(k=>[k,p[k].map((point,j)=>point.map((x,d)=>mix(x,b.paths[i][k][j][d])))]))}))};
}
function deviation(a,b){assert.equal(a.paths.length,b.paths.length);let max=Math.max(Math.abs(a.width-b.width),Math.abs(a.alpha-b.alpha)*100);for(let p=0;p<a.paths.length;p++){assert.equal(a.paths[p].v.length,b.paths[p].v.length);for(let j=0;j<a.paths[p].v.length;j++)for(const key of ['v','i','o']){const x=a.paths[p][key][j],y=b.paths[p][key][j];max=Math.max(max,Math.hypot(x[0]-y[0],x[1]-y[1]))}}return max;}
(async()=>{
 // The old two-pose linear morph visibly shrinks a rigid rotating circle.
 const circle=t=>{const rec=scope.createAECanvasRecorder();rec.ctx.translate(960,540);rec.ctx.rotate(t*Math.PI*.9);rec.ctx.beginPath();rec.ctx.arc(0,0,400,0,Math.PI*2);rec.ctx.stroke();return rec.ops};
 const legacy=circle(0)[0].paths[0].v.map((p,i)=>p.map((x,d)=>(x+circle(.5)[0].paths[0].v[i][d])/2));
 const legacyShrink=400-Math.hypot(legacy[0][0]-960,legacy[0][1]-540);assert.ok(legacyShrink>90);
 const stable=(await capture(circle,2)).geometry[0];let radiusError=0;
 for(let i=0;i<=120;i++){const shape=interpolate(stable,i/60);for(const p of shape.paths[0].v)radiusError=Math.max(radiusError,Math.abs(Math.hypot(p[0]-960,p[1]-540)-400))}
 assert.ok(radiusError<.25,`circle breathing ${radiusError}px`);
 const hold=(await capture(()=>circle(0),20)).geometry[0];assert.equal(hold.samples.length,2,'a stationary span retains two boundary keys');
 let yields=0;scope.setTimeout=resolve=>{yields++;setTimeout(resolve,0)};
 await scope.captureStudioAEGeometry(circle,.5);assert.ok(yields>0,'background export yields without waiting for animation frames');
 let emptyCaptures=0;assert.equal((await capture(()=>{emptyCaptures++;return []},20)).geometry.length,0);assert.equal(emptyCaptures,1);
 let worst=0,cases=0,totalCaptures=0;
 const fixtures=[...['couture','brutalist','cloud','plush','play','sticker','orbit','poster','wave','dual','district','tuner','arcade'].map(key=>({key,style:'signature'})),...['orbit','slices','wave','flow','facet','ribbon','blocks','ring','burst','cut','rays','none'].map(style=>({key:'poster',style})),...['orbit','slices','wave','flow','ring','rays'].map(style=>({key:'dual',style,portrait:true}))];
 for(const fixture of fixtures){
  const duration=fixture.key==='plush'?.6:2,settings={ringStyle:fixture.style,ringScale:1.15,transparent:true,pattern:'none',grid:false,floor:false,shadow:false,portrait:!!fixture.portrait,swapped:!!fixture.portrait};
  const paint=time=>{const t=6+time*1.8,rec=scope.createAECanvasRecorder();scope.paintExploration(rec.ctx,fixture.portrait?1080:1920,fixture.portrait?1920:1080,t,fixture.key,{...settings,ringTime:t*3,introProgress:1});return rec.ops.map((op,id)=>({...op,id}))};
  const result=await capture(paint,duration,{limit:fixture.key==='plush'?70:100});totalCaptures+=result.captures;
  for(let i=0;i<=40;i++){const time=duration*i/40,actual=paint(time);for(const op of result.geometry){const error=deviation(interpolate(op,time),actual[op.id]);worst=Math.max(worst,error);assert.ok(error<.5,`${fixture.key}/${fixture.style} at ${time}: ${error}px`);}}
  for(const op of result.geometry)for(let i=1;i<op.samples.length;i++)assert.ok(op.samples[i].time>op.samples[i-1].time);
  cases++;
 }
 // Intro changes size deliberately; preserve its easing without interval pulses.
 const introPaint=time=>{const t=time*.5,rec=scope.createAECanvasRecorder();scope.paintExploration(rec.ctx,1920,948,t,'poster',{ringTime:t*3,ringStyle:'orbit',ringScale:2.4,introProgress:scope.studioNarrativePose(t,4.5,{}).geometry,transparent:true,pattern:'none',grid:false,floor:false,shadow:false});return rec.ops.map((op,id)=>({...op,id}))};
 const intro=await capture(introPaint,12);for(let i=0;i<=96;i++){const t=i/8,actual=introPaint(t);for(const op of intro.geometry)assert.ok(deviation(interpolate(op,t),actual[op.id])<.5,'intro/show motion follows source')}
 // Missing/changing topology fails explicitly instead of silently skipping keys.
 await assert.rejects(()=>capture(t=>{const x=circle(t);if(t<1)x[0].paths[0].v.pop();return x},2),/结构/);
 console.log(`PASS: rigid-circle error ${radiusError.toFixed(3)}px (old morph ${legacyShrink.toFixed(1)}px shrink); ${cases} production motion fixtures, ${totalCaptures} captures, worst checked in-between ${worst.toFixed(3)}px; holds, intro continuity and topology failure.`);
})().catch(error=>{console.error(error);process.exitCode=1});
