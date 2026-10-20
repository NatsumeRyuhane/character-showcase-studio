import { paintUrbanLanguage } from './urban-language-scene.js';
import { designLanguagePalette, paintDesignLanguage } from './design-language-scene.js';
import { paintDualLanguage } from './dual-language-scene.js';
import { renderSeriesGeometry } from './studio-geometry.js';

export function paintExploration(ctx,w,h,t,variant,settings){
  if(paintUrbanLanguage(ctx,w,h,t,variant,settings||{}))return;
  if(paintDualLanguage(ctx,w,h,t,variant,settings||{}))return;
  if(paintDesignLanguage(ctx,w,h,t,variant,settings||{}))return;
  if(!ctx||!(w>0)||!(h>0))return;
  const input=settings||{},clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
  const num=(v,fallback)=>Number.isFinite(v)?v:fallback;
  const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
  const dark=input.background==='dark',swapped=!!input.swapped,side=swapped?-1:1;
  const intensity=clamp(num(input.intensity,.65),0,1.5),strength=clamp(num(input.geometryStrength,1),.5,1.5);
  const a=input.motion===false?0:Math.PI*2*num(input.ringTime,num(t,0))/12;
  const backgroundA=input.motion===false?0:Math.PI*2*num(t,0)/12;
  const sa=Math.sin(a),ca=Math.cos(a),s2=Math.sin(a*2);
  const intro=clamp(num(input.introProgress,1));
  const portrait=!!input.portrait;
  const centre=variant==='poster'?[.74,.43,.40]:variant==='wave'?[.73,.57,.375]:[.71,.46,.365];
  const finalCx=w*(portrait?.57:swapped?1-centre[0]:centre[0])+num(input.px,0)*w*.008,finalCy=h*(portrait?(swapped?.34:.59):centre[1])+num(input.py,0)*h*.005;
  const cx=w*.5+(finalCx-w*.5)*intro,cy=h*.48+(finalCy-h*.48)*intro;
  const r=(portrait?Math.min(w*.43,h*.26):h*centre[2])*clamp(num(input.ringScale,1.1),.6,2.4)*(1+s2*.008)*(1+.44*(1-intro));
  const accent=/^#[0-9a-f]{6}$/i.test(input.accent||'')?input.accent:'#bceb45';
  const languagePalette=designLanguagePalette(variant,dark);
  const bg=languagePalette?languagePalette.paper:dark?'#141b20':variant==='poster'?'#edeede':'#eff1e8';
  const fg=languagePalette?languagePalette.ink:dark?'#e4ede2':'#26382e';
  const weight=.66+.34*intensity;
  const shadowColor=/^#[0-9a-f]{6}$/i.test(input.shadowColor||'')?input.shadowColor:'#24302c';

  function rgba(hex,alpha){const n=parseInt(hex.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha)+')'}
  function stroke(points,color,width,alpha=1,cap='round'){
    if(points.length<2)return;
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.lineCap=cap;ctx.lineJoin='round';ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
    ctx.stroke();ctx.restore();
  }
  function disk(x,y,radius,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.restore()}
  function ellipse(rx,ry,rotation,start,end,color,width,alpha=1,dx=0,dy=0,steps=84){
    const points=[],cos=Math.cos(rotation),sin=Math.sin(rotation);
    for(let i=0;i<=steps;i++){const angle=start+(end-start)*i/steps,x=Math.cos(angle)*rx,y=Math.sin(angle)*ry;points.push([dx+x*cos-y*sin,dy+x*sin+y*cos])}
    stroke(points,color,width,alpha);
  }
  function ellipseBand(rx,ry,rotation,start,end,inner,color,alpha=1){
    ctx.save();ctx.rotate(rotation);ctx.globalAlpha*=alpha;ctx.beginPath();
    const steps=56;
    for(let i=0;i<=steps;i++){const angle=start+(end-start)*i/steps,x=Math.cos(angle)*rx,y=Math.sin(angle)*ry;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
    for(let i=steps;i>=0;i--){const angle=start+(end-start)*i/steps;ctx.lineTo(Math.cos(angle)*rx*inner,Math.sin(angle)*ry*inner)}
    ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();
  }
  function spatialAlpha(x,y){
    if(portrait){const middle=1-smooth(Math.abs(y/h-(swapped?.35:.59))/.43);return (.12+.88*middle)*(.2+.8*smooth(Math.min(x/w,1-x/w)/.12))}
    const display=swapped?1-smooth((x/w-.49)/.24):smooth((x/w-.29)/.24);
    const edge=smooth(Math.min(x/w,1-x/w)/.12);
    const bottom=1-smooth((y/h-.87)/.20);
    return (.13+.87*display)*(.2+.8*edge)*bottom;
  }
  function projected(u,depth){
    const z=.18+depth*4.65,perspective=1/(z+.8);
    const ga=input.gridMoving===false?0:backgroundA,motion=clamp(num(input.gridMotion,.14)/.14,0,3.6),wave=Math.sin(u*1.17-depth*2.3+ga);
    return [cx+(portrait?1:side)*(u+Math.sin(ga)*.038*motion)*w*.30*perspective,
      h*((portrait?.34:.22)+(portrait?.51:.66)*perspective)+h*.018*perspective*wave*motion];
  }
  function surface(kind){
    const cols=44,rows=27,points=[];
    for(let j=0;j<=rows;j++){
      const depth=j/rows,row=[];
      for(let i=0;i<=cols;i++)row.push(projected((i/cols-.5)*7.4,depth));
      points.push(row);
    }
    if(kind==='dots'){
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
        const point=points[j][i],depth=j/rows;
        const fade=Math.pow(1-depth,.70)*spatialAlpha(point[0],point[1]);
        if(fade<.015||point[0]<-2||point[0]>w+2)continue;
        const radius=w*.00125*(.50+.50/(.98+depth*4.65));
        disk(point[0],point[1],radius,(i+j)%9===0?accent:fg,intensity*.28*fade);
      }
      return;
    }
    // Draw independent segments so the information third and horizon can fade.
    for(let j=0;j<=rows;j++)for(let i=0;i<cols;i++){
      const x=points[j][i],y=points[j][i+1],depth=j/rows;
      const fade=Math.pow(1-depth,.72)*spatialAlpha((x[0]+y[0])/2,(x[1]+y[1])/2);
      if(fade>.01)stroke([x,y],j%6===0?accent:fg,w*.00082,intensity*.16*fade);
    }
    for(let i=0;i<=cols;i++)for(let j=0;j<rows;j++){
      const x=points[j][i],y=points[j+1][i],depth=(j+.5)/rows;
      const fade=Math.pow(1-depth,.72)*spatialAlpha((x[0]+y[0])/2,(x[1]+y[1])/2);
      if(fade>.01)stroke([x,y],fg,w*.00075,intensity*.14*fade);
    }
  }
  function rippleField(){
    const count=19,steps=76;
    for(let j=0;j<count;j++){
      const radius=w*(.065+j*.047),ratio=.255+.035*Math.cos(j*.25);
      let previous=null;
      for(let i=0;i<=steps;i++){
        const angle=i*Math.PI*2/steps;
        const ga=input.gridMoving===false?0:backgroundA,motion=clamp(num(input.gridMotion,.14)/.14,0,3.6);
        const point=[cx+Math.cos(angle)*radius,h*(portrait?(swapped?.47:.70):.67)+Math.sin(angle)*radius*ratio+h*.010*Math.sin(angle*3-j*.34+ga)*motion];
        if(previous){
          const fade=spatialAlpha((previous[0]+point[0])/2,(previous[1]+point[1])/2)*(1-j/count)*.86;
          stroke([previous,point],j%5===0?accent:fg,w*.00085,intensity*.18*fade);
        }
        previous=point;
      }
    }
  }
  function cast(draw){
    ctx.save();
    if(input.shadow!==false&&num(input.shadowStrength,.8)>0&&num(input.shadowDepth,1)>0){
      const matrix=typeof ctx.getTransform==='function'?ctx.getTransform():null;
      const dpr=matrix?Math.hypot(matrix.a,matrix.b)||1:1;
      const d=num(input.shadowDepth,1),s=num(input.shadowStrength,.8);
      ctx.shadowColor=rgba(shadowColor,s*.45);
      ctx.shadowBlur=input.shadowStyle==='soft'?r*.06*d*dpr:0;ctx.shadowOffsetY=r*.035*d*dpr;ctx.shadowOffsetX=r*.024*d*dpr;
    }
    draw();ctx.restore();
  }
  function orbit(signature){
    const angle=-.24+sa*.035;
    ellipse(r*1.05,r*.97,angle,0,Math.PI*2,fg,r*.006,.24*weight);
    ellipse(r*1.14,r*1.06,angle,a+.9,a+5.7,fg,r*.004,.12*weight);
    cast(()=>ellipse(r*1.05,r*.97,angle,a+.24,a+4.68,accent,r*(signature?.033:.047)*strength,.88*weight));
    const rx=r*(signature?1.38:1.24),ry=r*(signature?.43:.56),rotation=-.40+ca*.035;
    ellipse(rx,ry,rotation,0,Math.PI*2,fg,r*.006,.31*weight);
    ellipse(rx,ry,rotation,a-.11,a+.24,accent,r*.020,.88*weight);
    const x=Math.cos(a)*rx,y=Math.sin(a)*ry;
    disk(x*Math.cos(rotation)-y*Math.sin(rotation),x*Math.sin(rotation)+y*Math.cos(rotation),r*.022,accent,.96);
  }
  function slices(){
    const tilt=-.29+sa*.065;
    ellipse(r*1.28,r*1.05,tilt,-2.85,2.54,fg,r*.005,.22*weight);
    cast(()=>ellipseBand(r*1.15,r*.94,tilt,-2.72,-.54,1-.075*strength,accent,.87*weight));
    ellipseBand(r*1.15,r*.94,tilt,.18,1.82,.948,fg,.36*weight);
    ellipseBand(r*1.24,r*1.02,tilt,2.15,2.65,.978,accent,.62*weight);
    ellipse(r*1.34,r*.42,tilt+.24,a+.10,a+2.42,fg,r*.007,.29*weight);
    // Two parallel cuts float outside the perimeter, never across the centre.
    ctx.save();ctx.rotate(tilt);
    const bx=r*(.82+ca*.016),by=-r*(.91+sa*.018);
    stroke([[bx-r*.09,by+r*.04],[bx+r*.13,by-r*.08]],accent,r*.045,.90*weight,'butt');
    stroke([[bx-r*.05,by+r*.09],[bx+r*.08,by+r*.02]],fg,r*.009,.42*weight,'butt');ctx.restore();
  }
  function waveSignature(){
    const tilt=-.23+sa*.035;
    for(let i=2;i>=0;i--){
      const extra=i*.145;
      ellipse(r*(1.04+extra),r*(.83+extra*.68),tilt,0,Math.PI*2,fg,r*(i===0?.007:.004),(.31-i*.085)*weight);
    }
    cast(()=>ellipse(r*1.185,r*.929,tilt,a+.25,a+2.76,accent,r*.025*strength,.84*weight));
    ellipse(r*1.04,r*.83,tilt,-a+.60,-a+2.10,accent,r*.010,.44*weight);
    const dx=-r*(1.02+sa*.018),dy=-r*(.78+ca*.025);
    ellipse(r*.19,r*.075,-.37,0,Math.PI*2,accent,r*.012,.72*weight,dx,dy,44);
    disk(dx+Math.cos(a)*r*.17,dy+Math.sin(a)*r*.066,r*.018,fg,.58*weight);
    ellipse(r*.24,r*.085,.24,0,Math.PI*2,fg,r*.008,.32*weight,r*.98,r*(.84+sa*.025),44);
  }
  function ribbon(){
    const bend=sa*r*.025;
    ctx.save();ctx.rotate(-.20+sa*.04);ctx.lineCap='round';ctx.lineJoin='round';
    cast(()=>{
      ctx.beginPath();ctx.moveTo(-r*1.03,-r*.12);
      ctx.bezierCurveTo(-r*1.06,-r*.66,r*-.44,-r*1.12+bend,r*.22,-r*.97);
      ctx.bezierCurveTo(r*.57,-r*.88,r*.86,-r*.66,r*.99,-r*.39);
      ctx.strokeStyle=rgba(accent,.86*weight);ctx.lineWidth=r*.069*strength;ctx.stroke();
    });
    ctx.beginPath();ctx.moveTo(r*.98,r*.15);
    ctx.bezierCurveTo(r*.89,r*.66+bend,r*.35,r*1.08,-r*.23,r*.96);
    ctx.bezierCurveTo(-r*.59,r*.89,-r*.85,r*.61,-r*.98,r*.36);
    ctx.strokeStyle=rgba(fg,.36*weight);ctx.lineWidth=r*.045*strength;ctx.stroke();
    ellipse(r*1.23,r*.99,-.035,-2.02,1.24,fg,r*.005,.20*weight);
    ctx.restore();
  }

  function poly(points,fill,outline,width=1){ctx.beginPath();points.forEach((point,i)=>i?ctx.lineTo(point[0],point[1]):ctx.moveTo(point[0],point[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(outline){ctx.strokeStyle=outline;ctx.lineWidth=width;ctx.stroke()}}
  function editorialCuts(){
    const energy=clamp(num(input.cutStrength,.75));if(!energy)return;
    ctx.save();ctx.globalAlpha*=energy;ctx.translate(swapped?w:0,0);ctx.scale(side,1);
    const shift=sa*w*.006;
    if(portrait){
      const y=h*(swapped?.08:.77);
      poly([[w*.96+shift,y-h*.08],[w*1.12,y-h*.12],[w*1.04,y+h*.05],[w*.87+shift,y+h*.085]],rgba(accent,.75));
      stroke([[w*.90,y+h*.055],[w*1.05,y-h*.016]],fg,w*.008,.48,'butt');
      poly([[w*.065,h*.44],[w*.10,h*.421],[w*.125,h*.442],[w*.09,h*.461]],rgba(accent,.65));
    }else if(variant==='poster'){
      poly([[w*.79,h*1.025],[w*1.04,h*.64],[w*1.07,h*.82],[w*.94,h*1.04]],accent);
      poly([[w*.86,h*1.03],[w*1.04,h*.76],[w*1.06,h*.84],[w*.94,h*1.04]],dark?'#eee8d9':'#17271e');
      poly([[w*.81+shift,-h*.05],[w*.96,-h*.02],[w*.90,h*.12]],rgba(accent,.85));
      poly([[w*.87,-h*.02],[w*.93,h*.01],[w*.91,h*.16]],dark?'#eee8d9':'#17271e');
      stroke([[w*.52,h*.13],[w*.555,h*.10]],accent,w*.008,.8,'butt');
    }else if(variant==='wave'){
      poly([[w*.90,h*1.02],[w*1.06,h*.76],[w*1.04,h*.94],[w*.99,h*1.02]],accent);
      stroke([[w*.55,h*.12],[w*.61,h*.10]],accent,w*.006,.85,'butt');
      stroke([[w*.57,h*.145],[w*.605,h*.134]],fg,w*.002,.35,'butt');
      poly([[w*.964+shift,h*.22],[w*.987+shift,h*.18],[w*1.01+shift,h*.22]],rgba(accent,.7));
    }else{
      poly([[w*.85,h*1.025],[w*1.05,h*.78],[w*1.025,h*.91],[w*.94,h*1.02]],rgba(accent,.9));
      poly([[w*.91,h*1.02],[w*1.03,h*.88],[w*1.03,h*.915],[w*.94,h*1.03]],dark?'#e8edde':'#23392a');
      poly([[w*.56+shift,h*.14],[w*.585+shift,h*.10],[w*.61+shift,h*.15],[w*.585+shift,h*.19]],rgba(accent,.9));
      stroke([[w*.96,h*.24],[w*1.015,h*.17]],fg,w*.003,.38,'butt');
    }
    ctx.restore();
  }
  const state={geometryStrength:strength};
  function classic(kind){
    const color={accent,fg,paper:dark?'#f5f0e5':'#f9f6eb',black:'#090b10'};
    if(['facet','ribbon','blocks'].includes(kind)){cast(()=>renderSeriesGeometry(ctx,poly,state,kind,0,0,r,a,color,1));return}
    if(kind==='ring'){ellipse(r,r,0,0,Math.PI*2,accent,r*.065*strength,.78);ellipse(r*1.12,r*1.12,0,a,a+4.5,fg,r*.006,.28);return}
    if(kind==='cut'){ctx.save();ctx.rotate(a*.5);for(let i=0;i<8;i++){if(i===2||i===6)continue;const b=i*Math.PI/4,c=(i+.83)*Math.PI/4;stroke([[Math.cos(b)*r,Math.sin(b)*r],[Math.cos(c)*r,Math.sin(c)*r]],accent,r*.08*strength,.9,'butt')}const points=[];for(let i=0;i<8;i++){const b=i*Math.PI/4;points.push([Math.cos(b)*r*1.15,Math.sin(b)*r*1.15])}poly(points,null,fg,r*.008);ctx.restore();return}
    ctx.save();ctx.rotate(a);const rays=kind==='rays',count=rays?24:14;for(let i=0;i<count;i++){const angle=i*Math.PI*2/count,rr=r*(.91+.07*Math.sin(a*2+i)),length=r*(rays?(i%3===0?.30:.09):(i%3===0?.29:.14))*strength;poly([[Math.cos(angle)*rr,Math.sin(angle)*rr],[Math.cos(angle+.028)*(rr+length),Math.sin(angle+.028)*(rr+length)],[Math.cos(angle+.065)*rr,Math.sin(angle+.065)*rr]],i%3===0?color.paper:rgba(accent,.84))}ellipse(r*.77,r*.77,0,0,Math.PI*1.4,fg,r*.006,.2);ctx.restore();
  }
  function flatGrid(){const step=Math.max(22,w*.038),motion=clamp(num(input.gridMotion,.14),0,.5),ga=input.gridMoving===false?0:backgroundA;for(let x=-step;x<w+step;x+=step){const points=[];for(let y=0;y<=h+8;y+=12)points.push([x+Math.sin(y/h*5+ga)*w*.015*motion,y]);stroke(points,fg,.7,intensity*.08)}for(let y=-step;y<h+step;y+=step){const points=[];for(let x=0;x<=w+8;x+=12)points.push([x,y+Math.cos(x/w*6+ga)*h*.018*motion]);stroke(points,fg,.7,intensity*.08)}}
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);
  ctx.shadowColor='rgba(0,0,0,0)';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
  ctx.clearRect(0,0,w,h);if(!input.transparent){ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  // A broad, quiet light source adds depth without a visible colour panel.
  const wash=ctx.createRadialGradient(cx,cy,r*.15,cx,cy,Math.max(w,h)*.72);
  wash.addColorStop(0,rgba(accent,dark?.032:.055));wash.addColorStop(.65,rgba(accent,.008));wash.addColorStop(1,rgba(accent,0));
  ctx.fillStyle=wash;ctx.fillRect(0,0,w,h);
  }
  if(input.pattern==='grid')flatGrid();
  else if(input.pattern==='ripple')rippleField();
  else if(input.pattern!=='none')surface(input.pattern==='dots'?'dots':'mesh');
  editorialCuts();

  if(input.floor&&num(input.shadowStrength,.8)>0&&num(input.shadowDepth,1)>0){const floorY=Math.min(h*.88,cy+r*.94+h*.025),radius=Math.min(w*.26,r*.7),g=ctx.createRadialGradient(cx,floorY,0,cx,floorY,radius);g.addColorStop(0,rgba(shadowColor,num(input.shadowStrength,.8)*(dark?.32:.12)));g.addColorStop(1,rgba(shadowColor,0));ctx.save();ctx.translate(0,floorY);ctx.scale(1,.075);ctx.translate(0,-floorY);ctx.fillStyle=g;ctx.fillRect(cx-radius,floorY-radius,radius*2,radius*2);ctx.restore()}
  const style=input.ringStyle||'signature';
  if(style!=='none'){
    ctx.save();ctx.studioIntroTransform?.({fromX:w*.5,fromY:h*.48,toX:finalCx,toY:finalCy,scale:1.44});ctx.globalAlpha*=clamp(num(input.geometryOpacity,1),.3,1);ctx.translate(cx,cy);ctx.scale(portrait?1:side,1);
    if(style==='slices'||style==='signature'&&variant==='poster')slices();
    else if(style==='flow')ribbon();
    else if(style==='wave'||style==='signature'&&variant==='wave')waveSignature();
    else if(['facet','ribbon','blocks','ring','burst','cut','rays'].includes(style))cast(()=>classic(style));
    else orbit(style==='signature');
    ctx.restore();
  }
  ctx.restore();
}
