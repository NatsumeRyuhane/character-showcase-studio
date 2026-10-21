import { state } from './exploration-full-logic.js';

// DOM styling for the shared text overrides (settings: typography.ts).
export function studioTypographyStyle(el,key){
  if(!el)return;const item=state.typography[key],fonts={manrope:'"Manrope","Microsoft YaHei UI",sans-serif',grotesk:'"Space Grotesk","Microsoft YaHei UI",sans-serif',condensed:'"Barlow Condensed","Microsoft YaHei UI",sans-serif',serif:'"Cormorant Garamond","Noto Serif SC","Songti SC",SimSun,serif',rounded:'"Nunito","Microsoft YaHei UI",sans-serif',system:'"Microsoft YaHei UI","PingFang SC",sans-serif'};
  for(const[property,value]of Object.entries({'font-family':fonts[item.font]||'','font-weight':item.weight==='auto'?'':item.weight,'font-style':item.italic==='auto'?'':item.italic,'letter-spacing':item.tracking===null?'':item.tracking+'em',color:item.colorMode==='custom'?item.color:''}))value?el.style.setProperty(property,value):el.style.removeProperty(property);
  // Case is written into textContent, so editable AE text matches the preview.
  el.style.removeProperty('text-transform');
}
export function studioTypographyFontSize(el,key){
  el.style.removeProperty('font-size');const item=state.typography[key],base=parseFloat(getComputedStyle(el).fontSize),size=base*item.scale;
  if(item.scale!==1)el.style.fontSize=size+'px';return size;
}
export function applyStudioTypography(view){for(const[key,el]of [['name',view.name],['caption',view.art.querySelector('.copy-caption')],['subtitle',view.art.querySelector('.copy-subtitle')]])studioTypographyStyle(el,key);}
export function applyStudioStoryTypography(view,part,role){
  const {el}=part,key=JSON.stringify([state.typography[role],state.typography.copy[role],state.variants?.[view.key]?.typeface,view.w,view.h,el.dataset.corner,el.querySelector('.story-title').textContent]);if(part.textLayoutKey===key)return;part.textLayoutKey=key;
  const title=el.querySelector('.story-title'),primary=el.querySelector('.story-primary'),secondary=el.querySelector('.story-secondary');studioTypographyStyle(title,role);studioTypographyFontSize(title,role);secondary.style.removeProperty('top');
  // Long centered names still leave room for the smaller credit block.
  if(el.dataset.corner==='center'&&el.clientHeight){const limit=el.clientHeight*.42;if(primary.offsetHeight>limit){const current=parseFloat(getComputedStyle(title).fontSize);title.style.fontSize=Math.max(11,current*limit/primary.offsetHeight)+'px';}secondary.style.top=(el.clientHeight*.5+primary.offsetHeight*.5+Math.max(6,el.clientWidth*.025))+'px';}
}
