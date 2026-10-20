// The typography settings are unit-tested in tests/unit/typography.test.ts. This script
// exercises the DOM styling, which still reads the editor's shared state (phase 4).
const vm=require('vm'),assert=require('assert/strict');
const {load}=require('./support/module-script.cjs');
const scope={};vm.createContext(scope);load(scope,'src/typography.ts','src/studio-text.js');
const defaults=scope.studioTypographySettings();
const settings=scope.studioTypographySettings({name:{text:'Nonas',case:'uppercase',scale:.8},author:{text:'KGG',font:'serif',colorMode:'custom',color:'#ef72aa'}});
scope.state={typography:settings};
const style={setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]},get fontSize(){return this['font-size']||''},set fontSize(v){this['font-size']=v}},el={style};
scope.getComputedStyle=node=>({fontSize:node.style.fontSize||'100px'});
scope.studioTypographyStyle(el,'author');assert.equal(style.color,'#ef72aa');assert.ok(style['font-family'].includes('Cormorant'));
scope.studioTypographyFontSize(el,'name');assert.equal(style.fontSize,'80px');scope.studioTypographyFontSize(el,'name');assert.equal(style.fontSize,'80px','repeated layout measurements never accumulate scaling');
scope.state.typography=defaults;scope.studioTypographyStyle(el,'author');scope.studioTypographyFontSize(el,'author');assert.equal(style.color,undefined);assert.equal(style['font-family'],undefined);assert.equal(style.fontSize,'','reset restores scheme CSS including responsive sizes');
console.log('PASS: custom typography color priority, font family and nonaccumulating responsive font sizing.');
