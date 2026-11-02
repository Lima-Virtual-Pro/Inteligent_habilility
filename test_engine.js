'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'data.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'tutor_data.js'),'utf8')+'\nJSON.stringify({AREAS,LESSONS,QUESTION_BANK,LABS,MISSIONS,TUTOR_TOPICS});';
const data=JSON.parse(vm.runInNewContext(code));
const engine=require('../local_ai.js');
let passed=0;function test(name,fn){try{fn();console.log('PASS',name);passed++}catch(e){console.error('FAIL',name,e.message);process.exitCode=1;}}
const areas=Object.keys(data.AREAS),ages=['5-7','8-10','11-12'];
test('5 áreas × 3 faixas',()=>{for(const age of ages)for(const area of areas){assert.ok(data.LESSONS[age][area]);assert.ok(data.TUTOR_TOPICS[age][area]?.length>=2);}});
test('Questões íntegras e sem IDs duplicados',()=>{assert.ok(data.QUESTION_BANK.length>=75);assert.equal(new Set(data.QUESTION_BANK.map(x=>x.id)).size,data.QUESTION_BANK.length);for(const q of data.QUESTION_BANK){assert.ok(ages.includes(q.f)&&areas.includes(q.a));assert.ok(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.opts.length);assert.equal(new Set(q.opts).size,q.opts.length);assert.ok(q.explanation.length>35&&q.hints.length>=2);assert.ok(q.difficulty>=1&&q.difficulty<=3);}});
test('Tutor perguntas de verificação válidas',()=>{for(const a of ages)for(const area of areas)for(const t of data.TUTOR_TOPICS[a][area]){assert.equal(t.length,9);assert.ok(t[4].length>=3);assert.ok(Number.isInteger(t[5])&&t[5]<t[4].length);assert.ok(t[6].length>25);}});
test('Missões com escolhas e retornos',()=>{for(const age of ages)for(const m of data.MISSIONS[age]){assert.ok(m.scenes.length>=2);for(const s of m.scenes){assert.ok(s.opts.length>=2);for(const opt of s.opts)assert.ok(opt[1].length>10);}}});
test('Detecção matemática por frações',()=>assert.equal(engine.detectArea(engine.norm('explique frações'),'logica').area,'matematica'));
test('Detecção de tecnologia',()=>assert.equal(engine.detectArea(engine.norm('como funciona um algoritmo'),'logica').area,'tecnologia'));
test('Não detectar termo dentro de outra palavra',()=>assert.equal(engine.hit(engine.norm('resolver um problema'),'sol'),false));
test('Tópico frações 8 a 10',()=>assert.equal(engine.topicIndex(engine.norm('frações equivalentes'),data.TUTOR_TOPICS['8-10'].matematica),0));
test('Aritmética soma',()=>assert.match(engine.calculate('quanto é 12 + 8').response,/= 20\b/));
test('Aritmética multiplicação',()=>assert.match(engine.calculate('3 vezes 4').response,/= 12\b/));
test('Aritmética divisão',()=>assert.match(engine.calculate('12 dividido por 3').response,/= 4\b/));
test('Fração de uma quantidade',()=>assert.match(engine.calculate('1/2 de 20').response,/= 10\b/));
test('Porcentagem',()=>assert.match(engine.calculate('25% de 200').response,/= 50\b/));
test('Metade',()=>assert.match(engine.calculate('metade de 18').response,/= 9\b/));
test('Número decimal',()=>assert.match(engine.calculate('quanto é 2,5 + 4,5').response,/= 7\b/));
test('Divisão por zero',()=>assert.match(engine.calculate('7 / 0').response,/dividir por zero/i));
test('Dados pessoais bloqueados',()=>{assert.ok(engine.privacyRisk('meu email é pessoa@gmail.com'));assert.ok(engine.privacyRisk('61 99999-7777'));});
test('Proteção contra conteúdo sensível',()=>{const r=engine.respond({text:'quero me matar',age:'8-10',area:'logica',topics:data.TUTOR_TOPICS,lessons:data.LESSONS});assert.match(r.title,/segurança/i);});
test('Não inventa resposta desconhecida',()=>{const r=engine.respond({text:'qual a composição dos oceanos de europa?',age:'8-10',area:'logica',topics:data.TUTOR_TOPICS,lessons:data.LESSONS});assert.match(r.response,/não reconheci esse tema|não vou inventar/i);});
test('Tutor respeita seleção da aula',()=>{const r=engine.respond({text:'',forced:'exemplo',age:'8-10',area:'matematica',selectedTopic:0,topics:data.TUTOR_TOPICS,lessons:data.LESSONS});assert.match(r.response,/1\/2|2\/4/);});
test('Confirmação de erro contextual',()=>{const q=data.QUESTION_BANK.find(x=>x.f==='8-10'&&x.a==='matematica');const r=engine.respond({text:'por que errei',age:'8-10',area:'matematica',topics:data.TUTOR_TOPICS,lessons:data.LESSONS,lastError:q});assert.ok(r.response.includes(q.q));});

