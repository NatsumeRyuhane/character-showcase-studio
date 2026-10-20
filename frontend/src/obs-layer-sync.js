import { studioAdvanceTime, studioShowDuration, studioTotalDuration } from './timeline.ts';
import { createMotionClock } from './motion-clock.ts';
import { root, setMotionClock, state } from './exploration-full-logic.js';

// All three OBS sources sample one clock. Reloading / reactivating one source
// catches it up to the others instead of replaying its own opening.
let studioSharedLayerClock=null;
export const studioLayerConfig=globalThis.studioOutput?.sync?globalThis.studioOutput:null;
export function mountStudioLayerSync(){
  if(!studioLayerConfig)return;
  const config=studioLayerConfig;
  root.dataset.outputLayer=config.layer;
  state.playing=false;
  window.addEventListener('message',event=>{
    const value=event.data;
    if(event.source!==window.parent||value?.type!=='studio:layer-clock'||value.key!==config.sync.key)return;
    const c=value.clock;
    if(!c||c.key!==config.sync.key||!Number.isFinite(c.elapsed)||c.elapsed<0||!Number.isFinite(c.timestampMs)||typeof c.playing!=='boolean'||!['intro','show','ending'].includes(c.mode))return;
    studioSharedLayerClock={elapsed:c.elapsed,timestampMs:c.timestampMs,playing:c.playing,mode:c.mode};
  });
  document.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.altKey||event.metaKey||/INPUT|SELECT|TEXTAREA/.test(event.target?.tagName))return;
    const key=event.key.toLowerCase(),command=event.code==='Space'?(studioSharedLayerClock?.playing?'pause':'resume'):key==='r'?'restart':key==='s'?'show':key==='e'?'ending':null;
    if(!command)return;event.preventDefault();event.stopImmediatePropagation();
    window.parent.postMessage({type:'studio:layer-command',key:config.sync.key,command},'*');
  },true);
  window.parent.postMessage({type:'studio:layer-ready',key:config.sync.key},'*');
}
function studioLayerClockPose(clock,now,intro,narrative,speed){
  const base=clock.mode==='show'?intro:clock.mode==='ending'?intro+studioShowDuration(narrative):0;
  const elapsed=Math.max(0,clock.elapsed+(clock.playing?Math.max(0,now-clock.timestampMs)/1000:0))*speed;
  const time=studioAdvanceTime(base,elapsed,intro,narrative),total=studioTotalDuration(intro,narrative),finished=narrative.outroEnabled&&time>=total;
  return {time,motionTime:finished?total:base+elapsed,playing:clock.playing&&!finished};
}
export function studioApplyLayerClock(){
  if(!studioLayerConfig)return false;
  const clock=studioSharedLayerClock;
  if(!clock){state.playing=false;return true;}
  const pose=studioLayerClockPose(clock,Date.now(),state.introDuration,state.narrative,state.speed);
  state.time=pose.time;state.playing=pose.playing;
  setMotionClock(createMotionClock(pose.motionTime,state.variants,state.edges));return true;
}
