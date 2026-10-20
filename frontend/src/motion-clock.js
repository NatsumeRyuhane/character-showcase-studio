// The composition timeline can loop while the artwork phase keeps moving.
// Changing a speed alters only future increments, preserving the current pose.
const motionClockEdgeDefaults={top:{direction:'negative',duration:32},bottom:{direction:'positive',duration:38}};
function motionClockSpeed(value,min,max){return Number.isFinite(value)?Math.max(min,Math.min(max,value)):1}
function motionClockEdgeRate(edge,key){
  const fallback=motionClockEdgeDefaults[key],direction=['negative','positive','still'].includes(edge?.direction)?edge.direction:fallback.direction;
  const duration=Number.isFinite(edge?.duration)?Math.max(12,Math.min(90,edge.duration)):fallback.duration;
  return (direction==='negative'?-1:direction==='positive'?1:0)/duration;
}
export function createMotionClock(time,variants,edgeSettings){
  const elapsed=Number.isFinite(time)?Math.max(0,time):0,entries=Object.entries(variants||{});
  return {elapsed,
    rings:Object.fromEntries(entries.map(([key,v])=>[key,elapsed*motionClockSpeed(v?.ringSpeed,0,3)])),
    texts:Object.fromEntries(entries.map(([key,v])=>[key,elapsed*motionClockSpeed(v?.textMotionSpeed,.25,2)])),
    edges:Object.fromEntries(['top','bottom'].map(key=>[key,elapsed*motionClockEdgeRate(edgeSettings?.[key],key)]))
  };
}
export function advanceMotionClock(clock,delta,variants,edgeSettings){
  if(!Number.isFinite(delta)||delta<=0)return;
  clock.elapsed+=delta;
  clock.rings??={};clock.texts??={};clock.edges??={top:0,bottom:0};
  for(const [key,v]of Object.entries(variants||{})){
    clock.rings[key]=(clock.rings[key]??0)+delta*motionClockSpeed(v?.ringSpeed,0,3);
    // Disabled text effects still accumulate, so reenabling never restarts them.
    clock.texts[key]=(clock.texts[key]??0)+delta*motionClockSpeed(v?.textMotionSpeed,.25,2);
  }
  for(const key of ['top','bottom'])clock.edges[key]=(clock.edges[key]??0)+delta*motionClockEdgeRate(edgeSettings?.[key],key);
}
