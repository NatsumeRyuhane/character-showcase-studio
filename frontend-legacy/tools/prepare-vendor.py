"""One-time vendor refresh. The built application never calls the network."""
from pathlib import Path
from urllib.request import Request, urlopen
import re, json

root = Path(__file__).resolve().parents[1]
sources = {}

def fetch(url):
    request = Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'})
    with urlopen(request, timeout=45) as response:
        return response.read()

def save(relative, url):
    target = root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(fetch(url))
    sources[relative] = url
    print(relative, target.stat().st_size)

save('vendor/floating-ui-core.min.js', 'https://unpkg.com/@floating-ui/core@1.7.3/dist/floating-ui.core.umd.min.js')
save('vendor/floating-ui-dom.min.js', 'https://unpkg.com/@floating-ui/dom@1.7.4/dist/floating-ui.dom.umd.min.js')
save('vendor/lucide.js', 'https://unpkg.com/lucide@1.17.0/dist/umd/lucide.js')
save('vendor/FLOATING-UI-LICENSE.txt', 'https://unpkg.com/@floating-ui/core@1.7.3/LICENSE')
save('vendor/LUCIDE-LICENSE.txt', 'https://unpkg.com/lucide@1.17.0/LICENSE')
save('vendor/JSBARCODE-LICENSE.txt', 'https://raw.githubusercontent.com/lindell/JsBarcode/v3.12.1/MIT-LICENSE.txt')
save('vendor/QRCODE-LICENSE.txt', 'https://raw.githubusercontent.com/kazuhikoarase/qrcode-generator/master/LICENSE')

families = [
    ('barlowcondensed', 'Barlow+Condensed:ital,wght@0,600;0,800;1,800'),
    ('cormorantgaramond', 'Cormorant+Garamond:ital,wght@0,600;1,600'),
    ('manrope', 'Manrope:wght@500;700;800'),
    ('nunito', 'Nunito:wght@600;800;900'),
    ('spacegrotesk', 'Space+Grotesk:wght@500;600;700'),
]
styles = []
for family, query in families:
    css_url = 'https://fonts.googleapis.com/css2?family=' + query + '&display=swap'
    css = fetch(css_url).decode('utf-8')
    # Keep Latin and Latin-ext. Chinese typography uses a documented system fallback.
    blocks = re.findall(r'/\* (.*?) \*/\s*(@font-face\s*\{.*?\})', css, re.S)
    selected = [(subset, block) for subset, block in blocks if subset in ['latin', 'latin-ext']]
    if not selected: raise RuntimeError('No Latin font blocks found: ' + family)
    downloaded = {}
    for index, (subset, block) in enumerate(selected):
        url = re.search(r'url\(([^)]+)\)', block).group(1)
        if url not in downloaded:
            filename = f'{family}-{index}.woff2'
            save('assets/fonts/' + filename, url)
            downloaded[url] = filename
        block = block.replace(url, downloaded[url])
        styles.append(f'/* {family}: {subset} */\n{block}')
    save(f'assets/fonts/{family}-OFL.txt', f'https://raw.githubusercontent.com/google/fonts/main/ofl/{family}/OFL.txt')
(root / 'assets/fonts/fonts.css').write_text('\n\n'.join(styles), encoding='utf-8')
(root / 'vendor/SOURCES.json').write_text(json.dumps(sources, ensure_ascii=False, indent=2), encoding='utf-8')
