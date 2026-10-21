// The narrative timeline itself is unit-tested in tests/unit/timeline.test.ts. This script
// exercises the production renderer, which reads the editor's shared state (studio-session.js).
const vm=require('vm'),assert=require('assert/strict');
const {load,moduleScript}=require('./support/module-script.cjs');
const scope={};vm.createContext(scope);load(scope,'runtime/crt-motion.js','src/timeline.ts');
const config=scope.studioNarrativeSettings(),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const pose=(time,intro=4.5,n=config)=>scope.studioNarrativePose(time,intro,n);
// Framing must remain fully visible while intro information is hidden and
// while showcase content fades into the ending.
const renderer=moduleScript('src/studio-narrative.js');
vm.runInContext(renderer.slice(renderer.indexOf('function drawStudioNarrative')),scope);
function node(){return {style:{setProperty(k,v){this[k]=v}},classList:{toggle(){}},setAttribute(){}}}
const edges=[node(),node()],ending=node(),parts={};ending.querySelector=s=>parts[s]||(parts[s]=node());
const shutdown=node(),shutters=[node(),node()],signal=node(),crtParts={'.shutdown-line':signal};shutdown.querySelectorAll=()=>shutters;shutdown.querySelector=s=>crtParts[s]||(crtParts[s]=node());
const view={art:node(),stack:node(),composition:node(),ending,shutdown};view.art.querySelectorAll=()=>edges;
scope.motionClock={elapsed:8};scope.state={introDuration:4.5,narrative:config};
for(const introStyle of ['model','title'])for(const outroStyle of ['signature','orbit','quiet']){
  const n={...config,introStyle,outroStyle,outroEnabled:true};scope.state.narrative=n;
  for(const time of [0,2,4.5,5.4,16.5,17,20]){
    const p=pose(time,4.5,n);scope.drawStudioNarrative(view,p);
    edges.forEach(edge=>assert.equal(+edge.style.opacity,1,'borders remain visible in every narrative phase'));
    near(view.composition.style.opacity,1-p.outro);
    shutters.forEach(s=>assert.equal(s.style.transform,`scaleY(${p.shutter})`));near(signal.style.opacity,p.signal);
  }
}
const storyDefaults=scope.studioNarrativeSettings({introStyle:'story'}),storyDuration=scope.studioStoryDuration(storyDefaults);
let storyDraws=0;scope.drawStudioStoryIntro=(v,p)=>{storyDraws++;assert.ok(p.story)};scope.state.narrative=storyDefaults;scope.state.introDuration=storyDuration;
for(const t of [0,2,2.5,4.8,5.1,8]){const p=pose(t,storyDuration,storyDefaults);scope.drawStudioNarrative(view,p);near(view.composition.style.opacity,(1-p.outro)*p.story.main);edges.forEach(edge=>near(edge.style.opacity,1))}
assert.equal(storyDraws,6);new vm.Script(renderer);
console.log('PASS: production narrative renderer keeps independent borders fully visible through all intro/ending styles, CRT shutters and the story-intro hook.');
