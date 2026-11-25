import { loadRulesData, applyCustomContent, addCustom, removeCustom } from './data.js';
import { loadState, saveState, exportState, importState, freshState } from './store.js';
import { ABILITIES, SKILLS, LANGUAGES, abilityMod, formatMod, calculateCharacterStats, calculateArmorClass, buildCharacter, rollDie, rollFormula, getItem, getSpell, proficiencyBonus } from './rules.js';
import { createDraft, renderBuilder, validateBuilderStep, updateDraftFromControl, handleDraftClick } from './builder.js';
import { renderSheet, rollCheck, rollWeapon, castSpell } from './sheet.js';
import { addMapToken, buildEncounterFromTokens, rollGroupInitiative, renderEncounter, syncTokenToCombatant, updateCombatantHp, startCombat, advanceTurn } from './encounter.js';
import { renderContentLibrary, renderContentEditor, buildCustomRecord } from './content.js';
import { escapeHTML, humanize, initials, toast, openModal, closeModal, emptyState } from './ui.js';

let state=loadState(),data=null,currentView='table',activeSheetTab='overview',builderDraft=null,builderStep=0,contentFilter='all',contentSearch='',characterSearch='';
let mapDrag=null,storageWarningShown=false;
const $=id=>document.getElementById(id);

function persist(){
 state.customContent=data?.custom||state.customContent||{};
 try{saveState(state);storageWarningShown=false;return true;}catch(error){if(!storageWarningShown){storageWarningShown=true;toast('Campaign storage is full or unavailable. Export a backup and reduce stored map-image size.','error');}console.error('Campaign save failed:',error);return false;}
}
function hydrateCustom(){applyCustomContent(data,state.customContent||{});}
function setView(view){
 currentView=view;
 document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${view}`));
 document.querySelectorAll('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===view));
 const labels={table:'CAMPAIGN TABLE',characters:'CHARACTERS',sheet:'CHARACTER SHEET',encounter:'MAPS & COMBAT',content:'RULES & HOMEBREW',journal:'CAMPAIGN JOURNAL',settings:'CAMPAIGN SETTINGS'};
 $('breadcrumb-current').textContent=labels[view]||view.toUpperCase();
 renderView();
}
function activeCharacter(){return state.characters.find(c=>c.id===state.activeCharacterId)||state.characters[0]||null;}
function syncActiveCharacter(id){state.activeCharacterId=id;persist();}
function renderView(){
 renderSidebar();
 if(currentView==='table')renderDashboard();
 if(currentView==='characters')renderCharacters();
 if(currentView==='sheet')renderCharacterSheet();
 if(currentView==='encounter')renderEncounterView();
 if(currentView==='content')renderContentView();
 if(currentView==='journal')renderJournal();
 if(currentView==='settings')renderSettings();
}
function renderSidebar(){
 $('sidebar-campaign-name').textContent=state.campaign.name;
 $('sidebar-dm-name').textContent=state.campaign.dmName||'Dungeon Master';
 $('sidebar-party-count').textContent=state.characters.length;
 $('sidebar-party-list').innerHTML=state.characters.slice(0,5).map(c=>`<button class="sidebar-party-item" data-open-character="${c.id}"><span class="sidebar-party-avatar">${escapeHTML(initials(c.name))}</span><span><b>${escapeHTML(c.name)}</b><small>${escapeHTML(c.className||'Adventurer')} · Lv ${c.level||1}</small></span></button>`).join('')||'<p class="muted" style="font-size:11px;padding:0 8px">No characters yet.</p>';
}
function renderDashboard(){
 $('campaign-heading').textContent=state.campaign.name;
 $('campaign-description').textContent=state.campaign.description||'A new adventure begins.';
 $('campaign-characters-count').textContent=state.characters.length;
 $('campaign-encounter-count').textContent=state.encounter.combatants.length;
 $('dashboard-party').innerHTML=state.characters.length?state.characters.slice(0,6).map(c=>{
  const s=calculateCharacterStats(c,data);return `<div class="dashboard-party-row"><span class="avatar-small">${escapeHTML(initials(c.name))}</span><div class="who"><b>${escapeHTML(c.name)}</b><small>${escapeHTML(c.speciesName||'Species')} · ${escapeHTML(c.className||'Adventurer')} · Level ${s.level}</small></div><span class="hp-summary">${Number(c.hpCurrent??s.maxHp)} / ${s.maxHp} HP</span></div>`;
 }).join(''):emptyState('No adventurers yet','Create the first character for this campaign.','<button class="primary-button" data-action="new-character">＋ Create character</button>');
 $('dashboard-rolls').innerHTML=state.rolls.length?state.rolls.slice(0,7).map(r=>`<div class="recent-roll"><div><b>${escapeHTML(r.name)}</b><small>${escapeHTML(r.detail||r.formula||'Roll')} · ${new Date(r.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small></div><strong>${Number(r.total)||0}</strong></div>`).join(''):'<div class="empty-panel">Your dice rolls will appear here during play.</div>';
}
function renderCharacters(){
 const q=characterSearch.toLowerCase();const list=state.characters.filter(c=>`${c.name} ${c.className} ${c.speciesName} ${c.backgroundName}`.toLowerCase().includes(q));
 $('character-count-label').textContent=`${list.length} adventurer${list.length===1?'':'s'}`;
 $('characters-grid').innerHTML=list.map(c=>{
  const s=calculateCharacterStats(c,data),hp=Number(c.hpCurrent??s.maxHp);
  return `<article class="character-card"><header class="character-card-head"><span class="character-avatar">${escapeHTML(initials(c.name))}</span><div><h3>${escapeHTML(c.name)}</h3><p>${escapeHTML([c.speciesName,c.className].filter(Boolean).join(' · '))} · Level ${s.level}</p></div></header><p class="character-card-summary">${escapeHTML(c.backgroundName||'Adventurer')}${c.alignment?` · ${escapeHTML(c.alignment)}`:''}${c.backstory?`<br>${escapeHTML(c.backstory.slice(0,100))}${c.backstory.length>100?'…':''}`:''}</p><div class="character-stat-strip"><span><b>${hp}/${s.maxHp}</b><small>HIT POINTS</small></span><span><b>${s.ac}</b><small>ARMOR CLASS</small></span><span><b>${formatMod(s.initiative)}</b><small>INITIATIVE</small></span><span><b>${s.pb}</b><small>PROFICIENCY</small></span></div><div class="character-card-actions"><button class="primary-button small" data-open-character="${c.id}">Open sheet</button><button class="secondary-button small" data-edit-character="${c.id}">Edit</button><button class="icon-button" data-delete-character="${c.id}" title="Delete character">×</button></div></article>`;
 }).join('')||emptyState('No characters found',q?'Try a different search term.':'Create your first adventurer to begin the campaign.','<button class="primary-button" data-action="new-character">＋ Create character</button>');
}
function renderCharacterSheet(){
 const character=activeCharacter();
 $('active-character-select').innerHTML='<option value="">Choose a character</option>'+state.characters.map(c=>`<option value="${c.id}" ${c.id===character?.id?'selected':''}>${escapeHTML(c.name)} · ${escapeHTML(c.className||'Adventurer')}</option>`).join('');
 $('character-sheet-root').innerHTML=renderSheet(character,data,activeSheetTab);
}
function renderEncounterView(){
 $('encounter-root').innerHTML=renderEncounter(state,data);
 bindMapStage();
}
function renderContentView(){
 const result=renderContentLibrary(data,contentFilter,contentSearch);
 $('content-library-root').innerHTML=result.html;
 $('content-count-label').textContent=`${result.count.toLocaleString()} entries in this view`;
 document.querySelectorAll('[data-content-filter]').forEach(b=>b.classList.toggle('active',b.dataset.contentFilter===contentFilter));
}
function renderJournal(){
 $('journal-list').innerHTML=state.journal.length?[...state.journal].reverse().map(entry=>`<article class="journal-entry"><header><h3>${escapeHTML(entry.title)}</h3><time>${new Date(entry.createdAt).toLocaleString()}</time></header><p>${escapeHTML(entry.body)}</p><button class="text-button danger-text" data-delete-journal="${entry.id}">Delete entry</button></article>`).join(''):emptyState('No journal entries yet','Add session summaries, important clues, NPCs, or unfinished leads.');
}
function renderSettings(){
 $('setting-campaign-name').value=state.campaign.name||'';
 $('setting-campaign-description').value=state.campaign.description||'';
 $('setting-dm-name').value=state.campaign.dmName||'';
 $('reroll-credit-count').textContent=state.settings.rerollCredits||0;
}

function openBuilder(){
 builderDraft=createDraft(data);builderStep=0;renderBuilderStep();$('builder-dialog').showModal();
}
function renderBuilderStep(){ $('builder-root').innerHTML=renderBuilder(builderDraft,data,builderStep,state); }
function builderClick(e){
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.action==='close-builder'){ $('builder-dialog').close();builderDraft=null;return; }
 if(button.dataset.step!==undefined){const target=Number(button.dataset.step);if(target<=builderStep){builderStep=target;renderBuilderStep();}return;}
 const message=handleDraftClick(builderDraft,data,button,state);
 if(message){toast(message,'error');return;}
 if(button.dataset.action==='builder-back'){builderStep=Math.max(0,builderStep-1);renderBuilderStep();return;}
 if(button.dataset.action==='builder-next'){
  const error=validateBuilderStep(builderDraft,data,builderStep,state);if(error){toast(error,'error');return;}
  builderStep=Math.min(5,builderStep+1);renderBuilderStep();return;
 }
 if(button.dataset.action==='builder-create'){
  const error=validateBuilderStep(builderDraft,data,builderStep,state);if(error){toast(error,'error');return;}
  try{const character=buildCharacter(builderDraft,data);state.characters.push(character);state.activeCharacterId=character.id;persist();$('builder-dialog').close();builderDraft=null;activeSheetTab='overview';setView('sheet');toast(`${character.name} is ready for the adventure.`);}catch(err){toast(err.message,'error');}
  return;
 }
 if(button.dataset.choice||button.dataset.method||button.dataset.score||button.dataset.action==='roll-scores'){renderBuilderStep();persist();}
}
function builderChange(e){
 const control=e.target;
 updateDraftFromControl(builderDraft,control);
 if(control.matches('[data-class-skill],[data-language],[data-species-skill],[data-cantrip],[data-starting-spell],[data-prepared-spell],[data-asi-choice],[data-roll-assignment],[data-standard-score],[data-equipment-pick],[data-draft],select[name="classEquipment"],input[name="classEquipment"],select[name="backgroundEquipment"],input[name="backgroundEquipment"]'))renderBuilderStep();
}
function builderInput(e){
 const control=e.target;
 if(control.dataset.draft)builderDraft[control.dataset.draft]=control.value;
}
function bindBuilder(){
 const root=$('builder-root');root.addEventListener('click',builderClick);root.addEventListener('change',builderChange);root.addEventListener('input',builderInput);
}

function addRoll(result){
 result.id=crypto.randomUUID();result.time=new Date().toISOString();state.rolls.unshift(result);state.rolls=state.rolls.slice(0,100);persist();
 toast(`${result.name}: ${result.detail||result.total}`);
 if(currentView==='table')renderDashboard();
}
function openDiceRoller(){
 openModal('Dice roller',`<form id="dice-form"><div class="form-grid three"><label class="field-label">Number of dice<input type="number" min="1" max="50" name="count" value="1"></label><label class="field-label">Die<select name="sides">${[4,6,8,10,12,20,100].map(n=>`<option value="${n}" ${n===20?'selected':''}>d${n}</option>`).join('')}</select></label><label class="field-label">Modifier<input type="number" name="modifier" value="0"></label></div><button class="primary-button" type="submit">Roll dice</button><div id="dice-result" class="roll-result-panel"></div></form>`);
}
function addHp(character,amount){
 if(Number(character.deathSaves?.failures)>=3&&amount>0){toast('This character is dead; ordinary healing cannot restore them.','error');return;}
 const stats=calculateCharacterStats(character,data),before=Number(character.hpCurrent??stats.maxHp);
 if(before<=0&&amount<0){character.deathSaves??={successes:0,failures:0};character.deathSaves.failures=Math.min(3,character.deathSaves.failures+(Math.abs(amount)>=stats.maxHp?3:1));}
 character.hpCurrent=Math.max(0,Math.min(stats.maxHp,before+amount));
 if(character.hpCurrent>0)character.deathSaves={successes:0,failures:0};
 syncCharacterTokens(character);persist();renderCharacterSheet();renderCharacters();
}
function syncCharacterTokens(character){
 for(const t of state.encounter.tokens.filter(t=>t.entityType==='character'&&t.entityId===character.id)){
  t.hp=Number(character.hpCurrent??character.hpMax);t.maxHp=character.hpMax||t.maxHp;
  const c=state.encounter.combatants.find(c=>c.tokenId===t.id);if(c){c.hp=t.hp;c.maxHp=t.maxHp;}
 }
}
function openHpAdjust(direction){
 const character=activeCharacter();if(!character)return;
 openModal(direction<0?'Apply damage':'Restore Hit Points',`<form id="hp-adjust-form"><p class="muted">${escapeHTML(character.name)} currently has ${Number(character.hpCurrent??character.hpMax)} Hit Points.</p><label class="field-label">Amount<input name="amount" type="number" min="1" value="1"></label><button class="primary-button" type="submit">${direction<0?'Apply damage':'Restore hit points'}</button></form>`);
 $('hp-adjust-form').addEventListener('submit',e=>{e.preventDefault();const amount=Number(new FormData(e.currentTarget).get('amount'))||0;addHp(character,direction*amount);closeModal();});
}
function openLevelUp(){
 const c=activeCharacter();if(!c)return;
 if(Number(c.deathSaves?.failures)>=3||Number(c.hpCurrent??1)<=0){toast('A character at 0 Hit Points cannot advance levels.','error');return;}
 const currentStats=calculateCharacterStats(c,data),nextLevel=currentStats.level+1;
 if(nextLevel>20){toast('This character has reached level 20.','error');return;}
 const cls=data.classes.find(x=>x.id===c.classId);if(!cls){toast('The character class could not be found.','error');return;}
 const newFeatures=(cls.features||[]).filter(f=>Number(f.l)===nextLevel);
 const needsSubclass=!c.subclassId&&newFeatures.some(f=>/subclass/i.test(f.n||''));
 const subclasses=data.subclasses.filter(x=>x.cls===c.classId);
 const fightingStyle=newFeatures.some(f=>f.pick==='fighting-style');
 const asiFeature=newFeatures.some(f=>f.asi);
 if(needsSubclass&&!subclasses.length){toast('No subclass options are available for this class in the current content library.','error');return;}
 const abilityOptions=ABILITIES.map(([id,name])=>`<option value="${id}">${name}</option>`).join('');
 const subclassField=needsSubclass?`<label class="field-label">Choose your subclass<select name="subclassId" required><option value="">Choose a subclass…</option>${subclasses.map(x=>`<option value="${escapeHTML(x.id)}">${escapeHTML(x.name)}</option>`).join('')}</select></label>`:'';
 const fightingField=fightingStyle?`<label class="field-label">Choose a Fighting Style feat<select name="fightingStyleId" required><option value="">Choose a Fighting Style…</option>${data.feats.filter(x=>x.type==='fighting-style').map(x=>`<option value="${escapeHTML(x.id)}">${escapeHTML(x.name)}</option>`).join('')}</select></label>`:'';
 const levelFeats=data.feats.filter(x=>(x.type==='general'||(nextLevel>=19&&x.type==='epic-boon'))&&!x.asiFeat&&(!x.lvl||Number(x.lvl)<=nextLevel)&&!(x.id==='grappler'&&Math.max(Number(c.abilities?.str)||10,Number(c.abilities?.dex)||10)<13));
 const asiField=asiFeature?`<section class="selection-detail"><h3>Ability Score Improvement</h3><label class="field-label">Choose an improvement<select name="asiChoice"><option value="asi">Increase ability scores</option><option value="feat">Choose a General feat or Epic Boon</option></select></label><div class="form-grid three"><label class="field-label">Ability A<select name="abilityA">${abilityOptions}</select></label><label class="field-label">Ability B<select name="abilityB">${abilityOptions}</select></label><label class="field-label">Increase<select name="asiMode"><option value="two">+2 to Ability A</option><option value="split">+1 to Ability A and +1 to Ability B</option></select></label></div><label class="field-label">Feat<select name="asiFeatId"><option value="">Choose a feat…</option>${levelFeats.map(x=>`<option value="${escapeHTML(x.id)}">${escapeHTML(x.name)}</option>`).join('')}</select></label><label class="field-label">Feat ability increase<select name="asiFeatAbility">${ABILITIES.map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label><p class="modal-help">Choose either the ability increase or a feat. If the feat grants an ability increase, choose the eligible ability. Ability scores cannot exceed the feat's maximum.</p></section>`:'';
 openModal(`Advance to level ${nextLevel}`,`<p class="muted">${escapeHTML(c.name)} advances from level ${currentStats.level} to level ${nextLevel}. Class features are added to the sheet, hit points increase, and spell slots update from the class progression table.</p><form id="level-up-form">${subclassField}${fightingField}${asiField}<label class="field-label">Hit Point increase<select name="hpMethod"><option value="average">Take the fixed average (${Math.max(1,Math.floor(currentStats.hitDie/2)+1+abilityMod(c.abilities?.con))} HP before any Constitution increase)</option><option value="roll">Roll 1d${currentStats.hitDie} and add Constitution</option></select></label><button class="primary-button" type="submit">Confirm level up</button></form>`);
 $('level-up-form').addEventListener('submit',e=>{
  e.preventDefault();const fd=new FormData(e.currentTarget),subclassId=String(fd.get('subclassId')||''),fightingStyleId=String(fd.get('fightingStyleId')||''),asiChoice=String(fd.get('asiChoice')||'asi'),asiMode=String(fd.get('asiMode')||'two'),abilityA=String(fd.get('abilityA')||'str'),abilityB=String(fd.get('abilityB')||'dex'),asiFeatId=String(fd.get('asiFeatId')||''),asiFeatAbility=String(fd.get('asiFeatAbility')||'str');
  if(needsSubclass&&!subclassId){toast('Choose a subclass before advancing.','error');return;}
  if(fightingStyle&&!fightingStyleId){toast('Choose a Fighting Style feat.','error');return;}
  if(asiFeature&&asiChoice==='feat'&&!asiFeatId){toast('Choose a General feat.','error');return;}
  if(asiFeature&&asiChoice==='feat'&&(c.featIds||[]).includes(asiFeatId)){toast('This character already has that feat. Choose another option.','error');return;}
  const selectedAsiFeat=asiFeature&&asiChoice==='feat'?data.feats.find(x=>x.id===asiFeatId):null;
  if(selectedAsiFeat?.asi){const allowed=selectedAsiFeat.asi.from||ABILITIES.map(([id])=>id),amount=Number(selectedAsiFeat.asi.n)||1,max=selectedAsiFeat.type==='epic-boon'?30:20;if(!allowed.includes(asiFeatAbility)||Number(c.abilities?.[asiFeatAbility]??10)+amount>max){toast('Choose an eligible ability score for this feat.','error');return;}}
  if(asiFeature&&asiChoice==='asi'){
   const a=Number(c.abilities?.[abilityA]??10),b=Number(c.abilities?.[abilityB]??10);
   if(a+(asiMode==='two'?2:1)>20||(asiMode==='split'&&(abilityA===abilityB||b+1>20))){toast('Choose ability increases that do not raise a score above 20.','error');return;}
  }
  const oldStats=calculateCharacterStats(c,data),oldHp=Number(c.hpCurrent??oldStats.maxHp),hpMethod=String(fd.get('hpMethod')||'average');
  if(needsSubclass){const subclass=subclasses.find(x=>x.id===subclassId);c.subclassId=subclass.id;c.subclassName=subclass.name;}
  if(asiFeature&&asiChoice==='asi'){
   c.abilities??={};c.abilityImprovements??={};const incA=asiMode==='two'?2:1;c.abilities[abilityA]=Number(c.abilities[abilityA]??10)+incA;c.abilityImprovements[abilityA]=(Number(c.abilityImprovements[abilityA])||0)+incA;
   if(asiMode==='split'){c.abilities[abilityB]=Number(c.abilities[abilityB]??10)+1;c.abilityImprovements[abilityB]=(Number(c.abilityImprovements[abilityB])||0)+1;}
  }
  c.level=nextLevel;
  c.features??=[];const known=new Set(c.features.map(x=>x.id));
  for(const f of newFeatures){if(!known.has(f.id)){c.features.push({id:f.id,name:f.n,description:f.d,source:`${cls.name} — Level ${nextLevel}`});known.add(f.id);}}
  const selectedSubclass=c.subclassId?data.subclasses.find(x=>x.id===c.subclassId):null;
  if(selectedSubclass){for(const f of selectedSubclass.features||[]){if(Number(f.l)<=nextLevel&&!known.has(f.id)){c.features.push({id:f.id,name:f.n,description:f.d,source:`${selectedSubclass.name} — Level ${f.l}`});known.add(f.id);}}}
  const addFeat=(feat,source)=>{if(!feat)return;c.featIds??=[];if(!c.featIds.includes(feat.id))c.featIds.push(feat.id);if(!(c.features||[]).some(x=>x.id===`level-${nextLevel}-${feat.id}`))c.features.push({id:`level-${nextLevel}-${feat.id}`,name:feat.name,description:feat.d,source});};
  if(fightingStyle)addFeat(data.feats.find(x=>x.id===fightingStyleId),`${cls.name} Fighting Style`);
  if(asiFeature&&asiChoice==='feat'){addFeat(selectedAsiFeat,`${cls.name} — Level ${nextLevel} feat`);if(selectedAsiFeat?.asi){const amount=Number(selectedAsiFeat.asi.n)||1;c.abilities[asiFeatAbility]=Number(c.abilities?.[asiFeatAbility]??10)+amount;c.abilityImprovements??={};c.abilityImprovements[asiFeatAbility]=(Number(c.abilityImprovements[asiFeatAbility])||0)+amount;}}
  let hitDieRoll=null;
  if(hpMethod==='roll')hitDieRoll=rollDie(oldStats.hitDie);
  const averageGain=Math.max(1,Math.floor(oldStats.hitDie/2)+1+abilityMod(c.abilities?.con)),actualGain=hpMethod==='roll'?Math.max(1,hitDieRoll+abilityMod(c.abilities?.con)):averageGain;
  if(hpMethod==='roll')c.hpRollAdjustment=(Number(c.hpRollAdjustment)||0)+actualGain-averageGain;
  const finalStats=calculateCharacterStats(c,data),hpGain=finalStats.maxHp-oldStats.maxHp;
  c.hpMax=finalStats.maxHp;c.hpCurrent=Math.min(finalStats.maxHp,oldHp+hpGain);c.ac=finalStats.ac;c.speed=finalStats.speed;
  const previousSlots=new Map((c.spellSlots||[]).map(x=>[x.level,x.expended]));
  c.spellSlots=(finalStats.spellSlots||[]).map((total,index)=>({level:index+1,total,expended:Math.min(total,previousSlots.get(index+1)||0)})).filter(x=>x.total>0);
  c.updatedAt=new Date().toISOString();syncCharacterTokens(c);persist();closeModal();renderCharacterSheet();renderCharacters();renderSidebar();
  if(hitDieRoll!==null)addRoll({name:`${c.name} · Level ${nextLevel} HP`,formula:`1d${oldStats.hitDie} ${formatMod(abilityMod(c.abilities?.con))}`,rolls:[hitDieRoll],total:actualGain,detail:`Hit Die ${hitDieRoll} ${formatMod(abilityMod(c.abilities?.con))} = ${actualGain} HP gained; total maximum HP ${finalStats.maxHp}.`});
  else toast(`${c.name} reached level ${nextLevel}. ${hpGain} maximum HP gained.`);
 });
}
function openTempHp(){const character=activeCharacter();if(!character)return;openModal('Temporary Hit Points',`<form id="temp-hp-form"><label class="field-label">Temporary Hit Points<input name="amount" type="number" min="0" value="0"></label><button class="primary-button" type="submit">Save temporary HP</button></form>`);$('temp-hp-form').addEventListener('submit',e=>{e.preventDefault();character.temporaryHp=Math.max(0,Number(new FormData(e.currentTarget).get('amount'))||0);persist();closeModal();toast('Temporary Hit Points updated.');});}
function openShortRest(){
 const c=activeCharacter();if(!c)return;
 if(Number(c.deathSaves?.failures)>=3){toast('A dead character cannot benefit from a short rest.','error');return;}
 const stats=calculateCharacterStats(c,data),available=Math.max(0,stats.level-(Number(c.hitDiceSpent)||0));
 openModal('Short rest',`<p class="muted">A short rest lets you spend Hit Dice to recover Hit Points. Each die adds your Constitution modifier. You have <b>${available}</b> of ${stats.level} Hit Dice remaining (d${stats.hitDie}).${c.classId==='warlock'?' Your Pact Magic slots also recover.':''}</p><form id="short-rest-form"><label class="field-label">Hit Dice to spend<input name="count" type="number" min="0" max="${available}" value="${available?1:0}" ${available?'':'disabled'}></label><button class="primary-button" type="submit">Complete short rest</button></form>`);
 $('short-rest-form').addEventListener('submit',e=>{
  e.preventDefault();const count=Math.max(0,Math.min(available,Math.floor(Number(new FormData(e.currentTarget).get('count'))||0))),con=abilityMod(c.abilities?.con),rolls=Array.from({length:count},()=>rollDie(stats.hitDie)),healing=rolls.reduce((sum,roll)=>sum+Math.max(0,roll+con),0),before=Number(c.hpCurrent??stats.maxHp);
  c.hitDiceSpent=(Number(c.hitDiceSpent)||0)+count;c.hpCurrent=Math.min(stats.maxHp,before+healing);if(c.hpCurrent>0)c.deathSaves={successes:0,failures:0};
  if(c.classId==='warlock')(c.spellSlots||[]).forEach(slot=>slot.expended=0);
  syncCharacterTokens(c);persist();closeModal();renderCharacterSheet();
  if(count)addRoll({name:`${c.name} · Short rest`,formula:`${count}d${stats.hitDie}${con?` ${con>0?'+':'−'} ${Math.abs(con)} each`:''}`,rolls,total:c.hpCurrent-before,detail:`Hit Dice ${rolls.join(', ')}; Constitution ${formatMod(con)} each. Restored ${c.hpCurrent-before} HP.`});
  else toast('Short rest completed.');
 });
}
function restCharacter(type){
 const c=activeCharacter();if(!c)return;
 if(type==='long'){
  if(Number(c.deathSaves?.failures)>=3){toast('A long rest cannot restore a dead character.','error');return;}
  if(Number(c.hpCurrent??calculateCharacterStats(c,data).maxHp)<=0){toast('Recover from 0 Hit Points before completing a long rest.','error');return;}
  const stats=calculateCharacterStats(c,data),recovery=Math.max(1,Math.floor(stats.level/2));
  c.hpCurrent=stats.maxHp;c.deathSaves={successes:0,failures:0};c.exhaustion=Math.max(0,(Number(c.exhaustion)||0)-1);
  c.hitDiceSpent=Math.max(0,(Number(c.hitDiceSpent)||0)-recovery);
  (c.spellSlots||[]).forEach(s=>s.expended=0);c.temporaryHp=0;
 }
 persist();syncCharacterTokens(c);renderCharacterSheet();toast('Long rest completed.');
}
function openEditCharacter(id){
 const c=state.characters.find(x=>x.id===id);if(!c)return;
 openModal('Edit character details',`<form id="edit-character-form"><label class="field-label">Name<input name="name" value="${escapeHTML(c.name)}" maxlength="60"></label><label class="field-label">Alignment<input name="alignment" value="${escapeHTML(c.alignment||'')}"></label><label class="field-label">Pronouns<input name="pronouns" value="${escapeHTML(c.pronouns||'')}"></label><button class="primary-button" type="submit">Save details</button></form>`);
 $('edit-character-form').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);c.name=String(fd.get('name')||'').trim()||c.name;c.alignment=String(fd.get('alignment')||'');c.pronouns=String(fd.get('pronouns')||'');persist();closeModal();renderView();toast('Character details saved.');});
}
function openAddItem(){
 const c=activeCharacter();if(!c)return;
 openModal('Add equipment',`<form id="add-item-form"><label class="field-label">Search and choose an item<select name="itemId" size="8">${data.items.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(i=>`<option value="${escapeHTML(i.id)}">${escapeHTML(i.name)} · ${escapeHTML(i.cost||'Equipment')}</option>`).join('')}</select></label><label class="field-label">Quantity<input type="number" name="quantity" min="1" value="1"></label><button class="primary-button" type="submit">Add to inventory</button></form>`);
 $('add-item-form').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget),id=String(fd.get('itemId')),quantity=Math.max(1,Number(fd.get('quantity'))||1);const item=getItem(data,id);if(!item)return;const existing=c.inventory.find(i=>i.itemId===id);if(existing)existing.quantity+=quantity;else c.inventory.push({itemId:id,quantity,equipped:false,notes:''});persist();closeModal();renderCharacterSheet();toast(`${item.name} added to inventory.`);});
}
function openAddSpell(){
 const c=activeCharacter();if(!c)return;
 const allowed=data.spells.filter(s=>!s.cls?.length||s.cls.includes(c.classId));
 openModal('Manage spells',`<form id="add-spell-form"><label class="field-label">Choose a spell<select name="spellId" size="9">${allowed.slice().sort((a,b)=>a.lvl-b.lvl||a.name.localeCompare(b.name)).map(s=>`<option value="${escapeHTML(s.id)}">${Number(s.lvl)===0?'Cantrip':`Level ${s.lvl}`} · ${escapeHTML(s.name)} · ${escapeHTML(s.sch||'')}</option>`).join('')}</select></label><p class="modal-help">The list is filtered to spells tagged for ${escapeHTML(c.className||'your class')} in the included SRD data. You can mark added spells as prepared on the sheet.</p><button class="primary-button" type="submit">Add spell</button></form>`);
 $('add-spell-form').addEventListener('submit',e=>{e.preventDefault();const spellId=String(new FormData(e.currentTarget).get('spellId'));if(!spellId)return;if(!c.spells.some(x=>x.spellId===spellId))c.spells.push({spellId,prepared:true});persist();closeModal();activeSheetTab='spells';renderCharacterSheet();toast('Spell added to your spellbook.');});
}
function handleSheetAction(action,button){
 const c=activeCharacter();if(!c)return;
 if(action==='short-rest'){openShortRest();return;}if(action==='long-rest'){restCharacter('long');return;}if(action==='level-up'){openLevelUp();return;}
 if(action==='temp-hp'){openTempHp();return;}if(action==='edit-character'){openEditCharacter(c.id);return;}
 if(action==='add-inventory'){openAddItem();return;}if(action==='add-spell'){openAddSpell();return;}
 if(action==='builder-create')return;
}
function contentOpenEditor(type,record=null){
 openModal(record?'Edit homebrew entry':'Create homebrew content',renderContentEditor(type,record,data));
 const form=$('content-editor-form');
 form.addEventListener('submit',e=>{
  e.preventDefault();try{
   const existing=(data.custom[type]||[]).find(x=>x.id===form.querySelector('[data-content-field="id"]').value)||{};
   const custom=buildCustomRecord(form,type,existing);addCustom(data,type,custom);state.customContent=data.custom;hydrateCustom();persist();closeModal();renderContentView();toast(`${custom.name} saved to campaign homebrew.`);
  }catch(err){toast(err.message,'error');}
 });
}
function contentDelete(type,id){
 const record=(data.custom[type]||[]).find(x=>x.id===id);if(!record)return;
 openModal('Delete homebrew entry',`<p>Delete <b>${escapeHTML(record.name)}</b> from this campaign? This removes it from future character and content selections. Existing characters keep their saved text and references.</p><button class="primary-button" id="confirm-delete-content">Delete entry</button>`);
 $('confirm-delete-content').onclick=()=>{removeCustom(data,type,id);state.customContent=data.custom;hydrateCustom();persist();closeModal();renderContentView();toast('Homebrew entry deleted.');};
}
function contentEditByRef(ref){const [type,id]=ref.split(':');const record=(data.custom[type]||[]).find(x=>x.id===id);if(record)contentOpenEditor(type,record);}

