/* tuple-v1 stores complete variant values without repeating property names.
   This positional schema is append-only: changing an existing slot requires a
   new encoding marker. State validation remains the restore function's job. */
const studioVariantTupleCodec=(()=>{
  const main=['typeface','cutStrength','badgePalette','badgeStyle','badgeColor','badgeInk','badgeOpacity','ringSpeed','ringScale','textMotion','textMotionStyle','textMotionAmount','textMotionSpeed','geometryStrength','geometryOpacity','grid','gridMoving','gridOpacity','gridMotion','modelScale','parallax','palette','background','pattern','accent','dualSplit','dualGuides'];
  const effects=['gradeEnabled','grade','gradeStrength','gradeModel','gradient','gradientStrength','gradientColor','gradientMotion','titleGradient','grain','vignette','shadowEnabled','shadowStyle','shadowStrength','shadowDepth','shadowColor'];
  const shadows=['title','badges','model','geometry','floor'];
  const series=['atelier','fur','mini'];
  const paths=main.map(key=>[key]).concat(effects.map(key=>['effects',key]),shadows.map(key=>['shadows',key]),series.map(key=>['geometryBySeries',key]));
  const own=(value,key)=>value!==null&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,key);
  const safeKey=key=>key!=='__proto__'&&key!=='constructor'&&key!=='prototype';
  const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const scalar=value=>typeof value==='string'||typeof value==='number'||typeof value==='boolean';
  function clone(value){
    if(Array.isArray(value))return value.map(clone);
    if(!record(value))return value;
    const copy={};
    for(const key of Object.keys(value))if(safeKey(key))copy[key]=clone(value[key]);
    return copy;
  }
  function encode(variants){
    const encoded={};
    if(!record(variants))return encoded;
    for(const name of Object.keys(variants)){
      if(!safeKey(name)||!record(variants[name]))continue;
      const source=variants[name];
      encoded[name]=paths.map(path=>{
        let value=source;
        for(const key of path){if(!own(value,key))return null;value=value[key]}
        return scalar(value)?value:null;
      });
    }
    return encoded;
  }
  function decode(encoded,defaults){
    const expanded=record(defaults)?clone(defaults):{};
    if(!record(encoded))return expanded;
    for(const name of Object.keys(expanded)){
      if(!safeKey(name)||!record(expanded[name])||!own(encoded,name)||!Array.isArray(encoded[name]))continue;
      const target=expanded[name],tuple=encoded[name];
      for(let index=0;index<paths.length&&index<tuple.length;index++){
        const value=tuple[index];
        if(value===null||!scalar(value))continue;
        const path=paths[index];
        if(path.length===1)target[path[0]]=value;
        else{
          if(!record(target[path[0]]))target[path[0]]={};
          target[path[0]][path[1]]=value;
        }
      }
    }
    return expanded;
  }
  return {encode,decode};
})();
function encodeStudioVariants(variants){return studioVariantTupleCodec.encode(variants)}
function decodeStudioVariants(encoded,defaults){return studioVariantTupleCodec.decode(encoded,defaults)}
