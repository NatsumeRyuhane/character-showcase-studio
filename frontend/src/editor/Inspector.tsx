// Right pane: the current design's look. Every design section gets its own inspector, so each
// keeps its open groups and scroll position; only the visible one re-renders on a change.
import { memo, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { badgeColors, state, update } from '../exploration-full-logic.js';
import { palettes, type DesignKey, type EdgeSide, type VariantSettings } from '../studio-state.ts';
import { optionList, type Options } from './controls.tsx';
import { useEditorRevision } from './store.ts';

type Variant = VariantSettings;

const paletteOptions: Options = [['acid', '酸性黄绿'], ['red', '叛逆绯红'], ['blue', '电子钴蓝'], ['pink', '电波粉紫'], ['orange', '信号橙'], ['champagne', '香槟矿金'], ['lavender', '雾绒薰紫'], ['oat', '暖燕麦棕'], ['coral', '软糖珊瑚'], ['ink', '墨蓝贴纸'], ['custom', '自定义色']];
const typefaces: Options = [['editorial', '窄体刊物 · 有力而克制'], ['grotesk', '几何无衬线 · 精简现代'], ['serif', '优雅衬线 · 时尚刊物'], ['rounded', '柔软圆体 · 亲和可爱'], ['classic', '经典粗斜体']];
const patterns: Options = [['mesh', '透视柔网'], ['dots', '立体点云'], ['ripple', '渐隐波纹'], ['grid', '微动平面网格'], ['none', '留白背景']];
const grades: Options = [['original', '原色'], ['chrome', '银盐 · 低饱和高反差'], ['cold', '冷感 · 蓝调印刷'], ['warm', '暖调 · 奶油胶片'], ['faded', '褪色 · 雾面杂志'], ['vivid', '鲜明 · 电波糖果']];
const gradients: Options = [['none', '关闭'], ['spotlight', '边缘微光'], ['diagonal', '对角双色'], ['halo', '环心色晕'], ['aurora', '流动极光']];

const percent = (value: number) => (Number.isInteger(value) ? value : value.toFixed(1)) + '%';
const group = (title: string, children: ReactNode, open = false, name?: string) => (
  <details className="studio-group" open={open} data-studio-group={name}><summary className="cursor-interaction">{title}</summary>{children}</details>
);
const field = (label: string, control: ReactNode) => <div className="direction-field"><label>{label}{control}</label></div>;
const note = (text: string) => <p className="studio-note">{text}</p>;

function Controls({ v }: { v: Variant }) {
  const e = v.effects;
  const select = (key: 'palette' | 'background' | 'typeface' | 'pattern' | 'textMotionStyle' | 'badgePalette' | 'badgeStyle', aria: string, options: ReactNode, disabled = false) => (
    <select className="form-select" aria-label={aria} disabled={disabled} value={v[key]} onChange={event => {
      (v as unknown as Record<string, string>)[key] = event.target.value;
      if (key === 'palette' && event.target.value !== 'custom') v.accent = palettes[event.target.value as keyof typeof palettes];
      update();
    }}>{options}</select>
  );
  const effectSelect = (key: 'grade' | 'gradient' | 'shadowStyle', aria: string, options: ReactNode, disabled = false) => (
    <select className="form-select" aria-label={aria} disabled={disabled} value={e[key]} onChange={event => { (e as unknown as Record<string, string>)[key] = event.target.value; update(); }}>{options}</select>
  );
  const range = (target: 'v' | 'e', key: string, label: string, min: number, max: number, step: number, factor = 100, aria = label, disabled = false) => {
    const record = (target === 'v' ? v : e) as unknown as Record<string, number>, value = record[key] * factor;
    const shown = factor === 1 ? value.toFixed(2) + '×' : percent(value);
    return (
      <div className="direction-field" key={key}>
        <label className="range-title">{label}<output>{shown}</output></label>
        <input className="form-range" type="range" min={min} max={max} step={step} value={value} aria-label={aria} disabled={disabled}
          onChange={event => { record[key] = Number(event.target.value) / factor; update(); }} />
      </div>
    );
  };
  const check = (target: 'v' | 'e' | 's', key: string, label: string, toggle = false, disabled = false) => {
    const record = (target === 'v' ? v : target === 'e' ? e : v.shadows) as unknown as Record<string, boolean>;
    return (
      <label className={'form-check' + (toggle ? ' form-switch' : '')} key={key}>
        <input className="form-check-input" type="checkbox" disabled={disabled} checked={!!record[key]} onChange={event => { record[key] = event.target.checked; update(); }} />
        <span className="form-check-label">{label}</span>
      </label>
    );
  };
  const color = (target: 'v' | 'e', key: 'accent' | 'badgeColor' | 'badgeInk' | 'gradientColor' | 'shadowColor', label: string, aria: string, disabled = false) => {
    const [badgeColor, badgeInk] = badgeColors(v);
    const value = key === 'badgeColor' ? badgeColor : key === 'badgeInk' ? badgeInk : target === 'v' ? v[key as 'accent'] : e[key as 'gradientColor'];
    return field(label, <input className="form-control form-control-color" type="color" aria-label={aria} disabled={disabled} value={value} onChange={event => {
      if (target === 'e') e[key as 'gradientColor' | 'shadowColor'] = event.target.value;
      else {
        if (key === 'accent') v.palette = 'custom';
        else if (v.badgePalette !== 'custom') { [v.badgeColor, v.badgeInk] = badgeColors(v); v.badgePalette = 'custom'; }
        v[key as 'accent' | 'badgeColor' | 'badgeInk'] = event.target.value;
      }
      update();
    }} />);
  };
  const noPattern = !v.grid || v.pattern === 'none', noShadow = !e.shadowEnabled, noGrade = !e.gradeEnabled, noGradient = e.gradient === 'none';
  return <>
    {group('配色与字体', <div className="direction-settings">
      {field('点缀配色', select('palette', '点缀配色', optionList(paletteOptions)))}
      {field('背景', select('background', '背景', <><option value="light">浅色 · 奶油纸</option><option value="dark">深色 · 夜幕黑</option></>))}
      {color('v', 'accent', '自定义点缀色', '自定义点缀色')}
      {field('标题字体', select('typeface', '标题字体', optionList(typefaces)))}
    </div>, true)}
    {group('圆环与几何', <>
      <div className="direction-settings">
        {field('几何样式', <select className="form-select" aria-label="环形与几何" value={v.geometryBySeries[state.series]} onChange={event => { v.geometryBySeries[state.series] = event.target.value as Variant['geometryBySeries'][typeof state.series]; update(); }}>
          <optgroup label="新构图"><option value="signature">此构图的推荐设计</option><option value="orbit">交错轨道</option><option value="slices">偏心切片</option><option value="wave">同心共振</option><option value="flow">开放流线</option></optgroup>
          <optgroup label="原版系列设计"><option value="facet">折面切框 · ATELIER</option><option value="ribbon">柔波缎环 · FUR</option><option value="blocks">玩趣积木 · MINI</option></optgroup>
          <optgroup label="经典设计"><option value="ring">极简圆环</option><option value="burst">放射碎片</option><option value="cut">切角星环</option><option value="rays">放射星芒</option><option value="none">留白 · 无几何</option></optgroup>
        </select>)}
        {range('v', 'ringScale', '几何大小 · 可超出画面', 60, 240, 1, 100, '几何大小')}
        {range('v', 'ringSpeed', '圆环／几何动画速度', 0, 3, 0.05, 1, '圆环动画速度')}
      </div>
      <details className="studio-group studio-subgroup"><summary className="cursor-interaction">线条与装饰细节</summary><div className="direction-settings">
        {range('v', 'geometryStrength', '线条粗细', 50, 150, 5, 100, '几何线条力度')}
        {range('v', 'cutStrength', '装饰丰富度', 0, 100, 5, 100, '装饰与构图力度')}
        {range('v', 'geometryOpacity', '几何装饰不透明度', 30, 100, 5)}
      </div></details>
    </>, true)}
    {group('动态背景', <>
      <div className="direction-settings">
        {field('背景图案', select('pattern', '背景图案', optionList(patterns)))}
        {range('v', 'gridOpacity', '背景图案强度', 2, 15, 0.5, 100, '背景图案强度', noPattern)}
        {range('v', 'gridMotion', '网格与波纹运动幅度', 0, 50, 2, 100, '网格与波纹运动幅度', noPattern || !v.gridMoving)}
      </div>
      <div className="direction-checks">{check('v', 'grid', '显示背景图案', true)}{check('v', 'gridMoving', '背景图案动态', true)}{check('v', 'parallax', '鼠标轻微视差')}</div>
    </>, false, 'background')}
    {group('文字与信息动效', <>
      <div className="direction-checks">{check('v', 'textMotion', '启用文字与信息动效', true)}</div>
      <div className="direction-settings">
        {field('文字动效风格', select('textMotionStyle', '文字动效风格', <><option value="refined">精致 · 错峰轻移</option><option value="soft">柔软 · 轻盈呼吸</option><option value="playful">俏皮 · 轻弹入场</option></>, !v.textMotion))}
        {range('v', 'textMotionAmount', '文字动效幅度', 0, 100, 5, 100, '文字动效幅度', !v.textMotion)}
        {range('v', 'textMotionSpeed', '文字动效速度', 0.25, 2, 0.05, 1, '文字动效速度', !v.textMotion)}
      </div>
    </>)}
    {group('标识外观', <>
      {note('添加或移除标识，请在左侧「交付格式与适配标识」勾选。')}
      <div className="direction-settings">
        {field('标识配色', select('badgePalette', '标识配色', <><option value="soft">柔和 · 随背景协调</option><option value="mono">经典 · 黑白</option><option value="custom">自定义双颜色</option></>))}
        {field('标识外观', select('badgeStyle', '标识外观', <><option value="filled">轻填充</option><option value="outline">细线框</option><option value="bare">仅图形与文字</option></>))}
        {color('v', 'badgeColor', '标识底色', '标识底色')}
        {color('v', 'badgeInk', '标识图形与文字色', '标识图形与文字色')}
        {range('v', 'badgeOpacity', '底色／线框不透明度', 20, 100, 5, 100, '标识底色不透明度')}
      </div>
    </>)}
    {group('阴影与空间层次', <>
      {check('e', 'shadowEnabled', '投影', true)}
      <div className="direction-settings">
        {field('投影风格', effectSelect('shadowStyle', '投影风格', <><option value="cut">利落 · 错位硬投影</option><option value="soft">柔和 · 悬浮层次</option></>, noShadow))}
        {color('e', 'shadowColor', '统一投影颜色', '统一投影颜色', noShadow)}
        {range('e', 'shadowStrength', '投影强度', 0, 100, 1, 100, '投影强度', noShadow)}
        {range('e', 'shadowDepth', '阴影偏移', 0, 200, 5, 100, '离地距离', noShadow)}
      </div>
      <div className="direction-checks">
        {check('s', 'title', '标题投影', false, noShadow)}{check('s', 'badges', '标识投影', false, noShadow)}{check('s', 'model', '角色投影', false, noShadow)}
        {check('s', 'geometry', '几何投影', false, noShadow)}{check('s', 'floor', '地面投影', false, noShadow)}
      </div>
    </>)}
    {group('滤镜与画面质感', <>
      <div className="direction-checks">{check('e', 'gradeEnabled', '启用影调', true)}{check('e', 'gradeModel', '角色图片跟随影调', false, noGrade)}</div>
      <div className="direction-settings">
        {field('影调风格', effectSelect('grade', '影调风格', optionList(grades), noGrade))}
        {range('e', 'gradeStrength', '影调强度', 0, 100, 1, 100, '影调强度', noGrade)}
        {field('背景渐变', effectSelect('gradient', '背景渐变', optionList(gradients)))}
        {range('e', 'gradientStrength', '渐变强度', 0, 60, 1, 100, '渐变强度', noGradient)}
        {color('e', 'gradientColor', '渐变第二色', '渐变第二色', noGradient)}
        {range('e', 'grain', '胶片颗粒', 0, 30, 1)}
        {range('e', 'vignette', '边缘暗角', 0, 60, 1)}
      </div>
      <div className="direction-checks">{check('e', 'titleGradient', '标题色块渐变')}{check('e', 'gradientMotion', '渐变缓慢流动', false, noGradient)}</div>
    </>)}
    {group('角色图片大小', <div className="direction-settings">{range('v', 'modelScale', '角色图片缩放', 75, 130, 1)}</div>)}
  </>;
}

// Border text and motion are shared by every design; they show in the visible inspector only.
function EdgeControls() {
  const vertical = state.frame === 'vertical';
  const direction = (side: EdgeSide, label: string) => (
    <div className="direction-field">
      <label htmlFor={'direction-edge-' + side}>{label}</label>
      <select className="form-select" id={'direction-edge-' + side} value={state.edges[side].direction} onChange={event => { state.edges[side].direction = event.target.value as 'negative'; update(); }}>
        <option value="negative">{vertical ? (side === 'top' ? '向下' : '向上') : '向左'}</option>
        <option value="positive">{vertical ? (side === 'top' ? '向上' : '向下') : '向右'}</option>
        <option value="still">静态排版</option>
      </select>
    </div>
  );
  const duration = (side: EdgeSide, label: string) => (
    <div className="direction-field">
      <label htmlFor={`direction-edge-${side}-duration`} className="range-title">{label}<output>{state.edges[side].duration + ' s'}</output></label>
      <input className="form-range" type="range" id={`direction-edge-${side}-duration`} min="12" max="90" step="1" value={state.edges[side].duration} onChange={event => { state.edges[side].duration = Number(event.target.value); update(); }} />
    </div>
  );
  const text = (key: 'topText' | 'bottomText', id: string, label: string) => (
    <div className="direction-field">
      <label htmlFor={id}>{label}</label>
      <input className="form-control" id={id} maxLength={60} value={state[key]} onChange={event => { state[key] = event.target.value; update(); }} />
    </div>
  );
  return (
    <div className="studio-shared-edges">
      <div className="direction-settings">
        {text('topText', 'direction-top-text', vertical ? '左边框文字' : '上边框文字')}
        {text('bottomText', 'direction-bottom-text', vertical ? '右边框文字' : '下边框文字')}
      </div>
      <div className="direction-settings">
        {direction('top', '上／左边框方向')}{direction('bottom', '下／右边框方向')}
        {duration('top', '上／左一轮时长')}{duration('bottom', '下／右一轮时长')}
      </div>
    </div>
  );
}

function DualControls({ v }: { v: Variant }) {
  return (
    <details className="studio-group" open>
      <summary className="cursor-interaction">双画面排版</summary>
      <div className="direction-settings">
        <div className="direction-field">
          <label className="range-title">特写画面占比<output>{percent((v.dualSplit ?? 0) * 100)}</output></label>
          <input className="form-range" type="range" min="35" max="60" step="1" value={(v.dualSplit ?? 0) * 100} aria-label="特写画面占比" onChange={event => { v.dualSplit = Number(event.target.value) / 100; update(); }} />
        </div>
      </div>
      <div className="direction-checks">
        <label className="form-check form-switch"><input className="form-check-input" type="checkbox" checked={!!v.dualGuides} onChange={event => { v.dualGuides = event.target.checked; update(); }} /><span className="form-check-label">显示画面指引</span></label>
      </div>
    </details>
  );
}

interface InspectorView { key: DesignKey; section: HTMLElement }

// `revision` changes only for the visible design, so hidden inspectors skip re-rendering.
const DesignInspector = memo(function DesignInspector({ view, active }: { view: InspectorView; active: boolean; revision: number }) {
  const v = state.variants[view.key];
  return createPortal(
    <aside className="studio-inspector" aria-label="当前方案画面样式">
      <div className="studio-panel-title"><h2>画面样式</h2><span className="studio-scope-label">仅当前方案</span></div>
      <div className="studio-active-design">{view.section.dataset.variant}</div>
      {note('视觉设置随方案保存；几何样式可按系列分别选择。')}
      {view.section.dataset.description ? note(view.section.dataset.description) : null}
      {view.key === 'dual' ? <DualControls v={v} /> : null}
      <Controls v={v} />
      <details className="studio-group" data-studio-group="edges" hidden={state.frame === 'none'}>
        <summary className="cursor-interaction">边框文字与滚动 · 全局</summary>
        {note('边框文字与滚动由所有方案共用，片头至片尾持续显示。AE 导出后，每侧边框的底板与文字可分别编辑。')}
        {active ? <EdgeControls /> : null}
      </details>
    </aside>, view.section);
});

export function Inspectors({ views }: { views: InspectorView[] }) {
  const revision = useEditorRevision();
  return <>{views.map(view => {
    const active = view.key === state.activeDesign;
    return <DesignInspector key={view.key} view={view} active={active} revision={active ? revision : 0} />;
  })}</>;
}
