// Measure the actual in-between curve, rather than assuming a rotating path
// can be linearly morphed between widely spaced snapshots.
function studioAEGeometryError(a,b,actual,fraction){
  if(!a||!b||!actual||a.kind!==b.kind||a.kind!==actual.kind||a.paths.length!==b.paths.length||a.paths.length!==actual.paths.length)return Infinity;
  const mix=(x,y)=>x+(y-x)*fraction;
  let error=Math.max(Math.abs(mix(a.alpha,b.alpha)-actual.alpha)*100,Math.abs(mix(a.width,b.width)-actual.width));
  for(let p=0;p<a.paths.length;p++){
    const x=a.paths[p],y=b.paths[p],z=actual.paths[p];
    if(x.closed!==y.closed||x.closed!==z.closed||x.v.length!==y.v.length||x.v.length!==z.v.length)return Infinity;
    for(let j=0;j<x.v.length;j++)for(const tangent of [null,'i','o']){
      const vx=mix(x.v[j][0]+(tangent?x[tangent][j][0]:0),y.v[j][0]+(tangent?y[tangent][j][0]:0));
      const vy=mix(x.v[j][1]+(tangent?x[tangent][j][1]:0),y.v[j][1]+(tangent?y[tangent][j][1]:0));
      error=Math.max(error,Math.hypot(vx-z.v[j][0]-(tangent?z[tangent][j][0]:0),vy-z.v[j][1]-(tangent?z[tangent][j][1]:0)));
    }
  }
  return error;
}
export async function captureStudioAEGeometry(paint,duration,options={}){
  const tolerance=options.tolerance??.25,reference=paint(duration),limit=options.limit??100,minStep=1/((options.fps===60?60:30)*4);
  const score=op=>{const points=op.paths.flatMap(p=>p.v);if(!points.length)return 0;const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return (Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys))+op.width*100};
  const selected=reference.map((op,i)=>({i,score:score(op)})).sort((a,b)=>b.score-a.score).slice(0,limit).map(item=>item.i).sort((a,b)=>a-b);
  const geometry=selected.map(i=>({...reference[i],samples:[]}));
  let captures=1;
  if(!geometry.length)return {geometry,captures,total:reference.length};
  // Export must also finish in a background tab, where animation frames pause.
  const pause=options.yield||(()=>new Promise(resolve=>setTimeout(resolve,0)));
  async function frame(time){
    if(++captures%32===0)await pause();
    const ops=paint(time);return selected.map(i=>ops[i]);
  }
  function append(index,time,op){
    const samples=geometry[index].samples,sample={time,paths:op.paths,alpha:op.alpha,width:op.width};
    // Keep the start/end of a hold. Dropping every identical key would let the
    // next moving key drift backward through what should be a stationary span.
    const asOp=s=>({...s,kind:geometry[index].kind});
    if(samples.length>1&&studioAEGeometryError(asOp(samples.at(-2)),asOp(samples.at(-1)),op,0)<1e-8&&studioAEGeometryError(asOp(samples.at(-1)),asOp(samples.at(-1)),op,0)<1e-8)samples[samples.length-1]=sample;
    else samples.push(sample);
  }
  let left=await frame(0);for(let i=0;i<geometry.length;i++){
    if(!Number.isFinite(studioAEGeometryError(left[i],left[i],reference[selected[i]],0)))throw Error('几何路径的结构发生变化，请更换几何样式后重试。');
    append(i,0,left[i]);
  }
  const all=geometry.map((_,i)=>i);
  for(let start=0;start<duration;){
    const end=Math.min(duration,start+.5),right=await frame(end),cache=new Map([[start,left],[end,right]]);
    const get=async time=>{if(!cache.has(time))cache.set(time,await frame(time));return cache.get(time)};
    async function refine(aTime,bTime,a,b,active){
      const span=bTime-aTime,mid=(aTime+bTime)/2,q1=await get(aTime+span*.25),m=await get(mid),q3=await get(aTime+span*.75),split=[];
      for(const i of active){
        const error=Math.max(studioAEGeometryError(a[i],b[i],q1[i],.25),studioAEGeometryError(a[i],b[i],m[i],.5),studioAEGeometryError(a[i],b[i],q3[i],.75));
        if(!Number.isFinite(error))throw Error('几何路径的结构发生变化，请更换几何样式后重试。');
        if(error>tolerance&&span>minStep)split.push(i);else append(i,bTime,b[i]);
      }
      if(split.length){await refine(aTime,mid,a,m,split);await refine(mid,bTime,m,b,split)}
    }
    await refine(start,end,left,right,all);left=right;start=end;
  }
  return {geometry,captures,total:reference.length};
}
