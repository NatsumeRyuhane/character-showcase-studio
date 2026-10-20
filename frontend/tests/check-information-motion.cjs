const fs=require('fs');
const {load,moduleScript}=require('./support/module-script.cjs');
const vm=require('vm');
const assert=require('assert/strict');
const scope={};
vm.createContext(scope);
for(const file of ['motion-clock.js','information-motion.js'])load(scope,'src/'+file);
const {createMotionClock,advanceMotionClock,informationMotionPose,marqueeOffset}=scope;
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
const snapshot=value=>JSON.parse(JSON.stringify(value));
const variants={refined:{ringSpeed:.65,textMotionSpeed:.75},soft:{textMotion:false,textMotionSpeed:.5},default:{}};
const edges={top:{direction:'negative',duration:32},bottom:{direction:'positive',duration:38}};
const clock=createMotionClock(4.5,variants,edges);
near(clock.elapsed,4.5);near(clock.rings.refined,4.5*.65);
near(clock.texts.refined,4.5*.75);near(clock.texts.default,4.5);
near(clock.edges.top,-4.5/32);near(clock.edges.bottom,4.5/38);

// The narrative loop changes its own counter; every information phase continues.
let narrative=16.49;
const before=snapshot(clock);
advanceMotionClock(clock,.02,variants,edges);
narrative=4.5+(narrative+.02-16.5)%12;
near(narrative,4.51);near(clock.texts.refined-before.texts.refined,.02*.75);
near(clock.edges.top-before.edges.top,-.02/32);
near(clock.edges.bottom-before.edges.bottom,.02/38);
near(clock.texts.soft-before.texts.soft,.02*.5);

// Editing speed, direction, and period cannot alter an accumulated pose.
const textBefore=informationMotionPose(4.5,clock.texts.refined,0,'refined');
const edgeBefore=marqueeOffset(clock.edges.top,800),phaseBefore=clock.edges.top;
variants.refined.textMotionSpeed=2;
edges.top.direction='positive';edges.top.duration=12;
assert.deepEqual(snapshot(informationMotionPose(4.5,clock.texts.refined,0,'refined')),snapshot(textBefore));
near(marqueeOffset(clock.edges.top,800),edgeBefore);
const textPhase=clock.texts.refined;
advanceMotionClock(clock,1,variants,edges);
near(clock.texts.refined,textPhase+2);near(clock.edges.top,phaseBefore+1/12);

// Paused/no-time updates are inert, while a still border stays fixed as text runs.
const paused=snapshot(clock);
for(const delta of [0,-1,NaN,Infinity])advanceMotionClock(clock,delta,variants,edges);
assert.deepEqual(snapshot(clock),paused);
edges.top.direction='still';
const frozenTop=clock.edges.top,activeBottom=clock.edges.bottom,activeText=clock.texts.soft;
advanceMotionClock(clock,2,variants,edges);
near(clock.edges.top,frozenTop);near(clock.edges.bottom,activeBottom+2/38);
near(clock.texts.soft,activeText+1);

// Explicit seek/replay reconstructs all domains from the same narrative time.
const seek=createMotionClock(2,variants,edges),replay=createMotionClock(0,variants,edges);
near(seek.texts.refined,4);near(seek.edges.top,0);near(seek.edges.bottom,2/38);
assert.ok(Object.values(replay.rings).every(value=>value===0));
assert.ok(Object.values(replay.texts).every(value=>value===0));
assert.ok(Object.values(replay.edges).every(value=>value===0));
const legacy=createMotionClock(1,{original:{ringSpeed:1.37}});
advanceMotionClock(legacy,1,{original:{ringSpeed:1.37}});
near(legacy.rings.original,2.74);near(legacy.texts.original,2);
near(legacy.edges.top,-2/32);near(legacy.edges.bottom,2/38);
const clamped=createMotionClock(12,{low:{textMotionSpeed:0},high:{textMotionSpeed:9}},
  {top:{direction:'negative',duration:0},bottom:{direction:'positive',duration:1000}});
near(clamped.texts.low,3);near(clamped.texts.high,24);
near(clamped.edges.top,-1);near(clamped.edges.bottom,12/90);

// Every stagger finishes by 4.2 seconds. Titles can opt out of entry explicitly.
for(let index=0;index<20;index++){
  near(informationMotionPose(4.2,3,index,'refined').entry,1);
  near(informationMotionPose(4.2,3,index,'refined').opacity,1);
}
near(informationMotionPose(0,0,-1,'refined').entry,1);
assert.equal(informationMotionPose(.79,0,0,'refined').entry,0);
assert.equal(informationMotionPose(1,0,3,'refined').entry,0);
assert.deepEqual(snapshot(informationMotionPose(0,100,5,'playful',0)),{x:0,y:0,scale:1,opacity:1,entry:1});
for(const style of ['refined','soft','playful'])for(let sample=0;sample<=500;sample++){
  const pose=informationMotionPose(sample/100,sample*.137-20,sample%10,style);
  assert.ok(Object.values(pose).every(Number.isFinite));
  assert.ok(pose.opacity>=0&&pose.opacity<=1&&pose.entry>=0&&pose.entry<=1);
  assert.ok(Math.abs(pose.x)<2);
  assert.ok(Math.abs(pose.y)<(style==='refined'?2:3));
  assert.ok(pose.scale>.99&&pose.scale<1.025);
}
assert.deepEqual(snapshot(informationMotionPose(4.5,3,1,'unknown')),snapshot(informationMotionPose(4.5,3,1,'refined')));
assert.ok(Object.values(informationMotionPose(NaN,Infinity,NaN,'soft')).every(Number.isFinite));

// Repeated content uses the same visual period for either direction.
near(marqueeOffset(-.25,800),-200);near(marqueeOffset(.25,800),-600);
for(const phase of [-10,-1,0,1,10])near(marqueeOffset(phase,800),0);
for(const phase of [-100.9,-1.3,-.001,.001,.9,10.3,100.9]){
  const offset=marqueeOffset(phase,800);
  assert.ok(offset>=-800&&offset<=0);
  near(marqueeOffset(phase+1,800),offset);
}
near(marqueeOffset(.3,800)-marqueeOffset(.25,800),40);
near(marqueeOffset(-.3,800)-marqueeOffset(-.25,800),-40);
near(marqueeOffset(1.0001,800)-marqueeOffset(.9999,800)+800,.0002*800);
for(const args of [[NaN,100],[1,0],[1,-1],[1,Infinity]])near(marqueeOffset(...args),0);
console.log('PASS: independent text/border clocks, narrative-loop continuity, speed/direction edits, pause and still modes, seek/replay, legacy defaults, readable bounded poses and bidirectional marquee wrapping.');
