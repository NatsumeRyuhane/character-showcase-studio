// Output dialog: OBS / AE settings and the export requests to the shell.
// Clean-output mode and the exported page's keyboard shortcuts live in studio-output.js.
import { useImperativeHandle, useRef, useState, type KeyboardEvent, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { images, state, update } from '../exploration-full-logic.js';
import { collectStudioAEScene } from '../ae-export.js';
import { studioOutputDimensions, studioOutputPayload, type OutputKind } from '../output-payload.ts';
import type { OutputSettings } from '../studio-state.ts';
import { setStudioCleanOutput } from '../studio-output.js';
import { outputSummary, resolutionLabel, type OutputMode } from './format.ts';
import { useEditorRevision } from './store.ts';

interface PreparedAE { scene: { layers: unknown[]; geometry: unknown[] }; [key: string]: unknown }
type Download = (payload: unknown) => Promise<{ filename: string }>;
interface View { section: HTMLElement }

const downloadLabel = () => state.output.obsLayers === 'separate' ? '下载 OBS 三层输出包' : '下载 OBS 输出包';

export interface OutputDialogHandle { open(): void }

// The header's output button opens the dialog through `ref`.
export function OutputDialog({ ref, root, views }: { ref: Ref<OutputDialogHandle>; root: Element; views: View[] }) {
  useEditorRevision();
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<OutputMode>('obs');
  const [prepared, setPrepared] = useState<PreparedAE | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const separate = mode === 'obs' && state.output.obsLayers === 'separate';
  useImperativeHandle(ref, () => ({
    open() {
      setStatus('');
      setPrepared(null);
      dialog.current?.showModal();
    },
  }), []);

  function change<K extends keyof OutputSettings>(key: K, value: OutputSettings[K]) {
    state.output = { ...state.output, [key]: value };
    setPrepared(null);
    setStatus('');
    update();
  }
  function switchMode(next: OutputMode) {
    setMode(next);
    setPrepared(null);
    setStatus('');
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const next = mode === 'obs' ? 'ae' : 'obs';
    switchMode(next);
    dialog.current?.querySelector<HTMLElement>(`[data-output-tab="${next}"]`)?.focus();
  }
  async function exportDesign(kind: OutputKind | 'ae') {
    if (busy) return;
    setBusy(true);
    try {
      const download = (globalThis as { downloadStudioOutput?: Download }).downloadStudioOutput;
      if (!download) throw new Error('请从完整本地工作台打开此功能。');
      if (kind === 'ae' && !prepared) {
        setStatus('正在生成原生图层与圆环关键帧…');
        const [width, height] = studioOutputDimensions(state);
        const scene = await collectStudioAEScene(views.find(view => !view.section.hidden), {
          width, height, fps: state.output.fps, includeIntro: state.output.aeIntro,
          transparent: state.output.transparent, includeCharacters: state.output.includeCharacters,
        }) as PreparedAE;
        setPrepared(scene);
        setStatus('模板已就绪：' + scene.scene.layers.length + ' 个信息图层 / ' + scene.scene.geometry.length + ' 组可编辑几何。点击「下载 AE 模板」保存 ZIP。');
        return;
      }
      setStatus('正在打包下载…');
      // A second deliberate click downloads an asynchronously prepared AE package.
      // This preserves the sandbox user-activation boundary even for large assets.
      const result = await download(kind === 'ae' ? { kind, ...prepared } : studioOutputPayload(state, images, kind));
      setStatus('已发起下载：' + result.filename + '。请查看浏览器下载列表。');
    } catch (error) {
      setStatus('导出未完成：' + (error as Error).message);
      if (kind === 'ae') setPrepared(null);
    } finally {
      setBusy(false);
    }
  }

  const generating = busy && mode === 'ae' && !prepared;
  const primaryLabel = mode === 'ae' ? (prepared ? '下载 AE 模板' : generating ? '生成中…' : '生成 AE 模板') : downloadLabel();
  const tab = (key: OutputMode, label: string) => (
    <button type="button" role="tab" id={'output-tab-' + key} aria-controls={'output-panel-' + key} aria-selected={mode === key}
      tabIndex={mode === key ? 0 : -1} data-output-tab={key} disabled={busy} onClick={() => switchMode(key)} onKeyDown={tabKey}>{label}</button>
  );
  return createPortal(
      <dialog ref={dialog} className="studio-output-dialog" aria-labelledby="studio-output-heading">
        <div className="studio-output-heading"><div><span className="studio-kicker">EXPORT STUDIO</span><h2 id="studio-output-heading">把设计带到下一站</h2></div></div>
        <div className="studio-output-tabs" role="tablist" aria-label="输出用途">{tab('obs', 'OBS 纯画面')}{tab('ae', 'AE 可编辑模板')}</div>
        <div className="studio-output-panel" id="output-panel-obs" role="tabpanel" aria-labelledby="output-tab-obs" data-output-panel="obs" hidden={mode !== 'obs'}>
          <p><strong>只把展示页面送进 OBS。</strong><br />下载后添加为「浏览器」源。无需将浏览器窗口全屏，也不会录入编辑面板和地址栏。</p>
        </div>
        <div className="studio-output-panel" id="output-panel-ae" role="tabpanel" aria-labelledby="output-tab-ae" data-output-panel="ae" hidden={mode !== 'ae'}>
          <p><strong>文字、角色、圆环、滤镜与边框分层编辑。</strong><br />下载 ZIP，在 AE 运行导入脚本，即可另存为可编辑 .aep。绿色 MODEL / REPLACE 容器用于替换角色素材，紫色 FX 图层用于修改后处理。</p>
          <p>片头素材与字幕一起经过滤镜，展示角色位于滤镜上方。边框始终独立；即使没有上传角色图，也会保留空素材容器。</p>
          <p>滤镜使用 AE 内置效果与矢量近似；复杂渐变、金属、云雾与细毛会简化，不逐像素还原。桌面未安装的字体会被 AE 替代。</p>
        </div>
        <div className="studio-output-fields">
          <div className="direction-field studio-output-wide" data-obs-field="" hidden={mode !== 'obs'}>
            <label htmlFor="studio-output-layers">OBS 输出结构</label>
            <select id="studio-output-layers" className="form-select" disabled={busy} value={state.output.obsLayers || 'combined'} onChange={event => change('obsLayers', event.target.value as OutputSettings['obsLayers'])}>
              <option value="combined">一体网页源 · 一次导入完整画面</option>
              <option value="separate">三层网页源 · 画面 + 光效 + 边框</option>
            </select>
            <small>三层输出方便在 OBS 中自由叠放角色素材。</small>
          </div>
          <div className="direction-field">
            <label htmlFor="studio-output-resolution">输出尺寸</label>
            <select id="studio-output-resolution" className="form-select" disabled={busy} value={state.output.resolution} onChange={event => change('resolution', event.target.value as OutputSettings['resolution'])}>
              <option value="1080">{resolutionLabel(state, '1080')}</option>
              <option value="2160">{resolutionLabel(state, '2160')}</option>
            </select>
          </div>
          <div className="direction-field" data-obs-field="" hidden={mode !== 'obs'}>
            <label htmlFor="studio-output-start">打开时从哪里开始</label>
            <select id="studio-output-start" className="form-select" disabled={busy} value={state.output.start} onChange={event => change('start', event.target.value as OutputSettings['start'])}>
              <option value="intro">完整片头 → 展示 → 已启用的片尾</option>
              <option value="show">直接展示（按片尾设置）</option>
            </select>
          </div>
          <div className="direction-field" data-obs-field="" hidden={mode !== 'obs'}>
            <label htmlFor="studio-output-fit">画幅不同时如何适配</label>
            <select id="studio-output-fit" className="form-select" disabled={busy} value={state.output.fit} onChange={event => change('fit', event.target.value as OutputSettings['fit'])}>
              <option value="contain">完整显示 · 可能留边</option>
              <option value="cover">铺满裁切 · 可能裁边</option>
            </select>
          </div>
          <div className="direction-field" data-ae-field="" hidden={mode !== 'ae'}>
            <label htmlFor="studio-output-fps">AE 帧率</label>
            <select id="studio-output-fps" className="form-select" disabled={busy} value={String(state.output.fps)} onChange={event => change('fps', +event.target.value as OutputSettings['fps'])}>
              <option value="30">30 fps</option>
              <option value="60">60 fps</option>
            </select>
          </div>
        </div>
        <p className="studio-note">1080p 与 4K 使用相同排版。4K 仅提高清晰度，文字、标识、圆环和边框占比保持一致。</p>
        <div className="studio-output-checks">
          <label className="form-check"><input className="form-check-input" type="checkbox" id="studio-output-transparent" disabled={busy} checked={state.output.transparent} onChange={event => change('transparent', event.target.checked)} /><span>透明底 · 用于叠加</span></label>
          <label className="form-check"><input className="form-check-input" type="checkbox" id="studio-output-characters" disabled={busy} checked={state.output.includeCharacters} onChange={event => change('includeCharacters', event.target.checked)} /><span>包含角色预览图片</span></label>
          <label className="form-check" data-ae-field="" hidden={mode !== 'ae'}><input className="form-check-input" type="checkbox" id="studio-output-ae-intro" disabled={busy} checked={state.output.aeIntro} onChange={event => change('aeIntro', event.target.checked)} /><span>包含引入页动画</span></label>
        </div>
        <div className="studio-output-summary" data-output-summary="">{outputSummary(state, mode)}</div>
        <div className="studio-output-layer-guide" data-layer-guide="" hidden={!separate}>
          <strong>OBS 图层顺序 · 从上到下</strong>
          <ol><li><span>03</span> 边框 <small>始终清晰，独立编辑</small></li><li><span>02</span> 光效 <small>透明的扫描线、波纹与炫光</small></li><li><span>01</span> 画面 <small>背景、文字与预览素材</small></li></ol>
          <p>外部角色素材：开场放在「光效」下方，展示页放在「光效」上方、边框下方。运行 START-LAYERS.cmd 打开同步控制页，统一重播、暂停或切换镜头。首次使用需要 Node.js 18 或更新版本。</p>
          <p>光效源仅作透明叠加，无法读取其他 OBS 源的像素。真正的辉光、色散与画面变形保留在「画面」源内；外部角色需要这类处理时，请在 OBS 或 AE 中添加。</p>
        </div>
        <p className="studio-output-preview-note" data-obs-field="" hidden={mode !== 'obs'}>「单独 HTML」导出完整自动流程：从片头开始，按设定时长播放展示和已启用的片尾；关闭片尾时持续展示或循环。起点和手动片尾选项仅用于 OBS 输出包。</p>
        <details className="studio-output-guide" data-obs-field="" hidden={mode !== 'obs'}>
          <summary>OBS 导入方式 / Spout2</summary>
          <ol><li>下载输出包并完整解压，双击 PREPARE-OBS.cmd 生成场景文件。</li><li>OBS「场景集合 → 导入」选择生成的 IMPORT-IN-OBS.json。</li><li>OBS「设置 → 视频」基础画布设为上方所示尺寸；场景集合不会可靠地修改全局视频设置。</li></ol>
          <p data-output-import-guide="">{separate
            ? '三层模式请先运行 START-LAYERS.cmd，再导入生成的场景文件。若手动添加，请使用服务生成的网页地址，并保持三个源宽高一致。'
            : '也可手动添加浏览器源 → 本地文件 → output.html，宽高与输出尺寸相同。不要使用窗口捕获。'}</p>
          <p>若需要 Spout2，可在 OBS 中为各浏览器源添加 obs-spout2-plugin 的 Spout Filter。网页自身不直接发送 Spout2。</p>
          <p>快捷键：空格暂停 / 继续，R 重播引入页，S 跳至展示，E 进入片尾（OBS 中先打开源的「交互」）。</p>
        </details>
        <details className="studio-output-guide" data-ae-field="" hidden={mode !== 'ae'}>
          <summary>AE 导入与编辑</summary>
          <ol><li>先生成模板，再点击「下载 AE 模板」。解压 ZIP，保持 assets 素材文件夹完整。</li><li>AE「文件 → 脚本 → 运行脚本文件」选择 IMPORT_TO_AE.jsx。</li><li>打开 01 MAIN，在 CONTROLS 调颜色与动效；各合成内可继续编辑文字、路径和素材，最后保存为 .aep。</li></ol>
          <p>转场可以在 AE 继续调整：Show Transition Start / Duration 控制圆环与大字过渡，Information Start / Fade Duration 控制信息入场，Ending Start / Transition Duration 控制进入片尾。单位均为秒，不改变圆环旋转速度。</p>
          <p>老电视关机的亮线、光点、余辉和遮罩是独立图层；边框始终独立。改变转场参数不会自动延长合成总时长。</p>
          <p>这会添加独立文件夹与合成，不关闭已有项目。模板使用当前设置的片头、展示时长，以及已启用的品牌片尾与关机动画。</p>
        </details>
        <p className="studio-output-status" role="status" aria-live="polite">{status}</p>
        <div className="studio-output-footer">
          <button className="btn" type="button" data-output-close="" disabled={busy} onClick={() => dialog.current?.close()}>返回编辑</button>
          <button className="btn" type="button" data-output-preview="" hidden={mode !== 'obs'} onClick={() => {
            dialog.current?.close();
            setStudioCleanOutput(true);
          }}>预览纯画面</button>
          <button className="btn" type="button" hidden={mode !== 'obs'} disabled={busy} onClick={() => exportDesign('html')}>单独 HTML</button>
          <button className="btn btn-primary" type="button" data-output-download="" disabled={busy} onClick={() => exportDesign(mode)}>{primaryLabel}</button>
        </div>
      </dialog>, root);
}
