import { draw, measure, state, update } from './exploration-full-logic.js';
import { studioOutputLayout } from './export-layout.js';
import { loopNote } from './editor/format.ts';

// Editor chrome only. Existing inputs and listeners are retained, never cloned.
export function mountStudioWorkspace(root,views){
  root.classList.add('studio-editor');root.dataset.panel='preview';
  const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el};
  const button=(text,aria)=>{const el=make('button','btn',text);el.type='button';if(aria)el.setAttribute('aria-label',aria);return el};
  const field=id=>root.querySelector('#'+id)?.closest('.direction-field');
  const global=root.querySelector('.direction-global');
  const oldHeading=root.querySelector('.direction-heading'),oldCanvasOptions=oldHeading.nextElementSibling;
  const phase=oldHeading.querySelector('[data-phase]');
  const originalViews=root.querySelector('.viz-carousel');originalViews.className='studio-views';

  const header=make('header','studio-header');
  const brand=make('div','studio-brand');
  brand.innerHTML='<span class="studio-emblem" aria-hidden="true">✳</span><div><span class="studio-kicker">SHOWCASE STUDIO</span><h1>角色展示工作台</h1></div>';
  const headerActions=make('div','studio-header-actions');
  const localLabel=make('span','studio-local-label','本地编辑 · 即时预览');
  const focusButton=button('专注预览');focusButton.classList.add('studio-focus-button');focusButton.dataset.focusPreview='';focusButton.setAttribute('aria-pressed','false');
  const help=make('details','studio-help');
  help.innerHTML='<summary>使用说明</summary><div class="studio-help-body"><strong>从作品内容到展示画面</strong><ol><li>在左侧选择系列，填写名字与系列资料。</li><li>上传角色图，再选择中间的视觉方案。</li><li>在右侧调整配色、圆环和动效，立即预览。</li></ol><p>系列名称、编号和短句分别保存。配色等视觉设置按方案保存，几何样式按方案与系列保存。</p><p>参数记在当前浏览器。上传的图片仅在本次打开时有效，刷新前请保留原始素材。</p></div>';
  headerActions.append(localLabel,help,focusButton);header.append(brand,headerActions);
  const tabs=make('nav','studio-mobile-tabs');tabs.setAttribute('aria-label','工作台区域');
  for(const [key,label]of [['content','作品内容'],['preview','画面预览'],['style','画面样式']]){const tab=button(label);tab.dataset.panelTab=key;tab.setAttribute('aria-pressed',String(key==='preview'));tab.addEventListener('click',()=>setPanel(key));tabs.append(tab)}

  const layout=make('div','studio-layout');
  const left=make('aside','studio-content');left.id='studio-content-panel';left.setAttribute('aria-label','作品内容与系列');
  // The pane's content is the React component src/editor/ContentPanel.tsx.

  const toolbar=make('div','studio-canvas-toolbar');toolbar.setAttribute('aria-label','预览与画布设置');
  const designRow=make('div','studio-design-row'),designField=make('label','studio-design-field');designField.append(make('span','','视觉方案'));
  const designSelect=make('select','form-select');designSelect.id='studio-design';designSelect.setAttribute('aria-label','视觉方案');
  const originalDesigns=make('optgroup'),urbanDesigns=make('optgroup');originalDesigns.label='原有方案';urbanDesigns.label='街头二游 · 新增';for(const view of views){const option=make('option','',view.section.dataset.variant);option.value=view.key;(['district','tuner','arcade'].includes(view.key)?urbanDesigns:originalDesigns).append(option)}designSelect.append(urbanDesigns,originalDesigns);designField.append(designSelect);
  const previous=button('‹','上一个视觉方案'),next=button('›','下一个视觉方案');previous.classList.add('studio-design-step');next.classList.add('studio-design-step');designRow.append(designField,previous,next);
  const canvasOptions=make('div','studio-canvas-options');for(const el of [...oldCanvasOptions.children])canvasOptions.append(el);
  const typeToggle=root.querySelector('#direction-type').closest('label');typeToggle.querySelector('.form-check-label').textContent='显示文字信息';canvasOptions.append(typeToggle);
  const previewMeta=make('div','studio-preview-meta');previewMeta.append(make('span','','实时预览'),phase,make('span','studio-loop-note','片头 4.5s · 展示循环 12s'));
  toolbar.append(designRow,canvasOptions,previewMeta);
  const sharedPlayback=make('div','studio-playback-settings');const speedField=field('direction-speed');speedField.classList.add('studio-speed');speedField.querySelector('label').firstChild.textContent='播放速度';sharedPlayback.append(speedField);
  // Preview and playback per design. The inspector beside them is the React component src/editor/Inspector.tsx.
  function reorganizeInspector(view){
    const section=view.section;
    const preview=make('div','studio-preview');const stage=section.querySelector('.stage-viewport'),transport=section.querySelector('.direction-transport'),seek=section.querySelector('.seek-row');
    const playback=make('div','studio-playback');playback.append(transport,seek);preview.append(stage,playback);section.append(preview);view.preview=preview;view.playback=playback;
  }
  for(const view of views)reorganizeInspector(view);
  layout.append(left,toolbar,originalViews);oldHeading.remove();oldCanvasOptions.remove();global.remove();root.append(header,tabs,layout);

  const rename={'direction-frame':'信息边框','direction-ratio':'画幅'};
  for(const[id,label]of Object.entries(rename)){const el=root.querySelector('label[for="'+id+'"]');if(el)el.firstChild.textContent=label}

  function setPanel(panel){root.dataset.panel=panel;for(const el of tabs.querySelectorAll('button'))el.setAttribute('aria-pressed',String(el.dataset.panelTab===panel));requestAnimationFrame(()=>{const view=views.find(v=>!v.section.hidden);if(view)sizePreview(view)})}
  function setDesign(key){state.activeDesign=key;update()}
  function stepDesign(delta){const index=views.findIndex(v=>v.key===state.activeDesign);setDesign(views[(index+delta+views.length)%views.length].key)}
  designSelect.addEventListener('change',()=>setDesign(designSelect.value));previous.addEventListener('click',()=>stepDesign(-1));next.addEventListener('click',()=>stepDesign(1));
  focusButton.addEventListener('click',()=>{const focused=root.classList.toggle('is-focused');focusButton.setAttribute('aria-pressed',String(focused));focusButton.textContent=focused?'退出专注':'专注预览';setPanel('preview')});
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.classList.contains('is-focused'))focusButton.click()});
  function sizePreview(view){
    const stage=view.preview.querySelector('.stage-viewport');if(!stage.clientWidth||!stage.clientHeight)return;
    const style=getComputedStyle(stage),width=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),height=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);if(width<=0||height<=0)return;
    if(root.classList.contains('is-clean-output')){
      const layout=studioOutputLayout(width,height,state.ratio==='portrait',state.output.fit==='cover');
      view.outputScale=layout.scale;view.art.style.setProperty('--preview-width',layout.width+'px');
      view.art.style.transform='scale('+layout.scale+')';view.art.style.transformOrigin='center';
    }else{
      view.outputScale=0;view.art.style.removeProperty('transform');view.art.style.removeProperty('transform-origin');
      const ratio=state.ratio==='portrait'?9/16:16/9;view.art.style.setProperty('--preview-width',Math.max(1,Math.min(width,height*ratio))+'px');
    }
    measure(view);draw(view);
  }
  for(const view of views)new ResizeObserver(()=>sizePreview(view)).observe(view.preview.querySelector('.stage-viewport'));
  const ui={sync(){
    const selected=views.find(v=>v.key===state.activeDesign)||views[0];state.activeDesign=selected.key;designSelect.value=selected.key;
    for(const view of views)view.section.hidden=view!==selected;
    if(sharedPlayback.parentElement!==selected.playback)selected.playback.append(sharedPlayback);
    root.querySelector('.studio-loop-note').textContent=loopNote(state);
    requestAnimationFrame(()=>sizePreview(selected));
  }};
  ui.sync();return ui;
}
