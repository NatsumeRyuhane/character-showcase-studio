// Sequence controls (intro, show, outro) and post-processing. The state changes they make
// (retiming, switching to and from the story intro) are in studio-narrative.js.
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { images, state } from '../exploration-full-logic.js';
import { jumpToStudioStory, setStudioIntroDuration, setStudioNarrative } from '../studio-narrative.js';
import { studioContinuousShow, studioStoryDuration, type NarrativeSettings } from '../timeline.ts';
import { NumberInput, optionList, type Options } from './controls.tsx';
import { useEditorRevision } from './store.ts';

type Key = keyof NarrativeSettings;
type Role = 'character' | 'author';
// Stored as fractions, shown as percent.
const percentKeys: readonly Key[] = ['nameDelay', 'characterEffectStrength', 'authorEffectStrength', 'postStrength', 'postGlow'];
const corners: Options = [['tl-br', '左上 ↔ 右下'], ['tr-bl', '右上 ↔ 左下'], ['bl-tr', '左下 ↔ 右上'], ['br-tl', '右下 ↔ 左上'], ['center', '画面正中']];
const postEffects: Options = [['none', '关闭 · 保留原画'], ['polar', '偏振流光 · Polar'], ['crt', '显像管 · CRT'], ['holo', '全息波纹 · Holo'], ['bloom', '柔光泛晕 · Bloom'], ['anamorphic', '电影横向炫光 · Lens Flare'], ['prism', '棱镜色散 · Prism'], ['film', '胶片光漏 · Film']];
const seconds = (value: number) => value.toFixed(2).replace(/0$/, '') + ' 秒';

const value = (key: Key) => state.narrative[key] as number;
const set = (key: Key, next: unknown) => setStudioNarrative(key, next);

function Select({ id, field, children }: { id: string; field: Key; children: ReactNode }) {
  return <select className="form-select" id={id} value={String(state.narrative[field])} onChange={event => set(field, event.target.value)}>{children}</select>;
}
function Switch({ id, field, children }: { id?: string; field: Key; children: string }) {
  return <label className="form-check form-switch"><input className="form-check-input" id={id} type="checkbox" checked={state.narrative[field] as boolean} onChange={event => set(field, event.target.checked)} /><span>{children}</span></label>;
}
function Range({ id, field, label, shown, min, max, step }: { id: string; field: Key; label: string; shown: string; min: number; max: number; step: number }) {
  const factor = percentKeys.includes(field) ? 100 : 1;
  return (
    <div className="direction-field">
      <label htmlFor={id} className="range-title">{label}<output>{shown}</output></label>
      <input id={id} className="form-range" type="range" min={min} max={max} step={step} value={value(field) * factor} onChange={event => set(field, event.target.valueAsNumber / factor)} />
    </div>
  );
}
function Seconds({ id, field, min, max, step }: { id: string; field: Key; min: number; max: number; step: number }) {
  return <NumberInput id={id} className="form-control" min={min} max={max} step={step} inputMode="decimal" value={value(field)} onValue={next => set(field, next)} />;
}

function StoryShot({ role, index, label }: { role: Role; index: string; label: string }) {
  const enabled = state.narrative[`${role}ShotEnabled`];
  return (
    <section className={'studio-story-shot' + (enabled ? '' : ' is-disabled')}>
      <div className="studio-story-shot-head"><span><b>{index}</b>{label}</span><Switch field={`${role}ShotEnabled`}>启用</Switch></div>
      <div className="direction-settings" hidden={!enabled}>
        <div className="studio-story-pair">
          <div className="direction-field"><label htmlFor={`studio-${role}-duration`}>镜头时长 · 秒</label><Seconds id={`studio-${role}-duration`} field={`${role}ShotDuration`} min={0.5} max={12} step={0.1} /></div>
          <div className="direction-field"><label htmlFor={`studio-${role}-corner`}>字幕位置</label><Select id={`studio-${role}-corner`} field={`${role}Corner`}>{optionList(corners)}</Select></div>
        </div>
        <details className="studio-story-media">
          <summary>画面缩放与位置</summary>
          <Range id={`studio-${role}-Scale`} field={`${role}Scale`} label="画面缩放" shown={value(`${role}Scale`).toFixed(2) + '×'} min={0.6} max={2.4} step={0.05} />
          <Range id={`studio-${role}-X`} field={`${role}X`} label="水平位置" shown={Math.round(value(`${role}X`)) + '%'} min={0} max={100} step={1} />
          <Range id={`studio-${role}-Y`} field={`${role}Y`} label="垂直位置" shown={Math.round(value(`${role}Y`)) + '%'} min={0} max={100} step={1} />
        </details>
      </div>
      <button type="button" className="btn studio-story-jump" disabled={!enabled} onClick={() => jumpToStudioStory(role)}>{'预览' + label}</button>
    </section>
  );
}

