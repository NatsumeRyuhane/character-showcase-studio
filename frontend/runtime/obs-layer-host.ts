// Serialized only into the trusted host of a synchronized OBS layer. The
// sandbox keeps its original CSP; only this same-origin host talks to loopback.
// studio-output-host.ts inlines this function's source text into the exported
// page, so it must stay self-contained: no imports, no module-level helpers.
export function studioOBSLayerBootstrap(config: { layer: string; sync?: { key: string; endpoint?: string } }): void {
  const frame = document.getElementById('studio-output') as HTMLIFrameElement | null, sync = config.sync;
  if (!frame || !sync || !/^https?:$/.test(location.protocol)) return;
  let current: unknown = null, stopped = false;
  const send = () => {
    if (current) frame.contentWindow?.postMessage({ type: 'studio:layer-clock', key: sync.key, clock: current }, '*');
  };
  const endpoint = new URL(sync.endpoint || '/__studio_clock', location.href);
  if (endpoint.origin !== location.origin) return;
  endpoint.searchParams.set('key', sync.key);
  endpoint.searchParams.set('layer', config.layer);
  async function poll() {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        if (data.key === sync!.key && Number.isFinite(data.elapsed) && Number.isFinite(data.timestampMs) && typeof data.playing === 'boolean' && ['intro', 'show', 'ending'].includes(data.mode)) {
          current = data;
          send();
        }
      }
    } catch {}
    if (!stopped) setTimeout(poll, 180);
  }
  async function control(command: unknown) {
    if (!['restart', 'show', 'ending', 'pause', 'resume', 'stop'].includes(command as string)) return;
    try {
      const response = await fetch(new URL('/__studio_control', location.href), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: sync!.key, command }) });
      if (response.ok) {
        current = await response.json();
        send();
      }
    } catch {}
  }
  frame.addEventListener('load', send);
  addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.data?.key !== sync.key) return;
    if (event.data.type === 'studio:layer-ready') send();
    else if (event.data.type === 'studio:layer-command') control(event.data.command);
  });
  addEventListener('pagehide', () => {
    stopped = true;
  });
  poll();
}
