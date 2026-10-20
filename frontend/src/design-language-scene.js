/* Six material and composition systems. All paths are presentation geometry,
   deliberately kept away from the model's central silhouette. */
function designLanguagePalette(variant,dark){
  const urban=urbanLanguagePalette(variant,dark);if(urban)return urban;
  const palettes={
    couture:dark?['#17171a','#eee9e1','#a09b94']:['#efede8','#252522','#77766f'],
    brutalist:dark?['#151719','#f1f0e7','#969b95']:['#e9eae3','#20241f','#767d72'],
    cloud:dark?['#292c36','#f1e7ed','#a7a3b4']:['#f5f0ee','#4b4b59','#96909d'],
    plush:dark?['#302b29','#eee4d3','#b5a593']:['#f1e9dc','#514a40','#9c8f7d'],
    play:dark?['#202c32','#f5f0dd','#98b0ac']:['#f4f3e8','#263c3c','#819b91'],
    sticker:dark?['#25282d','#f8efdb','#b4ae9e']:['#f2efdf','#353936','#8c9182']
  };
  const colors=palettes[variant];
  if(!colors)return null;
  return {paper:colors[0],ink:colors[1],muted:colors[2]};
}

function paintDesignLanguage(ctx,w,h,t,variant,settings){
  if(!['couture','brutalist','cloud','plush','play','sticker'].includes(variant))return false;
  const input=settings||{};
  if((input.ringStyle||'signature')!=='signature')return false;
  if(!ctx||!(w>0)||!(h>0))return true;
  const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
  const num=(v,fallback)=>Number.isFinite(v)?v:fallback;
  const rgba=(hex,alpha)=>{const n=parseInt(hex.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha)+')'};
  const mix=(first,second,amount)=>{const a=parseInt(first.slice(1),16),b=parseInt(second.slice(1),16),v=clamp(amount),f=shift=>Math.round(((a>>shift)&255)*(1-v)+((b>>shift)&255)*v);return '#'+[f(16),f(8),f(0)].map(n=>n.toString(16).padStart(2,'0')).join('')};
  const dark=input.background==='dark',portrait=!!input.portrait,swapped=!!input.swapped;
  const colors=designLanguagePalette(variant,dark),paper=colors.paper,ink=colors.ink,muted=colors.muted;
  const accent=/^#[0-9a-f]{6}$/i.test(input.accent||'')?input.accent:({couture:'#c1b5a5',brutalist:'#ddfb4b',cloud:'#c3a7e5',plush:'#d8a183',play:'#8bc9a4',sticker:'#f7bf4f'})[variant];
  const shadowColor=/^#[0-9a-f]{6}$/i.test(input.shadowColor||'')?input.shadowColor:'#282c31';
  // Background and geometry receive independent continuous clocks. A paused ring
  // must not stop the ambient grid, and neither clock resets at the intro boundary.
  const a=input.motion===false?0:Math.PI*2*num(input.ringTime,num(t,0))/12,sa=Math.sin(a),ca=Math.cos(a),s2=Math.sin(2*a);
  const ga=input.motion===false||input.gridMoving===false?0:Math.PI*2*num(t,0)/12,gm=clamp(num(input.gridMotion,.14),0,.5);
  const intro=clamp(num(input.introProgress,1));
  const side=swapped?-1:1;
  const finalCx=w*(portrait?.52:swapped?.285:.715)+num(input.px,0)*w*.007;
  const finalCy=h*(portrait?(swapped?.34:.56):.49)+num(input.py,0)*h*.005;
  const cx=w*.5+(finalCx-w*.5)*intro,cy=h*.48+(finalCy-h*.48)*intro;
  const r=(portrait?Math.min(w*.35,h*.26):h*.38)*clamp(num(input.ringScale,1.15),.6,2.4)*(1+.44*(1-intro));
  const unit=Math.min(w,h),strength=clamp(num(input.geometryStrength,1),.5,1.5);
  const opacity=clamp(num(input.geometryOpacity,1),.3,1),cut=clamp(num(input.cutStrength,.75));
  const shadowEnabled=input.shadow!==false&&num(input.shadowStrength,.8)>0&&num(input.shadowDepth,1)>0;
  const shadowStrength=clamp(num(input.shadowStrength,.8),0,1.5),shadowDepth=clamp(num(input.shadowDepth,1),0,2);

  function line(points,color,width,alpha=1,cap='round'){
    if(points.length<2)return;ctx.save();ctx.globalAlpha*=alpha;ctx.lineWidth=width;ctx.lineCap=cap;ctx.lineJoin='round';ctx.strokeStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.restore();
  }
  function poly(points,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.restore()}
  function disc(x,y,radius,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(.01,radius),0,Math.PI*2);ctx.fill();ctx.restore()}
  function ell(rx,ry,rot,start,end,color,width,alpha=1,x=0,y=0){
    const points=[],c=Math.cos(rot),s=Math.sin(rot),count=Math.max(28,Math.ceil(Math.abs(end-start)*20-1e-9));
    for(let i=0;i<=count;i++){const b=start+(end-start)*i/count,u=Math.cos(b)*rx,v=Math.sin(b)*ry;points.push([x+u*c-v*s,y+u*s+v*c])}line(points,color,width,alpha);
  }
  function ringBand(rx,ry,rot,start,end,thickness,color,alpha=1){
    ctx.save();ctx.rotate(rot);ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();const count=90;
    for(let i=0;i<=count;i++){const b=start+(end-start)*i/count,u=Math.cos(b)*rx,v=Math.sin(b)*ry;i?ctx.lineTo(u,v):ctx.moveTo(u,v)}
    for(let i=count;i>=0;i--){const b=start+(end-start)*i/count;ctx.lineTo(Math.cos(b)*(rx-thickness),Math.sin(b)*(ry-thickness))}ctx.closePath();ctx.fill();ctx.restore();
  }
  function roundedPath(x,y,width,height,radius){
    const rr=Math.min(radius,width*.5,height*.5);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.lineTo(x+width-rr,y);ctx.quadraticCurveTo(x+width,y,x+width,y+rr);ctx.lineTo(x+width,y+height-rr);ctx.quadraticCurveTo(x+width,y+height,x+width-rr,y+height);ctx.lineTo(x+rr,y+height);ctx.quadraticCurveTo(x,y+height,x,y+height-rr);ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.closePath();
  }
  function roundRect(x,y,width,height,radius,color,alpha=1,strokeWidth=0){ctx.save();ctx.globalAlpha*=alpha;roundedPath(x,y,width,height,radius);if(strokeWidth){ctx.lineWidth=strokeWidth;ctx.strokeStyle=color;ctx.stroke()}else{ctx.fillStyle=color;ctx.fill()}ctx.restore()}
  function cast(draw,soft=false){
    ctx.save();if(shadowEnabled){const tr=typeof ctx.getTransform==='function'?ctx.getTransform():null,dpr=tr?Math.hypot(tr.a,tr.b)||1:1;ctx.shadowColor=rgba(shadowColor,shadowStrength*(soft?.25:.33));ctx.shadowBlur=(soft||input.shadowStyle==='soft'?unit*.024:0)*shadowDepth*dpr;ctx.shadowOffsetX=unit*.009*shadowDepth*dpr;ctx.shadowOffsetY=unit*.014*shadowDepth*dpr}draw();ctx.restore();
  }
  function halo(x,y,radius,color,alpha,inner=.03){
    const g=ctx.createRadialGradient(x,y,radius*inner,x,y,radius);g.addColorStop(0,rgba(color,alpha));g.addColorStop(.48,rgba(color,alpha*.36));g.addColorStop(1,rgba(color,0));ctx.save();ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);ctx.restore();
  }
  function gridAlpha(x,y){
    const dx=(x-cx)/(w*(portrait?.7:.65)),dy=(y-cy)/(h*.8);
    return clamp(1-Math.sqrt(dx*dx+dy*dy),.07,1)*(portrait?1:clamp((side*(x-cx)/w+.45)*2,.15,1));
  }
  function pattern(){
    if(input.grid===false||input.pattern==='none')return;
    const kind=input.pattern||'dots',density=clamp(num(input.gridOpacity,.065),.02,.15),step=Math.max(19,unit*.046);
    const alpha=density*(dark?1.1:1.45);
    if(kind==='ripple'){
      for(let j=0;j<16;j++){const rx=unit*(.08+j*.063),points=[];for(let i=0;i<=112;i++){const b=i*Math.PI/56;points.push([cx+Math.cos(b)*rx,cy+r*.55+Math.sin(b)*rx*.24+Math.sin(b*3-j*.4+ga)*unit*.025*gm])}line(points,ink,unit*.0008,alpha*(1-j/18))}return;
    }
    if(kind==='mesh'){
      for(let j=0;j<20;j++){const depth=j/19,z=1/(.9+depth*4.4),points=[];for(let i=0;i<=70;i++){const u=(i/70-.5)*5.4,x=cx+u*w*.42*z,y=h*.25+h*.60*z+Math.sin(u*1.1-depth*4+ga)*unit*.05*gm*z;points.push([x,y])}line(points,ink,unit*.0008,alpha*(1-depth)*.75)}
      for(let i=0;i<=32;i++){const u=(i/32-.5)*5.4,points=[];for(let j=0;j<=50;j++){const depth=j/50,z=1/(.9+depth*4.4);points.push([cx+u*w*.42*z,h*.25+h*.60*z+Math.sin(u*1.1-depth*4+ga)*unit*.05*gm*z])}line(points,ink,unit*.00065,alpha*.6)}return;
    }
    if(kind==='grid'){
      for(let x=-step;x<w+step;x+=step){const points=[];for(let y=0;y<=h+8;y+=16)points.push([x+Math.sin(ga+y/h*4)*unit*.018*gm,y]);line(points,ink,unit*.00065,alpha*.68)}
      for(let y=-step;y<h+step;y+=step){const points=[];for(let x=0;x<=w+8;x+=16)points.push([x,y+Math.sin(ga+x/w*5)*unit*.015*gm]);line(points,ink,unit*.00065,alpha*.68)}return;
    }
    for(let row=0,y=step*.5;y<h;y+=step,row++)for(let col=0,x=step*.5;x<w;x+=step,col++){
      const wave=Math.sin(col*.42+row*.29+ga),xx=x+Math.sin(ga+row*.3)*unit*.015*gm,yy=y+wave*unit*.027*gm,fade=gridAlpha(xx,yy);
      disc(xx,yy,unit*.00115*(.75+wave*.13),ink,alpha*fade*1.5);
    }
  }
  function floor(){
    if(!input.floor||shadowStrength<=0||shadowDepth<=0)return;
    const yy=Math.min(h*.89,cy+r*.88),rr=Math.min(r*.65,w*.30);ctx.save();ctx.translate(cx,yy);ctx.scale(1,.075);const g=ctx.createRadialGradient(0,0,0,0,0,rr);g.addColorStop(0,rgba(shadowColor,shadowStrength*(dark?.36:.13)));g.addColorStop(1,rgba(shadowColor,0));ctx.fillStyle=g;ctx.fillRect(-rr,-rr,rr*2,rr*2);ctx.restore();
  }

  function couture(){
    ctx.studioIntroRotation?.(-.11);
    // A single platinum sculpture. Its open ends orbit through a gently turning
    // projection while the highlight travels independently across the metal.
    // There are no floating blades or large accent-coloured metallic surfaces.
    const aperture=portrait?.94:1;
    const rot=-.22+sa*.11-(1-intro)*.11,rx=r*(.92+.055*ca)*aperture,ry=r*(1.07+.024*s2)*aperture;
    const start=a-2.47,end=start+Math.PI*1.72,steps=150;
    const projection=b=>1/(1-Math.sin(b+.30)*(.065+.022*sa));
    function point(b,offset=0){
      const z=projection(b),x=Math.cos(b)*(rx+offset)*z,y=Math.sin(b)*(ry+offset)*z;
      return [x*Math.cos(rot)-y*Math.sin(rot),x*Math.sin(rot)+y*Math.cos(rot)];
    }
    function outline(offset,from=start,to=end){const points=[];for(let i=0;i<=steps;i++)points.push(point(from+(to-from)*i/steps,offset));return points}
    function metalShape(fill,dx=0,dy=0){
      ctx.save();ctx.translate(dx,dy);ctx.beginPath();
      for(let i=0;i<=steps;i++){const b=start+(end-start)*i/steps,p=point(b,r*.031*strength);i?ctx.lineTo(...p):ctx.moveTo(...p)}
      for(let i=steps;i>=0;i--){const b=start+(end-start)*i/steps,p=point(b,-r*.031*strength);ctx.lineTo(...p)}
      ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.restore();
    }
    const silver=ctx.createLinearGradient(-r*(.75+.18*ca),-r,r*.85,r*(.72+.18*sa));
    for(const [stop,color]of [[0,'#646a70'],[.12,'#c1c8cc'],[.25,'#f5f7f6'],[.34,'#777f88'],[.47,'#b8c0c6'],[.53,'#eef2f3'],[.59,'#737c85'],[.73,'#e5e9ea'],[.84,'#9aa3ab'],[1,'#4a535d']])silver.addColorStop(stop,color);
    cast(()=>metalShape(dark?'#616973':'#7c858d',r*.012*ca,r*.021));
    metalShape(silver);
    line(outline(r*.030*strength),'#f8fbfb',r*.0027,.78);
    line(outline(-r*.030*strength),dark?'#49535d':'#67727b',r*.0037,.64);
    // Short reflected streaks slide around the bevel, making slow motion visible.
    const shineStart=start+.40+(Math.sin(a+.6)*.5+.5)*(end-start-1.10);
    line(outline(r*.012*strength,shineStart,shineStart+.47),'#ffffff',r*.007,.54);
    line(outline(-r*.017*strength,start+.10,start+.55),'#d6dfe3',r*.004,.52);
    const p0=point(start,r*.030*strength),p1=point(start,-r*.030*strength),q0=point(end,r*.030*strength),q1=point(end,-r*.030*strength);
    line([p0,p1],'#e5eaed',r*.004,.9,'butt');line([q0,q1],mix(accent,'#c9cdd0',.88),r*.004,.9,'butt');
    if(cut>0){
      line(outline(r*.12,start+.18,end-.20),muted,r*.002,.11*cut);
      line(outline(r*.16,start+.75,start+1.55),ink,r*.002,.10*cut);
    }
  }
  function brutalist(){
    // A genuinely angular, broken architectural frame with a generous void.
    const lean=.08+cut*.14+sa*.012;
    const vertices=[[-r*.91,-r*.95],[r*.83,-r*1.18],[r*1.23,r*.67],[r*.22,r*1.15],[-r*.96,r*.69]];
    const inner=[[-r*.77,-r*.81],[r*.67,-r*.99],[r*1.02,r*.56],[r*.18,r*.94],[-r*.76,r*.58]];
    ctx.save();ctx.transform(1,0,-lean,1,0,0);
    cast(()=>{ctx.beginPath();vertices.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();inner.slice().reverse().forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=mix(ink,paper,dark?.09:.20);ctx.fill('evenodd')});
    poly([[r*.68,-r*1.00],[r*.83,-r*1.18],[r*1.23,r*.67],[r*1.025,r*.56]],accent,.97);
    poly([[-r*.91,-r*.95],[-r*.77,-r*.81],[r*.67,-r*.99],[r*.83,-r*1.18]],mix(accent,paper,.40),.88);
    // Missing corners and a transverse slice create rhythm without filling the centre.
    poly([[-r*1.08,-r*.36],[-r*.73,-r*.47],[-r*.68,-r*.28],[-r*1.02,-r*.16]],paper);
    poly([[r*.14,r*.96],[r*.42,r*.87],[r*.47,r*1.20],[r*.19,r*1.28]],paper);
    line([[-r*1.10,r*.86],[-r*.77,r*.75]],accent,r*.049*strength,.95,'butt');
    line([[r*.77,-r*1.28],[r*1.02,-r*1.31]],ink,r*.008,.45,'butt');ctx.restore();
    for(let i=0;i<7;i++)line([[r*(1.10+i*.035),-r*.30],[r*(1.15+i*.035),-r*.20]],ink,r*.007,.14,'butt');
    poly([[-r*1.13,r*.34],[-r*.96,r*.29],[-r*1.06,r*.49]],accent,.9);
  }
  function puffy(x,y,rx,ry,color,alpha=1,rot=0){
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(-rx*.28,-rx*.34,rx*.06,0,0,rx);g.addColorStop(0,mix(color,'#ffffff',dark?.22:.65));g.addColorStop(.42,mix(color,paper,.18));g.addColorStop(.83,color);g.addColorStop(1,mix(color,ink,dark?.09:.10));ctx.globalAlpha*=alpha;ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.restore();
  }
  function cloud(){
    // Soft floating cloud banks inhabit opposite edges. The middle stays airy.
    const airy=mix(accent,paper,dark?.55:.72),cream=mix(paper,'#ffffff',dark?.09:.64);
    halo(0,r*.02,r*1.30,accent,dark?.08:.11);
    ctx.save();ctx.rotate(-.22+sa*.023);cast(()=>{
      puffy(r*.79,-r*.70,r*.44,r*.25,airy,.92,-.24);
      puffy(r*.54,-r*.93,r*.30,r*.25,cream,.96,.21);
      puffy(r*1.02,-r*.88,r*.29,r*.23,mix(airy,cream,.45),.95,-.18);
      puffy(r*.82,-r*1.02,r*.31,r*.27,airy,.98,.13);
    },true);ctx.restore();
    ctx.save();ctx.translate(0,sa*r*.022);cast(()=>{
      puffy(-r*.70,r*.80,r*.45,r*.22,airy,.82,.16);
      puffy(-r*.97,r*.76,r*.25,r*.20,cream,.91,-.18);
      puffy(-r*.65,r*.63,r*.30,r*.26,mix(airy,cream,.55),.95,.20);
      puffy(-r*.40,r*.85,r*.25,r*.18,cream,.89,-.1);
    },true);ctx.restore();
    ctx.save();ctx.globalAlpha*=cut;
    ell(r*.99,r*.90,-.14,-.90,2.30,muted,r*.0032,.22);
    ell(r*.99,r*.90,-.14,2.65,3.80,accent,r*.014*strength,.32);
    // A thin drifting mist filament is less literal than another ring.
    const points=[];for(let i=0;i<=70;i++){const u=i/70;points.push([r*(.52+u*.70),r*(.32+.055*Math.sin(u*7+a))])}line(points,mix(accent,ink,.1),r*.004,.34);
    puffy(r*1.08,r*.56,r*.065,r*.052,mix(accent,cream,.36),.8,sa*.2);
    disc(-r*.97,-r*.32,r*.018,mix(accent,ink,.20),.6);
    ctx.restore();
  }
  function squirclePoint(b,radius,power=3.8){const c=Math.cos(b),s=Math.sin(b);return [Math.sign(c)*Math.pow(Math.abs(c),2/power)*radius,Math.sign(s)*Math.pow(Math.abs(s),2/power)*radius]}
  function plush(){
    // A bouclé cord cushion outline: densely textured at its edge, empty inside.
    const thread=mix(accent,paper,dark?.25:.15),light=mix(thread,'#fff8e6',.55),deep=mix(thread,ink,.27),angle=-.095+sa*.017;
    const path=[],radius=r*.89;for(let i=0;i<=180;i++){const p=squirclePoint(i*Math.PI/90,radius);path.push([p[0],p[1]*1.09])}
    ctx.save();ctx.rotate(angle);cast(()=>line(path,deep,r*.110*strength,.87),true);line(path,thread,r*.092*strength,.98);line(path,light,r*.050*strength,.17);
    // Bouclé is the material itself, so it remains when optional decoration is zero.
    // Arc-length spacing avoids bald areas on the squircle's almost-flat sides.
    const lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
    const perimeter=lengths[lengths.length-1],count=Math.max(230,Math.min(390,Math.round(perimeter/(r*.021))));
    ctx.save();ctx.lineCap='round';ctx.lineWidth=Math.max(.42,r*.0032);
    for(let row=0;row<4;row++){
      let segment=1;
      for(let i=0;i<count;i++){
        const distance=((i+(row%2)*.5)/count)*perimeter;
        while(segment<lengths.length-1&&lengths[segment]<distance)segment++;
        const first=path[segment-1],second=path[segment],span=lengths[segment]-lengths[segment-1],u=span?(distance-lengths[segment-1])/span:0;
        const tx=(second[0]-first[0])/span,ty=(second[1]-first[1])/span,nx=-ty,ny=tx;
        const seed=i*2.399+row*1.731,jitter=Math.sin(seed)*r*.0035,offset=((row-1.5)*.0265*strength)*r+jitter;
        const xx=first[0]+(second[0]-first[0])*u+nx*offset+tx*Math.cos(seed*1.3)*r*.003;
        const yy=first[1]+(second[1]-first[1])*u+ny*offset+ty*Math.cos(seed*1.3)*r*.003;
        const rotation=Math.atan2(ty,tx)+Math.sin(seed)*.65;
        const coil=r*(.0092+.0025*Math.sin(seed*.7));
        ctx.beginPath();ctx.ellipse(xx,yy,coil,coil*(.53+.12*Math.cos(seed)),rotation,.15,Math.PI*1.88);
        ctx.strokeStyle=i%4===0?mix(deep,thread,.18):i%3===0?mix(light,thread,.20):mix(light,deep,.43);
        ctx.globalAlpha=opacity*(i%4===0?.57:.78);ctx.stroke();
        // Short edge flyaways break the silicone-like contour, staying on the cord.
        if((row===0||row===3)&&i%2===0){
          const direction=row===0?-1:1,edge=direction*r*.049*strength;
          const ex=first[0]+(second[0]-first[0])*u+nx*edge,ey=first[1]+(second[1]-first[1])*u+ny*edge;
          ctx.beginPath();ctx.moveTo(ex-tx*r*.004,ey-ty*r*.004);ctx.quadraticCurveTo(ex+nx*direction*r*.008,ey+ny*direction*r*.008,ex+tx*r*.006+nx*direction*r*.005,ey+ty*r*.006+ny*direction*r*.005);
          ctx.strokeStyle=i%3===0?light:thread;ctx.globalAlpha=opacity*.70;ctx.lineWidth=Math.max(.35,r*.0026);ctx.stroke();ctx.lineWidth=Math.max(.42,r*.0032);
        }
      }
    }
    ctx.restore();
    // One stitched seam on one side, not a symmetrical upholstered frame.
    ctx.save();ctx.globalAlpha*=cut;
    const seam=[];for(let i=0;i<=55;i++){const b=-1.43+i/55*1.35,p=squirclePoint(b,radius-r*.032);seam.push([p[0],p[1]*1.09])}ctx.save();ctx.setLineDash([r*.017,r*.022]);line(seam,ink,r*.0028,.18);ctx.restore();
    ctx.restore();ctx.restore();
    // The loose yarn makes this language more tactile than the airy Cloud set.
    ctx.save();ctx.globalAlpha*=cut;
    ctx.save();ctx.strokeStyle=deep;ctx.lineWidth=r*.006;ctx.globalAlpha*=.62;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-r*.87,r*.51);ctx.bezierCurveTo(-r*1.27,r*.55,-r*1.30,r*.97,-r*.96,r*1.02);ctx.bezierCurveTo(-r*.66,r*1.07,-r*.55,r*1.24,-r*.82,r*1.22);ctx.bezierCurveTo(-r*1.06,r*1.22,-r*1.06,r*1.06,-r*.94,r*1.11+sa*r*.016);ctx.stroke();ctx.restore();
    ctx.save();ctx.translate(r*.93,-r*.83+ca*r*.015);ctx.rotate(.24);cast(()=>roundRect(-r*.13,-r*.09,r*.26,r*.18,r*.075,mix(thread,paper,.12)),true);line([[-r*.065,-r*.027],[r*.065,-r*.027]],ink,r*.003,.22);line([[-r*.065,r*.021],[r*.025,r*.021]],ink,r*.003,.22);ctx.restore();
    ctx.restore();
  }
  function play(){
    // An oversized cropped toy arc is distinct from Plush's cushion and Sticker's paper loop.
    const mint=mix(accent,paper,dark?.06:.08),peach=dark?'#d6a590':'#e6bda5',cream=dark?'#e4e0c8':'#fffdf0';
    const tilt=-.12+sa*.025;ctx.save();ctx.translate(r*.20,-r*.06);ctx.rotate(tilt);
    cast(()=>ringBand(r*1.06,r*1.06,0,-2.80,1.84,r*.145*strength,mint,.91));
    ell(r*1.055,r*1.055,0,-2.76,-.34,mix(mint,cream,.30),r*.008,.6);
    // A subtly darker rim supplies puck-like thickness while its centre remains open.
    ell(r*(1.06-.145*strength),r*(1.06-.145*strength),0,-.28,1.82,mix(mint,ink,.14),r*.012,.46);
    ctx.restore();
    ctx.save();ctx.globalAlpha*=cut;
    ctx.save();ctx.translate(r*.87,r*.78+Math.sin(a)*r*.04);ctx.rotate(-.28+sa*.04);cast(()=>{
      roundRect(-r*.22,-r*.18,r*.44,r*.36,r*.13,peach);
      roundRect(-r*.22,-r*.18,r*.44,r*.26,r*.115,mix(peach,cream,.27));
    });ctx.restore();
    cast(()=>disc(-r*.94,-r*.69,r*.133,cream));
    disc(-r*.94,-r*.69,r*.060,accent,.83);
    disc(r*.98,-r*.96,r*.041,peach,.95);disc(r*1.12,-r*.78,r*.023,ink,.7);
    ctx.save();ctx.translate(-r*.88,r*.85);ctx.rotate(.18);roundRect(-r*.14,-r*.027,r*.28,r*.054,r*.025,ink,.75);ctx.restore();
    ell(r*.14,r*.055,-.2,0,Math.PI*2,ink,r*.005,.18,r*.86,r*1.10);
    ctx.restore();
  }
  function paperLoop(x,y,rx,ry,thickness,rotation,color){
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);cast(()=>ringBand(rx,ry,0,0,Math.PI*2,thickness,color));ell(rx-thickness*.08,ry-thickness*.08,0,-2.75,-.68,mix(color,'#ffffff',.45),r*.003,.80);ctx.restore();
  }
  function sticker(){
    // Paper-cut modules and torn strips: compact clusters, broad intervening space.
    const warm=dark?'#f1e7cc':'#fffced',contrast=mix(ink,paper,dark?.05:.12),second=dark?'#a8c8be':'#b4cec2';
    const elastic=Math.sin(a)*.026+Math.sin(2*a)*.006;
    paperLoop(r*.16,r*.18,r*1.03,r*.89,r*.053*strength,-.30+elastic,accent);
    ctx.save();ctx.globalAlpha*=cut;
    ctx.save();ctx.translate(r*.94,-r*.78);ctx.rotate(.28+elastic);cast(()=>{
      poly([[-r*.26,-r*.13],[r*.24,-r*.17],[r*.28,r*.10],[-r*.27,r*.16]],warm);
      poly([[-r*.23,-r*.13],[r*.16,-r*.15],[r*.12,-r*.09],[-r*.22,-r*.06]],mix(accent,warm,.37),.9);
    });line([[-r*.17,r*.01],[r*.12,-r*.025]],contrast,r*.015,.7,'butt');ctx.restore();
    ctx.save();ctx.translate(-r*.82,r*.69+sa*r*.018);ctx.rotate(-.24);cast(()=>{
      roundedPath(-r*.21,-r*.17,r*.42,r*.34,r*.075);ctx.fillStyle=second;ctx.fill();
      // A bite-shaped cutout is material geometry, not a pictogram.
      disc(r*.21,-r*.17,r*.072,paper);
    });ctx.restore();
    paperLoop(-r*.97,-r*.51,r*.102,r*.102,r*.029,.20,warm);
    ctx.save();ctx.translate(r*1.02,r*.87);ctx.rotate(-.37+sa*.04);cast(()=>poly([[-r*.16,-r*.06],[r*.15,-r*.06],[r*.11,r*.09],[r*.055,r*.07],[r*.02,r*.10],[-r*.035,r*.072],[-r*.075,r*.10],[-r*.14,r*.07]],contrast));ctx.restore();
    poly([[r*.61,-r*1.11],[r*.66,-r*.99],[r*.78,-r*1.02],[r*.70,-r*.92],[r*.75,-r*.81],[r*.62,-r*.85],[r*.54,-r*.75],[r*.53,-r*.89],[r*.40,-r*.93],[r*.53,-r*.99]],accent,.82);
    for(let i=0;i<3;i++)disc(-r*.67+i*r*.054,r*1.04,r*.012,contrast,.55);
    ctx.restore();
  }

  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);ctx.shadowColor='rgba(0,0,0,0)';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;ctx.clearRect(0,0,w,h);if(!input.transparent){ctx.fillStyle=paper;ctx.fillRect(0,0,w,h);
  if(variant==='cloud'){halo(cx+w*.12,cy-h*.10,Math.max(w,h)*.70,accent,dark?.065:.09);halo(w*.12,h*.08,unit*.72,dark?'#d9c5df':'#ffffff',dark?.016:.43)}
  else if(variant==='plush'){halo(cx,cy,Math.max(w,h)*.65,accent,dark?.045:.06)}
  else if(variant==='couture'){const wash=ctx.createLinearGradient(0,0,w,h);wash.addColorStop(0,rgba(ink,dark?.018:.025));wash.addColorStop(.57,rgba(accent,.02));wash.addColorStop(1,rgba(ink,dark?.025:.045));ctx.fillStyle=wash;ctx.fillRect(0,0,w,h)}
  }
  pattern();floor();
  ctx.save();ctx.studioIntroTransform?.({fromX:w*.5,fromY:h*.48,toX:finalCx,toY:finalCy,scale:1.44});ctx.globalAlpha*=opacity;ctx.translate(cx,cy);ctx.scale(portrait?1:side,1);
  ({couture,brutalist,cloud,plush,play,sticker})[variant]();ctx.restore();
  // Two assertive edge accents belong to the fashion print, never the model.
  if(variant==='brutalist'&&cut>.05){ctx.save();if(swapped&&!portrait){ctx.translate(w,0);ctx.scale(-1,1)}const offset=sa*unit*.003;cast(()=>poly([[w*.92,h*1.01],[w*1.01,h*(.75-.10*cut)+offset],[w*1.01,h*1.01]],accent,.74*opacity));poly([[w*.54,-h*.01],[w*(.64+.05*cut),-h*.01],[w*.60,h*.045]],ink,.22*opacity);ctx.restore()}
  ctx.restore();return true;
}
