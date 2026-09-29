const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const code=fs.readFileSync(path.join(root,'script.js'),'utf8')+'\n;globalThis.__test=globalThis.__fase10;';
const elements=new Map(), store=new Map();
function makeEl(id){return {id,hidden:false,textContent:'',innerText:'',style:{},disabled:false,dataset:{},clientHeight:800,offsetHeight:800,classList:{set:new Set(['hidden']),add(x){this.set.add(x)},remove(x){this.set.delete(x)},toggle(x,force){if(force===undefined){if(this.set.has(x))this.set.delete(x);else this.set.add(x)}else if(force)this.set.add(x);else this.set.delete(x);return !this.set.has(x)},contains(x){return this.set.has(x)}},setAttribute(k,v){this[k]=v},addEventListener(){},focus(){this.focused=true},appendChild(){},insertBefore(){},prepend(){},scrollIntoView(){},querySelector(){return null},querySelectorAll(){return []},innerHTML:''};}
['main-content','reading-progress-bar','lesson-title','orientation-lesson','orientation-step','prev-btn','next-btn','lab-btn','review-btn','dashboard-btn','lessons-stat','exercises-stat','warning-modal','warning-message','warning-confirm','warning-cancel','l1','l2','l3','l4','l5','l6','l7','l8','cierre','case-lab','review-panel','dashboard-panel'].forEach(id=>elements.set(id,makeEl(id)));
const context={console,Date,Math,JSON,Set,Map,Object,Array,Number,String,Boolean,parseFloat,isNaN,
 localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)},
 document:{getElementById:id=>elements.get(id)||null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>makeEl('created'),activeElement:elements.get('next-btn')},
 window:{addEventListener(){},__conceptEvidenceCache:{}},confirm:()=>{throw new Error('No debe usarse confirm() en Fase 10')},setTimeout:()=>0,clearTimeout:()=>{}};
vm.createContext(context);vm.runInContext(code,context,{filename:'script.js'});const api=context.__test;
function assert(c,m){if(!c)throw new Error(m)} function pass(m){console.log('PASS',m)}
assert(html.includes('orientation-bar')&&html.includes('aria-label="Navegación principal del curso"'),'orientación y navegación');
assert(html.includes('aria-modal="true"')&&html.includes('warning-title'),'modal accesible');
assert(css.includes('prefers-reduced-motion')&&css.includes('focus-visible'),'accesibilidad visual');
pass('estructura UX y accesibilidad');
api.openWarningModal('Falta completar la lectura.');
assert(elements.get('warning-modal').hidden===false,'modal visible');
assert(elements.get('warning-message').textContent==='Falta completar la lectura.','mensaje claro');
assert(elements.get('warning-confirm').focused===true,'foco en acción principal');
api.closeModal(); assert(elements.get('warning-modal').hidden===true,'modal cerrado'); pass('diálogo accesible y foco');
context.__test.updateUI(); assert(elements.get('orientation-lesson').textContent.includes('Lección 1'),'orientación actualizada'); pass('orientación del alumno');
let data=fs.readFileSync(path.join(root,'script.js'),'utf8'); assert(!/if\s*\(\s*!?confirm\s*\(/.test(data),'sin confirm nativo en navegación'); pass('abandono sin confirm nativo');
assert(css.includes('@media (max-width: 620px)')&&css.includes('@media (max-width: 900px)'),'responsive móvil/tablet'); pass('responsive');
console.log('FASE10 OK');
