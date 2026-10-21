// Canvas paths recorded as AE-native vector vertices in composition coordinates.
// Lighting gradients become their middle colour; original artwork stays in HTML.
export function createAECanvasRecorder(){
  let m=[1,0,0,1,0,0],paths=[],path=null,introTransform=null,introOpacity=null,introRotation=0;const stack=[],ops=[];
  const round=x=>Math.round(x*100)/100,pt=(x,y)=>[round(m[0]*x+m[2]*y+m[4]),round(m[1]*x+m[3]*y+m[5])];
  const ctx={globalAlpha:1,fillStyle:'#000000',strokeStyle:'#000000',lineWidth:1,lineCap:'butt',lineJoin:'miter',shadowBlur:0,shadowOffsetX:0,shadowOffsetY:0,shadowColor:'transparent'};
  const color=value=>typeof value==='string'?value:value?.stops?.[Math.floor((value.stops?.length||1)/2)]?.[1]||'#888888';
  const next=(x,y)=>{path={v:[pt(x,y)],i:[[0,0]],o:[[0,0]],closed:false};paths.push(path)};
  ctx.beginPath=()=>{paths=[];path=null};ctx.moveTo=next;
  ctx.lineTo=(x,y)=>{if(!path)return next(x,y);path.v.push(pt(x,y));path.i.push([0,0]);path.o.push([0,0])};
  ctx.bezierCurveTo=(x1,y1,x2,y2,x,y)=>{if(!path)next(x,y);const a=path.v.at(-1),b=pt(x1,y1),c=pt(x2,y2),d=pt(x,y);path.o[path.o.length-1]=[round(b[0]-a[0]),round(b[1]-a[1])];path.v.push(d);path.i.push([round(c[0]-d[0]),round(c[1]-d[1])]);path.o.push([0,0])};
  ctx.quadraticCurveTo=(x1,y1,x,y)=>{if(!path)return next(x,y);const a=path.v.at(-1),b=pt(x1,y1),c=pt(x,y);path.o[path.o.length-1]=[round((b[0]-a[0])*2/3),round((b[1]-a[1])*2/3)];path.v.push(c);path.i.push([round((b[0]-c[0])*2/3),round((b[1]-c[1])*2/3)]);path.o.push([0,0])};
  ctx.closePath=()=>{if(path)path.closed=true};
  ctx.rect=(x,y,w,h)=>{next(x,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath()};
  const multiply=n=>{const a=m;m=[a[0]*n[0]+a[2]*n[1],a[1]*n[0]+a[3]*n[1],a[0]*n[2]+a[2]*n[3],a[1]*n[2]+a[3]*n[3],a[0]*n[4]+a[2]*n[5]+a[4],a[1]*n[4]+a[3]*n[5]+a[5]]};
  ctx.transform=(...a)=>multiply(a);ctx.setTransform=(...a)=>{m=a};ctx.translate=(x,y)=>multiply([1,0,0,1,x,y]);ctx.scale=(x,y)=>multiply([x,0,0,y,0,0]);ctx.rotate=a=>multiply([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);
  ctx.getTransform=()=>({a:m[0],b:m[1],c:m[2],d:m[3],e:m[4],f:m[5]});
  const keys=['globalAlpha','fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','shadowBlur','shadowOffsetX','shadowOffsetY','shadowColor'];
  ctx.studioIntroTransform=pose=>{introTransform={from:pt(pose.fromX,pose.fromY),to:pt(pose.toX,pose.toY),scale:pose.scale}};
  ctx.studioIntroOpacity=value=>{introOpacity=value};
  ctx.studioIntroRotation=value=>{introRotation=value};
  ctx.save=()=>stack.push({m:[...m],s:Object.fromEntries(keys.map(k=>[k,ctx[k]])),introTransform,introOpacity,introRotation});ctx.restore=()=>{const s=stack.pop();if(s){m=s.m;introTransform=s.introTransform;introOpacity=s.introOpacity;introRotation=s.introRotation;Object.assign(ctx,s.s)}};
  ctx.ellipse=(x,y,rx,ry,rotation,start,end,ccw=false)=>{
    let delta=end-start;if(!ccw){while(delta<0)delta+=Math.PI*2;delta=Math.min(delta,Math.PI*2)}else{while(delta>0)delta-=Math.PI*2;delta=Math.max(delta,-Math.PI*2)}
    const pieces=Math.max(1,Math.ceil(Math.abs(delta)/(Math.PI/2)-1e-9)),step=delta/pieces;
    const p=a=>[x+Math.cos(rotation)*rx*Math.cos(a)-Math.sin(rotation)*ry*Math.sin(a),y+Math.sin(rotation)*rx*Math.cos(a)+Math.cos(rotation)*ry*Math.sin(a)];
    const tangent=a=>[-Math.cos(rotation)*rx*Math.sin(a)-Math.sin(rotation)*ry*Math.cos(a),-Math.sin(rotation)*rx*Math.sin(a)+Math.cos(rotation)*ry*Math.cos(a)];
    const first=p(start);if(!path)next(...first);else ctx.lineTo(...first);
    for(let j=0;j<pieces;j++){const a=start+j*step,b=a+step,k=4/3*Math.tan(step/4),u=p(a),v=p(b),ta=tangent(a),tb=tangent(b);ctx.bezierCurveTo(u[0]+k*ta[0],u[1]+k*ta[1],v[0]-k*tb[0],v[1]-k*tb[1],...v)}
  };
  ctx.arc=(x,y,r,a,b,c)=>ctx.ellipse(x,y,r,r,0,a,b,c);
  const emit=kind=>{if(!paths.length)return;let pose=introTransform&&structuredClone(introTransform);if(pose&&introRotation){const to=[m[4],m[5]],delta=to.map((n,d)=>n-pose.to[d]);pose={...pose,from:pose.from.map((n,d)=>n+delta[d]*pose.scale),to,rotation:introRotation*180/Math.PI*(m[0]*m[3]-m[1]*m[2]<0?-1:1)}}ops.push({paths:structuredClone(paths),kind,color:color(kind==='fill'?ctx.fillStyle:ctx.strokeStyle),alpha:round(Math.max(0,Math.min(1,ctx.globalAlpha))),width:round(ctx.lineWidth*Math.hypot(m[0],m[1])),cap:ctx.lineCap==='round'?2:1,...(pose?{introTransform:pose}:{}),...(introOpacity!==null?{introOpacity}:{})})};
  ctx.fill=()=>emit('fill');ctx.stroke=()=>emit('stroke');ctx.fillRect=(...a)=>{const old=paths,oldPath=path;paths=[];ctx.rect(...a);emit('fill');paths=old;path=oldPath};
  ctx.clearRect=()=>{};ctx.clip=()=>{};ctx.setLineDash=()=>{};ctx.getLineDash=()=>[];
  ctx.createLinearGradient=ctx.createRadialGradient=()=>{const g={stops:[],addColorStop(t,c){this.stops.push([t,c])}};return g};
  return {ctx,ops};
}
