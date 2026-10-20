const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const {spawn}=require('node:child_process');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const waitForExit=(child,timeout=3000)=>new Promise((resolve,reject)=>{
  if(child.exitCode!==null)return resolve(child.exitCode);
  const timer=setTimeout(()=>reject(new Error('Service did not exit.')),timeout);
  child.once('exit',code=>{clearTimeout(timer);resolve(code)});
});
(async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'studio-obs-sync-'));
  let child;
  try{
    const key='test-package-sync-74019';
    const files={picture:'01-picture.html',effects:'02-effects.html',borders:'03-borders.html'};
    await fs.copyFile(path.join(__dirname,'../runtime/obs-layer-server.mjs'),path.join(directory,'OBS-LAYERS-SERVER.mjs'));
    await fs.copyFile(path.join(__dirname,'../runtime/obs-layer-control.html'),path.join(directory,'control.html'));
    await fs.writeFile(path.join(directory,'studio-sync.json'),JSON.stringify({key,start:'intro',width:3840,height:2160,files}));
    const scene={sources:Object.entries(files).map(([name,file],index)=>({name,type:'browser_source',settings:{url:'__STUDIO_BASE_URL__/'+file,width:3840,height:2160},position:index})),groups:[{order:['picture','effects','borders']}]};
    await fs.writeFile(path.join(directory,'scene-template.json'),JSON.stringify(scene));
    const fixture='<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'none\'"><iframe sandbox="allow-scripts"></iframe>';
    for(const filename of Object.values(files))await fs.writeFile(path.join(directory,filename),fixture);
    await fs.writeFile(path.join(directory,'secret.txt'),'not public');
    let log='';child=spawn(process.execPath,[path.join(directory,'OBS-LAYERS-SERVER.mjs')],{cwd:os.tmpdir(),windowsHide:true,stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',chunk=>log+=chunk);child.stderr.on('data',chunk=>log+=chunk);
    let running;
    for(let count=0;count<100;count++){try{running=JSON.parse(await fs.readFile(path.join(directory,'RUNNING.json'),'utf8'));break}catch{await delay(25)}}
    assert.ok(running,'Server did not start: '+log);assert.match(running.origin,/^http:\/\/127\.0\.0\.1:\d+$/);
    const base=running.origin;
    const getClock=async(layer)=>{const response=await fetch(base+'/__studio_clock?key='+key+(layer?'&layer='+layer:''));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('access-control-allow-origin'),null);return response.json()};
    const command=async(command)=>{const response=await fetch(base+'/__studio_control',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({key,command})});assert.equal(response.status,200);return response.json()};
    let clock=await getClock();assert.equal(clock.playing,false);assert.equal(clock.mode,'intro');assert.equal(clock.elapsed,0);
    const control=await(await fetch(base+'/control.html')).text();assert.ok(control.includes(key));assert.ok(!control.includes('__STUDIO_CONFIG_JSON__'));assert.ok(control.includes('默认暂停'));assert.ok(control.includes('结束同步服务'));new(require('node:vm').Script)(control.match(/<script>([\s\S]*?)<\/script>/)[1]);
    const imported=JSON.parse(await fs.readFile(path.join(directory,'IMPORT-IN-OBS.json'),'utf8'));
    assert.deepEqual(imported,{...scene,sources:scene.sources.map(source=>({...source,settings:{...source.settings,url:source.settings.url.replace('__STUDIO_BASE_URL__',base)}}))});
    for(const filename of Object.values(files)){const response=await fetch(base+'/'+filename);assert.equal(response.status,200);assert.equal(await response.text(),fixture)}
    await command('restart');await delay(140);const first=await getClock('picture');await delay(90);const second=await getClock('effects');const late=await getClock('borders');
    assert.ok(first.elapsed>=.10);assert.ok(second.elapsed>first.elapsed);assert.ok(late.elapsed-second.elapsed<.1);assert.equal(first.revision,second.revision);assert.equal(late.mode,'intro');assert.ok(late.ready.picture>0&&late.ready.effects>0&&late.ready.borders>0);
    const paused=await command('pause');await delay(100);clock=await getClock();assert.equal(clock.playing,false);assert.equal(clock.elapsed,paused.elapsed);
    const resumed=await command('resume');await delay(100);clock=await getClock();assert.ok(clock.elapsed>resumed.elapsed+.07);
    const duplicate=spawn(process.execPath,[path.join(directory,'OBS-LAYERS-SERVER.mjs')],{cwd:os.tmpdir(),windowsHide:true,stdio:'ignore'});
    assert.equal(await waitForExit(duplicate),0);
    const reused=JSON.parse(await fs.readFile(path.join(directory,'RUNNING.json'),'utf8'));
    assert.equal(reused.pid,running.pid);assert.equal(reused.origin,base);assert.equal(child.exitCode,null);
    const afterDuplicate=await getClock();assert.equal(afterDuplicate.revision,clock.revision);assert.equal(afterDuplicate.playing,true);assert.ok(afterDuplicate.elapsed>clock.elapsed);
    const show=await command('show');assert.equal(show.mode,'show');assert.ok(show.elapsed<.05);assert.equal(show.playing,true);
    const ending=await command('ending');assert.equal(ending.mode,'ending');assert.ok(ending.elapsed<.05);
    const stopped=await command('stop');assert.equal(stopped.playing,false);assert.equal(stopped.elapsed,0);assert.equal(stopped.mode,'intro');
    const badPost=async(body,headers={})=>fetch(base+'/__studio_control',{method:'POST',headers:{'Content-Type':'application/json',...headers},body});
    assert.equal((await badPost('{')).status,400);
    assert.equal((await badPost('[]')).status,400);
    assert.equal((await badPost(JSON.stringify({key:'wrong',command:'restart'}))).status,403);
    assert.equal((await badPost(JSON.stringify({key:'wrong',command:'shutdown'}))).status,403);
    assert.equal((await badPost(JSON.stringify({key,command:'delete'}))).status,400);
    assert.equal((await badPost(JSON.stringify({key,command:'restart'}),{Origin:'https://example.com'})).status,403);
    assert.equal((await badPost(JSON.stringify({key,command:'shutdown'}),{Origin:'https://example.com'})).status,403);
    assert.equal((await badPost(JSON.stringify({key,command:'restart'}),{'Content-Type':'text/plain'})).status,415);
    assert.equal((await badPost(JSON.stringify({key,command:'restart',extra:'x'.repeat(9000)}))).status,413);
    assert.equal((await fetch(base+'/__studio_clock?key=wrong')).status,403);
    assert.equal((await fetch(base+'/__studio_clock?key='+key+'&layer=secret')).status,400);
    for(const filename of ['secret.txt','studio-sync.json','OBS-LAYERS-SERVER.mjs','RUNNING.json','scene-template.json'])assert.equal((await fetch(base+'/'+filename)).status,404);
    const raw=rawPath=>new Promise((resolve,reject)=>{const target=new URL(base),req=http.get({hostname:target.hostname,port:target.port,path:rawPath},response=>{response.resume();response.on('end',()=>resolve(response.statusCode))});req.on('error',reject)});
    assert.equal(await raw('/%2e%2e/secret.txt'),403);
    assert.equal(await raw('/..%5csecret.txt'),403);
    assert.equal(await raw('/%ZZ'),400);
    const shutdown=await command('shutdown');assert.equal(shutdown.shutdown,true);assert.equal(shutdown.playing,false);await delay(100);const closingClock=await getClock('picture');assert.equal(closingClock.playing,false);assert.equal(closingClock.shuttingDown,true);assert.equal(await waitForExit(child),0);
    await assert.rejects(fetch(base+'/__studio_clock?key='+key));
    // A stale RUNNING.json must not prevent a fresh, paused service from starting.
    child=spawn(process.execPath,[path.join(directory,'OBS-LAYERS-SERVER.mjs')],{cwd:os.tmpdir(),windowsHide:true,stdio:'ignore'});
    let restarted;
    for(let count=0;count<100;count++){const value=JSON.parse(await fs.readFile(path.join(directory,'RUNNING.json'),'utf8'));if(value.pid!==running.pid){restarted=value;break}await delay(25)}
    assert.ok(restarted,'Stale RUNNING.json was not replaced.');
    const restartResponse=await fetch(restarted.origin+'/__studio_clock?key='+key),restartClock=await restartResponse.json();assert.equal(restartClock.playing,false);assert.equal(restartClock.elapsed,0);
    const finalResponse=await fetch(restarted.origin+'/__studio_control',{method:'POST',headers:{'Content-Type':'application/json',Origin:restarted.origin},body:JSON.stringify({key,command:'shutdown'})});assert.equal(finalResponse.status,200);assert.equal((await finalResponse.json()).shutdown,true);assert.equal(await waitForExit(child),0);
    console.log('OBS sync server: shared clock, late sources, pause/resume, scene paths, request guards, duplicate launch reuse and graceful shutdown passed.');
  }finally{
    if(child&&child.exitCode===null){child.kill();await new Promise(resolve=>{child.once('exit',resolve);setTimeout(resolve,2000)})}
    const resolved=path.resolve(directory),temporary=path.resolve(os.tmpdir())+path.sep;
    if(!resolved.startsWith(temporary)||!path.basename(resolved).startsWith('studio-obs-sync-'))throw new Error('Unexpected temporary directory.');
    await fs.rm(resolved,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1});
