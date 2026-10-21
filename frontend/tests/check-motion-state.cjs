// Restore, validation and snapshots are unit-tested in tests/unit/studio-state.test.ts.
// This script exercises the session's glue around them (src/studio-session.js): the
// widget-state callback, own-echo detection, rebuilding the motion clock, and keeping
// session-only images out of what it saves.
const vm=require('vm');
const assert=require('assert/strict');
const {moduleScript}=require('./support/module-script.cjs');

// The session module's imports share the VM context, standing in for the module graph.
const prefix=['src/typography.ts','src/studio-text.js','src/variant-codec.ts','src/motion-clock.ts','runtime/crt-motion.js','src/timeline.ts','src/designs/catalog.ts','src/studio-state.ts','src/studio-session.js'].map(moduleScript).join('\n');
assert.ok(prefix.includes("window.addEventListener('openai:set_globals'"),'production widget-state callback exists');

function harness(widgetState){
  const callbacks={},saved=[];
  const scope={
    document:{getElementById:()=>({})},
    matchMedia:()=>({matches:false}),
    window:{
      openai:{widgetState,setWidgetState:payload=>{saved.push(payload);return Promise.resolve()}},
      addEventListener:(name,callback)=>{callbacks[name]=callback}
    }
  };
  vm.createContext(scope);
  vm.runInContext(prefix+'\nframe.last=123;let syncCount=0;onStudioSync(()=>syncCount++);',scope);
  return {
    run:source=>vm.runInContext(source,scope),
    inspect:()=>JSON.parse(vm.runInContext('JSON.stringify({state,motionClock,last:frame.last,syncCount})',scope)),
    emit:value=>callbacks['openai:set_globals']({detail:{globals:{widgetState:value}}}),
    saved
  };
}
const reverseKeys=value=>Array.isArray(value)?value.map(reverseKeys):value&&typeof value==='object'
  ?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reverseKeys(item)])):value;
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

const app=harness();
const initialTime=app.inspect().state.time;
app.run('advanceMotionClock(motionClock,100,state.variants,state.edges);state.time=8.5');
const continuous=app.inspect();
near(continuous.motionClock.elapsed,initialTime+100);
for(const invalid of [null,undefined,{},
  {privateContent:{design:'another-design',version:5,time:2}},
  {privateContent:{design:'character-explorations',version:999,time:2}}]){
  app.emit(invalid);
  assert.deepEqual(app.inspect(),continuous,'unsupported state must leave playback, clocks and settings untouched');
}

app.run('save()');
const payload=app.saved.at(-1);
assert.ok(payload?.privateContent,'production save returns the private settings');
assert.equal(payload.privateContent.variantEncoding,'tuple-v1');
app.emit(reverseKeys(payload));
assert.deepEqual(app.inspect(),continuous,'reordered own echo must preserve the accumulated phase');

// A genuine external state must still be accepted, applied and explicitly sought.
const external=JSON.parse(JSON.stringify(payload));
external.privateContent.name='EXTERNAL';
external.privateContent.time=2;
app.emit(reverseKeys(external));
const restored=app.inspect();
assert.equal(restored.state.name,'EXTERNAL');
near(restored.motionClock.elapsed,2);
assert.equal(restored.last,0,'frame timing restarts');
assert.equal(restored.syncCount,1,'the editor re-renders once');

// Uploaded images exist only for the page session.
app.run("images.introCharacter='data:image/png;base64,AAAA';images.introAuthor='data:image/png;base64,BBBB';save()");
assert.ok(!JSON.stringify(app.saved.at(-1)).includes('data:image/'),'session-only images stay out of persistent state');
console.log(`PASS: editor glue ignores incompatible states and reordered own echoes (elapsed ${initialTime+100} kept), rebuilds clocks for external states and never saves images.`);
