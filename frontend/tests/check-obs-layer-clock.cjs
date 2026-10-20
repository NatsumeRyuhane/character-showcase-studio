const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const {load,moduleScript}=require('./support/module-script.cjs');
const root=path.join(__dirname,'..'),scope={};vm.createContext(scope);
for(const file of ['runtime/crt-motion.js','src/timeline.js','src/obs-layer-sync.js'])load(scope,file);
const plain=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const n=scope.studioNarrativeSettings({introStyle:'story',showDuration:12}),intro=scope.studioStoryDuration(n);
const clock={mode:'intro',elapsed:1,playing:true,timestampMs:1000};
for(const speed of [.5,1,1.8]){
  const early=scope.studioLayerClockPose(clock,1300,intro,n,speed),late=scope.studioLayerClockPose({...clock,elapsed:1.2,timestampMs:1200},1300,intro,n,speed);
  near(early.time,1.3*speed);near(early.motionTime,late.motionTime);near(early.time,late.time);
}
// A source reloaded minutes later has exactly the same timeline and optical
// phase as a source that has stayed open; frame-count accumulation is irrelevant.
for(const milliseconds of [1300,2450,6200,50000,600000]){
  const original=scope.studioLayerClockPose(clock,milliseconds,intro,n,1),reloaded=scope.studioLayerClockPose({...clock,elapsed:1+(milliseconds-1000)/1000,timestampMs:milliseconds},milliseconds,intro,n,1);
  assert.deepEqual(plain(original),plain(reloaded));
}
const paused=scope.studioLayerClockPose({...clock,playing:false},800000,intro,n,1);near(paused.time,1);assert.equal(paused.playing,false);
const show=scope.studioLayerClockPose({...clock,mode:'show',elapsed:0},1000,intro,n,1);near(show.time,intro);near(show.motionTime,intro);
const continuous=scope.studioLayerClockPose({...clock,mode:'show',elapsed:200},1000,intro,n,1);near(continuous.time,intro+12);near(continuous.motionTime,intro+200);
const repeat=scope.studioLayerClockPose({...clock,mode:'show',elapsed:37},1000,intro,{...n,showPlayback:'repeat'},1);near(repeat.time,intro+1);near(repeat.motionTime,intro+37);
const ending={...n,outroEnabled:true,outroDuration:3.5},done=scope.studioLayerClockPose({...clock,mode:'ending',elapsed:100},1000,intro,ending,1);near(done.time,intro+15.5);near(done.motionTime,intro+15.5);assert.equal(done.playing,false);
console.log('PASS: synchronized logical time, late joins / source reloads, global optical phase, playback speed, pause, direct showcase, repeat and finite ending hold.');