export function NarrativePanel({ group }: { group: Element }) {
  useEditorRevision();
  const n = state.narrative, story = n.introStyle === 'story', continuous = studioContinuousShow(n);
  const introNote = story
    ? n.characterShotEnabled || n.authorShotEnabled ? '角色与作者是两张独立海报镜头，可分别调整画面和字幕位置。统一滤镜在下方「画面后处理」设置；圆环运动始终连续。' : '两个镜头都已关闭，直接进入主展示。'
    : n.introStyle === 'model' ? '先让模型与动态几何出场。名字保持正常排版大小，信息在展示页淡入。' : '沿用原版大字开场，角色名从画面中心缩回信息区。';
  const endingNote = !n.outroEnabled
    ? continuous ? '引入只播放一次，随后停留在展示页。圆环、背景、文字与滚动边框持续运动；暂停后继续也不会重播。' : '引入只播放一次，展示页按设定时长重新播放入场。'
    : (n.outroContent === 'logo' && !images.logo ? '尚未上传 Logo，暂用品牌字样。请在「角色与品牌 → 署名与品牌 Logo」上传。' : '沿用「角色与品牌」中的字样 / Logo。')
      + (n.outroTrigger === 'manual' ? '点击预览下的「片尾」，或在 OBS 源交互中按 E 进入。AE 按 ' + n.showDuration + ' 秒展示段落导出。' : '展示 ' + n.showDuration + ' 秒后进入片尾。')
      + (n.shutdownEnabled ? '最后 ' + n.shutdownDuration + ' 秒收成亮线与光点，连同边框一起关机，最后停在全黑画面。' : '最后停在品牌画面。');
  return createPortal(<>
    <summary>片头、展示与片尾</summary>
    <div className="studio-sequence-map" aria-hidden="true">
      <span>{story ? '01 / 02 海报' : '01 引入'}</span><i>→</i><span>{story ? '03 主展示' : '02 展示'}</span><i>→</i><span className={n.outroEnabled ? undefined : 'is-disabled'}>{story ? '04 片尾' : '03 片尾'}</span>
    </div>
    <div className="direction-settings">
      <div className="direction-field">
        <label htmlFor="studio-intro-style">引入方式</label>
        <Select id="studio-intro-style" field="introStyle"><option value="story">双镜头海报 · 角色 → 作者</option><option value="model">模型先行 · 信息稍后出现</option><option value="title">大字开场 · 原版</option></Select>
      </div>
      <div className="direction-field" hidden={story}>
        <label htmlFor="studio-intro-duration">引入页时长 · 秒</label>
        <NumberInput id="studio-intro-duration" className="form-control" min={0} max={30} step={0.5} inputMode="decimal" value={state.introDuration} onValue={setStudioIntroDuration} />
        <small>0 秒跳过 · 按 1× 播放计算</small>
      </div>
      <div className="direction-field" hidden={n.introStyle !== 'model'}>
        <label htmlFor="studio-name-reveal">角色名何时出现</label>
        <Select id="studio-name-reveal" field="nameReveal"><option value="show">到展示页再淡入</option><option value="delayed">片头后段轻轻浮现</option></Select>
      </div>
      <div className="direction-field" hidden={n.introStyle !== 'model' || n.nameReveal !== 'delayed'}>
        <label htmlFor="studio-name-delay" className="range-title">延迟到片头的<output>{Math.round(n.nameDelay * 100) + '%'}</output></label>
        <input className="form-range" id="studio-name-delay" type="range" min="20" max="90" step="5" value={n.nameDelay * 100} onChange={event => set('nameDelay', event.target.valueAsNumber / 100)} />
      </div>
    </div>
    <div className="studio-story-controls" hidden={!story}>
      <div className="studio-story-total"><span>角色镜头 → 作者镜头 → 主展示</span><output>{seconds(studioStoryDuration(n))}</output></div>
      <StoryShot role="character" index="01" label="角色镜头" />
      <StoryShot role="author" index="02" label="作者镜头" />
      <div className="direction-field">
        <label htmlFor="studio-story-transition">转入展示 · 秒</label>
        <Seconds id="studio-story-transition" field="storyTransitionDuration" min={0.15} max={3} step={0.05} />
        <small>包含在引入总时长内；最后一幕轻退，主展示同步出现。</small>
      </div>
      <Switch field="storyPackagingOnly">仅预览文字包装与效果</Switch>
      <Switch field="storyFlash">镜头切换时短曝光</Switch>
      <div className="studio-story-actions">
        <button type="button" className="btn" onClick={() => jumpToStudioStory('start')}>从片头播放</button>
        <button type="button" className="btn" onClick={() => jumpToStudioStory('show')}>跳到主展示</button>
      </div>
    </div>
    <p className="studio-note">{introNote}</p>
    <div className="direction-settings studio-showcase-settings">
      <div className="direction-field" hidden={n.outroEnabled}>
        <label htmlFor="studio-show-playback">无片尾时的播放方式</label>
        <Select id="studio-show-playback" field="showPlayback"><option value="continuous">持续展示 · 不回到起点</option><option value="repeat">按时长循环 · 重播展示入场</option></Select>
      </div>
      <div className="direction-field">
        <label htmlFor="studio-show-duration">{continuous ? '导出展示时长 · 秒' : '展示时长 · 秒'}</label>
        <Seconds id="studio-show-duration" field="showDuration" min={1} max={60} step={0.5} />
        <small>{continuous ? '网页 / OBS 持续播放，不受此时长限制；此处用于 AE 导出及进度预览。' : '1–60 秒 · 循环播放时为每轮时长 · AE 同步使用'}</small>
      </div>
    </div>
    <div className="studio-ending-settings">
      <Switch id="studio-outro-enabled" field="outroEnabled">启用品牌片尾</Switch>
      <div className="direction-settings" hidden={!n.outroEnabled}>
        <div className="direction-field">
          <label htmlFor="studio-outro-trigger">进入片尾的方式</label>
          <Select id="studio-outro-trigger" field="outroTrigger"><option value="auto">展示结束后自动进入</option><option value="manual">保持展示循环 · 手动进入</option></Select>
        </div>
        <div className="direction-field"><label htmlFor="studio-outro-duration">片尾时长 · 秒</label><Seconds id="studio-outro-duration" field="outroDuration" min={1.5} max={12} step={0.5} /></div>
        <div className="direction-field">
          <label htmlFor="studio-outro-style">品牌小动画</label>
          <Select id="studio-outro-style" field="outroStyle"><option value="signature">签名落版 · 一笔收束</option><option value="orbit">轨道回声 · 环绕落版</option><option value="quiet">安静留白 · 轻柔淡入</option></Select>
        </div>
        <div className="direction-field">
          <label htmlFor="studio-outro-content">片尾内容</label>
          <Select id="studio-outro-content" field="outroContent"><option value="auto">优先 Logo，否则品牌字样</option><option value="word">品牌字样</option><option value="logo">品牌 Logo</option></Select>
        </div>
        <Switch id="studio-shutdown-enabled" field="shutdownEnabled">老电视关机 · 亮线、光点与余辉</Switch>
        <div className="direction-field" hidden={!n.shutdownEnabled}>
          <label htmlFor="studio-shutdown-duration">关机动画时长 · 秒</label>
          <Seconds id="studio-shutdown-duration" field="shutdownDuration" min={0.3} max={Math.min(1.5, n.outroDuration * 0.45)} step={0.1} />
          <small>包含在片尾内，不额外增加总时长。最多占片尾的 45%。</small>
        </div>
      </div>
      <p className="studio-note">{endingNote}</p>
    </div>
  </>, group);
}

