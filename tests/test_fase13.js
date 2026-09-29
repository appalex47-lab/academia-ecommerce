const fs=require('fs'),vm=require('vm'),path=require('path'),{performance}=require('perf_hooks');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const code=fs.readFileSync(path.join(root,'script.js'),'utf8')+'\n;globalThis.__test={...globalThis.__fase5,...globalThis.__fase8,...globalThis.__fase9,...globalThis.__fase11,...globalThis.__fase12};';
const elements=new Map(),store=new Map();
function el(id){return {id,hidden:true,textContent:'',innerText:'',value:'',style:{},disabled:false,dataset:{},clientHeight:800,offsetHeight:800,classList:{add(){},remove(){},toggle(){return false},contains(){return false}},setAttribute(){},removeAttribute(){},addEventListener(){},focus(){this.focused=true},appendChild(){},insertBefore(){},prepend(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},innerHTML:''};}
['main-content','reading-progress-bar','lesson-title','prev-btn','next-btn','lab-btn','review-btn','dashboard-btn','assessment-btn','lessons-stat','exercises-stat','case-lab','review-panel','dashboard-panel','final-assessment-panel','persistence-notice','warning-modal','warning-title','warning-message','warning-confirm','warning-cancel','l1','l2','l3','l4','l5','l6','l7','l8','cierre'].forEach(id=>elements.set(id,el(id)));
const context={console,Date,Math,JSON,Set,Map,Object,Array,Number,String,Boolean,parseFloat,isNaN,Blob:class Blob{constructor(parts){this.parts=parts}},URL:{createObjectURL:()=>'',revokeObjectURL(){}},localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>el('created')},window:{addEventListener(){},__conceptEvidenceCache:{}},setTimeout:()=>0,clearTimeout:()=>{},confirm:()=>true};
vm.createContext(context);vm.runInContext(code,context,{filename:'script.js'});const api=context.__test;
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
// Static HTML/UX checks
assert((html.match(/id="[^"]+"/g)||[]).length>0,'HTML ids');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]); const counts=ids.reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{}); assert(!Object.values(counts).some(n=>n>1),'duplicate ids');
assert(html.includes('<main id="main-content">') && html.includes('aria-label="Navegación principal del curso"'),'landmarks');
assert(html.includes('role="dialog"')&&html.includes('aria-modal="true"'),'dialog accessibility');
assert(css.includes(':focus-visible')&&css.includes('prefers-reduced-motion'),'focus and reduced motion');
assert((css.match(/@media/g)||[]).length>=4,'responsive media rules');
assert(!/<script[^>]+src="https?:\/\//i.test(html)&&!/<link[^>]+href="https?:\/\//i.test(html),'no external runtime dependencies');
pass('auditoría estática UX/accesibilidad/responsive');
// Persisted-state invariants
let p=api.buildPersistableState(); assert(p.schemaVersion===2,'schema'); assert(!('conceptEvidence' in p)&&!('dashboardData' in p),'derived data not persisted'); pass('fuente de verdad sin derivados duplicados');
let migrated=api.migratePersistedState({version:1,currentIndex:1,lessonStatus:{},exercises:{},caseLearningState:{},reviewLearningState:{}}); assert(migrated.state.schemaVersion===2&&migrated.migratedFrom===1,'migration'); pass('migration compatibility');
let bad=api.migratePersistedState({schemaVersion:99,currentIndex:0}); assert(bad.unsupportedVersion===99,'future version'); pass('future schema protected');
// Stress persistence with many attempts and measure one explicit save.
for(let i=0;i<1000;i++) api.recordAttempt('l1-e1',i%7===0,{value:i});
const t0=performance.now(); api.saveLearningState({force:true}); const elapsed=performance.now()-t0; const payload=store.get(api.PROGRESS_STORAGE_KEY); assert(payload&&payload.length>1000,'large persisted payload'); assert(elapsed<250,'single persistence write too slow'); pass(`performance persistencia (${payload.length} bytes, ${elapsed.toFixed(2)} ms)`);
// Deduplication
const before=api.getPersistenceMetrics().skippedWrites; api.saveLearningState(); assert(api.getPersistenceMetrics().skippedWrites>before,'dedup'); pass('deduplicación de escrituras');
// Reset/import validation remains explicit and structured
let sanitized=api.sanitizeNavigationState({activeView:'evil',activeActivityId:'<script>alert(1)</script>'}); assert(sanitized.activeView==='course'&&sanitized.activeActivityId===null,'navigation sanitization');
let valid=api.sanitizeNavigationState({activeView:'cases',activeActivityId:'case-open-analysis-plan'}); assert(valid.activeView==='cases'&&valid.activeActivityId==='case-open-analysis-plan','valid navigation preserved'); pass('actividad válida conservada'); pass('datos de navegación inválidos protegidos');
console.log('FASE13 OK');
