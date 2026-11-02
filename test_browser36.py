from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
checks=[]
def check(name,action):
 try:
  action()
  checks.append((name,'PASS'))
 except Exception as exc:
  checks.append((name,'FAIL',str(exc)[:450]))
  print('FAIL',name,str(exc)[:300],flush=True)
def ensure(predicate,message='assertion failed'):
 assert predicate,message
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},accept_downloads=True)
 page.set_default_timeout(3500)
 errors=[];outbound=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda e:errors.append(e.text) if e.type=='error' else None)
 page.on('request',lambda r:outbound.append(r.url) if r.url.startswith(('https:','http:')) else None)
 page.evaluate("""() => {const db=new Map(); Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>db.has(k)?db.get(k):null,setItem:(k,v)=>db.setItem?.(k,v)??db.set(k,String(v)),removeItem:k=>db.delete(k)}})}""")
 check('HTML carrega em contexto isolado',lambda:(page.set_content((root/'Inteligent_Hability_V3_6_Standalone.html').read_text('utf-8'),wait_until='load'),page.locator('#privacidade-inicial').wait_for(state='visible')))
 check('sem downloads de redes externas',lambda:ensure(not outbound,str(outbound)))
 check('modo sem salvar funciona',lambda:page.locator('#modo-temporario').click())
 def nav_click(n):page.locator(f'[data-view="{n}"]').click()
 for width in (320,390,768,1280):
  page.set_viewport_size({'width':width,'height':844})
  check(f'navegação biblioteca {width}px',lambda:(nav_click('biblioteca'),ensure(page.locator('#biblioteca-resultados .library-card').count()>3)))
  check(f'evita transbordamento horizontal {width}px',lambda:ensure(page.evaluate('document.documentElement.scrollWidth <= innerWidth+2')))
 page.set_viewport_size({'width':390,'height':844})
 def library():
  nav_click('biblioteca');page.locator('#faixa').select_option('11-12')
  page.locator('#biblioteca-busca').fill('biomas brasileiros')
  ensure(page.locator('.library-card').count()>=1)
  page.locator('.library-card').first.click()
  ensure('IBGE' in page.locator('#biblioteca-detalhe').inner_text())
  ensure(page.locator('.source-proof a').count()>=1)
  ensure('revisão humana' in page.locator('#biblioteca-detalhe').inner_text())
  page.locator('#biblioteca-estudar').click()
  ensure(page.locator('#tutor').is_visible());ensure('IBGE' in page.locator('#tutor-resposta').inner_text())
 check('biblioteca busca + detalhe + tutor fonte',library)
 def tutor_math():
  page.locator('#pergunta-tutor').fill('15% de 200');page.locator('#tutor-perguntar').click()
  ensure('30' in page.locator('#tutor-resposta').inner_text())
 check('tutor cálculo determinístico preservado',tutor_math)
 def tutor_privacy():
  page.locator('#pergunta-tutor').fill('meu email é teste@example.org');page.locator('#tutor-perguntar').click()
  ensure('teste@example.org' not in page.locator('#tutor-resposta').inner_text())
 check('tutor não ecoa email',tutor_privacy)
 for age in ('5-7','8-10','11-12'):
  page.locator('#faixa').select_option(age)
  check('tutor apresenta aula '+age,lambda:(nav_click('tutor'),ensure(len(page.locator('#tutor-aula').inner_text())>30)))
  check('novo quiz '+age,lambda:(nav_click('desafios'),ensure(page.locator('#quiz-conteudo [data-answer]').count()>=3)))
  check('laboratório '+age,lambda:(nav_click('laboratorio'),ensure(page.locator('#lab-projeto option').count()>=8)))
  check('missões '+age,lambda:(nav_click('missoes'),ensure(page.locator('#missao-escolha option').count()>=5)))
 check('arquivos sem erros JS',lambda:ensure(not errors,str(errors)))
 check('navegação não disparou rede',lambda:ensure(not outbound,str(outbound)))
 page.set_viewport_size({'width':390,'height':840});nav_click('biblioteca');page.screenshot(path=str(root/'qa'/'biblioteca_390.png'),full_page=True)
 browser.close()
(root/'qa'/'browser36_results.json').write_text(json.dumps({'tests':checks,'passed':sum(x[1]=='PASS' for x in checks),'failed':sum(x[1]=='FAIL' for x in checks),'errors':errors,'external_requests':outbound},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'passed':sum(x[1]=='PASS' for x in checks),'failed':sum(x[1]=='FAIL' for x in checks),'errors':errors[:4]},ensure_ascii=False))
if any(x[1]=='FAIL' for x in checks):raise SystemExit(1)
