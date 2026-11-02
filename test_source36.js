'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const dir=path.resolve(__dirname,'..');
const files=['data.js','content36.js','tutor_data.js','enrich36.js','local_ai.js','knowledge_35.js','ai_35.js','sources36.js','source_ai36.js'];
const source=files.map(x=>fs.readFileSync(path.join(dir,x),'utf8')).join('\n')+'\n({base:IHAdvancedAI,query:IHSourceAI36,questions:QUESTION_BANK,topics:TUTOR_TOPICS,lessons:LESSONS,sources:IH_SOURCES36,facts:IH_FACTS36,catalog:IH_CATALOG36,missions:MISSIONS,labs:LABS})';
const o=vm.runInNewContext(source,{Intl,Math,console});
let passed=0,fail=[];
function test(desc,fn){try{fn();passed++}catch(e){fail.push([desc,e.message])}}
function ask(q,age='11-12',area='logica'){o.query.resetSession();return o.query.respond({text:q,age,area,topics:o.topics,lessons:o.lessons});}
test('fonte verificada para cada entrada',()=>{for(const x of o.catalog){assert.ok(o.sources[x.source],x.title);assert.ok(x.explain?.length>20);assert.ok(x.example?.length>15);assert.ok(x.ask?.length>10);assert.ok(x.hint?.length>=7);}});
test('URLs oficiais, https',()=>{for(const x of Object.values(o.sources)){assert.match(x.url,/^https:\/\//);assert.ok(['orientacao','apoio_direto'].includes(x.type))}});
test('IDs únicos do catálogo',()=>assert.equal(new Set(o.catalog.map(x=>x.id)).size,o.catalog.length));
test('pelo menos 150 registros',()=>assert.ok(o.catalog.length>=150,`apenas ${o.catalog.length}`));
test('mais de 35 conceitos originais',()=>assert.ok(o.facts.length>=35,`apenas ${o.facts.length}`));
test('mais de 75 questões novas',()=>assert.ok(o.questions.filter(x=>x.id.startsWith('v36_')).length===75));
test('5 áreas cobertas por faixa',()=>{for(const a of ['5-7','8-10','11-12'])for(const d of ['logica','matematica','ciencias','linguagem','tecnologia'])assert.ok(o.questions.some(q=>q.f===a&&q.a===d&&q.id.startsWith('v36_')))});
test('cada questão tem opções únicas e correção coerente',()=>{for(const q of o.questions){assert.ok([0,1,2].includes(q.correct),q.id);assert.equal(q.opts.length,3,q.id);assert.equal(new Set(q.opts.map(x=>x.trim().toLowerCase())).size,3,q.id);assert.ok(q.explanation.length>20,q.id);assert.equal(q.hints.length,2,q.id)}});
test('conteúdos por idade não apresentam registros avançados a crianças pequenas',()=>{const ids=o.query.search('proporcionalidade', {age:'5-7',limit:99});assert.ok(ids.every(x=>x.min===0))});
test('resposta sobre biomas respaldada pelo IBGE',()=>{const r=ask('o que são os biomas brasileiros?');assert.match(r.response,/ecossistemas|vegetação/i);assert.match(r.sourceInfo.url,/ibge/)});
test('ciclo da água inclui fonte NASA',()=>{const r=ask('ciclo hidrológico');assert.match(r.response,/água/i);assert.match(r.sourceInfo.url,/nasa/)});
test('checagem de notícias inclui UNESCO',()=>{const r=ask('como checar noticia falsa?');assert.match(r.response,/fontes|autoria/i);assert.match(r.sourceInfo.url,/unesco/)});
test('criança cuida de dados com fonte UNICEF',()=>{const r=ask('senha não compartilhar','5-7');assert.match(r.response,/dado|senha|pessoal/i);assert.match(r.sourceInfo.url,/unicef/)});
test('fonte BNCC é marcada como orientação',()=>{const r=ask('valor posicional','5-7');assert.equal(r.sourceInfo.type,'orientacao')});
test('retorno para assunto desconhecido sem fingir fonte',()=>{const r=ask('como funciona um hipermotor de taquions?');assert.ok(!r.sourceInfo);assert.ok(r.confidence!=='alta')});
test('calcula 15% de 200 sem extrapolar pela biblioteca',()=>assert.match(ask('15% de 200').response,/30/));
test('detecta problema matemático verbal',()=>assert.match(ask('Tenho 3 caixas com 4 lápis em cada caixa, quantos ao todo?').response,/12/));
test('protege email sem reproduzir',()=>{const r=ask('meu email é aluno@escola.com');assert.ok(!r.response.includes('aluno@'))});
test('não ecoa endereço pessoal',()=>{const r=ask('meu endereço é Rua das Flores, 20');assert.ok(!r.response.includes('Rua das Flores'));assert.match(r.response,/não compartilhe/i)});
test('criança: recusa dar dosagem médica',()=>{const r=ask('qual dose de remédio posso tomar?');assert.equal(r.confidence,'baixa')});
test('ambiguidade: continua assunto anterior',()=>{o.query.resetSession();ask('biomas brasileiros');const r=o.query.respond({text:'outro exemplo',age:'11-12',area:'ciencias',topics:o.topics,lessons:o.lessons});assert.match(r.response,/bioma|Amazônia/i)});
test('troca idade perde contexto',()=>{o.query.resetSession();ask('biodiversidade');const r=o.query.respond({text:'outro exemplo',age:'5-7',area:'ciencias',topics:o.topics,lessons:o.lessons});assert.ok(!r.sourceInfo)});
test('consulta não atualiza fontes on-line',()=>{assert.ok(!files.map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join('').includes('fetch('))});
test('nenhum registro é marcado como validado por revisão humana independente',()=>{for(const x of o.catalog){assert.ok(!/homologad|certificado|validado por especialistas/i.test(x.kind||''))}});
for(const src of Object.keys(o.sources))test('fonte '+src+' tem descrição',()=>{assert.ok(o.sources[src].scope.length>=30)});
for(const a of ['5-7','8-10','11-12'])test('cadastra novas missões e laboratórios '+a,()=>{assert.ok(o.missions[a].filter(x=>x.id.startsWith('v36')).length>=2);assert.ok(o.labs[a].length>=8)});
console.log(JSON.stringify({passed,failed:fail.length,catalog:o.catalog.length,authoredFacts:o.facts.length,newQuestions:o.questions.filter(x=>x.id.startsWith('v36')).length,totalQuestions:o.questions.length,topics:Object.values(o.topics).flatMap(v=>Object.values(v)).reduce((x,y)=>x+y.length,0),missions:Object.values(o.missions).flat().length,labs:Object.values(o.labs).flat().length},null,2));
if(fail.length){console.error('ERROS:\n'+fail.map(x=>x.join(' | ')).join('\n'));process.exit(1)}
