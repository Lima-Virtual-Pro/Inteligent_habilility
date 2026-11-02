/* Recuperação explicável local — nunca consulta fontes on-line durante o uso. */
'use strict';
const IHSourceAI36=(()=>{
 const stop=new Set('a o os as um uma uns umas de da do das dos em no na nos nas para por com sem que qual quais como onde quando porque por que seria quero saber me explique explicar diga sobre sao ser eu voce minha mais menos bem isso isto tema uma sua suas seu temos poder preciso pode hoje agora todos todas diante quantos quantas'.split(' '));
 const norm=x=>IHTutorEngine.norm(x).replace(/[.,/%+*÷×-]/g,' ').replace(/\s+/g,' ').trim();
 const aliases={fracoes:'fracao',plantas:'planta',algoritmos:'algoritmo',informacoes:'informacao',mapas:'mapa',senhas:'senha',crianças:'crianca',criancas:'crianca',numeros:'numero',nuvens:'nuvem',sombreamento:'sombra',biomas:'bioma',bioma:'bioma',opinioes:'opiniao',biodiversidade:'biodiversidade',correlacao:'correlacao',causas:'causa',consequencias:'consequencia',porcentagens:'porcentagem',descontos:'desconto',fotossintese:'fotossintese',evaporacao:'evaporacao',evapora:'evaporacao',condensa:'condensacao',condensacao:'condensacao',gravitacional:'gravidade',cartograficas:'cartografica'};
 const tk=x=>norm(x).split(' ').map(w=>aliases[w]||((w.length>5&&w.endsWith('s'))?w.slice(0,-1):w)).filter(w=>w.length>2&&!stop.has(w));
 const ageIndex={'5-7':0,'8-10':1,'11-12':2};
 const states={last:null};
 const phraseHits=(query,txt)=>{const q=norm(query),term=norm(txt);return term.length>3&&(' '+q+' ').includes(' '+term+' ')};
 function score(query,item,selectedArea){
   const asked=tk(query),a=new Set(asked);if(!a.size)return 0;
   const name=tk(item.title),terms=(item.terms||[]).flatMap(tk);
   const union=[...new Set([...name,...terms])],matched=asked.filter(w=>union.includes(w));
   if(!matched.length)return 0;
   let points=matched.length*4;
   const names=asked.filter(x=>name.includes(x));points+=names.length*4;
   if(asked.length>1)points+=Math.round(9*matched.length/asked.length);
   if(phraseHits(query,item.title))points+=18;
   if((item.terms||[]).some(t=>phraseHits(query,t)))points+=11;
   if(item.area===selectedArea)points+=2;
   // Evitar que uma única palavra solta no texto seja tomada por certeza.
   if(matched.length===1&&asked.length>=4)points-=11;
   if((item.kind||'').startsWith('pergunta')&&asked.length>=2&&matched.length===1)points-=8;
   return Math.max(0,points);
 }
 function search(query,{age='8-10',area='auto',limit=12}={}){
   const t=norm(query||'').trim();const max=ageIndex[age]??1;
   const records=IH_CATALOG36.filter(x=>x.min<=max&&(area==='auto'||x.area===area));
   if(!t)return records.filter(x=>x.kind!=='pergunta comentada autoral; fonte de orientação geral').slice(0,limit).map(x=>({...x,score:0}));
   return records.map(x=>({entry:x,score:score(t,x,area)})).filter(x=>x.score>=9).sort((a,b)=>b.score-a.score||a.entry.title.localeCompare(b.entry.title)).slice(0,limit).map(x=>({...x.entry,score:x.score}));
 }
 function safeQuestion(query){const n=norm(query);return /\b(?:medicamento|remedio|remedios|dosagem|dose|veneno|arma|bomba|suicidio|autoagressao|diagnostico|abuso|machucar|explosivo)\b/.test(n);}
 function toAnswer(entry,what='explicacao'){
   const text={
    explicacao:`${entry.explain} Exemplo comentado: ${entry.example} ${entry.pitfall?'Cuidado com um erro comum: '+entry.pitfall:''}`,
    exemplo:`Vamos usar um exemplo: ${entry.example} Agora tente explicar como esse exemplo se relaciona com ${entry.title.toLowerCase()}.`,
    simplificar:`Primeiro, veja um caso: ${entry.example} Depois, guarde a ideia central: ${entry.explain}`,
    aprofundar:`Ideia: ${entry.explain} Investigação: ${entry.ask} ${entry.pitfall?'Atenção: '+entry.pitfall:''}`,
    pista:`Uma pista sem revelar automaticamente o resultado: ${entry.hint}`,
    guiar:`Vamos raciocinar em etapas. ${entry.ask} Pista inicial: ${entry.hint}`,
    conferir:`Compare sua conclusão com este exemplo: ${entry.example} ${entry.pitfall?'Verifique também: '+entry.pitfall:''}`,
    resumo:`Resumo: ${entry.explain}`,
    erro:`Reveja a regra principal: ${entry.explain} ${entry.pitfall?'Evite: '+entry.pitfall:''} Pista: ${entry.hint}`,
    pratica:`Atividade guiada: ${entry.ask} Pista opcional: ${entry.hint}`
   };
   const s=IH_SOURCES36[entry.source]||IH_SOURCES36.BNCC;
   return {title:entry.title,response:text[what]||text.explicacao,area:entry.area,confidence:'media',topic:-1,source:s.name,sourceInfo:{...s,id:entry.source},trace:{id:entry.id,kind:entry.kind,min:entry.min,score:entry.score||0},intent:what};
 }
 const continuation=p=>/^(?:(?:explique|fala|mostre) de outro jeito|mais simples|nao entendi|outro exemplo|me de um exemplo|aprofunde|resumo|resuma|uma pista|me de uma pista|pista|vamos praticar|praticar|guie|como conferir|porque|por que|ajuda)$/.test(p);
 function intent(q,forced=''){
  if(forced)return forced;const p=norm(q);
  if(/\b(pista|dica|sem revelar)\b/.test(p))return 'pista';
  if(/\b(exemplo|exemplifique)\b/.test(p))return 'exemplo';
  if(/\b(mais simples|simplifique a explicacao|nao entendi|outro jeito)\b/.test(p))return 'simplificar';
  if(/\b(pratique|praticar|exercicio|atividade)\b/.test(p))return 'pratica';
  if(/\b(aprofunde|mais dificil|aprofundar)\b/.test(p))return 'aprofundar';
  if(/\b(resuma|resumo|resumir)\b/.test(p))return 'resumo';
  if(/\b(conferir|verificar)\b/.test(p))return 'conferir';
  if(/\b(por que errei|erro)\b/.test(p))return 'erro';
  return 'explicacao';
 }
 function respond(args={}){
  const query=String(args.text||'').trim().slice(0,250),age=args.age||'5-7',forced=args.forced||'',n=norm(query);
  // Segurança e cálculos já são executados no motor determinístico existente.
  if(/\b(meu endereco|minha senha|meu cpf|meu nome completo|meu telefone|moro na rua|endereco da minha casa)\b/.test(n)){
   states.last=null;return {title:'Proteja seus dados pessoais',response:'Não compartilhe nome completo, endereço, senhas ou outros dados pessoais em perguntas. Peça orientação de um adulto de confiança.',confidence:'baixa',area:args.area||'tecnologia',source:'proteção de privacidade local'};
  }
  if(IHTutorEngine.privacyRisk(query)||IHTutorEngine.safetyRisk(n)) {states.last=null;return IHAdvancedAI.respond(args);}
  if(safeQuestion(query)){states.last=null;return {title:'Peça ajuda a um adulto de confiança',response:'Essa pergunta exige orientação de um responsável ou profissional adequado. Não é seguro dar instruções específicas sobre esse assunto em um aplicativo infantil.',confidence:'baixa',area:args.area||'ciencias',source:'limite de segurança do tutor local'};}
  const math=IHTutorEngine.calculate(query);
  if(!forced&&math){states.last=null;return {...math,source:'cálculo local determinístico',confidence:'alta'};}
  const verbal=IHAdvancedAI.wordProblem(query);
  if(!forced&&verbal){states.last=null;return verbal;}
  const relevant=search(query,{age,limit:3});
  const recent=states.last&&states.last.age===age?IH_CATALOG36.find(x=>x.id===states.last.id):null;
  const chosen=((!forced&&!continuation(n))?relevant[0]:null)||(recent&&((forced||continuation(n))?recent:null));
  if(chosen){
   const next=relevant[1];
   if(!forced&&!continuation(n)&&next&&next.area!==chosen.area&&next.score>=chosen.score-2&&chosen.score<20){
    return {title:'Qual desses assuntos você quer?',response:`Encontrei mais de uma interpretação: “${chosen.title}” e “${next.title}”. Escreva um dos títulos para eu explicar sem adivinhar.`,confidence:'baixa',area:args.area||'logica',source:'checagem de ambiguidade'};
   }
   states.last={id:chosen.id,age};return toAnswer(chosen,intent(query,forced));
  }
  const base=IHAdvancedAI.respond(args);
  states.last=null;
  if(base.confidence==='alta'&&base.topic<0&&!base.mode)base.confidence='media';
  return base;
 }
 function resetSession(){states.last=null;IHAdvancedAI.resetSession();}
 return {respond,resetSession,search,detail:id=>IH_CATALOG36.find(x=>x.id===id)||null,sources:IH_SOURCES36,catalog:IH_CATALOG36};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=IHSourceAI36;
