from pathlib import Path
from threading import Thread
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parent.parent
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(root)))
thread=Thread(target=server.serve_forever,daemon=True);thread.start()
checks=[];error=[]
def check(name,fn):
 try:fn();checks.append([name,'APROVADO']);print('PASS',name,flush=True)
 except Exception as e:checks.append([name,'FALHA',str(e)[:200]]);print('FALHA',name,str(e)[:200],flush=True)
def ok(v):assert v
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},accept_downloads=True)
 page.set_default_timeout(5000)
 page.on('pageerror',lambda e:error.append(str(e)))
 page.on('console',lambda m:error.append(m.text) if m.type=='error' else None)
 url=f'http://127.0.0.1:{server.server_port}/index.html'
 check('carrega index modular sob origem HTTP local',lambda:(page.goto(url,wait_until='load'),page.locator('#privacidade-inicial').wait_for(state='visible')))
 def temporary():
  page.locator('#modo-temporario').click()
  page.locator('[data-view="tutor"]').click()
  page.locator('#pergunta-tutor').fill('15% de 200')
  page.locator('#tutor-perguntar').click()
  ok('30' in page.locator('#tutor-resposta').inner_text())
  ok(page.evaluate("localStorage.getItem('inteligent-hability.v3')") is None)
 check('modo temporário não salva perguntas nem progresso',temporary)
 def enable_save():
  page.locator('[data-view="responsaveis"]').click()
  page.locator('#rever-privacidade').click()
  page.locator('#responsavel-declara').check()
  page.locator('#politicas-declara').check()
  page.locator('#modo-salvar').click()
  ok(page.evaluate("localStorage.getItem('inteligent-hability.privacy.v3')")=='allow')
 check('responsável pode optar por armazenamento local',enable_save)
 def persistent_practice():
  page.locator('#faixa').select_option('8-10')
  page.locator('[data-view="tutor"]').click()
  page.locator('#tutor-area').select_option('matematica')
  page.locator('#ai35-criar').click()
  page.locator('#ai35-input').fill('999999')
  page.locator('#ai35-verificar').click()
  saved=json.loads(page.evaluate("localStorage.getItem('inteligent-hability.v3')"))
  ok(saved['tutorPractice']['8-10:matematica']['attempts']==1)
  ok('999999' not in json.dumps(saved))
  ok('pergunta-tutor' not in json.dumps(saved))
 check('registra somente contadores agregados sem texto',persistent_practice)
 def reload_restore():
  page.reload(wait_until='load')
  ok(not page.locator('#privacidade-inicial').is_visible())
  ok(page.locator('#faixa').input_value()=='8-10')
  item=page.evaluate("JSON.parse(localStorage.getItem('inteligent-hability.v3')).tutorPractice['8-10:matematica']")
  ok(item['attempts']==1)
 check('recarregamento recupera contadores de prática',reload_restore)
 def copy_backup():
  page.locator('[data-view="responsaveis"]').click()
  with page.expect_download() as d:page.locator('#exportar').click()
  backup=json.loads(d.value.path().read_text())
  ok('tutorPractice' in backup)
 check('backup exporta dados agregados completos',copy_backup)
 def hardening():
  page.locator('#importar').set_input_files({'name':'nocivo.json','mimeType':'application/json','buffer':b'{"version":2,"tutorPractice":{"8-10:matematica":{"attempts":9999999,"correct":9999999},"__proto__":{"evil":true}},"faixa":"11-12"}'})
  page.wait_for_function("() => document.querySelector('#admin-feedback').textContent.includes('Backup importado')")
  x=json.loads(page.evaluate("localStorage.getItem('inteligent-hability.v3')"))
  ok(x['tutorPractice']['8-10:matematica']=={'attempts':10000,'correct':10000})
  ok('__proto__' not in x['tutorPractice'])
 check('backup limita valores e descarta chaves inesperadas',hardening)
 def clear():
  page.locator('#reiniciar').click()
  page.locator('#confirmar-exclusao-botao').click()
  ok(page.evaluate("localStorage.getItem('inteligent-hability.v3')") is None)
 check('exclusão remove progresso persistente',clear)
 check('sem exceções ou erros de execução',lambda:ok(len(error)==0))
 page.locator('[data-view="tutor"]').click()
 page.screenshot(path=str(root/'qa'/'tutor_390.png'),full_page=True)
 browser.close()
server.shutdown()
(root/'qa'/'real_origin_results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
print('TOTAL REAL',sum(x[1]=='APROVADO' for x in checks),'/',len(checks))
if any(x[1]=='FALHA' for x in checks):raise SystemExit(1)
