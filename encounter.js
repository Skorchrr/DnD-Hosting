import { escapeHTML, humanize, initials } from './ui.js';
import { rollInitiative, abilityMod, calculateCharacterStats, getItem } from './rules.js';

function tokenFromCharacter(character,index=0){
 return {id:crypto.randomUUID(),entityType:'character',entityId:character.id,name:character.name,side:'party',x:18+(index%5)*10,y:24+Math.floor(index/5)*12,hp:character.hpCurrent??character.hpMax??10,maxHp:character.hpMax??10,ac:character.ac||10};
}
function tokenFromMonster(monster,index=0){
 return {id:crypto.randomUUID(),entityType:'monster',entityId:monster.id,name:monster.name,side:'enemy',x:64+(index%4)*8,y:30+Math.floor(index/4)*12,hp:monster.hp||10,maxHp:monster.hp||10,ac:monster.ac||10};
}
export function addMapToken(encounter,entityType,entity,index=0){
 const token=entityType==='character'?tokenFromCharacter(entity,index):tokenFromMonster(entity,index);
 encounter.tokens.push(token);return token;
}
export function buildEncounterFromTokens(encounter,characters,data){
 const existing=new Set(encounter.combatants.map(c=>c.tokenId));
 for(const token of encounter.tokens){
  if(existing.has(token.id))continue;
  let dex=0;
  if(token.entityType==='character'){
   const character=characters.find(x=>x.id===token.entityId);if(!character)continue;
   dex=abilityMod(character.abilities?.dex);
  } else {
   const monster=data.monsters.find(x=>x.id===token.entityId)||data.custom?.monster?.find(x=>x.id===token.entityId);if(!monster)continue;
   dex=abilityMod(monster.ab?.dex||10);
  }
  encounter.combatants.push({id:crypto.randomUUID(),tokenId:token.id,entityType:token.entityType,entityId:token.entityId,name:token.name,side:token.side,initiative:10+dex,hp:token.hp,maxHp:token.maxHp,ac:token.ac,dexMod:dex,conditions:[]});
 }
 const currentId=encounter.active?encounter.combatants[encounter.turnIndex]?.id:null;
 encounter.combatants.sort((a,b)=>b.initiative-a.initiative);
 if(currentId)encounter.turnIndex=encounter.combatants.findIndex(x=>x.id===currentId);
}
export function rollGroupInitiative(encounter,characters,data,side){
 const currentId=encounter.active?encounter.combatants[encounter.turnIndex]?.id:null;
 for(const combatant of encounter.combatants.filter(x=>x.side===side)){
  const token=encounter.tokens.find(t=>t.id===combatant.tokenId);
  if(combatant.entityType==='character'){
   const character=characters.find(c=>c.id===combatant.entityId);if(character){const result=rollInitiative(character,data);combatant.initiative=result.total;combatant.lastRoll=result;}
  } else {
   const roll=Math.floor(Math.random()*20)+1;combatant.lastRoll={roll,bonus:combatant.dexMod,total:roll+combatant.dexMod};combatant.initiative=roll+combatant.dexMod;
  }
 }
 encounter.combatants.sort((a,b)=>b.initiative-a.initiative);
 if(currentId)encounter.turnIndex=encounter.combatants.findIndex(x=>x.id===currentId);
}
export function renderEncounter(state,data){
 const e=state.encounter,selected=e.tokens.find(t=>t.id===e.selectedTokenId);
 const bg=e.map.image&&String(e.map.image).startsWith('data:image/')?`--map-image:url("${e.map.image}");`:'';
 const sideLabel=side=>({party:'Party',enemy:'Enemies',npc:'NPCs'}[side]||'NPCs');
 const tokenMarkup=e.tokens.map((t,i)=>`<button class="map-token ${t.side} ${t.id===e.selectedTokenId?'selected':''}" style="left:${t.x}%;top:${t.y}%" data-map-token="${t.id}" title="${escapeHTML(t.name)}"><span>${escapeHTML(initials(t.name))}</span><small>${escapeHTML(t.name)}</small></button>`).join('');
 const measureMarkup=e.measureStart?(e.measureEnd?(()=>{const a=e.measureStart,b=e.measureEnd,dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy*.75),angle=Math.atan2(dy*.75,dx)*180/Math.PI,distance=Math.round(Math.hypot(dx*(e.map.columns||20)/100,dy*(e.map.rows||15)/100))*5;return `<div class="map-measure-line" style="left:${a.x}%;top:${a.y}%;width:${length}%;transform:rotate(${angle}deg)"></div><span class="map-measure-label" style="left:${(a.x+b.x)/2}%;top:${(a.y+b.y)/2}%">~${distance} ft.</span>`;})():`<span class="map-measure-start" style="left:${e.measureStart.x}%;top:${e.measureStart.y}%"></span>`):'';
 const ordered=[...e.combatants].sort((a,b)=>b.initiative-a.initiative);
 const conditions=['Blinded','Charmed','Deafened','Exhaustion','Frightened','Grappled','Incapacitated','Invisible','Paralyzed','Petrified','Poisoned','Prone','Restrained','Stunned','Unconscious'];
 const rows=ordered.map((c)=>`<article class="initiative-row ${e.active&&e.combatants.indexOf(c)===e.turnIndex?'current':''}"><label class="initiative-number"><input type="number" data-initiative="${c.id}" value="${c.initiative}" aria-label="Initiative for ${escapeHTML(c.name)}"></label><div class="initiative-person"><b>${escapeHTML(c.name)}</b><small><span class="side-tag ${escapeHTML(c.side)}">${sideLabel(c.side)}</span> · ${escapeHTML(c.entityType==='character'?'Player character':'Creature')} · AC ${c.ac}</small><div class="initiative-hp"><i style="width:${Math.max(0,Math.min(100,c.hp/Math.max(1,c.maxHp)*100))}%"></i></div><div class="combatant-conditions">${(c.conditions||[]).map((condition,i)=>`<button type="button" class="condition-chip" data-remove-condition="${c.id}:${i}" title="Remove ${escapeHTML(condition)}">${escapeHTML(condition)} ×</button>`).join('')}<select aria-label="Add condition to ${escapeHTML(c.name)}" data-condition-select="${c.id}"><option value="">Add condition…</option>${conditions.map(x=>`<option value="${x}">${x}</option>`).join('')}</select><button type="button" class="condition-add" data-condition-add="${c.id}">＋</button></div></div><div class="initiative-hp-value"><b>${c.hp}</b><small>/${c.maxHp}</small><div class="combatant-hp-controls"><button type="button" data-combatant-hp="${c.id}" data-delta="-5" aria-label="Deal 5 damage to ${escapeHTML(c.name)}">−5</button><button type="button" data-combatant-hp="${c.id}" data-delta="-1" aria-label="Deal 1 damage to ${escapeHTML(c.name)}">−</button><button type="button" data-combatant-hp="${c.id}" data-delta="1" aria-label="Restore 1 hit point to ${escapeHTML(c.name)}">＋</button></div></div><button type="button" class="icon-button tiny" data-remove-combatant="${c.id}" title="Remove from initiative">×</button></article>`).join('');
 return `<div class="encounter-layout"><section class="encounter-map-panel"><div class="encounter-map-toolbar"><div><span class="eyebrow">TACTICAL MAP</span><h2>${escapeHTML(e.map.name||'Battle Map')}</h2></div><div class="map-toolbar-actions"><button class="secondary-button small" data-action="rename-map">Rename map</button><label class="secondary-button small upload-button">Upload map<input type="file" accept="image/*" id="mapImageInput" hidden></label><button class="secondary-button small" data-action="toggle-grid">${e.map.grid?'Hide grid':'Show grid'}</button><button class="secondary-button small" data-action="measure-map">${e.measureMode?'Cancel measure':'Measure distance'}</button>${e.measureStart||e.measureEnd?'<button class="secondary-button small" data-action="clear-measure">Clear measure</button>':''}<button class="secondary-button small" data-action="clear-map">Clear map</button></div></div><div class="map-stage-wrap"><div id="map-stage" class="map-stage ${e.map.grid?'grid-on':''}" style="${bg}--map-cols:${e.map.columns||20};--map-rows:${e.map.rows||15}">${tokenMarkup}${measureMarkup}<span class="map-stage-label">${escapeHTML(e.map.name||'Battle Map')}</span></div></div><div class="map-caption"><span>${e.measureMode?'Click two points on the map to measure distance.':'Drag tokens to move them. Select a token to edit its side and hit points.'}</span><span>${e.map.columns||20} × ${e.map.rows||15} grid</span></div><div class="token-add-row"><label class="field-label">Add a character or creature<select id="map-add-entity"><optgroup label="Party characters">${state.characters.map(c=>`<option value="character:${c.id}">${escapeHTML(c.name)} · ${escapeHTML(c.className||'Adventurer')}</option>`).join('')||'<option value="">No characters yet</option>'}</optgroup><optgroup label="Creatures">${data.monsters.map(m=>`<option value="monster:${m.id}">${escapeHTML(m.name)} · CR ${m.cr}</option>`).join('')}</optgroup></select></label><button class="primary-button" data-action="add-map-token">＋ Place token</button></div>${selected?`<section class="selected-token-panel"><div><span class="eyebrow">SELECTED TOKEN</span><h3>${escapeHTML(selected.name)}</h3></div><label class="field-label">Role<select data-token-side="${selected.id}"><option value="party" ${selected.side==='party'?'selected':''}>Party member</option><option value="enemy" ${selected.side==='enemy'?'selected':''}>Enemy</option><option value="npc" ${selected.side==='npc'?'selected':''}>Nonplayer character</option></select></label><label class="field-label">Hit Points<input type="number" min="0" data-token-hp="${selected.id}" value="${selected.hp}"></label><button class="secondary-button small" data-remove-token="${selected.id}">Remove token</button></section>`:''}</section>
 <aside class="encounter-tracker"><header class="tracker-header"><div><span class="eyebrow">ENCOUNTER</span><h2>Initiative tracker</h2></div><span class="tracker-round">${e.active?`ROUND ${e.round}`:'NOT STARTED'}</span></header><div class="tracker-actions"><button type="button" class="secondary-button full" data-action="build-encounter" ${e.tokens.length?'':'disabled'}>Add all map tokens</button><div class="tracker-roll-buttons"><button type="button" class="secondary-button" data-roll-side="party" ${e.combatants.some(c=>c.side==='party')?'':'disabled'}>Roll party</button><button type="button" class="secondary-button" data-roll-side="enemy" ${e.combatants.some(c=>c.side==='enemy')?'':'disabled'}>Roll enemies</button></div></div><div class="initiative-list">${rows||'<div class="empty-panel compact">Place tokens on the map, then choose “Add all map tokens” to build the encounter.</div>'}</div><div class="tracker-footer"><button type="button" class="primary-button full" data-action="start-combat" ${e.combatants.length?'':'disabled'}>${e.active?'Restart combat':'Start combat'}</button><button type="button" class="secondary-button full" data-action="next-turn" ${e.active?'':'disabled'}>Next turn →</button><button type="button" class="text-button danger-text" data-action="clear-encounter">Clear encounter</button></div></aside></div>`;
}

export function syncTokenToCombatant(encounter,token){
 const c=encounter.combatants.find(x=>x.tokenId===token.id);if(c){c.side=token.side;c.hp=token.hp;c.maxHp=token.maxHp;c.name=token.name;}
}
export function updateCombatantHp(encounter,id,hp){
 const c=encounter.combatants.find(x=>x.id===id);if(!c)return;
 c.hp=Math.max(0,Math.min(c.maxHp,Number(hp)||0));
 const token=encounter.tokens.find(t=>t.id===c.tokenId);if(token)token.hp=c.hp;
}
export function startCombat(encounter){
 if(!encounter.combatants.length)throw new Error('Add tokens to the initiative tracker before starting combat.');
 encounter.combatants.sort((a,b)=>b.initiative-a.initiative);encounter.active=true;encounter.round=1;encounter.turnIndex=0;
}
export function advanceTurn(encounter){
 if(!encounter.active||!encounter.combatants.length)return;
 encounter.turnIndex++;
 if(encounter.turnIndex>=encounter.combatants.length){encounter.turnIndex=0;encounter.round++;}
}
