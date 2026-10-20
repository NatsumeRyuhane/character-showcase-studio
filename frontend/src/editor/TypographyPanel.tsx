// Typography controls: the shared text overrides for the show title, the two story shots and the series copy.
// The DOM styling they drive stays in studio-text.js; the settings themselves are typography.ts.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { currentSeries, state, update } from '../exploration-full-logic.js';
import { studioTypographySettings, type StoryCopy, type TextStyle, type TypographyKey } from '../typography.ts';
import { useEditorRevision } from './store.ts';

type Options = readonly (readonly [string, string])[];
const targets: Options = [['name', '展示页 · 角色名'], ['character', '第一幕 · 角色标题'], ['author', '第二幕 · 作者标题'], ['caption', '展示页 · 系列短句'], ['subtitle', '展示页 · 英文说明']];
const fonts: Options = [['auto', '跟随视觉方案'], ['manrope', '现代无衬线 · Manrope'], ['grotesk', '几何字体 · Space Grotesk'], ['condensed', '紧凑海报 · Barlow Condensed'], ['serif', '时尚衬线 · Cormorant'], ['rounded', '圆润可爱 · Nunito'], ['system', '清晰中文 · 系统字体']];
const weights: Options = [['auto', '跟随方案'], ['400', '常规 · 400'], ['500', '中等 · 500'], ['600', '半粗 · 600'], ['700', '粗体 · 700'], ['800', '特粗 · 800'], ['900', '黑体 · 900']];
const italics: Options = [['auto', '跟随方案'], ['normal', '正体'], ['italic', '斜体']];
const cases: Options = [['original', '保留输入'], ['uppercase', '全部大写'], ['lowercase', '全部小写']];
const copyFields: readonly (readonly [keyof StoryCopy, string, number])[] = [['kicker', '标题上方小字', 80], ['label', '辅助信息第一行', 80], ['meta', '辅助信息第二行', 120]];

export const optionList = (items: Options) => items.map(([value, label]) => <option key={value} value={value}>{label}</option>);

interface View { storyShots?: { textLayoutKey: string }[] }