export function PostPanel({ group }: { group: Element }) {
  useEditorRevision();
  const n = state.narrative;
  const scene = (field: Key, label: string) => <label><input type="checkbox" checked={n[field] as boolean} onChange={event => set(field, event.target.checked)} /><span>{label}</span></label>;
  return createPortal(<>
    <summary>画面后处理</summary>
    <div className="direction-settings">
      <div className="direction-field">
        <label htmlFor="studio-post-effect">滤镜方案</label>
        <Select id="studio-post-effect" field="postEffect">{optionList(postEffects)}</Select>
      </div>
      <div data-post-controls="" hidden={n.postEffect === 'none'}>
        <div className="studio-post-label">应用到哪些镜头</div>
        <div className="studio-post-scenes">{scene('postCharacter', '角色镜头')}{scene('postAuthor', '作者镜头')}{scene('postShow', '展示页')}{scene('postOutro', '片尾')}</div>
        <Range id="studio-postStrength" field="postStrength" label="效果强度" shown={Math.round(n.postStrength * 100) + '%'} min={0} max={100} step={5} />
        <Range id="studio-postGlow" field="postGlow" label="附加辉光" shown={Math.round(n.postGlow * 100) + '%'} min={0} max={100} step={5} />
        <Range id="studio-postSpeed" field="postSpeed" label="动态速度" shown={n.postSpeed.toFixed(1) + '×'} min={0.1} max={2} step={0.1} />
        <Range id="studio-postFade" field="postFade" label="淡入淡出 · 秒" shown={seconds(n.postFade)} min={0.15} max={1.5} step={0.05} />
      </div>
    </div>
    <p className="studio-note">片头：素材与字幕一起处理。展示页：角色位于滤镜上方，背景与文字接受处理。边框始终独立。效果连续运动，离开所选镜头时柔和淡出。</p>
    <button type="button" className="btn studio-post-preview" onClick={() => jumpToStudioStory('start')}>从片头预览效果</button>
  </>, group);
}
