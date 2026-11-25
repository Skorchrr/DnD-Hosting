import { allOfType } from './data.js';
import { escapeHTML, humanize, rulesText } from './ui.js';
const TYPES=[['class','Classes'],['species','Species'],['background','Backgrounds'],['subclass','Subclasses'],['feat','Feats'],['spell','Spells'],['item','Items & Equipment'],['monster','Monsters']];
const LABELS={class:'Class',species:'Species',background:'Background',subclass:'Subclass',feat:'Feat',spell:'Spell',item:'Item',monster:'Monster'};

function metaSummary(type,x){
 if(type==='class')return `Hit Die d${x.hd||8} · ${(x.primary||[]).map(v=>v.toUpperCase()).join(' / ')||'Flexible'}`;
 if(type==='species')return `${x.size||'Medium'} · ${x.speed||30} ft. speed`;
 if(type==='background')return `Skills: ${(x.skills||[]).map(humanize).join(', ')||'—'} · Origin feat: ${humanize(x.feat||'—')}`;
 if(type==='subclass')return `Subclass for ${humanize(x.cls||'unassigned class')}`;
 if(type==='feat')return `${humanize(x.type||'Feat')} feat`;
 if(type==='spell')return `${Number(x.lvl)===0?'Cantrip':`Level ${x.lvl}`} · ${x.sch||'Magic'} · ${x.r||'—'}`;
 if(type==='item')return `${humanize(x.cat||'Equipment')} · ${x.cost||'No listed cost'}${x.wt?` · ${x.wt} lb.`:''}`;
 if(type==='monster')return `${humanize(x.size||'Medium')} ${humanize(x.type||'creature')} · CR ${x.cr??'—'} · AC ${x.ac??'—'} · HP ${x.hp??'—'}`;
 return '';
}
function recordDescription(type,x){return x.d||x.description||x.features?.[0]?.d||x.traits?.[0]?.d||'';}
export function renderContentLibrary(data,filter='all',search=''){
 const q=search.trim().toLowerCase();
 const types=filter==='all'?TYPES.map(x=>x[0]):[filter];
 let count=0;
 const sections=types.map(type=>{
  const items=allOfType(data,type).filter(x=>!q||`${x.name} ${metaSummary(type,x)} ${recordDescription(type,x)}`.toLowerCase().includes(q));
  count+=items.length;
  if(!items.length)return '';
  return `<section class="content-type-section"><div class="content-type-heading"><div><span class="eyebrow">${LABELS[type].toUpperCase()} LIBRARY</span><h3>${LABELS[type]} <small>${items.length}</small></h3></div><span class="content-source-label">SRD and campaign content</span></div><div class="content-card-grid">${items.slice(0,100).map(x=>{
   const custom=(data.custom?.[type]||[]).some(c=>c.id===x.id),description=recordDescription(type,x);
   return `<article class="content-card"><div class="content-card-top"><span class="content-type-pill">${custom?'HOMEBREW':'SRD 5.2'}</span>${custom?`<span class="content-actions"><button type="button" data-edit-content="${escapeHTML(type)}:${escapeHTML(x.id)}">Edit</button><button type="button" data-delete-content="${escapeHTML(type)}:${escapeHTML(x.id)}">Delete</button></span>`:''}</div><h4>${escapeHTML(x.name)}</h4><p class="content-meta">${escapeHTML(metaSummary(type,x))}</p><details><summary>Read full description</summary>${rulesText(description||'No detailed description supplied.')}</details></article>`;
  }).join('')}</div>${items.length>100?`<p class="muted">Showing first 100 of ${items.length}. Narrow your search to find a specific entry.</p>`:''}</section>`;
 }).join('');
 return {html:sections||'<div class="empty-panel">No content matches this filter. Try another search or create a homebrew entry.</div>',count};
}

