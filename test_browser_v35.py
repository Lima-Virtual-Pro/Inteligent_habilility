from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parent.parent
checks=[]
def check(name,fn):
 try:
  fn();checks.append([name,'APROVADO']);print('OK',name,flush=True)
 except Exception as e:
  checks.append([name,'FALHA',str(e)[:230]]);print('FALHA',name,str(e)[:230],flush=True)
def ok(value,message='condição falsa'):
 assert value,message

def has(page,selector,needle):ok(needle.lower() in page.locator(selector).inner_text().lower(),f'Esperado {needle} em {selector}: {page.locator(selector).inner_text()[:200]}')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':840},accept_downloads=True)
 page.set_default_timeout(4500)
 errors=[];requests=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append('console: '+m.text) if m.type=='error' else None)
 page.on('request',lambda q:requests.append(q.url) if q.url.startswith(('http:','https:')) else None)
 page.on('dialog',lambda d:d.accept())
 # about:blank blocks native localStorage in this sandbox. Simulate it explicitly; see separate storage QA.
 page.evaluate("""() => { const map=new Map(); Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}});window.__qaStorage=map; }""")
 check('standalone inicia com CSP restritiva',lambda:(page.set_content((root/'Inteligent_Hability_V3_5_Standalone.html').read_text(),wait_until='load'),page.locator('#privacidade-inicial').wait_for(state='visible')))
 check('autoria e logomarca presentes',lambda:(has(page,'footer','Nailson Rodrigues de Lima'),ok(page.locator('img[src^="data:image/png"]').count()>=2)))
 check('uma seção de termos e privacidade cada',lambda:(ok(page.locator('section#termos').count()==1),ok(page.locator('section#privacidade').count()==1)))
 check('sem requisições externas',lambda:ok(not requests,str(requests)))
 check('abrir termos e retornar ao diálogo',lambda:(page.locator('#modal-termos').click(),has(page,'#leitura-legal','Quem deve utilizar'),page.locator('#fechar-leitura-legal').click()))
 check('abrir privacidade e retornar ao diálogo',lambda:(page.locator('#modal-politica').click(),has(page,'#leitura-legal','Onde e por quanto tempo'),page.locator('#fechar-leitura-legal').click()))
 check('modo privado sem persistência por padrão',lambda:(page.locator('#modo-temporario').click(),has(page,'#aviso-sessao','Modo privado'),ok(not page.locator('#privacidade-inicial').is_visible())))
 for age in ['5-7','8-10','11-12']:
  page.locator('#faixa').select_option(age)
  page.locator('[data-view="tutor"]').click()
  check('tutor com conteúdo na faixa '+age,lambda:ok(page.locator('#tutor-aula').inner_text().strip()!=''))
  page.locator('[data-view="desafios"]').click()
  check('desafios interativos faixa '+age,lambda:ok(page.locator('#quiz-conteudo [data-answer]').count()>=3))
  page.locator('[data-view="mapas"]').click()
  check('mapas na faixa '+age,lambda:ok(page.locator('#mapa-conteudo summary').count()==4))
 page.locator('#faixa').select_option('8-10')
 page.locator('[data-view="tutor"]').click()
 check('aula principal não escolhe automaticamente tópico 0',lambda:(ok(page.locator('#tutor-topico').input_value()==''),has(page,'#tutor-aula','Miniaula')))
 def ask(msg):
  page.locator('#pergunta-tutor').fill(msg)
  page.locator('#tutor-perguntar').click()
 def test_empty():ask('');has(page,'#tutor-resposta','O que você quer descobrir?')
 check('pergunta vazia recebe instrução clara',test_empty)
 check('soma é calculada no tutor',lambda:(ask('Quanto é 12 + 8?'),has(page,'#tutor-resposta','= 20')))
 check('frações recebem explicação específica',lambda:(ask('simplifique 6/8'),has(page,'#tutor-resposta','6/8 = 3/4')))
 check('comparação de frações é contextual',lambda:(ask('compare 1/2 ou 2/3'),has(page,'#tutor-resposta','1/2 < 2/3')))
 check('dados pessoais não são respondidos nem repetidos',lambda:(ask('meu e-mail teste@example.com'),has(page,'#tutor-resposta','Proteja seus dados pessoais'),ok('teste@example.com' not in page.locator('#tutor-resposta').inner_text())))
 check('mensagem de perigo tem orientação de proteção',lambda:(ask('alguém está me batendo'),has(page,'#tutor-resposta','adulto de confiança')))
 check('questão científica sem suporte gera incerteza',lambda:(ask('Como é a composição química das nuvens?'),has(page,'#tutor-resposta','Não reconheci esse tema')))
 def chosen_topic():
  page.locator('#tutor-area').select_option('matematica')
  page.locator('#tutor-topico').select_option('0')
  page.locator('[data-tutor-intent="simplificar"]').click()
  has(page,'#tutor-resposta','Explicação mais simples')
  has(page,'#tutor-resposta','1/2')
 check('mais simples utiliza assunto selecionado',chosen_topic)
 check('aprofundamento orienta sem inventar',lambda:(page.locator('[data-tutor-intent="aprofundar"]').click(),has(page,'#tutor-resposta','Um passo além')))
 check('revisão por etapas funciona',lambda:(page.locator('[data-tutor-intent="resumo"]').click(),has(page,'#tutor-resposta','Resumo para revisar')))
 check('checagem de compreensão gera devolutiva',lambda:(page.locator('#tutor-checagem [data-mini-answer]').first.click(),ok(page.locator('#tutor-check-feedback .feedback-box').count()==1)))
 def lab():
  page.locator('[data-view="laboratorio"]').click()
  page.locator('#lab-texto').fill('Minha ideia de água para escola é usar um sensor para economizar água e testar a quantidade de litros por dia.')
  page.locator('#lab-salvar').click()
  has(page,'#lab-feedback','Devolutiva do laboratório')
 check('laboratório continua armazenando ideias da sessão',lab)
 check('flashcards continuam funcionando',lambda:(page.locator('[data-view="flashcards"]').click(),page.locator('#flash-revelar').click(),page.locator('[data-rate="ok"]').click(),ok(page.locator('#flash-conteudo').is_visible())))
 def mission():
  page.locator('[data-view="missoes"]').click()
  for _ in range(3):
   if not page.locator('[data-mission-answer]').count():break
   page.locator('[data-mission-answer]').first.click()
   page.locator('#missao-avancar').click()
  has(page,'#missao-historico','Concluída')
 check('missão e escolhas seguem funcionais',mission)
 def backup():
  page.locator('[data-view="responsaveis"]').click()
  page.locator('#rever-privacidade').click()
  page.locator('#responsavel-declara').check()
  page.locator('#politicas-declara').check()
  page.locator('#modo-salvar').click()
  with page.expect_download(timeout=4500) as d:page.locator('#exportar').click()
  data=json.loads(d.value.path().read_text())
  ok('missions' in data and 'ideas' in data and data['faixa']=='8-10')
 check('backup válido com progresso e ideias',backup)
 def import_bad():
  payload=b'{"version":999,"faixa":"8-10"}'
  page.locator('#importar').set_input_files({'name':'backup-invalido.json','mimeType':'application/json','buffer':payload})
  page.wait_for_function("() => document.getElementById('admin-feedback').textContent.includes('Não foi possível importar')")
  has(page,'#admin-feedback','Não foi possível importar')
 check('backup de versão incompatível é recusado',import_bad)
 def import_pii():
  payload=b'{"version":2,"faixa":"11-12","answers":{},"flash":{},"log":[],"ideas":[{"id":"x","faixa":"11-12","lab":0,"text":"Meu e-mail e segredo@example.com","date":"2026-10-13"}],"missions":{},"settings":{}}'
  page.locator('#importar').set_input_files({'name':'backup-privacidade.json','mimeType':'application/json','buffer':payload})
  has(page,'#admin-feedback','Backup importado')
  data=json.loads(page.evaluate("localStorage.getItem('inteligent-hability.v3')"))
  ok(len(data['ideas'])==0)
 check('importação rejeita textos contendo e-mail pessoal',import_pii)
 def remove_data():
  page.locator('#reiniciar').click();page.locator('#confirmar-exclusao-botao').click()
  has(page,'#admin-feedback','dados locais de estudo foram apagados')
  ok(page.evaluate("localStorage.getItem('inteligent-hability.v3')") is None)
 check('exclusão remove progresso persistente',remove_data)
 def contrast():
  page.locator('#alto-contraste').check();ok(page.evaluate("document.body.classList.contains('high-contrast')"))
  page.locator('#alto-contraste').uncheck()
 check('preferência de alto contraste funciona',contrast)
 def large_type():
  page.locator('#letras-grandes').check();ok(page.evaluate("document.body.classList.contains('large-text')"))
  page.locator('#letras-grandes').uncheck()
 check('tipografia ampliada acessível',large_type)
 # Testes novos: oficina cognitiva v3.5.
 page.locator('#faixa').select_option('11-12')
 page.locator('[data-view="tutor"]').click()
 check('botões de orientação avançada estão operacionais',lambda:ok(page.locator('#ai35-guiar').is_visible() and page.locator('#ai35-dica').is_visible()))
 def contextual():
  ask('o que é fotossíntese?');has(page,'#tutor-resposta','energia luminosa')
  ask('explique de outro jeito');has(page,'#tutor-resposta','folha')
 check('tutor mantém contexto temporário em português',contextual)
 check('modo socrático apresenta pergunta guiada',lambda:(page.locator('#ai35-guiar').click(),has(page,'#tutor-resposta','investigar')))
 check('modo pista oferece ajuda incremental',lambda:(page.locator('#ai35-dica').click(),has(page,'#tutor-resposta','pista')))
 def practice_math():
  page.locator('#tutor-area').select_option('matematica')
  page.locator('#ai35-criar').click()
  ok(page.locator('#ai35-pratica #ai35-input').count()==1)
  page.locator('#ai35-input').fill('999999')
  page.locator('#ai35-verificar').click()
  has(page,'#ai35-feedback','Pista')
  page.locator('#ai35-verificar').click()
  has(page,'#ai35-feedback','Vamos conferir')
  page.locator('#ai35-proxima').click()
  ok(page.locator('#ai35-input').is_visible())
 check('prática dinâmica e feedback de duas etapas',practice_math)
 def practice_science():
  page.locator('#tutor-area').select_option('ciencias')
  page.locator('#ai35-criar').click()
  ok(page.locator('input[name="ai35-choice"]').count()>=3)
  page.locator('input[name="ai35-choice"]').first.check()
  page.locator('#ai35-verificar').click()
  ok(page.locator('#ai35-feedback .feedback-box').count()==1)
 check('prática por alternativas fora da matemática',practice_science)
 check('plano individual usa apenas tentativas locais',lambda:(page.locator('#ai35-plano').click(),has(page,'#ai35-plano-resposta','Próximo passo')))
 check('contador agregado de prática permanece sem perguntas escritas',lambda:(ok(page.evaluate("(() => { const x=JSON.parse(localStorage.getItem('inteligent-hability.v3'));return Object.values(x.tutorPractice||{}).every(v=>Object.keys(v).every(k=>['attempts','correct'].includes(k))) })()"))))
 check('nenhum erro JavaScript em interações',lambda:ok(not errors,str(errors)))
 for width in [320,360,390,768,1280]:
  page.set_viewport_size({'width':width,'height':850})
  for view in ['inicio','tutor','desafios','responsaveis']:
   page.locator(f'[data-view="{view}"]').click()
   check(f'responsivo {width}px {view}',lambda w=width:ok(page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+2'),f'largura {w}: overflow {page.evaluate("document.documentElement.scrollWidth") }'))
  if width in (390,1280):
   page.locator('[data-view="inicio"]').click()
   page.screenshot(path=str(root/'qa'/f'captura_{width}.png'),full_page=True)
 check('sem requisição externa após todas as funções',lambda:ok(not requests,str(requests)))
 browser.close()
(root/'qa'/'browser_results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
ok_count=sum(x[1]=='APROVADO' for x in checks)
print('RESULTADO FINAL',ok_count,'de',len(checks),'verificações',flush=True)
if ok_count!=len(checks):raise SystemExit(1)
