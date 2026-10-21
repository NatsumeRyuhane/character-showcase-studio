import { studioIntroDuration, studioNarrativeSettings, studioRetime, studioRetimeShow, studioStoryDuration, studioTotalDuration } from './timeline.ts';
import { images, motionClock, resetLastFrame, state, update } from './exploration-full-logic.js';
import { drawStudioStoryIntro, mountStudioStoryIntro } from './story-intro.js';
import { drawStudioPostProcessing, mountStudioPostProcessing } from './studio-post.js';

// Sequence settings are shared by all designs, including pure output and AE. The controls are the
// React component src/editor/NarrativePanel.tsx; these functions apply its changes to the state.
let legacyIntroDuration=4.5;
export function setStudioIntroDuration(value){
  if(state.narrative.introStyle==='story')return;
  const next=studioIntroDuration(value);state.time=studioRetime(state.time,state.introDuration,next);state.introDuration=legacyIntroDuration=next;state.time=Math.min(state.time,studioTotalDuration(next,state.narrative));update();
}
export function setStudioNarrative(key,value){
  const before=state.narrative,beforeIntro=state.introDuration;state.narrative=studioNarrativeSettings({...before,[key]:value});
  if(before.introStyle!=='story'&&state.narrative.introStyle==='story')legacyIntroDuration=beforeIntro;
  if(state.narrative.introStyle==='story')state.introDuration=studioStoryDuration(state.narrative);else if(before.introStyle==='story')state.introDuration=legacyIntroDuration;
  if(state.introDuration!==beforeIntro)state.time=studioRetime(state.time,beforeIntro,state.introDuration);
  if(key==='showDuration')state.time=studioRetimeShow(state.time,state.introDuration,before,state.narrative);state.time=Math.min(state.time,studioTotalDuration(state.introDuration,state.narrative));update();
}
export function jumpToStudioStory(role){const n=state.narrative;state.time=role==='show'?state.introDuration:role==='author'&&n.characterShotEnabled?n.characterShotDuration:0;state.playing=true;resetLastFrame();update()}
export function mountStudioNarrative(views){
  legacyIntroDuration=state.narrative.introStyle==='story'?4.5:state.introDuration;
  if(state.narrative.introStyle==='story'){const next=studioStoryDuration(state.narrative);state.time=studioRetime(state.time,state.introDuration,next);state.introDuration=next;}
  for(const view of views){
    const ending=document.createElement('div');ending.className='brand-ending';ending.setAttribute('aria-label','品牌片尾');
    ending.innerHTML='<div class="ending-content"><div class="ending-orbit" aria-hidden="true"></div><div class="ending-spark" aria-hidden="true"></div><div class="ending-lockup"><img class="ending-logo" alt="品牌 Logo"><span class="ending-word"></span><span class="ending-stroke" aria-hidden="true"></span></div></div>';
    view.art.append(ending);view.ending=ending;
    const shutdown=document.createElement('div');shutdown.className='cyber-shutdown';shutdown.setAttribute('aria-hidden','true');shutdown.innerHTML='<div class="shutdown-scan"></div><div class="shutdown-flash"></div><div class="shutdown-shutter shutdown-top"></div><div class="shutdown-shutter shutdown-bottom"></div><div class="shutdown-beam-glow"></div><div class="shutdown-line"></div><div class="shutdown-dot-glow"></div><div class="shutdown-dot"></div>';view.art.append(shutdown);view.shutdown=shutdown;
    if(typeof mountStudioStoryIntro==='function')mountStudioStoryIntro(view);
    if(typeof mountStudioPostProcessing==='function')mountStudioPostProcessing(view);
  }
  return {sync(){
    const n=state.narrative;for(const view of views){view.ending.dataset.style=n.outroStyle;view.ending.classList.toggle('uses-logo',n.outroContent!=='word'&&!!images.logo);view.ending.querySelector('.ending-word').textContent=state.brand||'YOUR STUDIO';if(images.logo)view.ending.querySelector('img').src=images.logo;}
  }};
}
export function drawStudioNarrative(view,pose){
  view.art.classList.toggle('model-first-intro',state.narrative.introStyle==='model');
  view.art.style.setProperty('--detail',pose.info);view.art.style.setProperty('--model-detail',pose.model);
  view.stack.style.opacity=pose.titleAlpha;
  view.composition.style.opacity=(1-pose.outro)*(pose.story?pose.story.main:1);
  // Borders are persistent framing, independent of the title/content sequence.
  view.art.querySelectorAll('.edge').forEach(el=>el.style.opacity='1');
  const ending=view.ending,quiet=state.narrative.outroStyle==='quiet';
  ending.style.opacity=pose.outro;ending.style.visibility=pose.outro>0?'visible':'hidden';ending.setAttribute('aria-hidden',String(pose.outro===0));
  const lockup=ending.querySelector('.ending-lockup');lockup.style.opacity=pose.brand;
  lockup.style.transform=`translateY(${(1-pose.brand)*12}px) scale(${.975+.025*pose.brand})`;
  const stroke=ending.querySelector('.ending-stroke');stroke.style.transform=`scaleX(${pose.mark})`;
  const orbit=ending.querySelector('.ending-orbit');orbit.style.opacity=quiet?0:pose.mark*(state.narrative.outroStyle==='orbit'?.65:.16);
  orbit.style.transform=`translate(-50%,-50%) rotate(${-24+motionClock.elapsed*3}deg) scale(${.86+.14*pose.mark})`;
  const spark=ending.querySelector('.ending-spark');spark.style.opacity=quiet?0:pose.mark;spark.style.transform=`rotate(${45+pose.mark*90}deg) scale(${pose.mark})`;
  const content=ending.querySelector('.ending-content');content.style.transform=`translateX(${pose.jitter*100}cqw) scaleY(${1-pose.shutter})`;content.style.opacity=pose.flicker;
  const shutdown=view.shutdown;shutdown.style.visibility=pose.shutdown>0?'visible':'hidden';
  shutdown.querySelectorAll('.shutdown-shutter').forEach(el=>el.style.transform=`scaleY(${pose.shutter})`);
  const signal=shutdown.querySelector('.shutdown-line');signal.style.opacity=pose.signal;signal.style.transform=`translate(-50%,-50%) scaleX(${pose.signalWidth})`;
  const glow=shutdown.querySelector('.shutdown-beam-glow');glow.style.opacity=pose.signal*.72;glow.style.transform=signal.style.transform;
  for(const selector of ['.shutdown-dot','.shutdown-dot-glow']){const dot=shutdown.querySelector(selector);dot.style.opacity=pose.dot;dot.style.transform=`translate(-50%,-50%) scale(${pose.dotScale})`;}
  shutdown.querySelector('.shutdown-flash').style.opacity=pose.flash;
  shutdown.querySelector('.shutdown-scan').style.opacity=pose.scan;
  if(typeof drawStudioStoryIntro==='function')drawStudioStoryIntro(view,pose);
  if(typeof drawStudioPostProcessing==='function')drawStudioPostProcessing(view,pose);
}
