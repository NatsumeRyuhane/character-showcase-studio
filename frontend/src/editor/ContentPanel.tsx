// Left pane: content shared by every design. Series, character and brand, the sequence and
// post-processing panels, typography, images, delivery formats and badges, link and codes.
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { clearStudioImage, currentSeries, imageNames, images, loadStudioImage, state, studioError, update } from '../exploration-full-logic.js';
import type { ImageKey } from '../output-payload.ts';
import { badgeCatalog, cleanSeries, seriesDefaults, type SeriesEntry, type SeriesKey, type StudioState } from '../studio-state.ts';
import { NarrativePanel, PostPanel } from './NarrativePanel.tsx';
import { TypographyPanel } from './TypographyPanel.tsx';
import { useEditorRevision } from './store.ts';

type TextKey = 'name' | 'brand' | 'modelCredit' | 'designCredit' | 'qrUrl';
const seriesDescriptions: Record<SeriesKey, string> = { atelier: '时装精作', fur: '毛绒触感', mini: 'Q版简约' };
const seriesFields: readonly (readonly [keyof SeriesEntry, string, string, number])[] = [
  ['label', 'direction-series-name', '系列显示名称', 10], ['prefix', 'direction-prefix', '编号前缀', 3], ['serial', 'direction-serial', '作品编号', 4],
  ['caption', 'direction-caption', '系列中文短句', 14], ['subtitle', 'direction-subtitle', '系列英文短句', 32],
];
const formats: readonly (readonly [keyof StudioState['formats'], string])[] = [['fbx', 'FBX'], ['vrchat', 'VRChat'], ['vrm', 'VRM'], ['warudo', 'Warudo']];
const accept = 'image/png,image/jpeg,image/webp';

function TextField({ field, id, label, max, type }: { field: TextKey; id: string; label: string; max: number; type?: string }) {
  return (
    <div className="direction-field">
      <label htmlFor={id}>{label}</label>
      <input className="form-control" id={id} type={type} placeholder={type === 'url' ? 'https://…' : undefined} maxLength={max} value={state[field]} onChange={event => { state[field] = event.target.value; update(); }} />
    </div>
  );
}

