// The editor chrome: header, the three panes and each design's playback controls.
// The artwork itself (each section's .stage-viewport) stays imperative and is only moved into place.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { resetLastFrame, saveStudio, setMotionClock, state, syncStudio, update } from '../exploration-full-logic.js';
import { icons, type IconName } from '../icons.ts';
import { createMotionClock } from '../motion-clock.ts';
import type { DesignKey } from '../studio-state.ts';
import { refreshStudioPreview } from '../studio-preview.js';
import { studioContinuousShow, studioShowDuration, studioTotalDuration } from '../timeline.ts';
import { ContentPanel } from './ContentPanel.tsx';
import { loopNote } from './format.ts';
import { Inspectors } from './Inspector.tsx';
import { OutputDialog, type OutputDialogHandle } from './OutputDialog.tsx';
import { useEditorRevision } from './store.ts';

export interface WorkspaceView { key: DesignKey; section: HTMLElement; preview: HTMLElement; storyShots?: { textLayoutKey: string }[] }
type Panel = 'content' | 'preview' | 'style';
const urbanDesigns: readonly DesignKey[] = ['district', 'tuner', 'arcade'];

function Icon({ name }: { name: IconName }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-lucide={name} aria-hidden="true" className={'lucide lucide-' + name}>
      {icons[name].map(([Tag, props], index) => <Tag key={index} {...props} />)}
    </svg>
  );
}

// Seeking only previews; the position is saved once the drag or key press ends (the native change event).
function Seek({ total }: { total: number }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = input.current!;
    el.addEventListener('change', saveStudio);
    return () => el.removeEventListener('change', saveStudio);
  }, []);
  // The paint loop writes the value and its description every frame.
  return <input ref={input} className="form-range" type="range" min="0" max={total} step=".05" defaultValue={state.time} data-seek="" aria-label="片头、展示与片尾进度"
    onChange={event => { state.time = Number(event.target.value); restartClock(); state.playing = false; resetLastFrame(); syncStudio(); }} />;
}

const restartClock = () => setMotionClock(createMotionClock(state.time, state.variants, state.edges));

function Playback({ view }: { view: WorkspaceView }) {
  const n = state.narrative, total = studioTotalDuration(state.introDuration, n);
  const active = view.key === state.activeDesign;
  return createPortal(
    <div className="studio-playback">
      <div className="direction-transport">
        <button className="btn btn-primary" type="button" data-play="" aria-pressed={state.playing} onClick={() => {
          if (!state.playing && !studioContinuousShow(n) && state.time >= total) { state.time = 0; restartClock(); }
          state.playing = !state.playing;
          resetLastFrame();
          update();
        }}>{state.playing ? '暂停动态' : '播放动态'}</button>
        <button className="btn" type="button" data-intro="" onClick={() => { state.time = 0; restartClock(); state.playing = true; resetLastFrame(); update(); }}>从片头播放</button>
        <button className="btn" type="button" data-show="" onClick={() => { state.time = state.introDuration; resetLastFrame(); update(); }}>展示页</button>
        <button className="btn" type="button" data-ending-preview="" disabled={!n.outroEnabled} onClick={() => {
          state.time = state.introDuration + studioShowDuration(n);
          state.playing = true;
          resetLastFrame();
          update();
        }}>片尾</button>
        <button className="btn" type="button" data-swap="" aria-pressed={state.swapped} onClick={() => { state.swapped = !state.swapped; update(); }}>
          <Icon name="arrow-left-right" /><span>{state.ratio === 'portrait' ? '上下互换' : '左右互换'}</span>
        </button>
      </div>
      <div className="seek-row">
        <Seek total={total} />
        {/* The paint loop writes the time. */}
        <span className="seek-time" data-time="" />
      </div>
      {active ? (
        <div className="studio-playback-settings">
          <div className="direction-field studio-speed">
            <label htmlFor="direction-speed" className="range-title">播放速度<output>{state.speed.toFixed(1) + '×'}</output></label>
            <input className="form-range" type="range" id="direction-speed" min=".5" max="1.8" step=".1" value={state.speed} onChange={event => { state.speed = Number(event.target.value); update(); }} />
          </div>
        </div>
      ) : null}
    </div>, view.preview);
}

