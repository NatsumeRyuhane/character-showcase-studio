const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const decode=value=>value.replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&amp;/g,'&');
const built=read('dist/index.html'),frameTemplate=decode(built.match(/\bdata-srcdoc="([^"]*)"/)[1]),policy=decode(built.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1]);
let downloaded=null;
const scope={TextEncoder,Blob,crypto:{randomUUID:()=> 'obs-layer-test-0001'},document:{getElementById:id=>id==='codex-visualization'?{dataset:{srcdoc:frameTemplate}}:null,querySelector:()=>({content:policy})},studioZip:files=>files,studioDownload:(files,filename)=>{downloaded={files,filename}}};
vm.createContext(scope);
const packages=read('runtime/export-packages.js').replace('__STUDIO_AE_TEMPLATE__',()=>JSON.stringify('QA AE template')).replace('__STUDIO_ASSET_NOTICES__',()=>JSON.stringify('QA notices')).replace('__STUDIO_OBS_LAYER_SERVER__',()=>JSON.stringify(read('runtime/obs-layer-server.mjs'))).replace('__STUDIO_OBS_LAYER_CONTROL__',()=>JSON.stringify(read('runtime/obs-layer-control.html')));
vm.runInContext(read('runtime/obs-layer-host.js')+'\n'+packages+'\n'+read('runtime/studio-output-host.js'),scope);
const state={design:'character-explorations',version:6,name:'OBS Layer QA',ratio:'landscape',frame:'horizontal'},base={kind:'obs',state,config:{width:3840,fit:'contain',start:'intro',transparent:false,includeCharacters:false}},sync={key:'obs-layer-test-0001',endpoint:'/__studio_clock'};
const build=config=>scope.buildStudioOutputDocument(frameTemplate,{...base,config:{...base.config,...config}},policy);
const child=result=>decode(result.html.match(/\bdata-srcdoc="([^"]*)"/)[1]);
const globals=result=>JSON.parse(child(result).match(/id="codex-visualization-widget-state">([\s\S]*?)<\/script>/)[1]);
const outerPolicy=result=>decode(result.html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1]);
const plain=build({});assert.equal(plain.config.layer,'all');assert.equal(plain.config.obsLayers,'combined');assert.equal(plain.config.transparent,false);assert.equal(plain.config.sync,undefined);assert.equal(outerPolicy(plain),policy);
const combinedFiles=scope.studioOBSFiles(plain),combined=JSON.parse(combinedFiles.find(file=>file.name==='scene-template.json').data),combinedSources=combined.sources.filter(source=>source.id==='browser_source');
assert.equal(combinedSources.length,1);assert.equal(combinedSources[0].settings.is_local_file,true);assert.equal(combinedSources[0].settings.local_file,'output.html');assert.equal(combinedSources[0].settings.width,3840);assert.equal(combinedSources[0].settings.height,2160);assert.ok(!combinedFiles.some(file=>file.name==='studio-sync.json'));assert.ok(combinedFiles.find(file=>file.name==='PREPARE-OBS.cmd').data.includes('[IO.Path]::GetFileName'));
for(const layer of ['picture','effects','borders']){
  const output=build({layer,sync,obsLayers:'separate'}),g=globals(output);
  assert.equal(output.config.layer,layer);assert.equal(g.studioOutput.layer,layer);assert.equal(output.config.transparent,layer!=='picture');assert.equal(g.studioOutput.sync.key,sync.key);
  assert.ok(output.html.includes('sandbox="allow-scripts"'));assert.ok(!output.html.includes('allow-same-origin'));assert.match(outerPolicy(output),/connect-src 'self'/);assert.ok(!/connect-src[^;]*https?:/.test(outerPolicy(output)));
  const framePolicy=child(output).match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1],originalFramePolicy=frameTemplate.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1];assert.equal(framePolicy,originalFramePolicy,'iframe network policy is unchanged');
  assert.ok(output.html.includes('studio:layer-clock'),'trusted host bridge is embedded');
  for(const script of output.html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))new vm.Script(script[1]);
}
assert.equal(build({layer:'picture',transparent:true}).config.transparent,true,'picture layer honors user transparency');
for(const invalid of [{key:'bad',endpoint:'/__studio_clock'},{key:sync.key,endpoint:'https://evil.invalid'},{key:'</script>',endpoint:'/__studio_clock'}])assert.equal(build({layer:'effects',sync:invalid}).config.sync,undefined);
assert.equal(build({layer:'effects;alert(1)'}).config.layer,'all');
scope.studioOutputHost.download({...base,config:{...base.config,obsLayers:'separate'}});
assert.ok(downloaded);const files=downloaded.files,byName=name=>files.find(file=>file.name===name)?.data;
for(const name of ['output.html','01-picture.html','02-effects.html','03-borders.html','control.html','OBS-LAYERS-SERVER.mjs','studio-sync.json','START-LAYERS.cmd','scene-template.json','PREPARE-OBS.cmd','README.txt'])assert.equal(typeof byName(name),'string',name+' is included');
assert.equal(new Set(files.map(file=>file.name)).size,files.length,'no duplicate ZIP filenames');
const manifest=JSON.parse(byName('studio-sync.json'));assert.equal(manifest.key,sync.key);assert.equal(manifest.width,3840);assert.equal(manifest.height,2160);assert.deepEqual(manifest.files,{picture:'01-picture.html',effects:'02-effects.html',borders:'03-borders.html'});
for(const layer of ['picture','effects','borders']){const g=globals({html:byName(manifest.files[layer])});assert.equal(g.studioOutput.sync.key,manifest.key);assert.equal(g.studioOutput.layer,layer)}
assert.equal(globals({html:byName('output.html')}).studioOutput.sync,undefined,'one-file fallback has no dependency on service');
const collection=JSON.parse(byName('scene-template.json')),sources=collection.sources.filter(source=>source.id==='browser_source'),scene=collection.sources.find(source=>source.id==='scene');
assert.equal(sources.length,3);assert.equal(scene.settings.items.length,3);assert.equal(new Set(sources.map(source=>source.uuid)).size,3);
for(const [index,layer]of ['picture','effects','borders'].entries()){
  const source=sources[index];assert.equal(source.settings.url,'__STUDIO_BASE_URL__/'+manifest.files[layer]);assert.equal(source.settings.is_local_file,false);assert.equal(source.settings.restart_when_active,false);assert.equal(source.settings.shutdown,false);assert.equal(scene.settings.items[index].source_uuid,source.uuid);assert.equal(scene.settings.items[index].visible,true);assert.equal(scene.settings.items[index].pos.x,0);assert.equal(scene.settings.items[index].pos.y,0);
}
assert.match(byName('START-LAYERS.cmd'),/Start-Process/);assert.match(byName('START-LAYERS.cmd'),/-WindowStyle Hidden/);assert.match(byName('START-LAYERS.cmd'),/OBS-LAYERS-SERVER\.mjs/);assert.match(byName('START-LAYERS.cmd'),/--open/);assert.ok(!byName('START-LAYERS.cmd').includes('ExecutionPolicy'));
assert.match(byName('README.txt'),/无法读取其他 OBS 源像素/);assert.match(byName('README.txt'),/Node\.js 18/);assert.equal(byName('OBS-LAYERS-SERVER.mjs'),read('runtime/obs-layer-server.mjs'));
assert.throws(()=>scope.studioOBSFiles({html:'x',config:{obsLayers:'separate',width:1920,height:1080}}),/不完整/);
console.log('PASS: default one-file OBS compatibility; 4K three-source order, transparent FX/borders, same-key sync service, preserved iframe sandbox/CSP, standalone fallback and portable package launch.');
