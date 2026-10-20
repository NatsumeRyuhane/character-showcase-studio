/* Original urban graphic systems: a utility dial, an after-hours signal orbit,
   and a soft arcade loop. No third-party logos, character art, or type assets. */
export function urbanLanguagePalette(variant,dark){
  const palettes={
    district:dark?['#191c19','#f0f0df','#8c9986']:['#efefdf','#20271e','#8b947f'],
    tuner:dark?['#1a1918','#f6e8cf','#a49a87']:['#f2eadc','#292722','#a69b86'],
    arcade:dark?['#172a32','#eaf3de','#7baba5']:['#e6f1e3','#1b3533','#8baa9f']
  };
  const colors=palettes[variant];
  return colors?{paper:colors[0],ink:colors[1],muted:colors[2]}:null;
}

export function paintUrbanLanguage(ctx,w,h,t,variant,settings){
  if(!['district','tuner','arcade'].includes(variant))return false;
  const input=settings||{};
  if((input.ringStyle||'signature')!=='signature')return false;
  if(!ctx||!(w>0)||!(h>0))return true;
  const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
  const num=(v,fallback)=>Number.isFinite(v)?v:fallback;
  const rgba=(hex,alpha)=>{const n=parseInt(hex.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha)+')'};
  const mix=(first,second,amount)=>{const a=parseInt(first.slice(1),16),b=parseInt(second.slice(1),16),v=clamp(amount),f=shift=>Math.round(((a>>shift)&255)*(1-v)+((b>>shift)&255)*v);return '#'+[f(16),f(8),f(0)].map(n=>n.toString(16).padStart(2,'0')).join('')};
  const portrait=!!input.portrait,swapped=!!input.swapped,dark=input.background==='dark',side=swapped?-1:1;
  const colors=urbanLanguagePalette(variant,dark),paper=colors.paper,ink=colors.ink,muted=colors.muted;
  const accent=/^#[0-9a-f]{6}$/i.test(input.accent||'')?input.accent:({district:'#d4fa32',tuner:'#ff7a3d',arcade:'#b8ed66'})[variant];
  const shadowColor=/^#[0-9a-f]{6}$/i.test(input.shadowColor||'')?input.shadowColor:'#101c20';
  const unit=Math.min(w,h),strength=clamp(num(input.geometryStrength,1),.5,1.5),opacity=clamp(num(input.geometryOpacity,1),.3,1),cut=clamp(num(input.cutStrength,.75));
  const a=input.motion===false?0:Math.PI*2*num(input.ringTime,num(t,0))/12;
  const ga=input.motion===false||input.gridMoving===false?0:Math.PI*2*num(t,0)/12,gm=clamp(num(input.gridMotion,.14),0,.5);
  const intro=clamp(num(input.introProgress,1)),introScale=1+.44*(1-intro);
  const finalCx=w*(portrait?.52:swapped?.285:.715)+num(input.px,0)*w*.007;
  const finalCy=h*(portrait?(swapped?.34:.56):.49)+num(input.py,0)*h*.005;
  const cx=w*.5+(finalCx-w*.5)*intro,cy=h*.48+(finalCy-h*.48)*intro;
  const baseR=(portrait?Math.min(w*.35,h*.26):h*.38)*clamp(num(input.ringScale,1.15),.6,2.4),r=baseR*introScale;
  const shadowStrength=clamp(num(input.shadowStrength,.8),0,1.5),shadowDepth=clamp(num(input.shadowDepth,1),0,2);
  const shadowEnabled=input.shadow!==false&&shadowStrength>0&&shadowDepth>0;

  function line(points,color,width,alpha=1,cap='butt',closed=false){
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap=cap;ctx.lineJoin='round';ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));if(closed)ctx.closePath();ctx.stroke();ctx.restore();
  }
  function poly(points,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.restore()}
  function disc(x,y,radius,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.restore()}
  function ellipse(rx,ry,rot,start,end,color,width,alpha=1,x=0,y=0){
    const c=Math.cos(rot),s=Math.sin(rot),points=[],count=Math.max(24,Math.ceil(Math.abs(end-start)*14-1e-9));
    for(let i=0;i<=count;i++){const b=start+(end-start)*i/count,u=Math.cos(b)*rx,v=Math.sin(b)*ry;points.push([x+u*c-v*s,y+u*s+v*c])}line(points,color,width,alpha);
  }
  function band(rx,ry,start,end,thickness,color,alpha=1){
    const points=[],count=Math.max(12,Math.ceil(Math.abs(end-start)*16-1e-9));
    for(let i=0;i<=count;i++){const b=start+(end-start)*i/count;points.push([Math.cos(b)*rx,Math.sin(b)*ry])}
    for(let i=count;i>=0;i--){const b=start+(end-start)*i/count;points.push([Math.cos(b)*(rx-thickness),Math.sin(b)*(ry-thickness)])}poly(points,color,alpha);
  }
  function roundRect(x,y,width,height,radius,color,alpha=1){
    const rr=Math.min(radius,width*.5,height*.5);ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+rr,y);ctx.lineTo(x+width-rr,y);ctx.quadraticCurveTo(x+width,y,x+width,y+rr);ctx.lineTo(x+width,y+height-rr);ctx.quadraticCurveTo(x+width,y+height,x+width-rr,y+height);ctx.lineTo(x+rr,y+height);ctx.quadraticCurveTo(x,y+height,x,y+height-rr);ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.closePath();ctx.fill();ctx.restore();
  }
  function cast(draw){
    ctx.save();if(shadowEnabled){const tr=typeof ctx.getTransform==='function'?ctx.getTransform():null,dpr=tr?Math.hypot(tr.a,tr.b)||1:1;ctx.shadowColor=rgba(shadowColor,shadowStrength*.31);ctx.shadowBlur=(input.shadowStyle==='soft'?unit*.018:0)*shadowDepth*dpr;ctx.shadowOffsetX=unit*.007*shadowDepth*dpr;ctx.shadowOffsetY=unit*.012*shadowDepth*dpr}draw();ctx.restore();
  }
  function star(x,y,size,rotation,color,alpha=1){
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);poly([[0,-size],[size*.24,-size*.24],[size,0],[size*.24,size*.24],[0,size],[-size*.24,size*.24],[-size,0],[-size*.24,-size*.24]],color,alpha);ctx.restore();
  }
  function pattern(){
    if(input.grid===false||input.pattern==='none')return;
    const kind=input.pattern||'dots',alpha=clamp(num(input.gridOpacity,.065),.02,.15)*(dark?1:1.2);
    if(kind==='ripple'){
      for(let j=0;j<12;j++){
        const radius=unit*(.12+j*.073),points=[];
        for(let i=0;i<=88;i++){const b=i*Math.PI/44;points.push([cx+Math.cos(b)*radius,cy+baseR*.53+Math.sin(b)*radius*.31+Math.sin(b*3-j*.42+ga)*unit*.028*gm])}
        line(points,ink,unit*.0008,alpha*(1-j/14));
      }return;
    }
    if(kind==='mesh'){
      for(let j=0;j<19;j++){
        const d=j/18,z=1/(.9+d*4.3),points=[];
        for(let i=0;i<=58;i++){const u=(i/58-.5)*5.6;points.push([cx+u*w*.40*z,h*.22+h*.64*z+Math.sin(u*1.3-d*3.5+ga)*unit*.045*gm*z])}
        line(points,ink,unit*.00085,alpha*(1-d)*.85);
      }
      for(let i=0;i<25;i++){
        const u=(i/24-.5)*5.6,points=[];
        for(let j=0;j<=36;j++){const d=j/36,z=1/(.9+d*4.3);points.push([cx+u*w*.40*z,h*.22+h*.64*z+Math.sin(u*1.3-d*3.5+ga)*unit*.045*gm*z])}
        line(points,ink,unit*.0007,alpha*.5);
      }return;
    }
    if(kind==='grid'){
      const cols=portrait?16:26,rows=portrait?25:16;
      for(let j=0;j<=rows;j++){const y=h*j/rows,points=[];for(let i=0;i<=46;i++){const x=w*i/46;points.push([x,y+Math.sin(x/w*5+ga+j*.12)*unit*.022*gm])}line(points,ink,unit*.0007,alpha*.65)}
      for(let j=0;j<=cols;j++){const x=w*j/cols,points=[];for(let i=0;i<=40;i++){const y=h*i/40;points.push([x+Math.sin(y/h*4+ga+j*.14)*unit*.020*gm,y])}line(points,ink,unit*.0007,alpha*.55)}return;
    }
    // One compound path per row keeps the dot field economical when recording.
    const cols=portrait?14:25,rows=portrait?25:15,stepX=w/cols,stepY=h/rows;
    for(let row=0;row<rows;row++){
      ctx.save();ctx.fillStyle=ink;ctx.globalAlpha*=alpha*(.30+.50*Math.sin((row+.5)/rows*Math.PI));ctx.beginPath();
      for(let col=0;col<cols;col++){
        const x=(col+.5)*stepX+Math.sin(ga+row*.34)*unit*.014*gm,y=(row+.5)*stepY+Math.sin(ga+col*.34+row*.23)*unit*.025*gm;
        const fade=clamp(1-Math.abs(x-cx)/(w*.85),.18,1),radius=unit*.0012*fade;
        ctx.moveTo(x+radius,y);ctx.arc(x,y,radius,0,Math.PI*2);ctx.closePath();
      }ctx.fill();ctx.restore();
    }
  }
  function floor(){
    if(!input.floor||shadowStrength<=0||shadowDepth<=0)return;
    const yy=Math.min(h*.9,cy+baseR*.88),rr=Math.min(baseR*.68,w*.31);ctx.save();ctx.translate(cx,yy);ctx.scale(1,.07);const g=ctx.createRadialGradient(0,0,0,0,0,rr);g.addColorStop(0,rgba(shadowColor,shadowStrength*(dark?.34:.13)));g.addColorStop(1,rgba(shadowColor,0));ctx.fillStyle=g;ctx.fillRect(-rr,-rr,rr*2,rr*2);ctx.restore();
  }

  function district(){
    // Coarse, asymmetric dial sectors make a strong silhouette without a starburst.
    const sectors=[[-2.92,-2.05],[-1.92,-1.29],[-1.19,.32],[.43,1.49],[1.65,2.33],[2.45,3.18]];
    ctx.save();ctx.rotate(a-.24);
    cast(()=>sectors.forEach(([from,to],i)=>band(r*1.035,r*1.035,from,to,r*(i===2?.112:.066)*strength,i===2?accent:mix(ink,paper,dark?.08:.05),i===4?.35:.88)));
    ellipse(r*.887,r*.887,0,-2.89,2.90,muted,r*.003,.34);
    ellipse(r*1.088,r*1.088,0,-2.02,.37,accent,r*.006,.72);
    ellipse(r*1.088,r*1.088,0,.57,2.21,ink,r*.002,.22);
    for(let i=0;i<12;i++){
      const b=-1.15+i*.104,c=Math.cos(b),s=Math.sin(b),ri=r*1.14,ro=r*(i%3===0?1.205:1.175);
      line([[c*ri,s*ri],[c*ro,s*ro]],i%3===0?accent:ink,r*(i%3===0?.007:.003),i%3===0?.9:.38);
    }
    ctx.save();ctx.rotate(-2.29);roundRect(r*.952,-r*.046,r*.208,r*.092,r*.012,ink,.91);line([[r*.995,-r*.014],[r*1.11,-r*.014]],paper,r*.007,.85);line([[r*.995,r*.017],[r*1.06,r*.017]],paper,r*.005,.5);ctx.restore();
    ctx.save();ctx.rotate(.81);poly([[r*.99,-r*.051],[r*1.145,-r*.051],[r*1.18,0],[r*1.145,r*.051],[r*.99,r*.051]],accent,.95);ctx.restore();
    ctx.restore();
    ctx.save();ctx.globalAlpha*=cut;
    // These stationary brackets anchor the rotating mechanism, like a dial housing.
    line([[-r*1.17,-r*.30],[-r*1.17,-r*.50],[-r*1.04,-r*.50]],ink,r*.007,.63);
    line([[r*1.05,r*.73],[r*1.19,r*.73],[r*1.19,r*.53]],accent,r*.010,.91);
    for(let i=0;i<3;i++)poly([[r*(.84+i*.062),-r*1.10],[r*(.875+i*.062),-r*1.10],[r*(.84+i*.062),-r*1.03],[r*(.805+i*.062),-r*1.03]],ink,.36);
    ctx.restore();
  }
  function tuner(){
    // A wide tape orbit, with narrow rail lines instead of a heavy round dial.
    const tilt=-.34,cream=mix(ink,paper,dark?.06:.02);
    ctx.save();ctx.rotate(tilt);
    cast(()=>band(r*1.22,r*.79,-2.99,2.61,r*.040*strength,cream,.86));
    ellipse(r*1.27,r*.835,0,-2.99,2.61,muted,r*.0025,.40);
    ellipse(r*1.155,r*.724,0,-2.95,2.56,ink,r*.0023,.38);
    // The accent is a short signal sweep moving steadily along the fixed rails.
    ctx.save();ctx.scale(1,.79/1.22);ctx.rotate(a);band(r*1.22,r*1.22,-.58,.12,r*.052*strength,accent,.98);ctx.restore();
    ctx.save();ctx.scale(1,.79/1.22);ctx.rotate(-a);ellipse(r*1.28,r*1.28,0,1.84,2.18,accent,r*.008,.72);ctx.restore();
    ctx.save();ctx.translate(-r*1.123,-r*.258);ctx.rotate(-.96);cast(()=>roundRect(-r*.153,-r*.065,r*.306,r*.13,r*.025,accent));
    for(let i=0;i<4;i++)line([[-r*.104+i*r*.063,-r*.028],[-r*.104+i*r*.063,r*.028]],paper,r*.010,.8);ctx.restore();
    ctx.save();ctx.translate(r*.927,r*.532);ctx.rotate(-.78);roundRect(-r*.129,-r*.045,r*.258,r*.09,r*.012,cream,.9);line([[-r*.079,0],[r*.079,0]],paper,r*.009,.84);ctx.restore();
    ctx.restore();
    ctx.save();ctx.globalAlpha*=cut;
    // An offset fine orbit makes a second unmistakable ellipse, never a frame box.
    ellipse(r*1.02,r*.94,.40,-1.19,2.04,muted,r*.0028,.37,r*.052,-r*.045);
    ellipse(r*1.02,r*.94,.40,2.20,3.59,accent,r*.004,.48,r*.052,-r*.045);
    const bx=r*.052,by=-r*.045,b=a+.38,cc=Math.cos(.40),ss=Math.sin(.40),xx=Math.cos(b)*r*1.02,yy=Math.sin(b)*r*.94;
    disc(bx+xx*cc-yy*ss,by+xx*ss+yy*cc,r*.018,accent,.95);
    for(let i=0;i<5;i++)line([[r*(.80+i*.062),-r*.93],[r*(.83+i*.062),-r*.985]],i===0?accent:ink,r*.005,i===0?.95:.40);
    line([[-r*1.22,r*.68],[-r*.91,r*.68]],ink,r*.004,.34);
    disc(-r*1.28,r*.68,r*.015,accent,.83);
    ctx.restore();
  }
  function arcade(){
    // A deliberately uneven soft-rectangle is more playful than another circle.
    const loop=[];
    for(let i=0;i<=128;i++){
      const b=i*Math.PI/64,c=Math.cos(b),s=Math.sin(b),corner=3.3;
      const x=Math.sign(c)*Math.pow(Math.abs(c),2/corner)*r*(1+.045*Math.sin(b*3+.3));
      const y=Math.sign(s)*Math.pow(Math.abs(s),2/corner)*r*(.94+.035*Math.cos(b*3-.7));loop.push([x,y]);
    }
    ctx.save();ctx.rotate(-.19+Math.sin(a)*.045);
    cast(()=>line(loop,mix(accent,ink,dark?.04:.13),r*.102*strength,.94,'round',true));
    line(loop,mix(accent,paper,.30),r*.073*strength,.98,'round',true);
    // A single inset pen line keeps it graphic, with no shiny plastic gradient.
    ctx.save();ctx.scale(.933,.933);line(loop,ink,r*.0028,.22,'round',true);ctx.restore();
    ctx.save();ctx.translate(r*.88,-r*.69);ctx.rotate(.16);cast(()=>roundRect(-r*.176,-r*.075,r*.352,r*.15,r*.062,ink,.97));
    roundRect(-r*.117,-r*.023,r*.15,r*.046,r*.023,paper,.95);disc(r*.088,0,r*.023,accent,.98);ctx.restore();
    ctx.save();ctx.translate(-r*.85,r*.74);ctx.rotate(-.24);cast(()=>roundRect(-r*.127,-r*.092,r*.254,r*.184,r*.059,mix(paper,ink,dark?.88:.91),.96));
    disc(-r*.045,-r*.006,r*.018,paper,.9);disc(r*.045,-r*.006,r*.018,paper,.9);line([[-r*.043,r*.045],[0,r*.060],[r*.043,r*.045]],accent,r*.008,.88,'round');ctx.restore();
    ctx.restore();
    ctx.save();ctx.globalAlpha*=cut;
    star(-r*1.10,-r*.66,r*.098,-.20+a,accent,.92);
    star(r*1.11,r*.73,r*.064,.18-a,ink,.70);
    ctx.save();ctx.translate(-r*.64,-r*1.11);ctx.rotate(-.18);roundRect(-r*.116,-r*.022,r*.232,r*.044,r*.022,ink,.43);ctx.restore();
    disc(r*1.11,-r*.42,r*.033,accent,.88);disc(r*1.19,-r*.30,r*.014,ink,.36);
    ellipse(r*.09,r*.04,-.23,0,Math.PI*2,ink,r*.004,.35,r*.81,r*1.14);
    ctx.restore();
  }

  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);ctx.shadowColor='rgba(0,0,0,0)';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;ctx.clearRect(0,0,w,h);
  if(!input.transparent){ctx.fillStyle=paper;ctx.fillRect(0,0,w,h)}
  pattern();floor();
  ctx.save();ctx.studioIntroTransform?.({fromX:w*.5,fromY:h*.48,toX:finalCx,toY:finalCy,scale:1.44});ctx.globalAlpha*=opacity;ctx.translate(cx,cy);ctx.scale(portrait?1:side,1);
  ({district,tuner,arcade})[variant]();ctx.restore();
  // Crop accents sit at the far display-side corners. The information third is clear.
  if(cut>0){
    ctx.save();ctx.globalAlpha*=cut*opacity;if(swapped&&!portrait){ctx.translate(w,0);ctx.scale(-1,1)}
    if(variant==='district'){
      poly([[w*.88,-h*.02],[w*1.02,-h*.02],[w*1.02,h*.095],[w*.96,h*.095]],accent,.88);
      line([[w*.89,h*.97],[w*1.01,h*.85]],ink,unit*.014,.28);
      line([[w*.92,h*1.01],[w*1.03,h*.90]],accent,unit*.018,.80);
    }else if(variant==='tuner'){
      for(let i=0;i<4;i++)line([[w*(.88+i*.033),-h*.01],[w*(.93+i*.033),h*.06]],i===0?accent:ink,unit*.012,i===0?.72:.16);
      poly([[w*.84,h*1.01],[w*1.01,h*.90],[w*1.01,h*1.01]],accent,.15);
    }else{
      ctx.save();ctx.translate(w*.99,h*.075);ctx.rotate(-.29);cast(()=>roundRect(-unit*.075,-unit*.048,unit*.15,unit*.096,unit*.038,accent,.80));ctx.restore();
      star(w*.93,h*.94,unit*.025,.12,ink,.40);
    }ctx.restore();
  }
  ctx.restore();return true;
}
