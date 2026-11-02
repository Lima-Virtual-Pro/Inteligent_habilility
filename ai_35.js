/* Inteligent Hability 3.5 | Motor cognitivo local verificável.
   Busca lexical com sinônimos, contexto efêmero, problemas com regras explícitas,
   prática gerada deterministicamente por famílias matemáticas e recomendações.
   NÃO É rede neural, LLM nem substituto de professor. */
'use strict';
const IHAdvancedAI = (() => {
  const B = IHTutorEngine;
  const stop = new Set('a o os as um uma umas uns de do da dos das em no na nos nas por para com que qual quais como porque quando onde eu voce voce me meu minha seus suas seu sua mais menos sobre explique explicar diga quero aprender por favor pode ser e ou do que preciso saber'.split(' '));
  const suffixes=[/coes$/,'s$'];
  const canonical = w => {
    const map={fracoes:'fracao',plantas:'planta',sequencias:'sequencia',numeros:'numero',percentual:'porcentagem',dividir:'divisao',somar:'adicao',soma:'adicao',subtrair:'subtracao',multiplicar:'multiplicacao',valores:'valor',triangulos:'triangulo',retangulos:'retangulo',impares:'impar',pares:'par',rimas:'rima',sementes:'semente',operacoes:'operacao',probabilidades:'probabilidade'};
    return map[w]||((w.length>5&&w.endsWith('s'))?w.slice(0,-1):w);
  };
  const tokens=x=>B.norm(x).split(' ').map(canonical).filter(w=>w.length>=3&&!stop.has(w));
  const areaNames={logica:'Raciocínio',matematica:'Matemática',ciencias:'Ciências',linguagem:'Linguagem',tecnologia:'Tecnologia'};
  const ageIndex={'5-7':0,'8-10':1,'11-12':2};
  const mem={context:null,turns:0,practice:null,activityCount:0};
  const pure=(title,response,extra={})=>({title,response,area:extra.area||null,topic:-1,confidence:extra.confidence||'alta',source:extra.source||'biblioteca pedagógica local',...extra});
  function matchConcept(query,age){
    const q=B.norm(query),qTokens=new Set(tokens(query));if(qTokens.size===0)return null;
    let best=null;
    for(const c of IH_KNOWLEDGE_35){
      if(c.min>ageIndex[age])continue;
      let points=0;
      for(const phrase of [c.title,...c.terms]){
        const p=B.norm(phrase),pt=tokens(phrase);
        if(p.length>3 && (` ${q} `).includes(` ${p} `))points+=p.includes(' ')?12:8;
        else if(pt.length>=2&&pt.every(t=>qTokens.has(t)))points+=7;
        else if(pt.length===1&&qTokens.has(pt[0])&&pt[0].length>=5)points+=4;
      }
      // Evita recuperar definição específica para pergunta genérica sobre toda uma área.
      const domainMatch=c.terms.some(x=>tokens(x).some(t=>qTokens.has(t)));
      if(!domainMatch)continue;
      if(points >= 4 && (!best||points>best.points))best={concept:c,points};
    }
    return best;
  }
  function intent(text,forced=''){
    if(forced)return forced;
    const p=B.norm(text);
    if(/\b(pista|ajuda sem dar resposta|primeira dica)\b/.test(p))return 'pista';
    if(/\b(conferir|como verificar|como conferir|ta certo|esta certo)\b/.test(p))return 'conferir';
    if(/\b(mais facil|nao entendi|simplifique|outras palavras|de outro jeito)\b/.test(p))return 'simplificar';
    if(/\b(por que errei|onde errei|rever erro|revisar erros)\b/.test(p))return 'erro';
    if(/\b(exercicio|praticar|treinar|me teste|desafio|questao)\b/.test(p))return 'pratica';
    if(/\b(exemplo|exemplifique|mostre um caso)\b/.test(p))return 'exemplo';
    if(/\b(resuma|resumo|resumir)\b/.test(p))return 'resumo';
    if(/\b(aprofunde|aprofundar|mais avancado|mais dificil)\b/.test(p))return 'aprofundar';
    if(/\b(guie|sem revelar|me ajude a pensar|passo a passo)\b/.test(p))return 'guiar';
    return 'explicacao';
  }
  function teach(concept,age,what){
    const younger=age==='5-7', older=age==='11-12';
    const opts={
      explicacao:`${concept.explain} Exemplo: ${concept.example} ${older?'Explique por que esse exemplo funciona e identifique a ideia central.':younger?'Se possível, represente a ideia com desenhos ou objetos.':'Agora explique a ideia com suas palavras.'}`,
      exemplo:`Veja este caso: ${concept.example} Tente modificar um elemento do exemplo e observe o que acontece.`,
      simplificar:`Vamos começar por uma parte: ${concept.example} ${younger?'Desenhe para descobrir o que acontece.':'Identifique o primeiro passo antes de prosseguir.'}`,
      aprofundar:`Conceito principal: ${concept.explain} Para ir além: ${concept.ask} Explique qual evidência ajuda na sua conclusão.`,
      resumo:`Ideia central: ${concept.explain} Lembre-se deste exemplo: ${concept.example}`,
      pista:`Experimente esta pista, sem revelar a resposta: ${concept.hint}`,
      guiar:`Vamos investigar sem apressar a resposta. Primeira pergunta: ${concept.ask} Uma pista inicial: ${concept.hint}`,
      conferir:`Uma forma de verificar seu raciocínio é comparar com o exemplo: ${concept.example} ${concept.ask}`,
      erro:`Errar informa o que precisa de revisão. Recomece pela ideia: ${concept.explain} Pista: ${concept.hint}`,
      pratica:`${concept.ask} Pista opcional: ${concept.hint}`
    };
    return pure(what==='guiar'?'Investigação guiada':concept.title,opts[what]||opts.explicacao,{area:concept.area,conceptId:concept.id,source:'conceito pedagógico revisável',intent:what,followUps:['outro exemplo','me dê uma pista','vamos praticar']});
  }
  const fmt=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:5}).format(n);
  function wordProblem(s){
    const p=B.norm(s), nums=(p.match(/\b\d+(?:[.,]\d+)?\b/g)||[]).map(x=>Number(x.replace(',','.')));
    if(nums.length!==2 || nums.some(n=>n>100000||!Number.isFinite(n)))return null;
    const [a,b]=nums;
    if(!/(?:quantos|quanto|total|restaram|sobraram|cada|ficou|custam|resultado)/.test(p))return null;
    let kind=null;
    // Usar apenas sinais linguísticos específicos: perguntas ambíguas não são resolvidas por chute.
    if(/\b(dividiu|repartiu|distribuiu|dividir igualmente|repartir igualmente)\b/.test(p))kind='div';
    else if(/\b(cada caixa|cada pacote|cada grupo|em cada|grupos de|vezes|fileiras de)\b/.test(p))kind='mul';
    else if(/\b(perdeu|gastou|retirou|tirou|sobraram|restaram)\b/.test(p))kind='sub';
    else if(/\b(ganhou|recebeu|juntou|acrescentou|adicionou|mais .* (?:junto|total)|ao todo)\b/.test(p))kind='add';
    if(!kind)return null;
    if(kind==='sub'&&a<b)return pure('Vamos verificar a situação','Os números e a ação descrita precisam de mais contexto para esse tipo de problema. Confira se a ordem das quantidades está correta.',{area:'matematica',confidence:'baixa'});
    if(kind==='div'&&b===0)return pure('Divisão inválida','Não é possível repartir em zero grupos.',{area:'matematica'});
    const operators={add:['+',a+b,'Junte os dois grupos.','A soma pode ser conferida pela subtração.'],sub:['−',a-b,'Retire a segunda quantidade da primeira.','Confira adicionando a quantidade retirada ao que restou.'],mul:['×',a*b,'Conte grupos de igual tamanho.','Confira por adição repetida.'],div:['÷',a/b,'Separe em grupos de mesmo tamanho.','Confira multiplicando o resultado pela quantidade de grupos.']};
    const [symbol,result,step,verify]=operators[kind];
    if(!Number.isFinite(result))return null;
    return pure('Problema resolvido por etapas',`Dados: ${fmt(a)} e ${fmt(b)}. Interpretação: ${step} Cálculo: ${fmt(a)} ${symbol} ${fmt(b)} = ${fmt(result)}. Conferência: ${verify} Confira se a unidade usada na resposta corresponde à pergunta.`,{mode:'calculo',source:'interpretação restrita + cálculo determinístico',area:'matematica',confidence:'media',intent:'explicacao'});
  }
  function continuation(p){return /^(?:mais facil|nao entendi|outras palavras|outro exemplo|exemplo|me de um exemplo|aprofundar|aprofunde|resuma|resumo|me ajude|por que|porque|como conferir|me de uma pista|pista|como assim|explique de outro jeito|vamos praticar|praticar|guie|sem revelar)$/.test(p);}
  function respond({text='',forced='',age='5-7',area='logica',topics={},lessons={},lastError=null,selectedTopic=-1}={}){
    const raw=String(text??'').trim().slice(0,250),p=B.norm(raw);
    // Privacidade e segurança são verificadas antes de qualquer retomada de contexto.
    if(!forced&&(B.privacyRisk(raw)||B.safetyRisk(p))){mem.context=null;return B.respond({text:raw,age,area,topics,lessons,lastError,selectedTopic});}
    if(!forced&&!raw)return B.respond({text:raw,age,area,topics,lessons,lastError,selectedTopic});
    mem.turns++;
    if(!forced){
      const calc=B.calculate(raw);
      if(calc){mem.context={area:'matematica',conceptId:null,age};return {...calc,source:'calculadora exata com explicação',confidence:'alta'};}
      const word=wordProblem(raw);
      if(word){mem.context={area:'matematica',conceptId:null,age};return word;}
    }
    const matched=!forced?matchConcept(raw,age):null;
    const contextual=(!matched&&(forced||continuation(p))&&mem.context?.age===age)?IH_KNOWLEDGE_35.find(x=>x.id===mem.context.conceptId):null;
    const concept=matched?.concept||contextual;
    const what=intent(raw,forced);
    if(concept){mem.context={area:concept.area,conceptId:concept.id,age};return teach(concept,age,what);}
    const base=B.respond({text:raw,forced,age,area,topics,lessons,lastError,selectedTopic});
    if(base.confidence==='alta'&&base.topic>=0){mem.context={area:base.area,conceptId:null,age};}
    return {...base,source:base.mode==='calculo'?'cálculo determinístico':base.topic>=0?'biblioteca de temas':base.confidence==='baixa'?'assunto não confirmado':'miniaula local'};
  }
  // Os exercícios numéricos usam fórmulas fechadas. Não aceitam expressão arbitrária/eval.
  function createPractice({age='5-7',area='matematica',topics={}}={}){
    const turn=mem.activityCount++;
    if(area!=='matematica'){
      const ts=topics[age]?.[area]||[];
      if(!ts.length)return null;
      const t=ts[turn%ts.length];
      return mem.practice={type:'choice',area,age,question:t[3],options:[...t[4]],answer:t[5],hint:t[7],solution:t[6],tries:0};
    }
    const level=ageIndex[age]??0;
    const variant=turn%(level===0?3:level===1?5:7);
    const offset=Math.floor(turn/7)%7;
    let obj;
    if(level===0){
      if(variant===0){const a=3+offset,b=4+(turn%4);obj={question:`Quanto é ${a} + ${b}?`,answer:a+b,hint:'Junte as duas quantidades.',solution:`${a} + ${b} = ${a+b}.`};}
      else if(variant===1){const a=12+offset,b=3+turn%4;obj={question:`Quanto é ${a} − ${b}?`,answer:a-b,hint:'Comece no total e conte para trás.',solution:`${a} − ${b} = ${a-b}.`};}
      else {const a=2+offset;obj={question:`Qual número vem depois de ${a}, ${a+2}, ${a+4}, ...?`,answer:a+6,hint:'Observe o quanto o número aumenta a cada passo.',solution:`O padrão aumenta de 2 em 2. Depois vem ${a+6}.`};}
    } else if(level===1){
      if(variant===0){const a=4+offset,b=3+turn%5;obj={question:`Quanto é ${a} × ${b}?`,answer:a*b,hint:'Pense em grupos iguais.',solution:`${a} grupos de ${b} = ${a*b}.`};}
      else if(variant===1){const a=2+offset,b=3+turn%4;obj={question:`Se ${a*b} objetos forem divididos em ${a} grupos iguais, quantos ficarão em cada?`,answer:b,hint:'Use a multiplicação inversa.',solution:`${a*b} ÷ ${a} = ${b}.`};}
      else if(variant===2){const a=4+offset,b=2+turn%4;obj={question:`Qual o perímetro de um retângulo de lados ${a} cm e ${b} cm? (Responda só o número.)`,answer:2*(a+b),hint:'Some os quatro lados.',solution:`${a} + ${b} + ${a} + ${b} = ${2*(a+b)} cm.`};}
      else if(variant===3){const a=2+offset,b=2+turn%4;obj={question:`Qual a área de um retângulo ${a} cm por ${b} cm? (Só o número.)`,answer:a*b,hint:'Multiplique base por altura.',solution:`${a} × ${b} = ${a*b} cm².`};}
      else {const a=1+turn%4;obj={question:`Quanto é a metade de ${a*8}?`,answer:a*4,hint:'Divida o valor em duas partes iguais.',solution:`${a*8} ÷ 2 = ${a*4}.`};}
    } else {
      if(variant===0){const a=100+20*offset,b=[5,10,15,20][turn%4];obj={question:`Quanto é ${b}% de ${a}?`,answer:a*b/100,hint:'Multiplique por porcentagem dividida por 100.',solution:`${a} × ${b}/100 = ${fmt(a*b/100)}.`};}
      else if(variant===1){const a=3+offset,b=4+turn%4;obj={question:`Se ${a} itens custam R$ ${a*b}, quanto custam ${2*a} itens iguais? (Só o valor.)`,answer:2*a*b,hint:'A quantidade dobrou; o custo também.',solution:`${a*b} × 2 = ${2*a*b}.`};}
      else if(variant===2){const n=1+turn%5;obj={question:`Qual fração equivale a ${n}/6 se o denominador passar para 12? (Responda a fração.)`,answer:`${2*n}/12`,hint:'Multiplique numerador e denominador por 2.',solution:`${n}/6 = ${2*n}/12.`};}
      else if(variant===3){const x=2+offset,y=3+turn%5;obj={question:`Qual é a área de um retângulo ${x} cm por ${y} cm? (Só o número.)`,answer:x*y,hint:'Área = base × altura.',solution:`${x} × ${y} = ${x*y} cm².`};}
      else if(variant===4){const x=2+turn%4;obj={question:`Um dado comum e justo tem 6 faces. Qual a probabilidade de sair o número 1? (Responda em fração.)`,answer:'1/6',hint:'Um resultado favorável dentre seis possíveis.',solution:'A probabilidade é 1/6.'};}
      else if(variant===5){const x=9+offset,y=2+turn%5;obj={question:`Quanto é ${x} × ${y}?`,answer:x*y,hint:'Multiplique os fatores.',solution:`${x} × ${y} = ${x*y}.`};}
      else {const x=3+offset;obj={question:`Quanto é 25% de ${x*40}?`,answer:x*10,hint:'25% é um quarto.',solution:`${x*40} ÷ 4 = ${x*10}.`};}
    }
    return mem.practice={...obj,type:'number',area,age,tries:0};
  }
  function numeric(v){
    const s=String(v??'').trim().replace(/\s+/g,'');if(s.length>35)return NaN;
    if(/^[-+]?\d+\/\d+$/.test(s)){const [a,b]=s.split('/').map(Number);return b===0?NaN:a/b;}
    if(!/^[-+]?\d+(?:[.,]\d+)?$/.test(s))return NaN;
    return Number(s.replace(',','.'));
  }
  function grade(practice,raw){
    if(!practice)return {status:'error',message:'Inicie uma atividade primeiro.'};
    const value=String(raw??'').trim(),opts=practice.type==='choice';
    const x=opts?Number(value):numeric(value);
    if(!value||!Number.isFinite(x)||(opts&&(!Number.isInteger(x)||x<0||x>=practice.options.length)))return {status:'invalid',message:opts?'Escolha uma das alternativas.':'Digite apenas um número, decimal ou fração como 1/2.'};
    const expected=opts?practice.answer:typeof practice.answer==='string'?numeric(practice.answer):practice.answer;
    const correct=opts?x===expected:Math.abs(x-expected)<1e-8;
    practice.tries=(practice.tries||0)+1;
    if(correct)return {status:'correct',correct:true,message:`Muito bem! ${practice.solution}`,explanation:practice.solution};
    const reveal=practice.tries>=2;
    return {status:'incorrect',correct:false,message:reveal?`Vamos conferir: ${practice.solution} Você pode tentar outra atividade sem pressa.`:`Ainda não. Pista: ${practice.hint}`,explanation:reveal?practice.solution:practice.hint,reveal};
  }
  function plan({age='5-7',log=[],tutorPractice={}}={}){
    const areas=['logica','matematica','ciencias','linguagem','tecnologia'];
    const evidence=areas.map(area=>{
      const quiz=log.filter(x=>x.faixa===age&&x.area===area).slice(-12);
      const tutor=tutorPractice[`${age}:${area}`]||{};
      const attempts=quiz.length+(Number(tutor.attempts)||0),correct=quiz.filter(x=>x.correct).length+(Number(tutor.correct)||0);
      return {area,attempts,correct,rate:attempts?correct/attempts:null};
    });
    // Sem pontuação competitiva: ordens explicáveis e sugestões baseadas em evidências limitadas.
    const weak=evidence.filter(e=>e.attempts>=3&&e.rate<.65).sort((a,b)=>a.rate-b.rate||b.attempts-a.attempts)[0];
    const unexplored=evidence.find(e=>e.attempts===0);
    const target=weak||unexplored||[...evidence].sort((a,b)=>(a.rate??1)-(b.rate??1))[0];
    const rationale=weak?`Nas ${weak.attempts} tentativas registradas de ${areaNames[weak.area]}, há conteúdo a retomar. Isso não é diagnóstico.`:unexplored?`Ainda não há tentativas registradas em ${areaNames[unexplored.area]}. Uma exploração inicial ajudará a conhecer o tema.`:`Podemos revisar ${areaNames[target.area]} com um exemplo diferente.`;
    return {area:target.area,reason:rationale,steps:[`Releia uma explicação curta de ${areaNames[target.area]}.`,'Resolva uma atividade, usando uma pista apenas se necessário.','Explique como chegou à resposta e confira por outro caminho.'],evidence};
  }
  function resetSession(){mem.context=null;mem.practice=null;mem.turns=0;}
  return Object.freeze({respond,matchConcept,wordProblem,createPractice,grade,plan,resetSession,numeric,areaNames});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=IHAdvancedAI;
