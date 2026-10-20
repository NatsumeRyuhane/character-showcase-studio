const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict');
const {load,moduleScript}=require('./support/module-script.cjs');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8'),scope={structuredClone};vm.createContext(scope);
for(const file of ['ae-canvas-recorder.js','urban-language-scene.js','design-language-scene.js','dual-language-scene.js','export-layout.js'])load(scope,'src/'+file);
vm.runInContext(read('src/exploration-full-scene.js').replace('/* LEGACY_SERIES_GEOMETRY */',()=>read('src/studio-geometry.js')),scope);
const fixtures=[...['couture','brutalist','cloud','plush','play','sticker','orbit','poster','wave','dual','district','tuner','arcade'].map(key=>({key,style:'signature'})),...['orbit','slices','wave','flow','facet','ribbon','blocks','ring','burst','cut','rays','none'].flatMap(style=>['poster','dual'].map(key=>({key,style})))];
let max=0,checks=0;
for(const {key,style}of fixtures)for(const portrait of [false,true])for(const swapped of [false,true])for(const time of [.13,2.71,8.39]){
  const w=portrait?1080:1920,h=portrait?1788:948;
  const paint=introProgress=>{const rec=scope.createAECanvasRecorder();rec.ctx.translate(0,66);scope.paintExploration(rec.ctx,w,h,time,key,{ringStyle:style,ringTime:time*2.3,ringScale:1.4,transparent:true,pattern:'none',grid:false,floor:false,shadow:false,portrait,swapped,introProgress});return rec.ops};
  const settled=paint(1);
  for(const p of [0,.37,.79]){
    const actual=paint(p);assert.equal(actual.length,settled.length);
    for(let i=0;i<settled.length;i++){
      const op=settled[i],target=actual[i],m=op.introTransform,s=m?1+(m.scale-1)*(1-p):1;
      const pos=m?m.from.map((v,d)=>v+(m.to[d]-v)*p):[0,0],anchor=m?m.to:[0,0];
      for(let n=0;n<op.paths.length;n++)for(const type of ['v','i','o'])for(let j=0;j<op.paths[n][type].length;j++)for(let d=0;d<2;d++){
        const angle=(m?.rotation||0)*(1-p)*Math.PI/180,c=Math.cos(angle),sn=Math.sin(angle),point=op.paths[n][type][j].map((v,d)=>(type==='v'?v-anchor[d]:v)*s),rotated=[point[0]*c-point[1]*sn,point[0]*sn+point[1]*c];
        const expected=rotated[d]+(type==='v'?pos[d]:0);
        const error=Math.abs(expected-target.paths[n][type][j][d]);max=Math.max(max,error);assert.ok(error<.045,`${key}/${style}/${portrait}/${swapped} p${p} op${i} ${type}: ${error}`);
      }
      if(op.kind==='stroke')assert.ok(Math.abs(op.width*s-target.width)<.045,`${key}/${style} stroke scaling`);
      const alpha=op.alpha*(op.introOpacity===undefined?1:op.introOpacity+(1-op.introOpacity)*p);
      assert.ok(Math.abs(alpha-target.alpha)<.011,`${key}/${style} opacity`);checks++;
    }
  }
}
console.log(`PASS: ${fixtures.length*4*3} geometry fixtures and ${checks} operation poses factor intro from rotation; max coordinate error ${max.toFixed(4)}px.`);
