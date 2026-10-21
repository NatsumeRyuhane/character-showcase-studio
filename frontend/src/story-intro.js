import { currentSeries, images, state } from './studio-session.js';
import { applyStudioStoryTypography } from './studio-text.js';
import { studioTypographyCopy, studioTypographyValue } from './typography.ts';

// Seekable opening overlays. Every effect is painted from the shot's local time.
function studioPaintStoryEffect(ctx,w,h,options={}){
  ctx.clearRect(0,0,w,h);
  const effect=options.effect||'none',strength=Math.max(0,Math.min(1,Number.isFinite(options.strength)?options.strength:.3));
  if(effect==='none'||!strength||!w||!h)return;
  const time=(Number.isFinite(options.time)?options.time:0)*(Number.isFinite(options.speed)?options.speed:.7),accent=/^#[0-9a-f]{6}$/i.test(options.accent)?options.accent:'#bceb45';
  const color=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`};
  ctx.save();ctx.scale(w/1920,h/1080);
  if(effect==='crt'){
    // Fine scanlines, a soft moving band, and an optical edge falloff.
    ctx.fillStyle=`rgba(0,0,0,${strength*.14})`;
    for(let y=0;y<1080;y+=5)ctx.fillRect(0,y,1920,1);
    const y=((time*105)%1480)-200,band=ctx.createLinearGradient(0,y-120,0,y+120);
    band.addColorStop(0,color(accent,0));band.addColorStop(.48,color(accent,strength*.13));band.addColorStop(.52,`rgba(255,255,245,${strength*.15})`);band.addColorStop(1,color(accent,0));ctx.fillStyle=band;ctx.fillRect(0,y-120,1920,240);
    const vignette=ctx.createRadialGradient(960,540,220,960,540,1120);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.6,'rgba(0,0,0,0)');vignette.addColorStop(1,`rgba(0,0,0,${strength*.55})`);ctx.fillStyle=vignette;ctx.fillRect(0,0,1920,1080);
  }else if(effect==='holo'){
    // Broad, restrained interference ripples using the selected accent only.
    const cx=1440+Math.sin(time*.45)*140,cy=220+Math.cos(time*.35)*90;
    for(let i=0;i<8;i++){
      const r=120+i*175+((time*56)%175),alpha=strength*.16*(1-i/10);
      ctx.strokeStyle=color(accent,alpha);ctx.lineWidth=13+i*2;ctx.beginPath();ctx.ellipse(cx,cy,r,r*.58,-.25,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=`rgba(255,255,255,${alpha*.6})`;ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(cx,cy,r+13,r*.58+9,-.25,0,Math.PI*2);ctx.stroke();
    }
    const film=ctx.createLinearGradient(0,0,1920,1080);film.addColorStop(0,color(accent,strength*.1));film.addColorStop(.44,color(accent,0));film.addColorStop(1,color(accent,strength*.08));ctx.fillStyle=film;ctx.fillRect(0,0,1920,1080);
  }else if(effect==='polar'){
    const x=((time*280)%3300)-700;
    ctx.translate(x,0);ctx.transform(1,0,-.5,1,0,0);
    const light=ctx.createLinearGradient(-350,0,350,0);light.addColorStop(0,color(accent,0));light.addColorStop(.35,color(accent,strength*.08));light.addColorStop(.5,`rgba(255,255,245,${strength*(options.dark?.2:.35)})`);light.addColorStop(.64,color(accent,strength*.12));light.addColorStop(1,color(accent,0));ctx.fillStyle=light;ctx.fillRect(-350,0,700,1080);
    ctx.fillStyle=color(accent,strength*.1);ctx.fillRect(365,0,1.5,1080);
  }
  ctx.restore();
}
export function mountStudioStoryIntro(view){
  const layer=document.createElement('div');layer.className='story-intro';layer.setAttribute('aria-label','双镜头片头');
  for(const role of ['character','author']){
    const shot=document.createElement('section');shot.className='story-shot';shot.dataset.storyRole=role;
    shot.innerHTML='<div class="story-media"><img class="story-image" alt=""></div><div class="story-primary"><span class="story-kicker"></span><span class="story-title"></span><span class="story-rule" aria-hidden="true"></span></div><div class="story-secondary"><span class="story-meta-label"></span><span class="story-meta"></span></div><span class="story-shot-number" aria-hidden="true"></span>';
    layer.append(shot);
  }
  const flash=document.createElement('div');flash.className='story-flash';layer.append(flash);
  view.art.append(layer);view.storyLayer=layer;view.storyShots=[...layer.querySelectorAll('.story-shot')].map(el=>({el,image:el.querySelector('img')}));
}
export function drawStudioStoryIntro(view,pose){
  const layer=view.storyLayer;if(!layer)return;
  const story=pose.story,n=state.narrative,active=!!story?.active;
  layer.style.display=active?'block':'none';layer.style.visibility=active?'visible':'hidden';layer.setAttribute('aria-hidden',String(!active));
  if(!active)return;
  const series=currentSeries();
  for(const part of view.storyShots){
    const {el,image}=part,role=el.dataset.storyRole,visible=role===story.role;
    el.style.visibility=visible?'visible':'hidden';el.style.opacity=visible?1-story.main:0;el.dataset.corner=n[role+'Corner'];
    if(!visible)continue;
    const source=n.storyPackagingOnly?'':role==='character'?(images.introCharacter||images.model||images.portrait):(images.introAuthor||images.portrait||images.model);
    if(source){if(image.getAttribute('src')!==source)image.src=source;image.style.display='block';}else{image.removeAttribute('src');image.style.display='none';}
    image.style.transform=`translate(${n[role+'X']-50}%,${n[role+'Y']-50}%) scale(${n[role+'Scale']})`;
    image.style.opacity=1;
    const text=role==='character'?{kicker:'CHARACTER / '+series.label,title:state.name,label:'EDITION / '+series.prefix+'-'+series.serial,meta:series.caption}:{kicker:'CREATOR / CREDITS',title:state.brand||'YOUR STUDIO',label:state.modelCredit,meta:state.designCredit};
    text.title=studioTypographyValue(state.typography,role,text.title);text.kicker=studioTypographyCopy(state.typography,role,'kicker',text.kicker);text.label=studioTypographyCopy(state.typography,role,'label',text.label);text.meta=studioTypographyCopy(state.typography,role,'meta',text.meta);
    for(const [selector,value]of [['.story-kicker',text.kicker],['.story-title',text.title],['.story-meta-label',text.label],['.story-meta',text.meta]]){const node=el.querySelector(selector);if(node.textContent!==value)node.textContent=value;}
    applyStudioStoryTypography(view,part,role);
    el.querySelector('.story-shot-number').textContent=role==='character'?'01 / CHARACTER STUDY':'02 / BEHIND THE DESIGN';
    const copyAlpha=story.main<1?Math.min(1,story.alpha/Math.max(.0001,1-story.main)):0;
    for(const selector of ['.story-primary','.story-secondary']){const copy=el.querySelector(selector);copy.style.opacity=state.type?copyAlpha:0;const direction=n[role+'Corner'].startsWith('t')?1:-1;copy.style.transform=`translateY(${story.shift*100*direction}cqh)`;}
    el.querySelector('.story-shot-number').style.opacity=state.type?copyAlpha*.42:0;
  }
  layer.querySelector('.story-flash').style.opacity=story.flash;
}