export function ContentPanel({ pane, views }: { pane: Element; views: { storyShots?: { textLayoutKey: string }[] }[] }) {
  useEditorRevision();
  const files = useRef<Partial<Record<ImageKey, HTMLInputElement | null>>>({});
  const series = currentSeries() as SeriesEntry;
  const file = (kind: ImageKey, label: string) => (
    <div className="direction-field">
      <label htmlFor={`direction-${kind}-file`}>{label}</label>
      <input className="form-control" id={`direction-${kind}-file`} type="file" accept={accept} ref={el => { files.current[kind] = el; }}
        onChange={event => { const chosen = event.target.files?.[0]; if (chosen) loadStudioImage(kind, chosen); }} />
    </div>
  );
  const clear = (kind: ImageKey, label: string, disable = false) => (
    <button className="btn" type="button" disabled={disable && !images[kind]} onClick={() => {
      const input = files.current[kind];
      if (input) input.value = '';
      clearStudioImage(kind);
    }}>{label}</button>
  );
  const upload = (kind: ImageKey, label: string, clearLabel: string) => (
    <div className="studio-upload-card" key={kind}>
      {file(kind, label)}
      <span className={'studio-upload-name' + (images[kind] ? ' has-file' : '')}>{images[kind] ? (imageNames as Partial<Record<ImageKey, string>>)[kind] || '已载入图片' : '尚未选择图片'}</span>
      {clear(kind, clearLabel, true)}
    </div>
  );
  return createPortal(<>
    <div className="studio-panel-title"><h2>作品内容</h2><span className="studio-scope-label">所有方案共用</span></div>
    <p className="studio-note">先准备作品资料，再调整画面。</p>
    <details className="studio-group" data-studio-group="series" open>
      <summary className="cursor-interaction">系列管理</summary>
      <div className="studio-series-tabs" role="group" aria-label="选择作品系列">
        {(Object.keys(seriesDescriptions) as SeriesKey[]).map(key => {
          const label = state.seriesData[key].label || seriesDefaults[key].label;
          return <button className="btn" type="button" key={key} aria-pressed={key === state.series} aria-label={label + ' · ' + seriesDescriptions[key]}
            onClick={() => { state.series = key; update(); }}><strong>{label}</strong><small>{seriesDescriptions[key]}</small></button>;
        })}
      </div>
      <div className="studio-series-summary">{'当前系列  ' + (series.label || 'EDITION') + ' / ' + (series.prefix || 'ID') + '-' + (series.serial || '001')}</div>
      <p className="studio-note">名称、编号和短句随系列分别保存。</p>
      <details className="studio-group studio-subgroup">
        <summary className="cursor-interaction">系列名称、编号与短句</summary>
        <div className="direction-settings">
          {seriesFields.map(([key, id, label, max]) => (
            <div className="direction-field" key={key}>
              <label htmlFor={id}>{label}</label>
              <input className="form-control" id={id} maxLength={max} inputMode={key === 'serial' ? 'numeric' : undefined} value={series[key]}
                onChange={event => { series[key] = cleanSeries(key, event.target.value); update(); }} />
            </div>
          ))}
        </div>
      </details>
    </details>
    <details className="studio-group" open>
      <summary className="cursor-interaction">角色与品牌</summary>
      <div className="direction-settings">
        <TextField field="name" id="direction-name" label="角色名字" max={32} />
        <TextField field="brand" id="direction-brand" label="品牌字标" max={24} />
      </div>
      <details className="studio-group studio-subgroup">
        <summary className="cursor-interaction">署名与品牌 Logo</summary>
        <div className="direction-settings">
          <TextField field="modelCredit" id="direction-model-credit" label="模型制作署名" max={35} />
          <TextField field="designCredit" id="direction-design-credit" label="设计署名" max={30} />
          {file('logo', '品牌 Logo 图片')}
        </div>
        {clear('logo', '清除 Logo')}
      </details>
    </details>
    <NarrativePanel />
    <PostPanel />
    <TypographyPanel views={views} />
    <details className="studio-group" open>
      <summary className="cursor-interaction">角色图片</summary>
      {upload('model', '主角色图片', '清除角色图')}
      {upload('portrait', '补充 / 特写图片', '清除补充图片')}
      <p className="studio-note">PNG / WebP / JPG，单张不超过 12 MB。图片仅在本次打开时保留。</p>
      <details className="studio-group studio-subgroup">
        <summary className="cursor-interaction">片头镜头素材</summary>
        {upload('introCharacter', '第一幕 · 角色镜头', '清除图片')}
        {upload('introAuthor', '第二幕 · 作者镜头', '清除图片')}
        <p className="studio-note">两个镜头可独立选图。不选时，第一幕使用主角色图，第二幕优先使用特写图。模型动作可在 AE / OBS 叠加，或替换导出后的镜头素材。</p>
      </details>
    </details>
    <details className="studio-group" data-studio-group="formats">
      <summary className="cursor-interaction">交付格式与适配标识</summary>
      <p className="studio-note">勾选需要出现在画面里的格式与标识。</p>
      <div className="direction-checks">
        {formats.map(([key, label]) => (
          <label className="form-check" key={key}>
            <input className="form-check-input" type="checkbox" checked={state.formats[key]} onChange={event => { state.formats[key] = event.target.checked; update(); }} />
            <span className="form-check-label">{label}</span>
          </label>
        ))}
      </div>
      <div className="badge-options">
        {badgeCatalog.map(badge => (
          <label className="form-check" key={badge.id}>
            <input type="checkbox" className="form-check-input" checked={state.badges.includes(badge.id)} onChange={event => {
              const list = new Set(state.badges);
              if (event.target.checked) list.add(badge.id); else list.delete(badge.id);
              state.badges = badgeCatalog.filter(item => list.has(item.id)).map(item => item.id);
              update();
            }} />
            <span className="form-check-label">{badge.name + (badge.sub === 'COMPATIBLE' ? ' Compatible' : badge.id === 'face' ? ' Tracking' : '')}</span>
          </label>
        ))}
      </div>
    </details>
    <details className="studio-group">
      <summary className="cursor-interaction">作品链接与条码</summary>
      <div className="direction-settings">
        <TextField field="qrUrl" id="direction-qr" label="作品链接 · 自动生成二维码" max={180} type="url" />
        {file('qr', '或上传二维码图片')}
        {file('barcode', '替换条码图片')}
      </div>
      {clear('qr', '清除二维码图片')}
      {clear('barcode', '恢复编号条码')}
    </details>
    <div className="direction-error" role="alert" hidden={!studioError}>{studioError}</div>
  </>, pane);
}
