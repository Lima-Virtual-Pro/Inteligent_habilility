'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const files=['data.js','tutor_data.js','local_ai.js','knowledge_35.js','ai_35.js'];
const script=files.map(x=>fs.readFileSync(path.join(root,x),'utf8')).join('\n')+'\n({engine:IHAdvancedAI,base:IHTutorEngine,knowledge:IH_KNOWLEDGE_35,topics:TUTOR_TOPICS,lessons:LESSONS,areas:AREAS})';
const obj=vm.runInNewContext(script,{Intl,console,Math});
const {engine,knowledge,topics,lessons}=obj;let passed=0,failed=[];
function test(label,fn){try{fn();passed++;console.log('PASS',label);}catch(e){failed.push([label,e.message]);console.error('FAIL',label,e.message)}}
function ask(text,age='8-10',area='logica'){return engine.respond({text,age,area,topics,lessons});}
test('biblioteca complementar não está vazia',()=>assert.ok(knowledge.length>=30));
test('cada conceito possui conteúdo e pistas',()=>{for(const x of knowledge){assert.ok(x.id&&x.area&&x.title&&x.explain&&x.example&&x.ask&&x.hint);assert.ok([0,1,2].includes(x.min))}});
test('IDs da biblioteca exclusivos',()=>assert.equal(new Set(knowledge.map(x=>x.id)).size,knowledge.length));
test('perguntas de ciências encontram conteúdo específico',()=>assert.match(ask('o que é o ciclo da água').response,/evapora|evaporação|atmosfera/i));
test('classificação de número par',()=>assert.match(ask('o que são números pares','5-7').response,/par/i));
test('fotossíntese reconhecida para 11-12',()=>{const r=ask('explique fotossíntese','11-12');assert.equal(r.area,'ciencias');assert.match(r.response,/energia luminosa/i)});
test('fotossíntese não inventada como aula inicial de 5-7',()=>{engine.resetSession();const r=ask('explique fotossíntese','5-7');assert.ok(!r.response.includes('compostos orgânicos'))});
test('reconhecimento de fração com acento',()=>assert.match(ask('O que são frações?').response,/denominador|iguais/i));
test('reconhecimento de assunto por sinônimo',()=>assert.match(ask('Me explique regra de três','11-12').response,/proporciona/i));
test('continuidade da sessão no mesmo assunto',()=>{engine.resetSession();ask('fotossíntese','11-12');assert.match(ask('explique de outro jeito','11-12').response,/energia|luz/i)});
test('trocar faixa elimina contexto impróprio',()=>{engine.resetSession();ask('fotossíntese','11-12');const r=ask('explique de outro jeito','5-7');assert.ok(!r.response.includes('compostos orgânicos'))});
test('resposta orientada sem revelar primeiro',()=>{const r=ask('como verificar porcentagem','11-12');assert.equal(r.area,'matematica')});
test('operação 12+8 continua exata',()=>assert.match(ask('12 + 8').response,/= 20/));
test('fração numérica simplificada',()=>assert.match(ask('simplifique 6/8').response,/3\/4/));
test('porcentagem numérica explicada',()=>assert.match(ask('25% de 200').response,/50/));
test('problema de soma em linguagem natural',()=>assert.match(ask('Lia tinha 12 lápis e ganhou 5, quantos ficou?').response,/17/));
test('problema de subtração em linguagem natural',()=>assert.match(ask('Lia tinha 12 lápis e perdeu 5, quantos restaram?').response,/7/));
test('problema de grupos em linguagem natural',()=>assert.match(ask('Tenho 3 caixas com 4 lápis em cada caixa, quantos ao todo?').response,/12/));
test('problema de divisão em linguagem natural',()=>assert.match(ask('Lia repartiu 12 brinquedos em 3 grupos, quantos cada?').response,/4/));
test('não presume resposta para problema ambíguo',()=>{const r=engine.wordProblem('Tenho 12 lápis e 5 cadernos. Quantos animais?');assert.equal(r,null)});
test('consegue negar conteúdo não encontrado',()=>assert.match(ask('qual a física das ondas gravitacionais?','11-12').response,/não reconheci|não encontrei|não vou inventar/i));
test('privacidade bloqueia e-mail',()=>assert.match(ask('meu contato abc@example.com').title,/dados pessoais/i));
test('privacidade não ecoa e-mail',()=>assert.ok(!ask('meu contato abc@example.com').response.includes('abc@example.com')));
test('segurança detecta pedido de ajuda',()=>assert.match(ask('alguém está me batendo').response,/adulto de confiança/i));
test('não classifica resposta sem fonte como alta',()=>{const r=ask('biologia da estrela vulcano');assert.ok(r.confidence!=='alta')});
test('não executa código no cálculo',()=>{const r=ask('2+alert(1)');assert.ok(!r.response.includes('NaN'))});
for(const age of ['5-7','8-10','11-12']){
 test('prática de matemática produz enunciado '+age,()=>{const x=engine.createPractice({age,area:'matematica',topics});assert.ok(x.question&&x.solution&&x.hint)});
 test('prática de matemática aceita resposta correta '+age,()=>{const p=engine.createPractice({age,area:'matematica',topics});const r=engine.grade(p,String(p.answer));assert.equal(r.status,'correct')});
 test('prática de ciências possui alternativas '+age,()=>{const p=engine.createPractice({age,area:'ciencias',topics});assert.equal(p.type,'choice');assert.ok(p.options.length>=3);assert.equal(engine.grade(p,String(p.answer)).status,'correct')});
}
test('pista na primeira tentativa incorreta',()=>{const p=engine.createPractice({age:'8-10',area:'matematica',topics});const r=engine.grade(p,'999999');assert.equal(r.status,'incorrect');assert.ok(!r.reveal)});
test('explicação completa após segunda tentativa',()=>{const p=engine.createPractice({age:'8-10',area:'matematica',topics});engine.grade(p,'999999');const r=engine.grade(p,'999999');assert.ok(r.reveal);assert.ok(r.message.includes(p.solution))});
test('não aceita injeção em resposta numérica',()=>{const p=engine.createPractice({age:'11-12',area:'matematica',topics});const r=engine.grade(p,'1; window.alert(1)');assert.equal(r.status,'invalid')});
test('não aceita denominador 0',()=>assert.ok(Number.isNaN(engine.numeric('1/0'))));
test('aceita decimal com vírgula',()=>assert.equal(engine.numeric('2,5'),2.5));
test('aceita fração matemática',()=>assert.equal(engine.numeric('3/4'),0.75));
test('não aceita alternativa inexistente',()=>{const p=engine.createPractice({age:'8-10',area:'tecnologia',topics});assert.equal(engine.grade(p,'999').status,'invalid')});
test('não concede confiança sem dados',()=>{const p=engine.plan({age:'5-7',log:[],tutorPractice:{}});assert.match(p.reason,/não há tentativas/i)});
test('planejamento prioriza dificuldade observada',()=>{const log=Array.from({length:4},(_,i)=>({faixa:'8-10',area:'matematica',correct:i===3}));const p=engine.plan({age:'8-10',log,tutorPractice:{}});assert.equal(p.area,'matematica')});
test('planejamento usa contadores do tutor',()=>{const p=engine.plan({age:'11-12',log:[],tutorPractice:{'11-12:logica':{attempts:4,correct:1}}});assert.equal(p.area,'logica')});
test('planejamento não usa dados de outra faixa',()=>{const p=engine.plan({age:'5-7',log:[{faixa:'11-12',area:'matematica',correct:false}],tutorPractice:{}});assert.ok(p.evidence.every(x=>x.attempts===0))});
test('modo de estudo guiado é verificável',()=>{const r=engine.respond({text:'',forced:'guiar',age:'11-12',area:'ciencias',topics,lessons,selectedTopic:0});assert.ok(r.response.length>40)});
for(const area of ['logica','matematica','ciencias','linguagem','tecnologia']){
 test('biblioteca acessível por tema '+area,()=>assert.ok(knowledge.some(x=>x.area===area)));
 test('prática não matemática ou matemática '+area,()=>{const p=engine.createPractice({age:'11-12',area,topics});assert.ok(p.question&&p.hint)});
}
console.log('RESULTADO',passed,'aprovados,',failed.length,'falhas');if(failed.length)process.exit(1);