function textArea(name,label,value='',help=''){
 return `<label class="field-label">${label}<textarea rows="${name==='description'||name==='features'||name==='actions'?5:2}" data-content-field="${name}" placeholder="${escapeHTML(help)}">${escapeHTML(value||'')}</textarea></label>`;
}
function select(name,label,options,value){
 return `<label class="field-label">${label}<select data-content-field="${name}">${options.map(([v,l])=>`<option value="${escapeHTML(v)}" ${String(value??'')===String(v)?'selected':''}>${escapeHTML(l)}</option>`).join('')}</select></label>`;
}
function input(name,label,value='',type='text',help=''){
 return `<label class="field-label">${label}<input data-content-field="${name}" type="${type}" value="${escapeHTML(value??'')}" placeholder="${escapeHTML(help)}"></label>`;
}
function check(name,label,checked){return `<label class="checkbox-field"><input type="checkbox" data-content-field="${name}" ${checked?'checked':''}><span>${label}</span></label>`;}
function textFromRecords(records,levelled=false){
 return (records||[]).map(x=>`${levelled?`${x.l||1} | `:''}${x.n||'Feature'}: ${x.d||''}`).join('\n\n');
}
function typeFields(type,record,data){
 if(type==='class')return `<div class="form-grid three">${input('hd','Hit Die',record.hd||8,'number')}${input('primary','Primary abilities',(record.primary||[]).join(', '),'text','str, dex')}${input('saves','Saving throw proficiencies',(record.saves||[]).join(', '),'text','str, con')}</div>${input('armor','Armor training',(record.armor||[]).join(', '))}${input('weapons','Weapon training',(record.weapons||[]).join(', '))}${input('skillCount','Number of skill choices',record.skills?.n??2,'number')}${input('skills','Available skill choices',record.skills?.from?.join(', ')||'','text','athletics, perception')}${textArea('features','Class features — one per paragraph, use Level | Name: description',record.featuresText||textFromRecords(record.features,true),'1 | Second Wind: Regain Hit Points as described here.') }<h4>Level 1 spellcasting (optional)</h4><div class="form-grid four">${select('spellAbility','Spellcasting ability',[['','Not a spellcaster'],['int','Intelligence'],['wis','Wisdom'],['cha','Charisma']],record.spell?.ab||'')}${input('cantripsAtLevel1','Cantrips at level 1',record.table?.[0]?.c??0,'number')}${input('spellsAtLevel1','Spells known / prepared',record.table?.[0]?.p??0,'number')}${input('spellSlotsAtLevel1','Level 1 spell slots',record.table?.[0]?.s?.[0]??0,'number')}</div><p class="modal-help">This configures first-level choices and slots. Later class progression remains a campaign rule you can describe in the feature text.</p><h4>Starting equipment (optional)</h4>${textArea('equipmentA','Starting equipment option A — item IDs and quantities',record.equipmentA||'','longsword:1, shield:1, explorers-pack:1')}${input('equipmentAGold','Option A gold',record.equipmentAGold??0,'number')}${textArea('equipmentB','Starting equipment option B — item IDs and quantities',record.equipmentB||'','greataxe:1, handaxe:2')}${input('equipmentBGold','Option B gold',record.equipmentBGold??0,'number')}`;
 if(type==='species')return `<div class="form-grid two">${select('size','Size',[['Tiny','Tiny'],['Small','Small'],['Medium','Medium'],['Large','Large']],record.size||'Medium')}${input('speed','Walking speed (feet)',record.speed||30,'number')}</div>${input('langs','Additional fixed languages',(record.langs||[]).join(', '),'text','Elvish, Draconic')}${input('skillChoiceCount','Additional skill choices',record.skillChoice?.n??0,'number')}${input('skillChoiceFrom','Available skills (or any)',Array.isArray(record.skillChoice?.from)?record.skillChoice.from.join(', '):record.skillChoice?.from||'','text','perception, survival or any')}${input('originFeat','Additional Origin feat ID',record.originFeat?String(record.originFeat):'0','number')}${textArea('traits','Species traits — one per paragraph, use Name: description',record.traitsText||textFromRecords(record.traits),'Darkvision: You can see in darkness within 60 feet.')}`;
 if(type==='background')return `${input('skills','Skill proficiencies',(record.skills||[]).join(', '),'text','insight, religion')}${input('tools','Tool proficiencies',(record.tools||[]).join(', '),'text','Calligrapher’s Supplies')}${input('abOpts','Ability score options',(record.abOpts||[]).join(', '),'text','int, wis, cha')}${input('feat','Origin feat ID',record.feat||'','text','alert')}${textArea('equipment','Starting equipment description',record.equipmentText||'','Choose A or B: ...')}<h4>Starting equipment (optional)</h4>${textArea('equipmentA','Starting equipment option A — item IDs and quantities',record.equipmentA||'','calligraphers-supplies:1, book:1, robe:1')}${input('equipmentAGold','Option A gold',record.equipmentAGold??0,'number')}${textArea('equipmentB','Starting equipment option B — item IDs and quantities',record.equipmentB||'','potion-of-healing:1')}${input('equipmentBGold','Option B gold',record.equipmentBGold??0,'number')}`;
 if(type==='subclass')return `${select('cls','Parent class',[['','Choose class'],...data.classes.map(c=>[c.id,c.name])],record.cls||'')}${textArea('features','Subclass features — one per paragraph, use Level | Name: description',record.featuresText||textFromRecords(record.features,true),'3 | Example feature: Describe its effect.')}`;
 if(type==='feat')return `${select('type','Feat category',[['origin','Origin'],['general','General'],['fighting-style','Fighting Style'],['epic-boon','Epic Boon']],record.type||'origin')}${input('prerequisite','Prerequisites',record.prerequisite||'')}`;
 if(type==='spell')return `<div class="form-grid three">${input('lvl','Spell level',record.lvl??0,'number')}${input('sch','School',record.sch||'Evocation')}${input('t','Casting time',record.t||'Action')}</div><div class="form-grid three">${input('r','Range',record.r||'60 feet')}${input('dur','Duration',record.dur||'Instantaneous')}${input('comp','Components',record.comp||'V,S')}</div><div class="form-grid three">${input('dmg','Damage dice',record.dmg||'')}${input('dt','Damage type',record.dt||'')}${input('classes','Available to classes',(record.cls||[]).join(', '),'text','wizard, sorcerer')}</div>${check('conc','Requires concentration',record.conc)} ${check('rit','Can be cast as a ritual',record.rit)}${textArea('mat','Material component',record.mat||'')}${textArea('hl','At higher levels',record.hl||'')}`;
 if(type==='item')return `<div class="form-grid three">${select('cat','Category',[['weapon','Weapon'],['armor','Armor'],['shield','Shield'],['gear','Adventuring Gear'],['magic','Magic Item'],['tool','Tool']],record.cat||'gear')}${input('cost','Cost',record.cost||'')}${input('wt','Weight (lb.)',record.wt??0,'number')}</div><div class="form-grid three">${input('damage','Weapon damage dice',record.w?.dmg||'')}${input('damageType','Damage type',record.w?.dt||'')}${input('range','Range',record.w?.range||'')}</div><div class="form-grid three">${input('armorBase','Armor base AC',record.a?.base??'','number')}${input('armorDexMax','Maximum Dexterity bonus',record.a?.max??'','number')}${check('shield','This is a shield',record.cat==='shield')}</div>${input('properties','Properties',(record.w?.props||[]).join(', '),'text','Finesse, Light')}${textArea('d','Full item description',record.d||'')}`;
 if(type==='monster')return `<div class="form-grid three">${select('size','Size',[['Tiny','Tiny'],['Small','Small'],['Medium','Medium'],['Large','Large'],['Huge','Huge'],['Gargantuan','Gargantuan']],record.size||'Medium')}${input('creatureType','Creature type',record.type||'humanoid')}${input('cr','Challenge Rating',record.cr??'1/4')}</div><div class="form-grid three">${input('ac','Armor Class',record.ac||10,'number')}${input('hp','Hit Points',record.hp||10,'number')}${input('speed','Speed',record.speed||'30 ft.')}</div><div class="form-grid three">${ABILITIES_FOR_EDITOR.map(a=>input(`ability_${a}`,a.toUpperCase(),record.ab?.[a]??10,'number')).join('')}</div><div class="form-grid two">${input('senses','Senses',record.senses||'')}${input('langs','Languages',record.langs||'')}</div>${textArea('traits','Traits — one per paragraph, use Name: description',record.traitsText||textFromRecords(record.traits))}${textArea('actions','Actions — one per paragraph, use Name: description',record.actionsText||textFromRecords(record.actions))}`;
 return '';
}
const ABILITIES_FOR_EDITOR=['str','dex','con','int','wis','cha'];
export function renderContentEditor(type,record,data){
 const edit=Boolean(record?.id&&(record?.custom||record?.isCustom));
 const r=record||{};
 return `<form id="content-editor-form" class="content-editor-form"><div class="form-grid two"><div class="field-label">Content type<strong class="content-type-fixed">${LABELS[type]||type}</strong><input type="hidden" data-content-field="type" value="${escapeHTML(type)}"></div>${input('name','Name',r.name||'','text','Give this entry a clear name')}</div>${input('summary','Short summary',r.summary||r.flavor||'','text','A one-sentence overview shown in lists')}${textArea('description','Full description and rules text',r.d||r.description||'','Write complete, readable rules text. Use separate paragraphs for separate effects.')}${typeFields(type,r,data)}${input('source','Source',r.src||'Campaign Homebrew')}${input('tags','Tags',r.tags||'','text','fire, martial, exploration')}<label class="checkbox-field"><input type="checkbox" data-content-field="visible" ${r.visible===false?'':'checked'}><span>Available in character creation and campaign tools</span></label><input type="hidden" data-content-field="id" value="${escapeHTML(r.id||'')}"><input type="hidden" data-content-field="isCustom" value="true"><div class="editor-footnote">Official SRD entries are read-only. This editor creates campaign-owned entries that can be edited, duplicated, exported, and used by the relevant character or encounter tools.</div><button class="primary-button" type="submit">${edit?'Save changes':'Create homebrew entry'}</button></form>`;
}
export function buildCustomRecord(form,type,existing={}){
 const get=name=>form.querySelector(`[data-content-field="${name}"]`);
 const val=name=>get(name)?.value?.trim()??'';
 const checked=name=>Boolean(get(name)?.checked);
 const id=val('id')||`${type}-${crypto.randomUUID()}`;
 const record={id,type,name:val('name'),summary:val('summary'),d:val('description'),src:val('source')||'Campaign Homebrew',tags:val('tags').split(',').map(x=>x.trim()).filter(Boolean),visible:checked('visible'),custom:true,createdAt:existing.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
 if(!record.name)throw new Error('Name is required.');
 if(type==='class'){
  record.hd=Number(val('hd'))||8;record.primary=val('primary').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);record.saves=val('saves').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);record.armor=val('armor').split(',').map(x=>x.trim()).filter(Boolean);record.weapons=val('weapons').split(',').map(x=>x.trim()).filter(Boolean);record.skills={n:Math.max(0,Number(val('skillCount'))||2),from:val('skills').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)};record.features=parseLevelledText(val('features'));
  const spellAbility=val('spellAbility'),cantrips=Math.max(0,Number(val('cantripsAtLevel1'))||0),spells=Math.max(0,Number(val('spellsAtLevel1'))||0),slots=Math.max(0,Number(val('spellSlotsAtLevel1'))||0);
  record.table=Array.from({length:20},(_,i)=>({pb:2+Math.floor(i/4),x:{}}));
  record.table[0]={...record.table[0],...(spellAbility?{c:cantrips,p:spells,s:[slots,0,0,0,0,0,0,0,0]}:{})};
  if(spellAbility)record.spell={ab:spellAbility,prog:'full',prep:'table'};else delete record.spell;
  record.equip=buildEquipmentPackages(val('equipmentA'),val('equipmentB'),val('equipmentAGold'),val('equipmentBGold'));record.equipmentA=val('equipmentA');record.equipmentB=val('equipmentB');record.equipmentAGold=Number(val('equipmentAGold'))||0;record.equipmentBGold=Number(val('equipmentBGold'))||0;
 }
 if(type==='species') {record.size=val('size')||'Medium';record.speed=Number(val('speed'))||30;record.langChoice=0;record.langs=val('langs').split(',').map(x=>x.trim()).filter(Boolean);const skillCount=Math.max(0,Number(val('skillChoiceCount'))||0),skillInput=val('skillChoiceFrom');record.skillChoice=skillCount?{n:skillCount,from:skillInput.toLowerCase()==='any'?'any':skillInput.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean)}:null;record.originFeat=Math.max(0,Number(val('originFeat'))||0);record.traits=parseNamedText(val('traits'));record.subs=[];}
 if(type==='background'){record.skills=val('skills').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);record.tools=val('tools').split(',').map(x=>x.trim()).filter(Boolean);record.abOpts=val('abOpts').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);record.feat=val('feat')||null;record.equip=buildEquipmentPackages(val('equipmentA'),val('equipmentB'),val('equipmentAGold'),val('equipmentBGold'));record.equipmentText=val('equipment');record.equipmentA=val('equipmentA');record.equipmentB=val('equipmentB');record.equipmentAGold=Number(val('equipmentAGold'))||0;record.equipmentBGold=Number(val('equipmentBGold'))||0;}
 if(type==='subclass'){record.cls=val('cls');record.features=parseLevelledText(val('features'));}
 if(type==='feat'){record.type=val('type')||'origin';record.prerequisite=val('prerequisite');}
 if(type==='spell'){record.lvl=Number(val('lvl'))||0;record.sch=val('sch');record.t=val('t');record.r=val('r');record.dur=val('dur');record.comp=val('comp');record.dmg=val('dmg');record.dt=val('dt');record.cls=val('classes').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);record.conc=checked('conc');record.rit=checked('rit');record.mat=val('mat');record.hl=val('hl');}
 if(type==='item'){
  record.cat=val('cat')||'gear';record.cost=val('cost');record.wt=Number(val('wt'))||0;record.d=val('d')||record.d;
  if(record.cat==='weapon')record.w={cat:'simple',rng:val('range')?'ranged':'melee',dmg:val('damage')||'1d4',dt:val('damageType')||'Bludgeoning',range:val('range'),props:val('properties').split(',').map(x=>x.trim()).filter(Boolean)};
  if(record.cat==='armor')record.a={cat:'light',base:Number(val('armorBase'))||10,dex:true,max:val('armorDexMax')?Number(val('armorDexMax')):null};
  if(record.cat==='shield')record.a={cat:'shield',base:2};
 }
 if(type==='monster'){
  record.size=val('size');record.type=val('creatureType');record.cr=val('cr');record.ac=Number(val('ac'))||10;record.hp=Number(val('hp'))||10;record.speed=val('speed');record.ab=Object.fromEntries(ABILITIES_FOR_EDITOR.map(a=>[a,Number(val(`ability_${a}`))||10]));record.senses=val('senses');record.langs=val('langs');record.traits=parseNamedText(val('traits'));record.actions=parseNamedText(val('actions'));
 }
 return record;
}
function parseEquipmentItems(value){
 return String(value||'').split(',').map(part=>part.trim()).filter(Boolean).map(part=>{const [id,amount]=part.split(':').map(x=>x.trim());return [id,Math.max(1,Number(amount)||1)];}).filter(([id])=>/^[a-z0-9-]+$/i.test(id));
}
function buildEquipmentPackages(a,b,goldA,goldB){
 if(!String(a||'').trim()&&!String(b||'').trim()&&!Number(goldA||0)&&!Number(goldB||0))return [];
 const opts=[{items:parseEquipmentItems(a),picks:[],gold:Math.max(0,Number(goldA)||0)},{items:parseEquipmentItems(b),picks:[],gold:Math.max(0,Number(goldB)||0)}];
 return [{desc:'Choose one starting equipment option. Item IDs must match entries in the campaign item library.',choose:1,opts}];
}
function parseLevelledText(value){
 return String(value||'').split(/\n\s*\n/).map(block=>block.trim()).filter(Boolean).map(block=>{const match=block.match(/^(\d+)\s*\|\s*(.+)$/s),body=match?match[2]:block,i=body.indexOf(':');return {l:match?Number(match[1]):1,n:i>0?body.slice(0,i).trim():'Feature',d:i>0?body.slice(i+1).trim():body};});
}
function parseNamedText(value){
 return String(value||'').split(/\n\s*\n/).map(block=>block.trim()).filter(Boolean).map(block=>{const i=block.indexOf(':');return i>0?{n:block.slice(0,i).trim(),d:block.slice(i+1).trim()}:{n:'Feature',d:block};});
}