function openContentTypeChooser(){
 const options=[['class','Class'],['species','Species'],['background','Background'],['subclass','Subclass'],['feat','Feat'],['spell','Spell'],['item','Item or equipment'],['monster','Monster']];
 openModal('Create homebrew content',`<p class="muted">Choose what you are creating. The editor changes to show the fields that matter for that kind of content, including a full description and rules details.</p><div class="homebrew-type-grid">${options.map(([id,label])=>`<button type="button" class="homebrew-type-card" data-new-content-type="${id}"><b>${label}</b><small>Create a campaign-owned ${label.toLowerCase()} entry.</small><span>Open editor →</span></button>`).join('')}</div>`);
}

function openQuickRoll(){openDiceRoller();}
function addMapEntity(){
 const selector=$('map-add-entity');if(!selector?.value){toast('Create a character or choose a creature first.','error');return;}
 const [type,id]=selector.value.split(':');let entity=null;
 if(type==='character')entity=state.characters.find(c=>c.id===id);
 if(type==='monster')entity=data.monsters.find(m=>m.id===id);
 if(!entity)return;
 const count=state.encounter.tokens.filter(t=>t.entityType===type&&t.entityId===id).length;
 const token=addMapToken(state.encounter,type,entity,count);state.encounter.selectedTokenId=token.id;persist();renderEncounterView();toast(`${entity.name} placed on the map.`);
}
function handleEncounterAction(action){
 const e=state.encounter;
 if(action==='add-map-token'){addMapEntity();return;}
 if(action==='build-encounter'){buildEncounterFromTokens(e,state.characters,data);persist();renderEncounterView();toast('Encounter populated from map tokens.');return;}
 if(action==='start-combat'){try{startCombat(e);persist();renderEncounterView();toast('Combat started.');}catch(err){toast(err.message,'error');}return;}
 if(action==='next-turn'){advanceTurn(e);persist();renderEncounterView();return;}
 if(action==='toggle-grid'){e.map.grid=!e.map.grid;persist();renderEncounterView();return;}
 if(action==='measure-map'){e.measureMode=!e.measureMode;e.measureStart=null;e.measureEnd=null;if(e.measureMode)toast('Click two points on the map to measure distance.');persist();renderEncounterView();return;}
 if(action==='clear-measure'){e.measureMode=false;e.measureStart=null;e.measureEnd=null;persist();renderEncounterView();return;}
 if(action==='clear-map'){e.map.image=null;e.map.name='The Ruined Keep';e.measureMode=false;e.measureStart=null;e.measureEnd=null;persist();renderEncounterView();return;}
 if(action==='clear-encounter'){e.active=false;e.round=0;e.turnIndex=-1;e.combatants=[];persist();renderEncounterView();return;}
 if(action==='rename-map'){openModal('Rename map',`<form id="rename-map-form"><label class="field-label">Map name<input name="name" value="${escapeHTML(e.map.name)}" maxlength="80"></label><button class="primary-button" type="submit">Save map name</button></form>`);$('rename-map-form').addEventListener('submit',ev=>{ev.preventDefault();e.map.name=String(new FormData(ev.currentTarget).get('name')||'Battle Map').trim();persist();closeModal();renderEncounterView();});return;}
}
function bindMapStage(){
 const board=$('map-stage');if(!board)return;
 board.addEventListener('click',event=>{
  const enc=state.encounter;if(!enc.measureMode||event.target.closest('[data-map-token]'))return;
  const rect=board.getBoundingClientRect(),cols=enc.map.columns||20,rows=enc.map.rows||15;
  const x=Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100)),y=Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100));
  const point={x:Math.round(x/(100/cols))*(100/cols),y:Math.round(y/(100/rows))*(100/rows)};
  if(!enc.measureStart||enc.measureEnd){enc.measureStart=point;enc.measureEnd=null;}else{enc.measureEnd=point;enc.measureMode=false;}
  persist();renderEncounterView();
 });
 board.addEventListener('pointerdown',event=>{
  const tokenEl=event.target.closest('[data-map-token]');if(!tokenEl)return;
  event.preventDefault();const rect=board.getBoundingClientRect();
  mapDrag={id:tokenEl.dataset.mapToken,pointerId:event.pointerId,rect,startX:event.clientX,startY:event.clientY,moved:false};
  board.setPointerCapture?.(event.pointerId);
 });
 board.addEventListener('pointermove',event=>{
  if(!mapDrag||event.pointerId!==mapDrag.pointerId)return;
  const dx=event.clientX-mapDrag.startX,dy=event.clientY-mapDrag.startY;if(Math.abs(dx)+Math.abs(dy)>3)mapDrag.moved=true;
  if(!mapDrag.moved)return;
  const e=state.encounter,token=e.tokens.find(t=>t.id===mapDrag.id);if(!token)return;
  const rect=board.getBoundingClientRect();let x=(event.clientX-rect.left)/rect.width*100,y=(event.clientY-rect.top)/rect.height*100;
  const cols=e.map.columns||20,rows=e.map.rows||15;x=Math.round(Math.max(2.5,Math.min(97.5,x))/(100/cols))*(100/cols);y=Math.round(Math.max(100/rows/2,Math.min(100-100/rows/2,y))/(100/rows))*(100/rows);
  token.x=x;token.y=y;const el=board.querySelector(`[data-map-token="${token.id}"]`);if(el){el.style.left=`${x}%`;el.style.top=`${y}%`;}
 });
 board.addEventListener('pointerup',event=>{
  if(!mapDrag||event.pointerId!==mapDrag.pointerId)return;
  const e=state.encounter,token=e.tokens.find(t=>t.id===mapDrag.id);e.selectedTokenId=mapDrag.id;
  if(token)syncTokenToCombatant(e,token);const moved=mapDrag.moved;mapDrag=null;persist();renderEncounterView();if(moved)toast('Token position saved.');
 });
 board.addEventListener('pointercancel',()=>{mapDrag=null;});
}

