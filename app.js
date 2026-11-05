/* Inteligent Hability 3.5 | offline, tutor local e privacidade por padrão. */
(() => {
  'use strict';
  const KEY='inteligent-hability.v3';
  const LEGACY_KEY='inteligent-hability.v2';
  const PRIV_KEY='inteligent-hability.privacy.v3';
  const VALID_AGES=['5-7','8-10','11-12'];
  const VALID_AREAS=Object.keys(AREAS);
  const today=()=>new Date().toISOString().slice(0,10);
  const now=()=>Date.now();
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nl=s=>esc(s).replace(/\n/g,'<br>');
  const limited=(v,max)=>typeof v==='string'?v.slice(0,max):'';
  const safeArray=(v,max)=>Array.isArray(v)?v.slice(0,max):[];
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const DEFAULT=()=>({version:2,faixa:'5-7',answers:{},flash:{},ideas:[],missions:{},settings:{large:false,contrast:false,motion:false},log:[],tutorPractice:{}});
  let state=DEFAULT();
  let storageOK=true;
  let loadWarning='';
  let persistenceEnabled=false;
  let privacyChosen=false;
  let attemptsThisSession=0;
  let activeQuestion=null;
  let answerIndex=null;
  let hintCount=0;
  let questionResult=null;
  let activeCard=null;
  let cardShown=false;
  let missionIndex=0;
  let missionStory=[];
  let missionChoices=[];
  let workingMissionId='';
  let lastArea='logica';
  let speakUtterance=null;
  let tutorActivity=null;
  let tutorActivityRecorded=false;

  function validate(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==2) throw Error('Arquivo incompatível: é necessário um backup da versão 2.0.');
    const s=DEFAULT();
    if(VALID_AGES.includes(raw.faixa)) s.faixa=raw.faixa;
    if(raw.answers&&typeof raw.answers==='object'&&!Array.isArray(raw.answers)){
      for(const [id,x] of Object.entries(raw.answers).slice(0,200)){
        const q=QUESTION_BANK.find(o=>o.id===id);
        if(!q||!x||typeof x!=='object')continue;
        s.answers[id]={tries:clamp(Number(x.tries)||0,0,10000),correct:clamp(Number(x.correct)||0,0,10000),last:clamp(Number(x.last)||0,0,Number.MAX_SAFE_INTEGER),misses:clamp(Number(x.misses)||0,0,10000)};
        s.answers[id].correct=Math.min(s.answers[id].tries,s.answers[id].correct);
      }
    }
    if(raw.flash&&typeof raw.flash==='object'&&!Array.isArray(raw.flash)){
      for(const [id,x] of Object.entries(raw.flash).slice(0,100)){
        if(!/^((5-7)|(8-10)|(11-12)):(logica|matematica|ciencias|linguagem|tecnologia):[0-2]$/.test(id)||!x||typeof x!=='object')continue;
        s.flash[id]={level:clamp(Number(x.level)||0,0,4),due:clamp(Number(x.due)||0,0,Number.MAX_SAFE_INTEGER),reviews:clamp(Number(x.reviews)||0,0,10000)};
      }
    }
    for(const x of safeArray(raw.ideas,80)){
      if(!x||typeof x!=='object'||!VALID_AGES.includes(x.faixa)||!Number.isInteger(x.lab)||x.lab<0||x.lab>3)continue;
      const body=limited(x.text,1500);
      if(!body.trim()||IHTutorEngine.privacyRisk(body))continue;
      s.ideas.push({id:limited(x.id,80)||'ideia-'+s.ideas.length,faixa:x.faixa,lab:x.lab,text:body,date:limited(x.date,30)});
    }
    if(raw.missions&&typeof raw.missions==='object'&&!Array.isArray(raw.missions)){
      const ids=Object.values(MISSIONS).flat().map(m=>m.id);
      for(const [id,x] of Object.entries(raw.missions).slice(0,30)) if(ids.includes(id)&&x&&typeof x==='object')s.missions[id]={done:!!x.done,completed:limited(x.completed,30),choices:safeArray(x.choices,3).filter(n=>Number.isInteger(n)&&n>=0&&n<=2)};
    }
    if(raw.settings&&typeof raw.settings==='object')for(const k of Object.keys(s.settings))s.settings[k]=raw.settings[k]===true;
    for(const e of safeArray(raw.log,300))if(e&&typeof e==='object'&&VALID_AGES.includes(e.faixa)&&VALID_AREAS.includes(e.area)&&typeof e.id==='string'&&QUESTION_BANK.some(q=>q.id===e.id)){
      s.log.push({id:limited(e.id,10),faixa:e.faixa,area:e.area,correct:!!e.correct,at:clamp(Number(e.at)||0,0,Number.MAX_SAFE_INTEGER)});
    }
    if(raw.tutorPractice&&typeof raw.tutorPractice==='object'&&!Array.isArray(raw.tutorPractice)){
      for(const [key,val] of Object.entries(raw.tutorPractice).slice(0,15)){
        if(!/^(5-7|8-10|11-12):(logica|matematica|ciencias|linguagem|tecnologia)$/.test(key)||!val||typeof val!=='object')continue;
        const attempts=clamp(Math.trunc(Number(val.attempts)||0),0,10000),correct=clamp(Math.trunc(Number(val.correct)||0),0,attempts);
        s.tutorPractice[key]={attempts,correct};
      }
    }
    return s;
  }
  function load(){
    try{
      const mode=localStorage.getItem(PRIV_KEY);
      privacyChosen=mode==='session'||mode==='allow';
      persistenceEnabled=mode==='allow';
      if(persistenceEnabled){
        const raw=localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY);
        if(raw)state=validate(JSON.parse(raw));
      }
    }catch(e){
      if(e instanceof SyntaxError || (e.message||'').includes('incompatível')){
        loadWarning='Não foi possível recuperar o progresso anterior. Os dados existentes não foram apagados. Você pode continuar nesta sessão ou importar um backup válido.';
      }else{
        storageOK=false;privacyChosen=false; // Ambiente sem armazenamento acessível: funcionamento temporário por padrão.
      }
      persistenceEnabled=false;
      console.warn('Armazenamento ou estado local indisponível:',e);
    }
    checkStorage();updatePrivacyStatus();
  }
  function checkStorage(){
    try{const k='ih-test';localStorage.setItem(k,'1');localStorage.removeItem(k);}catch{storageOK=false;}
    $('alerta-armazenamento').hidden=!loadWarning&&(storageOK||!persistenceEnabled);
    if(loadWarning)$('alerta-armazenamento').textContent=loadWarning;
  }
  function save(){
    if(!persistenceEnabled||!storageOK)return;
    try{localStorage.setItem(KEY,JSON.stringify(state));localStorage.removeItem(LEGACY_KEY);}
    catch{storageOK=false;checkStorage();updatePrivacyStatus();}
  }
  function updatePrivacyStatus(){
    const line=$('aviso-sessao'),status=$('estado-privacidade');
    const label=persistenceEnabled&&storageOK?'🛡️ Progresso guardado apenas neste navegador.':'🛡️ Modo privado: o progresso desta sessão não é armazenado permanentemente.';
    line.textContent=label;line.classList.toggle('saved',persistenceEnabled&&storageOK);
    if(status)status.textContent=label;
    const disable=$('desativar-registro');if(disable)disable.disabled=!persistenceEnabled;
  }
  function showPrivacyDialog(){
    const dialog=$('privacidade-inicial');
    $('responsavel-declara').checked=false;$('politicas-declara').checked=false;$('modo-salvar').disabled=true;
    if(typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();
    else if(typeof dialog.showModal!=='function'){
      dialog.setAttribute('open','');
      dialog.style.position='fixed';dialog.style.zIndex='9999';
    }
  }
  function selectPrivacyMode(allow){
    if(allow&&(!$('responsavel-declara').checked||!$('politicas-declara').checked))return;
    if(allow&&!storageOK){alert('Este navegador não permite guardar os dados. Continue no modo privado.');return;}
    if(allow&&!persistenceEnabled){
      try{
        const old=localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY);
        if(old&&!Object.keys(state.answers).length&&!state.ideas.length&&!state.log.length){
          try{state=validate(JSON.parse(old));}catch{console.warn('Backup anterior incompatível ou inválido.');}
        }
      }catch{}
    }
    persistenceEnabled=allow;privacyChosen=true;
    try{localStorage.setItem(PRIV_KEY,allow?'allow':'session');}catch{storageOK=false;persistenceEnabled=false;}
    if(allow)save();
    if($('privacidade-inicial').open)$('privacidade-inicial').close();
    $('faixa').value=state.faixa;applyPrefs();updatePrivacyStatus();renderHome();
    const shown=document.querySelector('.view:not([hidden])')?.id;
    if(shown==='responsaveis')renderReport();
  }
  function resetSession(){if(typeof IHAdvancedAI!=='undefined')IHAdvancedAI.resetSession();tutorActivity=null;tutorActivityRecorded=false;if($('ai35-pratica'))$('ai35-pratica').innerHTML='';if($('ai35-feedback'))$('ai35-feedback').innerHTML='';if($('ai35-plano-resposta'))$('ai35-plano-resposta').innerHTML='';activeQuestion=null;answerIndex=null;hintCount=0;questionResult=null;activeCard=null;cardShown=false;missionStory=[];missionChoices=[];missionIndex=0;workingMissionId='';}
  function stats(age=state.faixa){
    const qs=QUESTION_BANK.filter(q=>q.f===age);
    const keys=new Set(qs.map(q=>q.id));
    const rec=state.log.filter(e=>e.faixa===age&&keys.has(e.id));
    const seen=qs.filter(q=>(state.answers[q.id]?.tries||0)>0).length;
    return {total:rec.length,correct:rec.filter(e=>e.correct).length,seen,review:Object.entries(state.flash).filter(([id])=>id.startsWith(age+':')).reduce((a,[,x])=>a+x.reviews,0),ideas:state.ideas.filter(e=>e.faixa===age).length,missions:MISSIONS[age].filter(e=>state.missions[e.id]?.done).length};
  }
  function areaStats(area,age=state.faixa){
    const r=state.log.filter(x=>x.area===area&&x.faixa===age);
    return {n:r.length,good:r.filter(x=>x.correct).length};
  }
  function recommendArea(){
    const arr=VALID_AREAS.map((a,i)=>{const {n,good}=areaStats(a);return {a,i,score:n===0?-1:good/n+(n<3?0.01*n:0.2)};});
    arr.sort((a,b)=>a.score-b.score||a.i-b.i);
    return arr[0].a;
  }
  function targetDifficulty(area){
    const last=state.log.filter(x=>x.faixa===state.faixa&&x.area===area).slice(-6);
    if(last.length<3)return 2;
    const rate=last.filter(x=>x.correct).length/last.length;
    return rate>=.8?3:rate<=.4?1:2;
  }
  function renderDailyPlan(){
    const area=recommendArea(), recent=state.log.filter(x=>x.faixa===state.faixa).slice(-10);
    const errors=recent.filter(x=>!x.correct), weak=errors.length?errors[errors.length-1].area:area;
    const due=cards().filter(c=>!state.flash[c.id] || (state.flash[c.id].due||0)<=now()).length;
    const steps=[
      {icon:'🧩',title:'Investigar',description:`Resolva um desafio de ${AREAS[area].name.toLowerCase()} e explique seu raciocínio.`,action:'desafios',area},
      {icon:'📘',title:'Compreender',description:`Revise a aula de ${AREAS[weak].name.toLowerCase()}${errors.length?' e descubra outra estratégia para seu erro recente':''}.`,action:'tutor',area:weak},
      {icon:'🧠',title:'Recordar',description:due?`Você tem ${due} cartão(ões) disponíveis para revisão nesta faixa.`:'Parabéns pelas revisões! Você pode explorar um cartão novamente.',action:'flashcards'},
      {icon:'🚀',title:'Inventar',description:'Crie uma solução original no laboratório e descreva como testá-la.',action:'laboratorio'}
    ];
    $('plano-diario').innerHTML=steps.map((t,i)=>`<div class="plan-step"><div class="plan-index">${i+1}</div><div><strong>${t.icon} ${t.title}</strong><p>${esc(t.description)}</p></div><button type="button" class="btn btn-outline" data-plan="${i}">Explorar →</button></div>`).join('');
    $('plano-diario').querySelectorAll('[data-plan]').forEach(b=>b.addEventListener('click',()=>{
      const t=steps[Number(b.dataset.plan)];
      if(t.action==='desafios'){$('quiz-area').value=t.area;activeQuestion=null;}
      if(t.action==='tutor')$('tutor-area').value=t.area;
      go(t.action);
    }));
  }
  function renderHome(){
    const x=stats();
    $('resumo').innerHTML=[['🧩',x.seen,'Desafios explorados'],['🎯',x.total?Math.round(100*x.correct/x.total)+'%':'—','Acertos nas tentativas'],['🧠',x.review,'Revisões realizadas'],['🚀',x.ideas+x.missions,'Criações e missões']].map(([ico,num,label])=>`<div class="stat-card"><span aria-hidden="true">${ico}</span><strong>${num}</strong><small>${label}</small></div>`).join('');
    const area=recommendArea(), a=AREAS[area];
    const beginner=x.total<4;
    $('sugestao-trilha').innerHTML=`<div><strong>✨ ${beginner?'Por onde começar':'Uma sugestão para sua próxima descoberta'}</strong><p>${beginner?'Que tal experimentar uma pergunta e depois descobrir a explicação?':`Você pode fortalecer sua prática em ${esc(a.name.toLowerCase())}. A recomendação considera somente suas tentativas neste aparelho.`}</p></div><button type="button" class="btn btn-main" id="seguir-sugestao">Explorar ${esc(a.name)} →</button>`;
    $('seguir-sugestao').addEventListener('click',()=>{$('quiz-area').value=area;nextQuestion();go('desafios');});
    renderDailyPlan();
  }
  function go(name){
    if(!$(`titulo-${name}`))return;
    document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==name);
    document.querySelectorAll('.nav-item').forEach(el=>{
      const current=el.dataset.view===name;el.classList.toggle('active',current);
      if(current)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
    });
    if(name==='inicio')renderHome();
    if(name==='desafios'){if(!activeQuestion||activeQuestion.f!==state.faixa)nextQuestion();else renderQuestion();}
    if(name==='tutor')renderTutor();
    if(name==='mapas')renderMap();
    if(name==='flashcards')nextCard(false);
    if(name==='laboratorio')renderLab();
    if(name==='missoes')renderMission();
    if(name==='responsaveis')renderReport();
    const h=$(`titulo-${name}`);h.setAttribute('tabindex','-1');h.focus({preventScroll:true});
    try{window.scrollTo({top:0,behavior:'auto'});}catch{}
  }
  function chooseQuestion(){
    const a=$('quiz-area').value;
    const area=a==='auto'?recommendArea():a;
    const choices=QUESTION_BANK.filter(q=>q.f===state.faixa&&(a==='auto'||q.a===a));
    const available=choices.filter(q=>q.id!==activeQuestion?.id);
    const pool=available.length?available:choices;
    const preferred=targetDifficulty(area);
    const date=now();
    // Unseen questions first; then missed questions and least-recently practiced ones.
    const scored=pool.map(q=>{
      const r=state.answers[q.id]||{tries:0,correct:0,misses:0,last:0};
      let score=(r.tries===0?200:0)+(r.misses>0?Math.min(60,r.misses*8):0)
                +(r.tries?Math.min(35,(date-r.last)/86400000*5):20)
                -Math.abs(q.difficulty-preferred)*12;
      if(a==='auto'&&q.a===area)score+=28;
      score+=Math.random()*4;
      return {q,score};
    });
    scored.sort((x,y)=>y.score-x.score);
    return scored[0]?.q||QUESTION_BANK[0];
  }
  function nextQuestion(){activeQuestion=chooseQuestion();answerIndex=null;hintCount=0;questionResult=null;renderQuestion();}
  function renderQuestion(){
    const q=activeQuestion;if(!q)return;
    lastArea=q.a;
    const area=AREAS[q.a];
    const completed=state.answers[q.id]?.tries||0;
    $('quiz-conteudo').innerHTML=`<div class="question-chip">${area.icon} ${esc(area.name)} · Nível ${q.difficulty}/3 · ${completed?'Revisão':'Nova descoberta'}</div><h2 class="question-heading">${esc(q.q)}</h2><p class="muted small-text">Escolha uma opção. Depois de responder, confira o raciocínio completo.</p><div class="choices">${q.opts.map((o,i)=>`<button type="button" data-answer="${i}" class="choice ${questionResult!==null?(i===q.correct?'correct':(i===answerIndex?'incorrect':'')):''}" ${questionResult!==null?'disabled':''}><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span></button>`).join('')}</div><div id="questao-feedback" aria-live="polite"></div><div class="quiz-actions"><button type="button" class="btn btn-outline" id="quiz-dica" ${hintCount>=2||questionResult!==null?'disabled':''}>💡 ${hintCount?'Mais uma dica':'Preciso de uma dica'}</button><button type="button" class="btn btn-main" id="quiz-proxima">Próximo desafio →</button></div>`;
    $('quiz-orientador').innerHTML=`<p>Você está explorando <strong>${esc(area.name.toLowerCase())}</strong>. ${q.difficulty===1?'Comece observando as pistas mais simples.':q.difficulty===3?'Procure explicar a resposta com evidências.':'Use desenhos e compare as possibilidades.'}</p><div class="mini-tile"><strong>Estratégia</strong><p>${esc(LESSONS[state.faixa][q.a].practice)}</p></div><div class="mini-tile"><strong>Seu caminho</strong><p>${esc(completed?'Esta pergunta já foi praticada. Tente explicar a resposta de um jeito novo.':'Depois de responder, veja uma explicação completa e compare com seu pensamento.')}</p></div>`;
    $('quiz-conteudo').querySelectorAll('[data-answer]').forEach(btn=>btn.addEventListener('click',()=>answer(Number(btn.dataset.answer))));
    $('quiz-proxima').addEventListener('click',nextQuestion);
    $('quiz-dica').addEventListener('click',()=>{if(hintCount<2&&questionResult===null){hintCount++;renderQuestion();}});
    const box=$('questao-feedback');
    if(hintCount&&questionResult===null)box.innerHTML=`<div class="feedback-box"><strong>💡 Dica ${hintCount}</strong><p>${esc(q.hints[hintCount-1])}</p></div>`;
    if(questionResult!==null){
      box.innerHTML=`<div class="feedback-box ${questionResult?'good':'warn'}"><strong>${questionResult?'🌟 Boa descoberta!':'🔍 Uma oportunidade de aprender'}</strong><p>${esc(q.explanation)}</p><p><strong>Resposta:</strong> ${esc(q.opts[q.correct])}</p><p class="small-text">${hintCount?'As dicas fazem parte da aprendizagem. ':''}Explique o motivo usando suas próprias palavras.</p></div>`;
      $('quiz-orientador').innerHTML+=`<div class="mini-tile"><strong>Para compreender melhor</strong><p>${esc(LESSONS[state.faixa][q.a].example)}</p></div>`;
    }
  }
  function answer(index){
    if(questionResult!==null||!activeQuestion||!Number.isInteger(index)||index<0||index>=activeQuestion.opts.length)return;
    answerIndex=index;questionResult=index===activeQuestion.correct;
    const id=activeQuestion.id, a=state.answers[id]||{tries:0,correct:0,misses:0,last:0};
    a.tries++;a.correct+=Number(questionResult);a.misses+=Number(!questionResult);a.last=now();state.answers[id]=a;
    state.log.push({id,faixa:state.faixa,area:activeQuestion.a,correct:questionResult,at:a.last});
    if(state.log.length>300)state.log=state.log.slice(-300);
    save();renderQuestion();
    attemptsThisSession++;
    if(attemptsThisSession%8===0){
      const d=$('lembrete-pausa');if(typeof d.showModal==='function'&&!d.open)d.showModal();
    }
  }
  function tutorArea(){return VALID_AREAS.includes($('tutor-area').value)?$('tutor-area').value:'logica';}
  function getTutorTopic(){
    const area=tutorArea(),raw=$('tutor-topico').value,idx=raw===''?-1:Number(raw);
    return Number.isInteger(idx)&&idx>=0&&idx<TUTOR_TOPICS[state.faixa][area].length?TUTOR_TOPICS[state.faixa][area][idx]:null;
  }
  function renderTutor(){
    const area=tutorArea(),l=LESSONS[state.faixa][area];
    const sel=$('tutor-topico'),current=`${state.faixa}:${area}`;
    if(sel.dataset.scope!==current){
      sel.innerHTML='<option value="">Aula principal — visão geral</option>'+TUTOR_TOPICS[state.faixa][area].map((t,i)=>`<option value="${i}">${esc(t[0])}</option>`).join('');
      sel.dataset.scope=current;
    }
    const t=getTutorTopic();
    if(t){
      $('tutor-aula').innerHTML=`<span class="lesson-badge">${AREAS[area].icon} Tema aprofundado · ${state.faixa} anos</span><h2 class="question-heading">${esc(t[0])}</h2><p>${esc(t[1])}</p><div class="feedback-box good"><strong>📌 Exemplo explicado</strong><p>${esc(t[2])}</p></div><p><strong>Estratégia:</strong> ${esc(t[7])}</p>`;
      renderTutorCheck(t);
    } else {
      $('tutor-aula').innerHTML=`<span class="lesson-badge">${AREAS[area].icon} Miniaula da faixa ${state.faixa} anos</span><h2 class="question-heading">${esc(l.title)}</h2><p>${esc(l.intro)}</p><h3>Vamos compreender por etapas</h3><ol class="lesson-steps">${l.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="feedback-box good"><strong>📌 Exemplo comentado</strong><p>${esc(l.example)}</p></div><h3>Prática investigativa</h3><p>${esc(l.investigate)}</p><p><strong>Estratégia de estudo:</strong> ${esc(l.practice)}</p>`;
      $('tutor-checagem').innerHTML='<div class="empty-note">Selecione um assunto aprofundado acima para explorar uma questão de compreensão com feedback.</div>';
    }
    $('tutor-resposta').innerHTML='';
  }
  function renderTutorCheck(t){
    $('tutor-checagem').innerHTML=`<h3>🎯 Verifique se compreendeu</h3><p>${esc(t[3])}</p><div class="choices">${t[4].map((text,i)=>`<button type="button" class="choice" data-mini-answer="${i}"><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(text)}</span></button>`).join('')}</div><div id="tutor-check-feedback" aria-live="polite"></div>`;
    $('tutor-checagem').querySelectorAll('[data-mini-answer]').forEach(b=>b.addEventListener('click',()=>{
      const correct=Number(b.dataset.miniAnswer)===t[5];
      $('tutor-checagem').querySelectorAll('[data-mini-answer]').forEach(x=>{x.disabled=true;if(Number(x.dataset.miniAnswer)===t[5])x.classList.add('correct');else if(x===b)x.classList.add('incorrect');});
      $('tutor-check-feedback').innerHTML=`<div class="feedback-box ${correct?'good':'warn'}"><strong>${correct?'Muito bem!':'Vamos pensar juntos.'}</strong><p>${esc(t[6])}</p><p>${esc(t[7])}</p><button type="button" id="tutor-tentar" class="btn btn-outline">Praticar de novo</button></div>`;
      $('tutor-tentar').addEventListener('click',()=>renderTutorCheck(t));
    }));
  }
  function normalize(t){return IHTutorEngine.norm(t);}
  function tutorRespond(forcedIntent=''){
    const raw=$('pergunta-tutor').value.trim(),area=tutorArea(),box=$('tutor-resposta');
    const recent=state.log.filter(x=>x.faixa===state.faixa&&x.area===area&&!x.correct).slice(-1)[0];
    const lastError=recent?QUESTION_BANK.find(q=>q.id===recent.id):null;
    const rawTopic=$('tutor-topico').value;
    const selectedTopic=rawTopic===''?-1:Number(rawTopic);
    const answer=IHAdvancedAI.respond({text:raw,forced:forcedIntent,age:state.faixa,area,
      topics:TUTOR_TOPICS,lessons:LESSONS,lastError,selectedTopic});
    if(answer.area!==area&&VALID_AREAS.includes(answer.area)){
      $('tutor-area').value=answer.area;renderTutor();
    }
    if(Number.isInteger(answer.topic)&&answer.topic>=0&&answer.topic<TUTOR_TOPICS[state.faixa][tutorArea()].length){
      $('tutor-topico').value=String(answer.topic);renderTutor();
    }
    box.innerHTML=`<div class="feedback-box ${answer.confidence==='baixa'?'warn':''}"><strong>💡 ${esc(answer.title)}</strong><p>${esc(answer.response)}</p><p class="muted small-text">Base: ${esc(answer.source||'regras locais')} · ${answer.confidence==='baixa'?'Tema não confirmado':'Resposta vinculada ao conteúdo disponível'}. ${answer.mode==='calculo'?'Conferência por cálculo local.':''}</p></div>`;
    if(forcedIntent==='pratica')startTutorPractice();
  }
  function tutorSkillsSave(grade,practice){
    if(tutorActivityRecorded||!['correct','incorrect'].includes(grade.status))return;
    tutorActivityRecorded=true;
    const key=`${state.faixa}:${practice.area}`,rec=state.tutorPractice[key]||{attempts:0,correct:0};
    rec.attempts=Math.min(10000,rec.attempts+1);rec.correct=Math.min(rec.attempts,rec.correct+Number(grade.correct));
    state.tutorPractice[key]=rec;save();
  }
  function startTutorPractice(){
    const area=tutorArea();tutorActivity=IHAdvancedAI.createPractice({age:state.faixa,area,topics:TUTOR_TOPICS});
    tutorActivityRecorded=false;
    $('ai35-feedback').textContent='';
    const item=tutorActivity;
    if(!item){$('ai35-pratica').innerHTML='<div class="empty-note">Não há atividade disponível para esta seleção.</div>';return;}
    let body=`<span class="lesson-badge">Atividade local · ${esc(AREAS[area].name)}</span><p class="ai35-question">${esc(item.question)}</p>`;
    if(item.type==='choice'){
      body+=`<div class="ai35-choices">${item.options.map((op,i)=>`<label><input type="radio" name="ai35-choice" value="${i}"><span>${esc(op)}</span></label>`).join('')}</div>`;
    }else body+='<label for="ai35-input">Sua resposta</label><input type="text" id="ai35-input" inputmode="decimal" maxlength="36" placeholder="Ex.: 12 ou 1/2" autocomplete="off">';
    body+=`<div class="ai35-toolbar"><button type="button" class="btn btn-main" id="ai35-verificar">Conferir resposta</button><button type="button" class="btn btn-quiet" id="ai35-revelar">Ver pista</button><button type="button" class="btn btn-outline" id="ai35-proxima">Outra atividade</button></div>`;
    $('ai35-pratica').innerHTML=body;
    $('ai35-verificar').addEventListener('click',gradeTutorPractice);
    $('ai35-revelar').addEventListener('click',()=>{$('ai35-feedback').innerHTML=`<div class="feedback-box">🔍 ${esc(tutorActivity.hint)}</div>`;});
    $('ai35-proxima').addEventListener('click',startTutorPractice);
    $('ai35-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')gradeTutorPractice();});
  }
  function gradeTutorPractice(){
    if(!tutorActivity)return;
    const chosen=tutorActivity.type==='choice'?document.querySelector('input[name="ai35-choice"]:checked')?.value:$('ai35-input')?.value;
    const grade=IHAdvancedAI.grade(tutorActivity,chosen);
    if(grade.status!=='invalid'&&grade.status!=='error')tutorSkillsSave(grade,tutorActivity);
    $('ai35-feedback').innerHTML=`<div class="feedback-box ${grade.status==='correct'?'good':grade.status==='incorrect'?'warn':''}"><strong>${grade.status==='correct'?'✅ Você encontrou a solução!':grade.status==='incorrect'?'Vamos investigar:':'Confira sua entrada:'}</strong><p>${esc(grade.message)}</p></div>`;
    if(grade.status==='correct'){
      $('ai35-verificar').disabled=true;
      $('ai35-pratica').querySelectorAll('input').forEach(e=>e.disabled=true);
    }
  }
  function tutorNextStep(){
    const result=IHAdvancedAI.plan({age:state.faixa,log:state.log,tutorPractice:state.tutorPractice});
    $('ai35-plano-resposta').innerHTML=`<div class="feedback-box good"><strong>🧭 Próximo passo: ${esc(AREAS[result.area].name)}</strong><p>${esc(result.reason)}</p><ol>${result.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p class="muted small-text">Sugestão pedagógica baseada somente nas tentativas locais, sem diagnóstico de habilidades.</p></div>`;
    $('tutor-area').value=result.area;renderTutor();
  }
  function readTutor(){
    if(!('speechSynthesis' in window)){ $('tutor-resposta').innerHTML='<div class="feedback-box warn">Seu navegador não dispõe de leitura em voz alta.</div>';return; }
    window.speechSynthesis.cancel();
    const l=LESSONS[state.faixa][tutorArea()],t=getTutorTopic();
    speakUtterance=new SpeechSynthesisUtterance(t?[t[0],t[1],t[2],t[7]].join('. '):[l.title,l.intro,...l.steps,l.example].join('. '));
    speakUtterance.lang='pt-BR';speakUtterance.rate=.88;
    window.speechSynthesis.speak(speakUtterance);
    $('tutor-resposta').innerHTML='<div class="feedback-box">O navegador iniciou a leitura, caso haja uma voz em português instalada. Para interromper, pressione o botão novamente.</div>';
  }
  function renderMap(){
    const a=$('mapa-area').value,l=LESSONS[state.faixa][a];
    $('mapa-conteudo').innerHTML=`<div class="map-center">${AREAS[a].icon} ${esc(l.title)}</div><div class="map-grid"><details class="map-branch" open><summary>1. Ideia central</summary><p>${esc(l.intro)}</p></details><details class="map-branch"><summary>2. Como pensar</summary><ol class="note-list">${l.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></details><details class="map-branch"><summary>3. Exemplo explicado</summary><p>${esc(l.example)}</p></details><details class="map-branch"><summary>4. Exploração e prática</summary><p>${esc(l.investigate)}</p><p><strong>Para refletir:</strong> ${esc(l.practice)}</p></details></div><p class="muted small-text">Abra cada ramo usando toque, Enter ou barra de espaço. Os conceitos são exemplos de estudo, não um laudo de habilidades.</p>`;
  }
  function cards(){
    const a=$('flash-area').value;
    return VALID_AREAS.flatMap(area=>LESSONS[state.faixa][area].cards.map(([front,back],i)=>({id:`${state.faixa}:${area}:${i}`,a:area,front,back}))).filter(x=>a==='auto'||x.a===a);
  }
  function nextCard(select=true){
    const available=cards();
    if(!available.length)return;
    if(!select&&activeCard&&available.some(x=>x.id===activeCard.id)){
      renderCard();return;
    }
    const rightNow=now();
    const candidates=available.filter(x=>x.id!==activeCard?.id);
    const pool=candidates.length?candidates:available;
    const scored=pool.map(c=>{
      const h=state.flash[c.id];
      return {c,score:h?(h.due<=rightNow?30+Math.min(12,(rightNow-h.due)/86400000):(-5-(h.due-rightNow)/86400000)):90};
    });
    scored.sort((a,b)=>b.score-a.score||a.c.id.localeCompare(b.c.id));
    activeCard=scored[0].c;cardShown=false;renderCard();
  }
  function renderCard(){
    if(!activeCard)return;
    const c=activeCard;
    const h=state.flash[c.id];
    $('flash-conteudo').innerHTML=`<div class="flash-meta">${AREAS[c.a].icon} ${esc(AREAS[c.a].name)} · ${h?'Revisões anteriores: '+h.reviews:'Novo cartão'} · ${cardShown?'Resposta':'Pergunta'}</div><div class="flashcard ${cardShown?'answer':''}"><strong>${esc(cardShown?c.back:c.front)}</strong></div><div class="flash-buttons">${cardShown?'<button type="button" class="btn btn-outline" data-rate="again">🔁 Revisar depois</button><button type="button" class="btn btn-main" data-rate="ok">✅ Lembrei</button>':'<button type="button" class="btn btn-main" id="flash-revelar">Mostrar resposta</button>'}<button type="button" class="btn btn-quiet" id="flash-outro">Outro cartão →</button></div><p class="flash-meta">${cardShown?'Se não lembrou, a revisão será antecipada.':'Tente responder mentalmente antes de revelar.'}</p>`;
    $('flash-revelar')?.addEventListener('click',()=>{cardShown=true;renderCard();});
    $('flash-outro').addEventListener('click',()=>nextCard());
    $('flash-conteudo').querySelectorAll('[data-rate]').forEach(b=>b.addEventListener('click',()=>rateCard(b.dataset.rate)));
  }
  function rateCard(r){
    if(!cardShown||!activeCard)return;
    const prev=state.flash[activeCard.id]||{level:0,due:0,reviews:0};
    prev.reviews++;
    prev.level=r==='ok'?clamp(prev.level+1,1,4):0;
    // Forgetting: quick review tomorrow; recall: 1,3,7 or 14 days.
    prev.due=now()+86400000*([1,1,3,7,14][prev.level]);
    state.flash[activeCard.id]=prev;save();nextCard();
  }
  function labIndex(){return Number($('lab-projeto').value)||0;}
  function renderLab(){
    const list=LABS[state.faixa];
    if($('lab-projeto').options.length!==list.length || $('lab-projeto').dataset.age!==state.faixa){
      $('lab-projeto').innerHTML=list.map((x,i)=>`<option value="${i}">${esc(x[0])}</option>`).join('');
      $('lab-projeto').dataset.age=state.faixa;
      $('lab-texto').value='';
    }
    const [title,desc,hints]=list[labIndex()];
    $('lab-enunciado').innerHTML=`<h3>💡 ${esc(title)}</h3><p>${esc(desc)}</p><p><strong>Pistas para criar:</strong> ${esc(hints)}</p><p>Uma boa invenção descreve a necessidade, a solução e como testá-la.</p>`;
    $('lab-contagem').textContent=$('lab-texto').value.length+' de 1500 caracteres';
    $('lab-feedback').innerHTML='';
    renderSavedIdeas();
  }
  function privacyRisk(text){return IHTutorEngine.privacyRisk(text);}
  function labCoach(text){
    const textNorm=normalize(text);
    let ideas=[];
    if(!/(problema|precis|dificuldade|ajudar|desafio|objetivo|economiz|melhorar)/.test(textNorm)) ideas.push('Qual necessidade ou problema sua ideia resolve?');
    if(!/(funcion|fazer|uso|usando|passo|sistema|parte|material|processo|poderia|mecanismo)/.test(textNorm)) ideas.push('Como ela funcionaria, passo a passo?');
    if(!/(test|avali|medir|verific|compar|experi|observ|ajust|melhor)/.test(textNorm)) ideas.push('Como você poderia experimentar, verificar e melhorar a ideia?');
    return ideas.length?`Sua ideia foi guardada. Para aprofundar: ${ideas.join(' ')}`:'Projeto guardado! Você mencionou aspectos de necessidade, funcionamento e verificação. Experimente explicar também as limitações da ideia.';
  }
  function saveLab(){
    const text=$('lab-texto').value.trim(),box=$('lab-feedback');
    if(text.length<40){box.innerHTML='<div class="feedback-box warn">Descreva um pouco mais sua ideia (pelo menos 40 caracteres), incluindo como ela funciona.</div>';return;}
    if(privacyRisk(text)){box.innerHTML='<div class="feedback-box warn">Encontramos algo que parece telefone, e-mail ou documento. Remova dados pessoais antes de guardar sua criação.</div>';return;}
    const lab=labIndex();
    state.ideas.unshift({id:'p'+now()+'-'+Math.floor(Math.random()*10000),faixa:state.faixa,lab,text,date:new Date().toLocaleDateString('pt-BR')});
    state.ideas=state.ideas.slice(0,80);save();
    box.innerHTML=`<div class="feedback-box good"><strong>💡 Devolutiva do laboratório</strong><p>${esc(labCoach(text))}</p><p class="small-text">Esse retorno identifica elementos textuais; não avalia criatividade nem substitui orientação pedagógica.</p></div>`;
    $('lab-texto').value='';$('lab-contagem').textContent='0 de 1500 caracteres';renderSavedIdeas();
  }
  function renderSavedIdeas(){
    const list=state.ideas.filter(x=>x.faixa===state.faixa);
    $('lab-lista').innerHTML=list.length?list.slice(0,20).map(x=>`<article class="idea-entry"><strong>${esc(LABS[x.faixa][x.lab][0])}</strong><p>${nl(x.text)}</p><small class="muted">${esc(x.date)}</small><button type="button" data-remove="${esc(x.id)}" aria-label="Excluir projeto ${esc(LABS[x.faixa][x.lab][0])}">Excluir esta ideia</button></article>`).join(''):'<div class="empty-note">Nenhum projeto guardado nesta faixa. Crie sua primeira ideia!</div>';
    $('lab-lista').querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{
      if(!confirm('Excluir esta ideia guardada?'))return;
      state.ideas=state.ideas.filter(x=>x.id!==b.dataset.remove);save();renderSavedIdeas();
    }));
  }
  function selectMission(){
    const x=MISSIONS[state.faixa];
    if($('missao-escolha').dataset.age!==state.faixa){
      $('missao-escolha').innerHTML=x.map((m,i)=>`<option value="${i}">${esc(m.title)}</option>`).join('');
      $('missao-escolha').dataset.age=state.faixa;missionIndex=0;missionStory=[];missionChoices=[];workingMissionId='';
    }
    return x[Number($('missao-escolha').value)||0];
  }
  function renderMission(){
    const m=selectMission();
    if(workingMissionId!==m.id){missionIndex=0;missionStory=[];missionChoices=[];workingMissionId=m.id;}
    const finished=missionIndex>=m.scenes.length;
    const historic=MISSIONS[state.faixa].filter(x=>state.missions[x.id]?.done);
    $('missao-historico').innerHTML=historic.length?historic.map(x=>`<div class="mini-tile"><strong>✅ ${esc(x.title)}</strong><p>Concluída em ${esc(state.missions[x.id].completed||'dia anterior')}</p></div>`).join(''):'<div class="empty-note">As missões concluídas aparecerão aqui.</div>';
    if(finished){
      $('missao-conteudo').innerHTML=`<div class="feedback-box good"><h2>🌟 Missão explorada!</h2><p>Você avaliou escolhas e observou consequências. Em situações reais, investigar significa ouvir perspectivas, registrar resultados e rever nossas ideias.</p><ol class="note-list">${missionStory.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div><button type="button" class="btn btn-main" id="missao-reiniciar">Explorar novamente ↻</button>`;
      $('missao-reiniciar').addEventListener('click',()=>{missionIndex=0;missionStory=[];missionChoices=[];renderMission();});return;
    }
    const scene=m.scenes[missionIndex];
    $('missao-conteudo').innerHTML=`<div class="mission-stepper" aria-label="Etapa ${missionIndex+1} de ${m.scenes.length}">${m.scenes.map((_,i)=>`<span class="${i<=missionIndex?'done':''}"></span>`).join('')}</div><h2 class="question-heading">${esc(m.title)}</h2><p>${esc(m.intro)}</p><div class="mission-scene"><span class="pill">Etapa ${missionIndex+1} de ${m.scenes.length}</span><p class="scenario">${esc(scene.q)}</p><div class="choices">${scene.opts.map(([label],i)=>`<button class="choice mission-option" type="button" data-mission-answer="${i}"><span class="letter">${i+1}</span><span>${esc(label)}</span></button>`).join('')}</div><div id="missao-resposta" aria-live="polite"></div></div>`;
    $('missao-conteudo').querySelectorAll('[data-mission-answer]').forEach(b=>b.addEventListener('click',()=>{
      const i=Number(b.dataset.missionAnswer);
      const response=scene.opts[i][1];
      missionStory.push(response);
      missionChoices.push(i);
      $('missao-conteudo').querySelectorAll('[data-mission-answer]').forEach(button=>button.disabled=true);
      $('missao-resposta').innerHTML=`<div class="mission-choice-feedback"><strong>O que essa escolha nos ensina?</strong><p>${esc(response)}</p><button type="button" class="btn btn-main" id="missao-avancar">${missionIndex+1>=m.scenes.length?'Concluir missão':'Próxima etapa →'}</button></div>`;
      $('missao-avancar').addEventListener('click',()=>{
        missionIndex++;
        if(missionIndex>=m.scenes.length){state.missions[m.id]={done:true,completed:new Date().toLocaleDateString('pt-BR'),choices:[...missionChoices]};save();}
        renderMission();
      });
    }));
  }
  function renderReport(){
    updatePrivacyStatus();
    const s=stats();
    $('relatorio-metricas').innerHTML=[['🧩',s.seen,'Questões diferentes'],['🎯',s.total?Math.round(s.correct/s.total*100)+'%':'—','Acertos por tentativa'],['🧠',s.review,'Revisões de cartões'],['🌎',s.missions,'Missões concluídas']].map(([ico,val,label])=>`<div class="stat-card"><span>${ico}</span><strong>${val}</strong><small>${label}</small></div>`).join('');
    $('relatorio-areas').innerHTML=VALID_AREAS.map(a=>{
      const {n,good}=areaStats(a),pct=n?Math.round(good/n*100):0;
      return `<div class="report-line"><span>${AREAS[a].icon} ${esc(AREAS[a].name)}</span><div class="progress-track" role="progressbar" aria-label="Acertos em ${esc(AREAS[a].name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="progress-fill" data-progress="${pct}"></div></div><strong>${n?pct+'%':'Sem dados'}</strong></div>`;
    }).join('');
    $('relatorio-areas').querySelectorAll('[data-progress]').forEach(el=>{el.style.width=el.dataset.progress+'%';});
  }
  function applyPrefs(){
    document.body.classList.toggle('large-text',state.settings.large);
    document.body.classList.toggle('high-contrast',state.settings.contrast);
    document.body.classList.toggle('reduce-motion',state.settings.motion);
    $('alto-contraste').checked=state.settings.contrast;
    $('reduzir-animacao').checked=state.settings.motion;
    $('letras-grandes').checked=state.settings.large;
    $('botao-acessibilidade').setAttribute('aria-pressed',String(state.settings.large));
  }
  function exportBackup(){
    const text=JSON.stringify(state,null,2);
    const u=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
    const a=document.createElement('a');a.href=u;a.download=`inteligent-hability-backup-${today()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);
    $('admin-feedback').innerHTML='<div class="feedback-box good">Backup preparado. Guarde o arquivo com cuidado, pois inclui projetos e progresso.</div>';
  }
  async function importBackup(file){
    if(!file)return;
    const box=$('admin-feedback');
    if(file.size>1048576){box.innerHTML='<div class="feedback-box warn">O arquivo deve ter no máximo 1 MB.</div>';return;}
    try{
      const data=validate(JSON.parse(await file.text()));
      if(!confirm('Substituir o progresso atual pelo backup selecionado?'))return;
      state=data;save();resetSession();$('faixa').value=state.faixa;applyPrefs();renderReport();
      box.innerHTML='<div class="feedback-box good">Backup importado e validado na estrutura. '+(persistenceEnabled?'Os dados foram guardados no navegador.':'Os dados estão apenas nesta sessão.')+'</div>';
    }catch(e){box.innerHTML=`<div class="feedback-box warn">Não foi possível importar: ${esc(e.message)}</div>`;}
    finally{$('importar').value='';}
  }
  function eraseData(){
    if('speechSynthesis' in window)window.speechSynthesis.cancel();
    state=DEFAULT();resetSession();attemptsThisSession=0;
    try{localStorage.removeItem(KEY);localStorage.removeItem(LEGACY_KEY);}catch{}
    $('faixa').value=state.faixa;applyPrefs();
    if($('confirmar-exclusao').open)$('confirmar-exclusao').close();
    renderReport();
    $('admin-feedback').innerHTML='<div class="feedback-box good">Os dados locais de estudo foram apagados. Qualquer arquivo de backup já exportado deverá ser apagado separadamente.</div>';
  }
  function disableSaving(){
    if(!persistenceEnabled)return;
    if(!confirm('Desativar e apagar os registros locais neste navegador? Os dados da sessão aberta continuarão disponíveis até fechar ou recarregar.'))return;
    persistenceEnabled=false;
    try{localStorage.removeItem(KEY);localStorage.removeItem(LEGACY_KEY);localStorage.setItem(PRIV_KEY,'session');}catch{}
    updatePrivacyStatus();
    $('admin-feedback').innerHTML='<div class="feedback-box good">Armazenamento desativado. Dados antigos do aplicativo apagados neste navegador.</div>';
  }
  function previewLegal(which){
    const label=which==='termos'?'Termos de Uso':'Política de Privacidade';
    $('leitura-legal-titulo').textContent=label;
    $('leitura-legal-corpo').innerHTML=document.querySelector(`#${which} .legal-document`).innerHTML;
    const d=$('leitura-legal');if(typeof d.showModal==='function'&&!d.open)d.showModal();
  }
  function attach(){
    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-go]');if(b)go(b.dataset.go);
    });
    document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));
    $('faixa').addEventListener('change',e=>{state.faixa=VALID_AGES.includes(e.target.value)?e.target.value:'5-7';save();resetSession();renderHome();
      const current=document.querySelector('.view:not([hidden])')?.id||'inicio';
      if(current==='desafios')nextQuestion();else if(current==='tutor')renderTutor();else if(current==='mapas')renderMap();else if(current==='flashcards')nextCard();else if(current==='laboratorio')renderLab();else if(current==='missoes')renderMission();else if(current==='responsaveis')renderReport();
    });
    $('quiz-area').addEventListener('change',nextQuestion);
    $('quiz-outro').addEventListener('click',nextQuestion);
    $('tutor-area').addEventListener('change',()=>{IHAdvancedAI.resetSession();renderTutor();tutorActivity=null;$('ai35-pratica').innerHTML='';$('ai35-feedback').innerHTML='';});
    $('tutor-topico').addEventListener('change',renderTutor);
    document.querySelectorAll('[data-tutor-intent]').forEach(b=>b.addEventListener('click',()=>tutorRespond(b.dataset.tutorIntent)));
    $('tutor-perguntar').addEventListener('click',()=>tutorRespond());
    $('pergunta-tutor').addEventListener('keydown',e=>{if(e.key==='Enter')tutorRespond();});
    $('ai35-criar').addEventListener('click',startTutorPractice);
    $('ai35-plano').addEventListener('click',tutorNextStep);
    $('ai35-guiar').addEventListener('click',()=>tutorRespond('guiar'));
    $('ai35-dica').addEventListener('click',()=>tutorRespond('pista'));
    $('tutor-ouvir').addEventListener('click',()=>{if('speechSynthesis' in window&&speechSynthesis.speaking){speechSynthesis.cancel();return;}readTutor();});
    $('mapa-area').addEventListener('change',renderMap);
    $('flash-area').addEventListener('change',()=>{activeCard=null;nextCard();});
    $('lab-projeto').addEventListener('change',()=>{$('lab-texto').value='';renderLab();});
    $('lab-texto').addEventListener('input',()=>{$('lab-contagem').textContent=$('lab-texto').value.length+' de 1500 caracteres';});
    $('lab-salvar').addEventListener('click',saveLab);
    $('lab-limpar').addEventListener('click',()=>{$('lab-texto').value='';$('lab-feedback').innerHTML='';$('lab-contagem').textContent='0 de 1500 caracteres';});
    $('missao-escolha').addEventListener('change',()=>{missionIndex=0;missionStory=[];missionChoices=[];workingMissionId='';renderMission();});
    for(const [id,key] of [['alto-contraste','contrast'],['reduzir-animacao','motion'],['letras-grandes','large']])$(id).addEventListener('change',e=>{state.settings[key]=e.target.checked;applyPrefs();save();});
    $('botao-acessibilidade').addEventListener('click',()=>{state.settings.large=!state.settings.large;applyPrefs();save();});
    $('exportar').addEventListener('click',exportBackup);
    $('importar').addEventListener('change',e=>importBackup(e.target.files?.[0]));
    $('rever-privacidade').addEventListener('click',showPrivacyDialog);
    $('desativar-registro').addEventListener('click',disableSaving);
    $('responsavel-declara').addEventListener('change',()=>{$('modo-salvar').disabled=!($('responsavel-declara').checked&&$('politicas-declara').checked);});
    $('politicas-declara').addEventListener('change',()=>{$('modo-salvar').disabled=!($('responsavel-declara').checked&&$('politicas-declara').checked);});
    $('modo-temporario').addEventListener('click',()=>selectPrivacyMode(false));
    $('modo-salvar').addEventListener('click',()=>selectPrivacyMode(true));
    $('modal-termos').addEventListener('click',()=>previewLegal('termos'));
    $('modal-politica').addEventListener('click',()=>previewLegal('privacidade'));
    $('fechar-leitura-legal').addEventListener('click',()=>$('leitura-legal').close());
    $('fechar-pausa').addEventListener('click',()=>$('lembrete-pausa').close());
    $('reiniciar').addEventListener('click',()=>{
      const d=$('confirmar-exclusao');if(typeof d.showModal==='function')d.showModal();else if(confirm('Apagar todos os dados?'))eraseData();
    });
    $('cancelar-exclusao').addEventListener('click',()=>$('confirmar-exclusao').close());
    $('confirmar-exclusao-botao').addEventListener('click',eraseData);
  }
  function boot(){
    try{
      load();$('faixa').value=state.faixa;applyPrefs();attach();renderHome();
      if(!privacyChosen)showPrivacyDialog();
    }catch(e){console.error('Erro ao iniciar Inteligent Hability:',e);
      $('alerta-armazenamento').hidden=false;$('alerta-armazenamento').textContent='Houve uma dificuldade ao carregar o aplicativo. Verifique se data.js, app.js e styles.css estão na mesma pasta do index.html.';}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
