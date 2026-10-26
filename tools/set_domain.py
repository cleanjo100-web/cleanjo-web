"""도메인(또는 GitHub Pages 주소)이 정해지면 한 번 실행하세요.
    python tools/set_domain.py https://cleanjo.co.kr
    python tools/set_domain.py https://아이디.github.io/cleanjo-web
- 모든 페이지 <head>에 canonical·og:url 을 넣고, og:image 와 구조화 데이터(JSON-LD)의 주소를 절대 주소로 바꿉니다.
- sitemap.xml 을 만들고 robots.txt 에 Sitemap 줄을 넣습니다.
여러 번 실행해도 됩니다(이전 값을 지우고 다시 씀)."""
import sys, re, json
from pathlib import Path
R = Path(__file__).resolve().parent.parent
base = sys.argv[1].rstrip('/') if len(sys.argv) > 1 else sys.exit(__doc__)
pages = sorted(p for p in R.glob('*.html'))
for p in pages:
    t = p.read_text(encoding='utf-8')
    url = base + '/' + ('' if p.name == 'index.html' else p.name)
    t = re.sub(r'\n<link rel="canonical"[^>]*>|\n<meta property="og:url"[^>]*>', '', t)
    t = re.sub(r'<meta property="og:image" content="[^"]*">', f'<meta property="og:image" content="{base}/images/og.jpg">', t)
    t = t.replace('<meta property="og:image"', f'<link rel="canonical" href="{url}">\n<meta property="og:url" content="{url}">\n<meta property="og:image"', 1)
    def ld(m):
        d = json.loads(m.group(1))
        if d.get('@type') == 'HomeAndConstructionBusiness':
            d.update({'url': base + '/', 'logo': base + '/images/logo/icon-512.png', 'image': base + '/images/og.jpg'})
        return '<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False) + '</script>'
    t = re.sub(r'<script type="application/ld\+json">(.*?)</script>', ld, t, flags=re.S)
    p.write_text(t, encoding='utf-8')
(R / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{base}/{"" if p.name == "index.html" else p.name}</loc></url>\n' for p in pages if p.name != '404.html')
    + '</urlset>\n', encoding='utf-8')
(R / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {base}/sitemap.xml\n', encoding='utf-8')
print('완료:', base, f'({len(pages)}개 페이지)')