function bindGlobalEvents(){
 document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-nav]');if(nav){e.preventDefault();setView(nav.dataset.nav);return;}
  const openChar=e.target.closest('[data-open-character]');if(openChar){syncActiveCharacter(openChar.dataset.openCharacter);activeSheetTab='overview';setView('sheet');return;}
  const action=e.target.closest('[data-action]');if(action){const name=action.dataset.action;
   if(name==='new-character'){openBuilder();return;}if(name==='quick-roll'){openQuickRoll();return;}if(name==='create-content'){openContentTypeChooser();return;}if(name==='clear-rolls'){state.rolls=[];persist();renderDashboard();return;}
   if(name==='save-settings'){state.campaign.name=$('setting-campaign-name').value.trim()||'Untitled Campaign';state.campaign.description=$('setting-campaign-description').value.trim();state.campaign.dmName=$('setting-dm-name').value.trim()||'Dungeon Master';persist();renderSidebar();toast('Campaign details saved.');return;}
   if(name==='grant-reroll'){state.settings.rerollCredits++;persist();renderSettings();toast('One ability-score reroll granted.');return;}
   if(name==='export-backup'){exportState(state);return;}if(name==='save-journal'){const title=$('journal-title').value.trim(),body=$('journal-body').value.trim();if(!title||!body){toast('Add a title and some notes first.','error');return;}state.journal.push({id:crypto.randomUUID(),title,body,createdAt:new Date().toISOString()});persist();$('journal-title').value='';$('journal-body').value='';renderJournal();toast('Journal entry saved.');return;}
   if(['add-map-token','build-encounter','start-combat','next-turn','toggle-grid','clear-map','clear-encounter','rename-map','measure-map','clear-measure'].includes(name)){handleEncounterAction(name);return;}
  }
  const tab=e.target.closest('[data-sheet-tab]');if(tab){activeSheetTab=tab.dataset.sheetTab;renderCharacterSheet();return;}
  const rollAbility=e.target.closest('[data-roll-ability]');if(rollAbility){const c=activeCharacter();if(c)addRoll(rollCheck(c,data,'ability',rollAbility.dataset.rollAbility));return;}
  const rollSkill=e.target.closest('[data-roll-skill]');if(rollSkill){const c=activeCharacter();if(c)addRoll(rollCheck(c,data,'skill',rollSkill.dataset.rollSkill));return;}
  const rollSave=e.target.closest('[data-roll-save]');if(rollSave){const c=activeCharacter();if(c)addRoll(rollCheck(c,data,'save',rollSave.dataset.rollSave));return;}
  if(e.target.closest('[data-roll-initiative]')){const c=activeCharacter();if(c)addRoll(rollCheck(c,data,'initiative','dex'));return;}
  const rollWeaponBtn=e.target.closest('[data-roll-weapon]');if(rollWeaponBtn){const c=activeCharacter();try{addRoll(rollWeapon(c,data,rollWeaponBtn.dataset.rollWeapon));}catch(err){toast(err.message,'error');}return;}
  const castBtn=e.target.closest('[data-cast-spell]');if(castBtn){const c=activeCharacter();try{const result=castSpell(c,data,castBtn.dataset.castSpell);addRoll(result);persist();renderCharacterSheet();}catch(err){toast(err.message,'error');}return;}
  const removeSpell=e.target.closest('[data-remove-spell]');if(removeSpell){const c=activeCharacter();c.spells=c.spells.filter(s=>s.spellId!==removeSpell.dataset.removeSpell);persist();renderCharacterSheet();return;}
  const prepareSpell=e.target.closest('[data-prepare-spell]');if(prepareSpell){const c=activeCharacter();const x=c.spells.find(s=>s.spellId===prepareSpell.dataset.prepareSpell);if(x){x.prepared=prepareSpell.checked;persist();}return;}
  const slot=e.target.closest('[data-slot-level]');if(slot){const c=activeCharacter(),s=c.spellSlots.find(x=>x.level===Number(slot.dataset.slotLevel));if(s){const index=Number(slot.dataset.slotIndex);const available=s.total-s.expended;s.expended=index<available?s.expended+1:Math.max(0,s.expended-1);persist();renderCharacterSheet();}return;}
  const hp=e.target.closest('[data-hp-delta]');if(hp){openHpAdjust(Number(hp.dataset.hpDelta));return;}
  const deathRoll=e.target.closest('[data-roll-death-save]');if(deathRoll){const c=activeCharacter();if(c&&Number(c.hpCurrent??calculateCharacterStats(c,data).maxHp)<=0){c.deathSaves??={successes:0,failures:0};const roll=rollDie(20);if(roll===20){c.hpCurrent=1;c.deathSaves={successes:0,failures:0};}else if(roll===1)c.deathSaves.failures=Math.min(3,c.deathSaves.failures+2);else if(roll>=10)c.deathSaves.successes=Math.min(3,c.deathSaves.successes+1);else c.deathSaves.failures=Math.min(3,c.deathSaves.failures+1);syncCharacterTokens(c);persist();renderCharacterSheet();addRoll({name:`${c.name} · Death Saving Throw`,formula:'d20',rolls:[roll],total:roll,detail:roll===20?'Natural 20: regain 1 Hit Point.':roll===1?'Natural 1: two failures.':roll>=10?'Success.': 'Failure.'});}return;}
  const sheetAction=e.target.closest('[data-action]');if(sheetAction&&['short-rest','long-rest','level-up','temp-hp','edit-character','add-inventory','add-spell'].includes(sheetAction.dataset.action)){handleSheetAction(sheetAction.dataset.action,sheetAction);return;}
  const qty=e.target.closest('[data-inventory-qty]');if(qty){const c=activeCharacter(),i=c.inventory[Number(qty.dataset.inventoryQty)];if(i){i.quantity=Math.max(0,Number(i.quantity)+Number(qty.dataset.delta));if(i.quantity===0)c.inventory.splice(Number(qty.dataset.inventoryQty),1);persist();renderCharacterSheet();}return;}
  const equip=e.target.closest('[data-equip-item]');if(equip){const c=activeCharacter(),i=c.inventory[Number(equip.dataset.equipItem)];if(i){i.equipped=equip.checked;persist();renderCharacterSheet();}return;}
  const removeItem=e.target.closest('[data-remove-item]');if(removeItem){const c=activeCharacter();c.inventory.splice(Number(removeItem.dataset.removeItem),1);persist();renderCharacterSheet();return;}
  const editChar=e.target.closest('[data-edit-character]');if(editChar){openEditCharacter(editChar.dataset.editCharacter);return;}
  const deleteChar=e.target.closest('[data-delete-character]');if(deleteChar){const c=state.characters.find(x=>x.id===deleteChar.dataset.deleteCharacter);if(!c)return;openModal('Remove character',`<p>Remove <b>${escapeHTML(c.name)}</b> from this campaign? This also removes linked map tokens and initiative entries.</p><button class="primary-button" id="confirm-delete-character">Remove character</button>`);$('confirm-delete-character').onclick=()=>{state.characters=state.characters.filter(x=>x.id!==c.id);const tokenIds=state.encounter.tokens.filter(t=>t.entityType==='character'&&t.entityId===c.id).map(t=>t.id);state.encounter.tokens=state.encounter.tokens.filter(t=>!tokenIds.includes(t.id));state.encounter.combatants=state.encounter.combatants.filter(x=>!tokenIds.includes(x.tokenId));if(state.activeCharacterId===c.id)state.activeCharacterId=state.characters[0]?.id||null;persist();closeModal();renderCharacters();renderSidebar();toast('Character removed.');};return;}
  const contentEdit=e.target.closest('[data-edit-content]');if(contentEdit){contentEditByRef(contentEdit.dataset.editContent);return;}
  const newContent=e.target.closest('[data-new-content-type]');if(newContent){contentOpenEditor(newContent.dataset.newContentType);return;}
  const deleteContentButton=e.target.closest('[data-delete-content]');if(deleteContentButton){const [type,id]=deleteContentButton.dataset.deleteContent.split(':');contentDelete(type,id);return;}
  const contentFilterBtn=e.target.closest('[data-content-filter]');if(contentFilterBtn){contentFilter=contentFilterBtn.dataset.contentFilter;renderContentView();return;}
  const deleteJournal=e.target.closest('[data-delete-journal]');if(deleteJournal){state.journal=state.journal.filter(x=>x.id!==deleteJournal.dataset.deleteJournal);persist();renderJournal();return;}
  const combatantHp=e.target.closest('[data-combatant-hp]');if(combatantHp){const enc=state.encounter,c=enc.combatants.find(x=>x.id===combatantHp.dataset.combatantHp);if(c){const before=c.hp,delta=Number(combatantHp.dataset.delta),character=c.entityType==='character'?state.characters.find(x=>x.id===c.entityId):null;if(character&&Number(character.deathSaves?.failures)>=3&&delta>0){toast('This character is dead; ordinary healing cannot restore them.','error');return;}updateCombatantHp(enc,c.id,c.hp+delta);if(c.entityType==='character'){if(character){character.hpCurrent=c.hp;if(before<=0&&delta<0){character.deathSaves??={successes:0,failures:0};const max=calculateCharacterStats(character,data).maxHp;character.deathSaves.failures=Math.min(3,character.deathSaves.failures+(Math.abs(delta)>=max?3:1));}if(c.hp>0)character.deathSaves={successes:0,failures:0};}}persist();renderEncounterView();}return;}
  const addCondition=e.target.closest('[data-condition-add]');if(addCondition){const id=addCondition.dataset.conditionAdd,select=addCondition.parentElement.querySelector(`[data-condition-select="${id}"]`),c=state.encounter.combatants.find(x=>x.id===id),value=select?.value;if(c&&value){c.conditions??=[];if(!c.conditions.includes(value))c.conditions.push(value);persist();renderEncounterView();}return;}
  const removeCondition=e.target.closest('[data-remove-condition]');if(removeCondition){const [id,index]=removeCondition.dataset.removeCondition.split(':'),c=state.encounter.combatants.find(x=>x.id===id);if(c){c.conditions.splice(Number(index),1);persist();renderEncounterView();}return;}
  const removeToken=e.target.closest('[data-remove-token]');if(removeToken){const id=removeToken.dataset.removeToken,enc=state.encounter,removedIndex=enc.combatants.findIndex(c=>c.tokenId===id);enc.tokens=enc.tokens.filter(t=>t.id!==id);enc.combatants=enc.combatants.filter(c=>c.tokenId!==id);enc.selectedTokenId=null;if(!enc.combatants.length){enc.active=false;enc.round=0;enc.turnIndex=-1;}else if(removedIndex>=0&&removedIndex<enc.turnIndex)enc.turnIndex--;else if(enc.turnIndex>=enc.combatants.length)enc.turnIndex=0;persist();renderEncounterView();return;}
  const removeCombatant=e.target.closest('[data-remove-combatant]');if(removeCombatant){const e=state.encounter,removedIndex=e.combatants.findIndex(c=>c.id===removeCombatant.dataset.removeCombatant);e.combatants=e.combatants.filter(c=>c.id!==removeCombatant.dataset.removeCombatant);if(!e.combatants.length){e.active=false;e.turnIndex=-1;e.round=0;}else if(removedIndex>=0&&removedIndex<e.turnIndex)e.turnIndex--;else if(e.turnIndex>=e.combatants.length)e.turnIndex=0;persist();renderEncounterView();return;}
  const rollSide=e.target.closest('[data-roll-side]');if(rollSide){rollGroupInitiative(state.encounter,state.characters,data,rollSide.dataset.rollSide);persist();renderEncounterView();toast(`${humanize(rollSide.dataset.rollSide)} initiative rolled.`);return;}
  const close=e.target.closest('[data-action="close-modal"]');if(close){closeModal();return;}
 });
 $('content-search').addEventListener('input',e=>{contentSearch=e.target.value;renderContentView();});
 $('character-search').addEventListener('input',e=>{characterSearch=e.target.value;renderCharacters();});
 $('active-character-select').addEventListener('change',e=>{if(e.target.value){syncActiveCharacter(e.target.value);activeSheetTab='overview';renderCharacterSheet();}});
 $('builder-root').addEventListener('click',builderClick);$('builder-root').addEventListener('change',builderChange);$('builder-root').addEventListener('input',builderInput);
 $('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
 $('modalContent').addEventListener('submit',e=>{
  if(e.target.id==='dice-form'){e.preventDefault();const fd=new FormData(e.target),count=Math.max(1,Math.min(50,Number(fd.get('count'))||1)),sides=Number(fd.get('sides'))||20,modifier=Number(fd.get('modifier'))||0;const rolls=Array.from({length:count},()=>rollDie(sides)),total=rolls.reduce((a,b)=>a+b,0)+modifier;const detail=`${rolls.join(' + ')} ${formatMod(modifier)} = ${total}`;$('dice-result').innerHTML=`<div class="roll-result-panel"><b>${total}</b><span>${escapeHTML(detail)}</span></div>`;addRoll({name:'Dice roller',formula:`${count}d${sides}${modifier?formatMod(modifier):''}`,rolls,total,detail});}
 });
 $('import-backup-file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{state=await importState(file);state.activeCharacterId=state.activeCharacterId||state.characters[0]?.id||null;hydrateCustom();persist();renderView();toast('Campaign backup imported.');}catch(err){toast(`Import failed: ${err.message}`,'error');}e.target.value='';});
 $('map-stage')?.addEventListener('change',()=>{});
 document.addEventListener('change',e=>{
  if(e.target.id==='mapImageInput'){
   const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){toast('Choose an image file.','error');return;}
   if(file.size>2*1024*1024){toast('Map images must be 2 MB or smaller so the private browser save stays reliable.','error');return;}
   const reader=new FileReader();reader.onload=()=>{state.encounter.map.image=String(reader.result);persist();renderEncounterView();toast('Map background uploaded.');};reader.readAsDataURL(file);return;
  }
  if(e.target.dataset.tokenSide){const token=state.encounter.tokens.find(t=>t.id===e.target.dataset.tokenSide);if(token){token.side=e.target.value;syncTokenToCombatant(state.encounter,token);persist();renderEncounterView();}return;}
  if(e.target.dataset.tokenHp){const token=state.encounter.tokens.find(t=>t.id===e.target.dataset.tokenHp);if(token){token.hp=Math.max(0,Math.min(Number(token.maxHp)||1,Number(e.target.value)||0));if(token.entityType==='character'){const character=state.characters.find(c=>c.id===token.entityId);if(character){if(Number(character.deathSaves?.failures)>=3&&token.hp>0){token.hp=0;toast('This character is dead; ordinary healing cannot restore them.','error');}character.hpCurrent=token.hp;if(token.hp>0)character.deathSaves={successes:0,failures:0};}}syncTokenToCombatant(state.encounter,token);persist();renderEncounterView();}return;}
  if(e.target.dataset.initiative){const enc=state.encounter,current=enc.combatants[enc.turnIndex]?.id,c=enc.combatants.find(x=>x.id===e.target.dataset.initiative);if(c){c.initiative=Number(e.target.value)||0;enc.combatants.sort((a,b)=>b.initiative-a.initiative);if(current)enc.turnIndex=enc.combatants.findIndex(x=>x.id===current);persist();renderEncounterView();}return;}
 });
 document.addEventListener('input',e=>{
  if(e.target.dataset.characterField){const c=activeCharacter();if(c){c[e.target.dataset.characterField]=e.target.value;clearTimeout(window.__sheetSave);window.__sheetSave=setTimeout(()=>persist(),350);}return;}
 });
 document.addEventListener('focusout',e=>{if(e.target.dataset.characterField)persist();});
}

async function init(){
 try{
  data=await loadRulesData();
  if(state.customContent)hydrateCustom();
  $('setting-campaign-name').value=state.campaign.name;
  bindGlobalEvents();renderView();
  if(!state.activeCharacterId&&state.characters.length)state.activeCharacterId=state.characters[0].id;
  persist();
  document.documentElement.dataset.appReady='true';
 }catch(error){
  document.body.innerHTML=`<main style="max-width:720px;margin:10vh auto;padding:28px;color:#f3e8d2;font:16px system-ui"><h1>D&amp;D Unlimited could not start</h1><p>${escapeHTML(error.message)}</p><p>Check that <code>data/srd-5.2-2024.json</code> and the <code>src/</code> modules were deployed with this page.</p></main>`;
  console.error(error);
 }
}
init();
