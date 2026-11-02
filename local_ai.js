/* Inteligent Hability 3.4 — tutor local explicável, determinístico e offline.
   Não utiliza modelo neural, não consulta a internet e não guarda o texto da conversa. */
'use strict';
const IHTutorEngine = (() => {
  const norm = v => String(v??'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}/%+×÷*.,\- ]/gu,' ').replace(/\s+/g,' ').trim();
  const lexicon = {
    matematica:['matematica','conta','calculo','numero','quantidade','somar','soma','adicao','subtracao','subtrair','multiplicacao','divisao','dividir','fracao','fracoes','metade','dobro','triplo','porcentagem','tabuada','geometria','perimetro','equivalente','equivalencia','decimal','probabilidade','proporcao','area do retangulo','area de retangulo'],
    ciencias:['ciencias','ciencia','agua','gelo','planta','fotossintese','energia','evaporacao','sombra','semente','experimento','animais','materia','natureza','ambiente','hipotese','cadeia alimentar','celulas'],
    linguagem:['linguagem','portugues','leitura','texto','livro','frase','personagem','historia','palavra','verbo','ortografia','resumo','argumento','tese','interpretacao','narrativa','noticia','opiniao','conectivo'],
    tecnologia:['tecnologia','algoritmo','programacao','computador','aplicativo','software','internet','senha','privacidade','codigo','digital','dados pessoais','sistema','validacao'],
    logica:['logica','raciocinio','sequencia','padrao','deducao','pista','conclusao','classificacao','classificar','condicao','premissa','inferencia','correlacao']
  };
  const normalizeWords = s => norm(s).split(' ').filter(Boolean);
  const synonymStems = {
    fracao:'frac',fracoes:'frac',equivalente:'equival',somar:'som',soma:'som',adicao:'adic',subtracao:'subtra',subtrair:'subtra',multiplicacao:'multiplic',divisao:'divis',dividir:'divid',porcentagem:'porcent',sequencia:'sequenc',raciocinio:'raciocin',probabilidade:'probabil',classificar:'classific',classificacao:'classific',experimento:'experim',argumento:'argument',interpretacao:'interpret',programacao:'program',fotossintese:'fotossint'
  };
  function hit(p, key) {
    const words = normalizeWords(p), phrase=norm(key);
    if(!phrase||phrase.length<3)return false;
    if(phrase.includes(' '))return (' '+words.join(' ')+' ').includes(' '+phrase+' ');
    const stem = synonymStems[phrase];
    return words.some(w=>w===phrase || (stem&&w.startsWith(stem)&&w.length>=stem.length));
  }
  function detectArea(p,current='logica') {
    let area=current, best=0;
    for(const [id,terms] of Object.entries(lexicon)){
      const score=terms.reduce((s,t)=>s+(hit(p,t)?(t.includes(' ')?5:3):0),0);
      if(score>best){area=id;best=score;}
    }
    return {area,confidence:best>=6?'alta':best>=3?'media':'baixa',points:best};
  }
  function topicIndex(p,topics=[]) {
    let winner=-1,score=0;
    topics.forEach((t,i)=>{
      const keys=[t[0],...String(t[8]||'').split(',')],n=keys.reduce((s,k)=>s+(hit(p,k)?(norm(k).includes(' ')?5:3):0),0);
      if(n>score){winner=i;score=n;}
    });
    return score>=3?winner:-1;
  }
  function privacyRisk(s){return /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[- ]?\d{4}\b|\b\d{3}[. ]?\d{3}[. ]?\d{3}[- ]?\d{2}\b/i.test(String(s??''));}
  function safetyRisk(p){return /\b(suicid\w*|me matar|quero morrer|autoagress\w*|automutil\w*|sofrendo abuso|abuso sexual|violencia sexual|assedi\w*|ameac\w*|me machucar|machucar alguem|foto intima|estao me batendo|estao me machucando|me batendo|me bate|me agride|me agredindo)\b/.test(p);}
  const fmt = x=>Number.isInteger(x)?String(x):String(Number(x.toFixed(5))).replace('.',',');
  const gcd=(a,b)=>{a=Math.abs(a);b=Math.abs(b);while(b){[a,b]=[b,a%b];}return a||1;};
  const calculation = (title,response)=>({title,response,mode:'calculo',area:'matematica',confidence:'alta'});
  function calculate(raw) {
    let s=norm(raw).replace(/(?<=\d),(?=\d)/g,'.').replace(/×|\bvezes\b|\bx\b/g,'*').replace(/÷|\bdividido por\b|\bdividida por\b/g,'/');
    s=s.replace(/\bmais\b/g,'+').replace(/\bmenos\b/g,'-').replace(/\b(quanto e|qual e|qual o resultado de|calcule|resolva)\s+/g,'').trim();
    const n='(\\d{1,6}(?:\\.\\d{1,4})?)';
    let m=s.match(new RegExp('^(\\d{1,3})%\\s+de\\s+'+n+'$'));
    if(m){const pct=+m[1],value=+m[2];if(pct>100)return calculation('Porcentagem acima de 100%','Uma porcentagem pode superar 100%, mas vamos começar estudando valores de 0% a 100%.');return calculation('Porcentagem por etapas',`${pct}% significa ${pct} partes de cada 100. ${pct}% de ${fmt(value)} = ${fmt(value)} × ${pct} ÷ 100 = ${fmt(value*pct/100)}. Confira usando a relação com 100.`);}
    m=s.match(new RegExp('^(\\d{1,4})\\s*/\\s*(\\d{1,4})\\s+de\\s+'+n+'$'));
    if(m){const a=+m[1],b=+m[2],v=+m[3];if(!b)return calculation('Denominador inválido','Uma fração não pode ter denominador zero.');return calculation('Fração de uma quantidade',`Para encontrar ${a}/${b} de ${fmt(v)}, divida ${fmt(v)} por ${b} e multiplique por ${a}: ${fmt(v)} ÷ ${b} × ${a} = ${fmt(v/b*a)}.`);}
    m=s.match(/^(?:simplifique|simplificar|reduza)\s+(\d{1,4})\s*\/\s*(\d{1,4})$/);
    if(m){const a=+m[1],b=+m[2];if(!b)return calculation('Denominador inválido','Não podemos ter denominador zero.');const d=gcd(a,b);return calculation('Simplificação de frações',`O maior divisor comum de ${a} e ${b} é ${d}. Dividimos o numerador e o denominador pelo mesmo número: ${a}/${b} = ${a/d}/${b/d}.`);}
    m=s.match(/^(?:qual (?:e )?maior|compare)\s+(\d{1,4})\s*\/\s*(\d{1,4})\s+(?:ou|e|com)\s+(\d{1,4})\s*\/\s*(\d{1,4})$/);
    if(m){const [a,b,c,d]=m.slice(1).map(Number);if(!b||!d)return calculation('Denominador inválido','O denominador deve ser diferente de zero.');let x=a*d,y=c*b;return calculation('Comparação de frações',`Compare por multiplicação cruzada: ${a} × ${d} = ${x}; ${c} × ${b} = ${y}. Assim, ${a}/${b} ${x===y?'=':x>y?'>':'<'} ${c}/${d}.`);}
    m=s.match(/^(?:as fracoes\s+)?(\d{1,4})\s*\/\s*(\d{1,4})\s+e\s+(\d{1,4})\s*\/\s*(\d{1,4})\s+(?:sao equivalentes|equivalentes)$/);
    if(m){const [a,b,c,d]=m.slice(1).map(Number);if(!b||!d)return calculation('Denominador inválido','O denominador não pode ser zero.');return calculation('Frações equivalentes',`${a}/${b} e ${c}/${d} ${a*d===c*b?'são':'não são'} equivalentes: ${a} × ${d} = ${a*d}, enquanto ${c} × ${b} = ${c*b}. Os produtos cruzados ${a*d===c*b?'coincidem':'são diferentes'}.`);}
    m=s.match(new RegExp('^(?:metade|dobro|triplo|um quarto)\\s+de\\s+'+n+'$'));
    if(m){const item=m[0].split(' de ')[0],v=+m[1],f={'metade':.5,'dobro':2,'triplo':3,'um quarto':.25}[item];return calculation('Partes e múltiplos',`${item.charAt(0).toUpperCase()+item.slice(1)} de ${fmt(v)} = ${fmt(v*f)}. ${item==='metade'?'Metade é dividir em duas partes iguais.':item==='um quarto'?'Um quarto é dividir em quatro partes iguais.':`Podemos formar ${f} grupos de ${fmt(v)}.`}`);}
    m=s.match(new RegExp('^(?:area|area de (?:um |do )?|area de )(?:um |do )?retangulo\\s+(?:de lados? |com lados? )?'+n+'\\s*(?:por|e|x|\\*)\\s*'+n+'$'));
    if(m){const a=+m[1],b=+m[2];return calculation('Área do retângulo',`Área é a quantidade de quadradinhos de uma unidade que cobrem a superfície. Base × altura = ${fmt(a)} × ${fmt(b)} = ${fmt(a*b)} unidades quadradas.`);}
    m=s.match(new RegExp('^perimetro (?:de (?:um |do )?)?retangulo\\s+(?:de lados? |com lados? )?'+n+'\\s*(?:por|e|x|\\*)\\s*'+n+'$'));
    if(m){const a=+m[1],b=+m[2];return calculation('Perímetro do retângulo',`Somamos os quatro lados: ${fmt(a)} + ${fmt(b)} + ${fmt(a)} + ${fmt(b)} = ${fmt(2*(a+b))} unidades de comprimento.`);}
    m=s.match(new RegExp('^'+n+'\\s*([+*/-])\\s*'+n+'$'));
    if(m){const a=+m[1],op=m[2],b=+m[3];if(op==='/'&&b===0)return calculation('Divisão por zero','Não é possível dividir por zero. Tente outro divisor.');const r=op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:a/b;if(!Number.isFinite(r)||Math.abs(r)>1e10)return null;
      const symbol=op==='*'?'×':op==='/'?'÷':op;
      const method=op==='+'?'Junte as duas quantidades e conte o total.':op==='-'?'Retire a segunda quantidade da primeira.':op==='*'?`São ${fmt(a)} grupos de ${fmt(b)} elementos.`:`Distribua ${fmt(a)} em ${fmt(b)} grupos iguais.`;
      const verify=op==='+'?`${fmt(r)} − ${fmt(b)} = ${fmt(a)}`:op==='-'?`${fmt(r)} + ${fmt(b)} = ${fmt(a)}`:op==='*'&&b?`${fmt(r)} ÷ ${fmt(b)} = ${fmt(a)}`:op==='/'?`${fmt(r)} × ${fmt(b)} = ${fmt(a)}`:'';
      return calculation('Cálculo com conferência',`${fmt(a)} ${symbol} ${fmt(b)} = ${fmt(r)}. ${method}${verify?' Confira pela operação inversa: '+verify+'.':''}`);
    }
    return null;
  }
  const intentRules=[
    ['erro',/\b(errei|erro|errado|erros|nao consegui|nao acertei|revisar erros|rever erros)\b/],
    ['simplificar',/\b(mais facil|simples|simplifique a explicacao|nao entendi|explique de outro jeito|outras palavras)\b/],
    ['aprofundar',/\b(aprofunde|aprofundar|mais dificil|mais avancado|detalhe|detalhar)\b/],
    ['exemplo',/\b(exemplo|exemplos|exemplifique|mostre um caso|outro caso)\b/],
    ['pratica',/\b(praticar|atividade|atividades|exercicio|exercicios|desafio|treinar|teste)\b/],
    ['resumo',/\b(resuma|resumir|resumo|revisao|relembre|passo a passo)\b/],
    ['explicacao',/\b(explique|explicar|explicacao|entender|entendo|como|porque|por que|o que e|significa|aprender|ensinar|duvida|duvidas)\b/]
  ];
  const confidenceText=(c)=>c==='alta'?'Assunto reconhecido':c==='media'?'Assunto provável':'Assunto não identificado';
  function respond({text='',forced='',age='5-7',area='logica',topics={},lessons={},lastError=null,selectedTopic=-1}={}){
    const raw=String(text??'').trim().slice(0,250),p=norm(raw);
    const basic={area,topic:-1,confidence:'baixa'};
    if(!forced&&p.length<3)return {...basic,title:'O que você quer descobrir?',response:'Escreva sua dúvida ou selecione uma das perguntas rápidas do tutor.'};
    if(!forced&&safetyRisk(p))return {...basic,title:'Segurança primeiro',response:'Se você está em perigo ou alguém está fazendo mal a você, procure um adulto de confiança agora. O tutor não é um serviço de emergência. Se o primeiro adulto não ajudar, conte a outro adulto de confiança.'};
    if(!forced&&privacyRisk(raw))return {...basic,title:'Proteja seus dados pessoais',response:'Não envie telefone, e-mail ou documentos. Apague essas informações e faça a pergunta sem identificar você ou sua família.'};
    const arithmetic=(!forced&&calculate(raw))||null;
    if(arithmetic)return {...arithmetic,topic:-1};
    const chosen=detectArea(p,area),nextArea=chosen.area,topicList=topics[age]?.[nextArea]||[];
    const inferred=topicIndex(p,topicList);
    // Uma continuação curta pode usar o tema selecionado; perguntas novas e não reconhecidas não herdam uma resposta desconexa.
    const genericFollowup=/^(?:nao entendi|outro exemplo|me de um exemplo|exemplo|mais facil|mais simples|explique|resuma|revisar erros|praticar|aprofunde|por que errei|como praticar|resumo|vamos praticar|explique de outro jeito|outro caso|por que funciona|me mostre|detalhe)$/.test(p);
    const topic=inferred>=0?inferred:((forced||genericFollowup)&&nextArea===area&&Number.isInteger(selectedTopic)&&selectedTopic>=0&&selectedTopic<topicList.length?selectedTopic:-1);
    const t=topic>=0?topicList[topic]:null,l=lessons[age]?.[nextArea];
    if(!l)return {...basic,title:'Biblioteca indisponível',response:'Ainda não tenho uma aula validada sobre esse assunto.'};
    const intent=forced||intentRules.find(([,r])=>r.test(p))?.[0]||(inferred>=0?'explicacao':'desconhecido');
    const broadWords=new Set(['matematica','logica','raciocinio','ciencias','ciencia','linguagem','portugues','tecnologia','me explique','explique','explique matematica','explique ciencias']);
    const broad=broadWords.has(p)||/^(?:o que e |explique |quero aprender |me ensine )?(?:matematica|logica|raciocinio|ciencias|linguagem|portugues|tecnologia)$/.test(p);
    if(!forced&&inferred<0&&!t&&chosen.points>0&&!broad){
      return {area:nextArea,topic:-1,confidence:'baixa',title:'Preciso delimitar o assunto',response:`Sua pergunta parece relacionada a ${nextArea==='matematica'?'Matemática':nextArea==='logica'?'Raciocínio':nextArea==='ciencias'?'Ciências':nextArea==='linguagem'?'Linguagem':'Tecnologia'}, mas não encontrei uma explicação específica e confiável na biblioteca. Escolha um dos temas da lista ou formule uma pergunta mais objetiva. Não vou inventar uma resposta.`};
    }
    if(!forced&&inferred<0&&chosen.points===0&&!t&&!broad&&!genericFollowup){
      return {...basic,title:'Vamos especificar sua pergunta',response:`Não reconheci esse tema na biblioteca offline. Posso explicar “${l.title}”, mostrar exemplos ou ajudar com os assuntos do menu. Escolha uma área ou mencione um assunto concreto.`};
    }
    if(intent==='erro'){
      if(lastError&&typeof lastError.explanation==='string')return {area:nextArea,topic,confidence:'alta',title:'Analisando o erro',response:`No desafio “${lastError.q}”, o raciocínio esperado é: ${lastError.explanation} Pista para uma nova tentativa: ${lastError.hints?.[0]||t?.[7]||l.practice}. O erro não define sua capacidade; ele indica o que revisar.`};
      return {area:nextArea,topic,confidence:'media',title:'Revisão orientada',response:`Ainda não há tentativa incorreta registrada nesta área para revisar. Comece por: ${t?.[7]||l.practice}`};
    }
    const title={explicacao:'Explicação estruturada',exemplo:'Exemplo com raciocínio',pratica:'Desafio para investigar',resumo:'Resumo para revisar',simplificar:'Explicação mais simples',aprofundar:'Um passo além',desconhecido:'Vamos compreender melhor'}[intent]||'Orientação de estudo';
    const short=t?t[1]:l.intro, example=t?t[2]:l.example, hint=t?t[7]:l.practice;
    const res={
      explicacao:`${short} Exemplo: ${example} Estratégia: ${hint}`,
      exemplo:`${example} Como conferir? ${t?t[6]:l.investigate} Experimente criar outro caso parecido.`,
      pratica:`${t?t[3]:l.investigate} Dica sem revelar tudo: ${hint}`,
      resumo:t?`${t[0]}: ${t[1]} Lembre-se: ${hint}`:l.steps.map((step,i)=>`${i+1}. ${step}`).join(' '),
      simplificar:`Imagine a situação do dia a dia: ${example} Comece apenas por este passo: ${hint} O que você já sabe?`,
      aprofundar:`Para investigar com mais cuidado: ${short} Agora justifique por que funciona: ${t?t[6]:l.investigate} Compare com uma situação diferente e explique o que mudou.`,
      desconhecido:`Posso ajudar com “${t?t[0]:l.title}”. Tente perguntar “explique”, “dê um exemplo” ou “vamos praticar”.`
    };
    const ageHint=age==='5-7'?' Se quiser, desenhe ou use objetos para representar o exemplo.':age==='8-10'?' Confira cada etapa e diga qual pista ajudou mais.':' Tente justificar sua conclusão usando evidências ou uma operação inversa.';
    return {area:nextArea,topic,confidence:chosen.confidence,title,response:(res[intent]||res.desconhecido)+ageHint,intent,guide:confidenceText(chosen.confidence)};
  }
  return Object.freeze({norm,hit,detectArea,topicIndex,privacyRisk,safetyRisk,calculate,respond});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=IHTutorEngine;
