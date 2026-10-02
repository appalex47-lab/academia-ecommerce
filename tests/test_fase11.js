const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const code=fs.readFileSync(path.join(root,'script.js'),'utf8')+'\n;globalThis.__test=globalThis.__fase11;';
const elements=new Map(), store=new Map();
function el(id){return {id,hidden:true,textContent:'',innerText:'',style:{},disabled:false,dataset:{},clientHeight:800,offsetHeight:800,classList:{add(){},remove(){},toggle(){return false},contains(){return false}},setAttribute(){},addEventListener(){},focus(){this.focused=true},appendChild(){},insertBefore(){},prepend(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},innerHTML:''};}
['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lab-btn','review-btn','dashboard-btn','lessons-stat','exercises-stat','case-lab','review-panel','dashboard-panel','persistence-notice','warning-modal','warning-title','warning-message','warning-confirm','warning-cancel','l0','l1','l2','l3','l4','l5','l6','l7','l8','cierre'].forEach(id=>elements.set(id,el(id)));
const context={console,Date,Math,JSON,Set,Map,Object,Array,Number,String,Boolean,parseFloat,isNaN,Blob:class Blob{constructor(parts){this.parts=parts}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},
 localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
 document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el('created')},window:{addEventListener(){},__conceptEvidenceCache:{}},setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true};
vm.createContext(context);vm.runInContext(code,context,{filename:'script.js'});const api=context.__test;
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
let state=api.buildPersistableState(); assert(state.schemaVersion===2,'schema v2'); assert(!('conceptEvidence' in state),'derived evidence not persisted'); pass('esquema y fuente de verdad');
let old={version:1,currentIndex:2,lessonStatus:{l1:{read:true,completed:true}},exercises:{},caseLearningState:{},reviewLearningState:{}}; let mig=api.migratePersistedState(old); assert(mig.migratedFrom===1&&mig.state.schemaVersion===2&&mig.state.currentIndex===2,'migración'); pass('migración v1→v2');
let future=api.migratePersistedState({schemaVersion:99}); assert(future.unsupportedVersion===99,'futura'); pass('versión futura');
let invalid=api.validatePersistedState({schemaVersion:2,currentIndex:99,lessonStatus:[]}); assert(!invalid.ok,'invalid'); pass('validación de estructura');
api.saveLearningState({force:true}); let first=JSON.stringify(JSON.parse(store.get('plataforma.aprendizaje.v1')).courses['analista-ecommerce'].state); assert(first&&JSON.parse(first).schemaVersion===2,'guardar'); api.saveLearningState(); assert(api.getPersistenceMetrics().skippedWrites>=1,'deduplicación'); pass('persistencia y deduplicación');
api.importLearningProgressFromText(JSON.stringify({schemaVersion:2,currentIndex:1,lessonStatus:{},exercises:{},caseLearningState:{},reviewLearningState:{},navigation:{activeView:'course',activeActivityId:'l2-e1'}})); assert(api.getNavigationState().activeActivityId==='l2-e1','importación'); pass('importación validada');
api.resetLearningProgress(); assert(api.getNavigationState().activeView==='course','reset'); assert(JSON.parse(store.get('plataforma.aprendizaje.v1')).courses['analista-ecommerce'].state.currentIndex===0,'reset guardado'); pass('reinicio explícito');
store.set('plataforma.aprendizaje.v1','{bad'); api.loadLearningState(); assert(api.getPersistenceState().status==='corrupt','corrupt'); assert(store.get('plataforma.aprendizaje.v1')==='{bad','no sobrescribe corrupto'); pass('recuperación de datos corruptos');
console.log('FASE11 OK');
