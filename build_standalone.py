from pathlib import Path
from bs4 import BeautifulSoup
import base64,hashlib
root=Path(__file__).resolve().parent
stand=BeautifulSoup((root/'index.html').read_text(encoding='utf-8'),'html.parser')
css=(root/'styles.css').read_text(encoding='utf-8')
style=stand.new_tag('style');style.string=css
stand.select_one('link[rel="stylesheet"]').replace_with(style)
for img in stand.find_all('img',src=True):
 source=img['src']
 if source.startswith('assets/'):
  img['src']='data:image/png;base64,'+base64.b64encode((root/source).read_bytes()).decode('ascii')
for icon in stand.select('link[rel="icon"]'):
 icon['href']='data:image/svg+xml;base64,'+base64.b64encode((root/'favicon.svg').read_bytes()).decode('ascii')
for tag in list(stand.find_all('script',src=True)):tag.decompose()
scripts=[]
for name in ('data.js','content36.js','tutor_data.js','enrich36.js','local_ai.js','knowledge_35.js','ai_35.js','sources36.js','source_ai36.js','app.js'):
 src=(root/name).read_text(encoding='utf-8').replace('</script','<\\/script')
 tag=stand.new_tag('script');tag.string=src
 stand.body.append(tag);scripts.append(src)
def sha(s):return "'sha256-"+base64.b64encode(hashlib.sha256(s.encode('utf-8')).digest()).decode('ascii')+"'"
policy=f"default-src 'none'; script-src {' '.join(map(sha,scripts))}; style-src {sha(css)}; img-src data:; font-src 'none'; connect-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
stand.find('meta',attrs={'http-equiv':'Content-Security-Policy'})['content']=policy
out=root/'Inteligent_Hability_V3_6_Standalone.html'
out.write_text('<!doctype html>\n'+str(stand.html),encoding='utf-8')
print(f'Gerado: {out.name}, {out.stat().st_size} bytes, CSP sha256: {len(scripts)+1} hashes')