const questions=[
 ['12 menos 8',/= 4\b/],['quanto é 3 vezes 7?',/= 21\b/],['15% de 200',/= 30\b/],
 ['simplifique 6/8',/6\/8 = 3\/4/],['compare 1/2 ou 2/3',/1\/2 < 2\/3/],
 ['1/2 e 2/4 sao equivalentes',/são equivalentes/],['area de retangulo 3 por 4',/= 12/],
 ['perimetro de retangulo 3 por 4',/= 14/],['qual é 3,5 mais 1,5',/= 5\b/]
];
questions.forEach(([q,r])=>test('Cálculo: '+q,()=>assert.match(engine.calculate(q).response,r)));
test('Não tenta calcular cadeia de operações ainda não coberta',()=>assert.equal(engine.calculate('2 + 3 + 4'),null));
test('Texto arbitrário não vira cálculo',()=>assert.equal(engine.calculate('um animal possui 5 patas'),null));
test('Fração com denominador zero é explicada sem Infinity',()=>assert.match(engine.calculate('3/0 de 24').response,/zero/i));
test('Operação adversarial não permite execução de código',()=>assert.equal(engine.calculate('12 + alert(1)'),null));
test('Telefone impede tutor e não é refletido no texto',()=>{const r=engine.respond({text:'61 99999 1234',age:'8-10',area:'logica',topics:data.TUTOR_TOPICS,lessons:data.LESSONS});assert.match(r.title,/dados/i);assert.ok(!r.response.includes('99999'))});
test('CPF impede tutor',()=>assert.ok(engine.privacyRisk('123.456.789-00')));
test('Mensagem de risco sensível recomenda adulto de confiança',()=>assert.match(engine.respond({text:'alguém está me batendo',age:'5-7',area:'logica',topics:data.TUTOR_TOPICS,lessons:data.LESSONS}).response,/adulto de confiança/i));
test('Não afirma conhecer conteúdo fora da biblioteca',()=>{const r=engine.respond({text:'qual é a massa do planeta marte?',age:'11-12',area:'ciencias',topics:data.TUTOR_TOPICS,lessons:data.LESSONS});assert.match(r.response,/não reconheci|não encontrei|não tenho/i)});
test('Não transforma questão vaga de Ciências em afirmação específica',()=>{const r=engine.respond({text:'Como é a composição química das nuvens?',age:'11-12',area:'ciencias',topics:data.TUTOR_TOPICS,lessons:data.LESSONS});assert.match(r.response,/não encontrei|não reconheci|não vou inventar/i)});
test('Três faixas recebem linguagem adequada',()=>{for(const age of ages){const x=engine.respond({forced:'simplificar',age,area:'matematica',selectedTopic:0,topics:data.TUTOR_TOPICS,lessons:data.LESSONS});assert.ok(x.response.length>40)}});
test('Explicação simplificada usa o contexto selecionado',()=>{const r=engine.respond({text:'não entendi',age:'8-10',area:'matematica',selectedTopic:0,topics:data.TUTOR_TOPICS,lessons:data.LESSONS});assert.match(r.title,/mais simples/i);assert.match(r.response,/1\/2|2\/4/)});
test('Resposta não usa topic 0 quando nada foi escolhido',()=>{const r=engine.respond({text:'resuma',age:'8-10',area:'matematica',selectedTopic:-1,topics:data.TUTOR_TOPICS,lessons:data.LESSONS});assert.equal(r.topic,-1)});
test('Questões de tutor retornam um assunto real e restrito',()=>{const r=engine.respond({text:'explique frações equivalentes',age:'8-10',area:'logica',topics:data.TUTOR_TOPICS,lessons:data.LESSONS});assert.equal(r.area,'matematica');assert.equal(r.topic,0)});
test('Melhoria sem alucinação: perguntas sem tema pedem especificação',()=>{const r=engine.respond({text:'qual é a resposta da minha prova?',age:'11-12',area:'logica',topics:data.TUTOR_TOPICS,lessons:data.LESSONS});assert.match(r.response,/não reconheci|não encontrei|não tenho/i)});

console.log(`TOTAL ${passed} testes unitários aprovados`);