function Toolbar({ views }: { views: WorkspaceView[] }) {
  const step = (delta: number) => {
    const index = views.findIndex(view => view.key === state.activeDesign);
    state.activeDesign = views[(index + delta + views.length) % views.length].key;
    update();
  };
  const option = (view: WorkspaceView) => <option key={view.key} value={view.key}>{view.section.dataset.variant}</option>;
  return (
    <div className="studio-canvas-toolbar" aria-label="预览与画布设置">
      <div className="studio-design-row">
        <label className="studio-design-field">
          <span>视觉方案</span>
          <select className="form-select" id="studio-design" aria-label="视觉方案" value={state.activeDesign} onChange={event => { state.activeDesign = event.target.value as DesignKey; update(); }}>
            <optgroup label="街头二游 · 新增">{views.filter(view => urbanDesigns.includes(view.key)).map(option)}</optgroup>
            <optgroup label="原有方案">{views.filter(view => !urbanDesigns.includes(view.key)).map(option)}</optgroup>
          </select>
        </label>
        <button className="btn studio-design-step" type="button" aria-label="上一个视觉方案" onClick={() => step(-1)}>‹</button>
        <button className="btn studio-design-step" type="button" aria-label="下一个视觉方案" onClick={() => step(1)}>›</button>
      </div>
      <div className="studio-canvas-options">
        <div className="direction-field">
          <label htmlFor="direction-ratio">画幅</label>
          <select className="form-select" id="direction-ratio" value={state.ratio} onChange={event => { state.ratio = event.target.value as 'landscape'; update(); }}>
            <option value="landscape">横屏 · 16:9</option><option value="portrait">竖屏 · 9:16</option>
          </select>
        </div>
        <div className="direction-field">
          <label htmlFor="direction-frame">信息边框</label>
          <select className="form-select" id="direction-frame" value={state.frame} onChange={event => { state.frame = event.target.value as 'none'; update(); }}>
            <option value="none">开放式 · 无边框</option><option value="horizontal">上下信息边框</option><option value="vertical">左右信息边框</option>
          </select>
        </div>
        <label className="form-check form-switch">
          <input className="form-check-input" id="direction-type" type="checkbox" checked={state.type} onChange={event => { state.type = event.target.checked; update(); }} />
          <span className="form-check-label">显示文字信息</span>
        </label>
      </div>
      <div className="studio-preview-meta">
        <span>实时预览</span>
        {/* The paint loop writes the current phase. */}
        <span data-phase="" aria-live="polite" />
        <span className="studio-loop-note">{loopNote(state)}</span>
      </div>
    </div>
  );
}

export function Workspace({ root, views, carousel }: { root: HTMLElement; views: WorkspaceView[]; carousel: HTMLElement }) {
  useEditorRevision();
  const [panel, setPanelState] = useState<Panel>('preview');
  const [focused, setFocused] = useState(false);
  const output = useRef<OutputDialogHandle>(null);
  function setPanel(next: Panel) {
    root.dataset.panel = next;
    setPanelState(next);
    refreshStudioPreview();
  }
  function toggleFocus() {
    const next = !root.classList.contains('is-focused');
    root.classList.toggle('is-focused', next);
    setFocused(next);
    setPanel('preview');
  }
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && root.classList.contains('is-focused')) toggleFocus(); };
    root.addEventListener('keydown', escape);
    return () => root.removeEventListener('keydown', escape);
  });
  return <>
    {createPortal(<>
      <header className="studio-header">
        <div className="studio-brand"><span className="studio-emblem" aria-hidden="true">✳</span><div><span className="studio-kicker">SHOWCASE STUDIO</span><h1>角色展示工作台</h1></div></div>
        <div className="studio-header-actions">
          <span className="studio-local-label">本地编辑 · 即时预览</span>
          <details className="studio-help">
            <summary>使用说明</summary>
            <div className="studio-help-body">
              <strong>从作品内容到展示画面</strong>
              <ol><li>在左侧选择系列，填写名字与系列资料。</li><li>上传角色图，再选择中间的视觉方案。</li><li>在右侧调整配色、圆环和动效，立即预览。</li></ol>
              <p>系列名称、编号和短句分别保存。配色等视觉设置按方案保存，几何样式按方案与系列保存。</p>
              <p>参数记在当前浏览器。上传的图片仅在本次打开时有效，刷新前请保留原始素材。</p>
            </div>
          </details>
          <button className="btn studio-focus-button" type="button" data-focus-preview="" aria-pressed={focused} onClick={toggleFocus}>{focused ? '退出专注' : '专注预览'}</button>
          <button className="btn studio-output-button" type="button" data-output-open="" onClick={() => output.current?.open()}>输出 / AE 模板</button>
        </div>
      </header>
      <nav className="studio-mobile-tabs" aria-label="工作台区域">
        {([['content', '作品内容'], ['preview', '画面预览'], ['style', '画面样式']] as const).map(([key, label]) => (
          <button className="btn" type="button" key={key} data-panel-tab={key} aria-pressed={panel === key} onClick={() => setPanel(key)}>{label}</button>
        ))}
      </nav>
      {/* The design sections are adopted into the layout; React never renders inside them except through portals. */}
      <div className="studio-layout" ref={layout => { if (layout && carousel.parentElement !== layout) layout.append(carousel); }}>
        <aside className="studio-content" id="studio-content-panel" aria-label="作品内容与系列"><ContentPanel views={views} /></aside>
        <Toolbar views={views} />
      </div>
    </>, root)}
    {views.map(view => <Playback key={view.key} view={view} />)}
    <Inspectors views={views} />
    <OutputDialog ref={output} root={root} views={views} />
  </>;
}
