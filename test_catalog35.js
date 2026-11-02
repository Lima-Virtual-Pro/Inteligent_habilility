'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert').strict;
const root=path.join(__dirname,'..');
const content=['data.js','tutor_data.js','local_ai.js','knowledge_35.js','ai_35.js'].map(n=>fs.readFileSync(path.join(root,n),'utf8')).join('\n');
const ctx=vm.runInNewContext(content+'\n({AI:IHAdvancedAI,TUTOR_TOPICS,IH_KNOWLEDGE_35,QUESTION_BANK})',{Intl,Math,console});
let count=0;const errs=[];
const ages=['5-7','8-10','11-12'],areas=['logica','matematica','ciencias','linguagem','tecnologia'];
for(const age of ages)for(const area of areas){
 for(let i=0;i<25;i++){
  try{
   const p=ctx.AI.createPractice({age,area,topics:ctx.TUTOR_TOPICS});
   assert.ok(p&&p.question&&p.hint&&p.solution,p?.question||'exercicio ausente');
   const answer=String(p.answer);
   assert.equal(ctx.AI.grade(p,answer).status,'correct');
   count++;
  }catch(e){errs.push(`${age}/${area}/#${i}: ${e.message}`);}
 }
}
const seen=new Set();for(const c of ctx.IH_KNOWLEDGE_35){assert.ok(!seen.has(c.id));seen.add(c.id);assert.ok(c.explain.length>30&&c.example.length>15&&c.hint.length>10)}
assert.equal(ctx.QUESTION_BANK.length,75);
console.log('Ciclo de exercícios validados:',count,'/375');
console.log('Conceitos adicionais:',ctx.IH_KNOWLEDGE_35.length,'| desafios existentes:',ctx.QUESTION_BANK.length);
if(errs.length){console.log(errs.slice(0,15));process.exit(1)}
