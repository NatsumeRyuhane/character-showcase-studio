// Standalone local OBS bridge. No packages, installation or OBS global changes.
import http from 'node:http';
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';

const directory=path.dirname(fileURLToPath(import.meta.url));
const config=JSON.parse(await readFile(path.join(directory,'studio-sync.json'),'utf8'));
const layers=['picture','effects','borders'];
if(typeof config.key!=='string'||config.key.length<8||config.key.length>200||!layers.every(name=>typeof config.files?.[name]==='string'&&/^[a-zA-Z0-9_-]+\.html$/.test(config.files[name])))throw new Error('studio-sync.json is invalid. Please export the OBS package again.');
function openControl(base){
  const target=base+'/control.html';
  try{
    const child=process.platform==='win32'?spawn('cmd.exe',['/d','/s','/c','start','""',target],{windowsHide:true,detached:true,stdio:'ignore'}):process.platform==='darwin'?spawn('open',[target],{detached:true,stdio:'ignore'}):spawn('xdg-open',[target],{detached:true,stdio:'ignore'});
    child.on('error',()=>{});child.unref();
  }catch{}
}
async function writeScene(base){
  const template=await readFile(path.join(directory,'scene-template.json'),'utf8');
  const scene=JSON.parse(template.replaceAll('__STUDIO_BASE_URL__',base));
  await writeFile(path.join(directory,'IMPORT-IN-OBS.json'),JSON.stringify(scene,null,2)+'\n');
}
async function existingService(){
  try{
    const running=JSON.parse(await readFile(path.join(directory,'RUNNING.json'),'utf8'));
    const target=new URL(running.origin);
    if(running.key!==config.key||target.protocol!=='http:'||target.hostname!=='127.0.0.1'||!target.port||target.pathname!=='/'||target.search||target.hash||target.username||target.password)return null;
    const alive=await new Promise(resolve=>{
      const request=http.get(target.origin+'/__studio_clock?key='+encodeURIComponent(config.key),response=>{
        if(response.statusCode!==200){response.resume();return resolve(false)}
        let body='';response.setEncoding('utf8');
        response.on('data',chunk=>{body+=chunk;if(body.length>8192){response.destroy();resolve(false)}});
        response.on('error',()=>resolve(false));
        response.on('end',()=>{try{const value=JSON.parse(body);resolve(value.key===config.key&&value.shuttingDown!==true&&Number.isFinite(value.elapsed)&&typeof value.playing==='boolean'&&['intro','show','ending'].includes(value.mode))}catch{resolve(false)}});
      });
      request.setTimeout(1000,()=>{request.destroy();resolve(false)});request.on('error',()=>resolve(false));
    });
    return alive?target.origin:null;
  }catch{return null}
}
const reused=await existingService();
if(reused){
  await writeScene(reused);
  await new Promise(resolve=>process.stdout.write('OBS layers already running: '+reused+'\nControl: '+reused+'/control.html\n',resolve));
  if(process.argv.includes('--open'))openControl(reused);
  process.exit(0);
}
const allowedFiles=new Set(layers.map(name=>config.files[name]));
const initialMode=config.start==='show'?'show':'intro';
let revision=0,mode=initialMode,playing=false,baseElapsed=0,anchor=performance.now(),origin='',shuttingDown=false;
const ready=Object.fromEntries(layers.map(name=>[name,0]));
const elapsed=()=>baseElapsed+(playing?(performance.now()-anchor)/1000:0);
const clock=()=>({key:config.key,revision,mode,elapsed:elapsed(),playing,timestampMs:Date.now(),ready:{...ready},shuttingDown});
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const send=(res,status,body,type='application/json; charset=utf-8')=>{res.writeHead(status,{...headers,'Content-Type':type});res.end(type.startsWith('application/json')?JSON.stringify(body):body)};
const isLoopback=req=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
const fail=(res,status,message)=>send(res,status,{error:message});
const safeJSON=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const server=http.createServer(async(req,res)=>{
  try{
    if(!isLoopback(req))return fail(res,403,'Local connections only.');
    if(req.headers.host!==new URL(origin).host)return fail(res,403,'Invalid local host.');
    // Check the raw URL before URL parsing can normalize dot segments.
    let decoded;try{decoded=decodeURIComponent((req.url||'/').split('?')[0])}catch{return fail(res,400,'Malformed URL.')}
    if(decoded.includes('\\')||decoded.includes('\0')||decoded.split('/').includes('..')||decoded.slice(1).includes('/'))return fail(res,403,'Path not allowed.');
    const url=new URL(req.url,origin),pathname=url.pathname;
    if(pathname==='/__studio_clock'){
      if(req.method!=='GET')return fail(res,405,'GET required.');
      if(url.searchParams.get('key')!==config.key)return fail(res,403,'Invalid package key.');
      const layer=url.searchParams.get('layer');
      if(layer&&!layers.includes(layer))return fail(res,400,'Invalid layer.');
      if(layer)ready[layer]=Date.now();
      return send(res,200,clock());
    }
    if(pathname==='/__studio_control'){
      if(req.method!=='POST')return fail(res,405,'POST required.');
      if(req.headers.origin&&req.headers.origin!==origin)return fail(res,403,'Same-origin control required.');
      if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))return fail(res,415,'JSON required.');
      if(Number(req.headers['content-length']||0)>8192)return fail(res,413,'Request too large.');
      const buffers=[];let length=0;
      const accepted=await new Promise((resolve,reject)=>{
        req.on('data',chunk=>{length+=chunk.length;if(length>8192){if(!res.headersSent)fail(res,413,'Request too large.');return}buffers.push(chunk)});
        req.on('end',()=>resolve(length<=8192));req.on('error',reject);req.on('aborted',()=>reject(new Error('Request aborted.')));
      });
      if(!accepted)return;
      let body;try{body=JSON.parse(Buffer.concat(buffers).toString('utf8'))}catch{return fail(res,400,'Invalid JSON.')}
      if(!body||typeof body!=='object'||Array.isArray(body))return fail(res,400,'Invalid control.');
      if(body.key!==config.key)return fail(res,403,'Invalid package key.');
      if(!['restart','show','ending','pause','resume','stop','shutdown'].includes(body.command))return fail(res,400,'Invalid command.');
      if(shuttingDown)return fail(res,409,'Service is shutting down.');
      if(body.command==='shutdown'){
        baseElapsed=elapsed();playing=false;shuttingDown=true;revision++;
        res.once('finish',()=>{
          // Hosts poll every 180 ms. Deliver the paused clock before going offline.
          setTimeout(()=>{server.close(()=>process.exit(0));server.closeIdleConnections?.()},400);
        });
        return send(res,200,{...clock(),shutdown:true});
      }
      const now=performance.now();
      if(body.command==='pause'){baseElapsed=elapsed();playing=false}
      if(body.command==='resume'){baseElapsed=elapsed();playing=true}
      if(['restart','show','ending','stop'].includes(body.command)){
        mode=body.command==='show'?'show':body.command==='ending'?'ending':initialMode;
        if(body.command==='restart')mode='intro';
        baseElapsed=0;playing=body.command!=='stop';
      }
      anchor=now;revision++;
      return send(res,200,clock());
    }
    if(req.method!=='GET'&&req.method!=='HEAD')return fail(res,405,'GET required.');
    if(pathname==='/'||pathname==='/control.html'){
      const template=await readFile(path.join(directory,'control.html'),'utf8');
      const html=template.replace('__STUDIO_CONFIG_JSON__',()=>safeJSON({key:config.key,width:config.width,height:config.height,start:initialMode,files:config.files}));
      res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"});
      return res.end(req.method==='HEAD'?'':html);
    }
    const filename=pathname.slice(1);
    if(filename==='IMPORT-IN-OBS.json'){
      const document=await readFile(path.join(directory,filename),'utf8');
      return send(res,200,JSON.parse(document));
    }
    if(!allowedFiles.has(filename))return fail(res,404,'Not found.');
    const content=await readFile(path.join(directory,filename));
    res.writeHead(200,{...headers,'Content-Type':'text/html; charset=utf-8'});res.end(req.method==='HEAD'?'':content);
  }catch(error){if(!res.headersSent)fail(res,error.code==='ENOENT'?404:500,error.code==='ENOENT'?'Not found.':'Unable to serve this file.');else res.end()}
});
server.requestTimeout=10000;server.headersTimeout=10000;
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
origin='http://127.0.0.1:'+server.address().port;
try{
  await writeScene(origin);
  await writeFile(path.join(directory,'RUNNING.json'),JSON.stringify({origin,control:origin+'/control.html',pid:process.pid,key:config.key,width:config.width,height:config.height},null,2)+'\n');
}catch(error){server.close();throw error}
console.log('OBS layers ready: '+origin);
console.log('Control: '+origin+'/control.html');
console.log('Keep this service running. Import IMPORT-IN-OBS.json into OBS, then press Play in the control page.');
if(process.argv.includes('--open'))openControl(origin);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close(()=>process.exit(0));server.closeIdleConnections?.()});