export function TypographyPanel({ group, views }: { group: Element; views: View[] }) {
  useEditorRevision();
  const [selected, setSelected] = useState<TypographyKey>('name');
  const item = state.typography[selected];
  const story = selected === 'character' || selected === 'author';
  const inherited = (selected === 'name' || selected === 'character' ? state.name : selected === 'author' ? state.brand : selected === 'caption' ? currentSeries().caption : currentSeries().subtitle) || '';
  function set<K extends keyof TextStyle>(key: K, value: TextStyle[K]) {
    item[key] = value;
    if (key === 'color') item.colorMode = 'custom';
    update();
  }
  function setCopy(key: keyof StoryCopy, value: string) {
    state.typography.copy[selected as 'character' | 'author'][key] = value;
    for (const view of views) view.storyShots?.forEach(part => part.textLayoutKey = '');
    update();
  }
  return createPortal(<>
    <summary>文字排版</summary>
    <p className="studio-note">各方案共用。文案留空时沿用角色、品牌与系列资料；选择「跟随方案」保留原有设计。</p>
    <div className="direction-field studio-text-target">
      <label htmlFor="studio-text-target">正在编辑</label>
      <select id="studio-text-target" className="form-select" value={selected} onChange={event => setSelected(event.target.value as TypographyKey)}>{optionList(targets)}</select>
    </div>
    <div className="direction-settings">
      <div className="direction-field">
        <label htmlFor="studio-text-content">自定义文案</label>
        <input id="studio-text-content" className="form-control" type="text" maxLength={64} placeholder={inherited} value={item.text} onChange={event => set('text', event.target.value)} />
        <small>{'留空沿用：' + inherited}</small>
      </div>
      <div className="direction-field">
        <label htmlFor="studio-text-font">字体</label>
        <select id="studio-text-font" className="form-select" value={item.font} onChange={event => set('font', event.target.value as TextStyle['font'])}>{optionList(fonts)}</select>
      </div>
      <div className="direction-field">
        <label htmlFor="studio-text-scale" className="range-title">字号比例<output>{Math.round(item.scale * 100) + '%'}</output></label>
        <input id="studio-text-scale" className="form-range" type="range" min="60" max="150" step="5" value={Math.round(item.scale * 100)} onChange={event => set('scale', event.target.valueAsNumber / 100)} />
        <small>文字过长时自动缩小，避免超出文字区域。</small>
      </div>
      <div className="studio-text-row">
        <div className="direction-field">
          <label htmlFor="studio-text-weight">字重</label>
          <select id="studio-text-weight" className="form-select" value={item.weight} onChange={event => set('weight', event.target.value as TextStyle['weight'])}>{optionList(weights)}</select>
        </div>
        <div className="direction-field">
          <label htmlFor="studio-text-italic">倾斜</label>
          <select id="studio-text-italic" className="form-select" value={item.italic} onChange={event => set('italic', event.target.value as TextStyle['italic'])}>{optionList(italics)}</select>
        </div>
      </div>
      <div className="direction-field">
        <label htmlFor="studio-text-case">英文大小写</label>
        <select id="studio-text-case" className="form-select" value={item.case} onChange={event => set('case', event.target.value as TextStyle['case'])}>{optionList(cases)}</select>
      </div>
      <div className="direction-field">
        <label htmlFor="studio-text-tracking-mode">字距</label>
        <select id="studio-text-tracking-mode" className="form-select" value={item.tracking === null ? 'auto' : 'custom'} onChange={event => set('tracking', event.target.value === 'auto' ? null : 0)}>
          <option value="auto">跟随方案</option><option value="custom">自定义</option>
        </select>
        <label htmlFor="studio-text-tracking" className="range-title studio-text-range-label" hidden={item.tracking === null}>字间距<output>{(item.tracking || 0).toFixed(3) + ' em'}</output></label>
        <input id="studio-text-tracking" className="form-range" type="range" min="-120" max="250" step="5" hidden={item.tracking === null} value={Math.round((item.tracking || 0) * 1000)} onChange={event => set('tracking', event.target.valueAsNumber / 1000)} />
      </div>
      <div className="studio-text-row">
        <div className="direction-field">
          <label htmlFor="studio-text-color-mode">文字颜色</label>
          <select id="studio-text-color-mode" className="form-select" value={item.colorMode} onChange={event => set('colorMode', event.target.value as TextStyle['colorMode'])}>
            <option value="auto">跟随方案</option><option value="custom">自定义颜色</option>
          </select>
        </div>
        <div className="direction-field" hidden={item.colorMode !== 'custom'}>
          <label htmlFor="studio-text-color">自定义颜色</label>
          <input id="studio-text-color" className="form-control form-control-color" type="color" value={item.color} onChange={event => set('color', event.target.value)} />
        </div>
      </div>
    </div>
    <details className="studio-subgroup" hidden={!story}>
      <summary>引导小字与辅助信息</summary>
      <p className="studio-note">以下只修改当前片头镜头。留空即可恢复资料里的内容。</p>
      <div className="direction-settings">
        {copyFields.map(([key, label, max]) => (
          <div className="direction-field" key={key}>
            <label htmlFor={'studio-text-' + key}>{label}</label>
            <input id={'studio-text-' + key} className="form-control" type="text" maxLength={max} value={story ? state.typography.copy[selected][key] : ''} onChange={event => setCopy(key, event.target.value)} />
          </div>
        ))}
      </div>
    </details>
    <button className="btn studio-text-reset" type="button" onClick={() => {
      const defaults = studioTypographySettings();
      state.typography[selected] = defaults[selected];
      if (story) state.typography.copy[selected] = defaults.copy[selected];
      update();
    }}>恢复当前文字默认</button>
    <p className="studio-note studio-text-font-note">英文字体随网页打包；中文使用系统字体。AE 打开时需要安装对应字体。</p>
  </>, group);
}
