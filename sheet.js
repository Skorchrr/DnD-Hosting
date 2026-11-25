import { ABILITIES, SKILLS, abilityMod, formatMod, proficiencyBonus, calculateCharacterStats, calculateSkillBonus, rollDie, rollFormula, getItem, getSpell } from './rules.js';
import { escapeHTML, humanize, initials, rulesText } from './ui.js';

function abilityCard(character,key,name){
 const score=Number(character.abilities?.[key]??10),mod=abilityMod(score);
 return `<button type="button" class="ability-stat" data-roll-ability="${key}" title="Roll a ${name} check"><span>${name}</span><strong>${score}</strong><b>${formatMod(mod)}</b><small>Check ↗</small></button>`;
}
function featureList(features=[]){
 if(!features.length)return '<p class="muted">Nothing recorded here yet.</p>';
 return features.map(f=>`<details class="feature-entry"><summary><span><b>${escapeHTML(f.name)}</b><small>${escapeHTML(f.source||'Character feature')}</small></span><i>Read details</i></summary>${rulesText(f.description||f.d||'')}</details>`).join('');
}
function skillRows(character,data){
 return SKILLS.map(([id,name,ability])=>{
  const bonus=calculateSkillBonus(character,id,data),trained=(character.skillProficiencies||[]).includes(id),expert=(character.expertise||[]).includes(id);
  return `<button class="skill-row ${trained?'trained':''}" type="button" data-roll-skill="${id}"><span class="skill-dot">${trained?'●':'○'}</span><span class="skill-name">${name}<small>${ability.toUpperCase()}</small></span><b>${formatMod(bonus)}</b><small>${expert?'Expertise':trained?'Proficient':'Untrained'}</small></button>`;
 }).join('');
}
function inventoryRows(character,data){
 if(!character.inventory?.length)return '<div class="empty-panel">Your inventory is empty. Add equipment to keep everything in one place.</div>';
 return character.inventory.map((entry,index)=>{
  const item=getItem(data,entry.itemId)||{id:entry.itemId,name:entry.name||humanize(entry.itemId),d:''};
  return `<div class="inventory-row"><div class="inventory-item-icon">${item.w?'⚔':item.a?'⬡':'◇'}</div><div class="inventory-item-name"><b>${escapeHTML(item.name)}</b><small>${escapeHTML(item.cat||'Equipment')}${item.w?` · ${escapeHTML(item.w.dmg)} ${escapeHTML(item.w.dt)}`:''}${item.a?` · AC ${item.a.base}${item.a.dex?'+ DEX':''}`:''}</small></div><div class="inventory-quantity"><button type="button" data-inventory-qty="${index}" data-delta="-1" aria-label="Decrease quantity">−</button><b>${Number(entry.quantity)||1}</b><button type="button" data-inventory-qty="${index}" data-delta="1" aria-label="Increase quantity">+</button></div><label class="equip-toggle"><input type="checkbox" data-equip-item="${index}" ${entry.equipped?'checked':''}><span>Equipped</span></label><button type="button" class="icon-button small" data-remove-item="${index}" title="Remove item">×</button></div>`;
 }).join('');
}
function spellCard(entry,data,stats){
 const spell=getSpell(data,entry.spellId)||entry;
 return `<article class="spell-card"><div class="spell-card-top"><div><span class="spell-level">${Number(spell.lvl)===0?'Cantrip':`Level ${spell.lvl}`} · ${escapeHTML(spell.sch||'Magic')}</span><h4>${escapeHTML(spell.name)}</h4></div><label class="prepared-toggle"><input type="checkbox" data-prepare-spell="${escapeHTML(spell.id)}" ${entry.prepared?'checked':''}><span>Prepared</span></label></div><div class="spell-facts"><span><b>Cast</b>${escapeHTML(spell.t||'Action')}</span><span><b>Range</b>${escapeHTML(spell.r||'—')}</span><span><b>Duration</b>${escapeHTML(spell.dur||'—')}</span><span><b>Components</b>${escapeHTML(spell.comp||'—')}</span></div>${rulesText(spell.d||'')}${spell.hl?`<p class="spell-higher"><b>At Higher Levels.</b> ${escapeHTML(spell.hl)}</p>`:''}<div class="spell-card-actions"><button class="primary-button small" type="button" data-cast-spell="${escapeHTML(spell.id)}">Cast spell</button><button class="secondary-button small" type="button" data-remove-spell="${escapeHTML(spell.id)}">Remove</button></div></article>`;
}

function overview(character,data,stats){
 const saves=(character.savingThrowProficiencies||[]);
 return `<div class="sheet-grid-main"><section class="sheet-panel"><div class="section-heading"><div><span class="eyebrow">ABILITY SCORES</span><h3>Your core abilities</h3></div><span class="muted">Select an ability to roll a check</span></div><div class="ability-stat-grid">${ABILITIES.map(([key,name])=>abilityCard(character,key,name)).join('')}</div></section><section class="sheet-panel"><div class="section-heading"><div><span class="eyebrow">SAVING THROWS</span><h3>Resist harmful effects</h3></div></div><div class="save-grid">${ABILITIES.map(([key,name])=>`<button class="save-row ${saves.includes(key)?'trained':''}" data-roll-save="${key}" type="button"><span>${name}</span><b>${formatMod(abilityMod(character.abilities?.[key])+(saves.includes(key)?stats.pb:0))}</b><small>${saves.includes(key)?'Proficient':'Untrained'}</small></button>`).join('')}</div></section><section class="sheet-panel"><div class="section-heading"><div><span class="eyebrow">SKILLS</span><h3>Checks and expertise</h3></div><span class="muted">Click a skill to roll</span></div><div class="skill-list">${skillRows(character,data)}</div></section><section class="sheet-panel"><div class="section-heading"><div><span class="eyebrow">FEATURES & TRAITS</span><h3>What makes you unique</h3></div><button class="text-button" data-sheet-tab="features">View all →</button></div>${featureList((character.features||[]).slice(0,4))}</section></div>`;
}
function actionsTab(character,data,stats){
 const weapons=(character.inventory||[]).filter(i=>i.equipped!==false).map(i=>getItem(data,i.itemId)).filter(i=>i?.w);
 const actionFeatures=(character.features||[]).filter(f=>/attack|action|rage|inspiration|second wind|lay on hands|wild shape|channel divinity|sneak attack|fighting style/i.test(`${f.name} ${f.description}`));
 return `<div class="sheet-grid-main"><section class="sheet-panel span-two"><div class="section-heading"><div><span class="eyebrow">WEAPON ATTACKS</span><h3>Make an attack</h3></div></div>${weapons.length?weapons.map(item=>`<article class="action-card"><div><b>${escapeHTML(item.name)}</b><p>${escapeHTML(item.w.dmg)} ${escapeHTML(item.w.dt)} · ${escapeHTML((item.w.props||[]).join(', '))}${item.w.range?` · ${escapeHTML(item.w.range)}`:''}</p><small>Mastery: ${escapeHTML(item.w.mastery||'—')}</small></div><button class="primary-button small" type="button" data-roll-weapon="${escapeHTML(item.id)}">Roll attack</button></article>`).join(''):'<div class="empty-panel">Equip a weapon in Inventory to add it to your Actions tab.</div>'}</section><section class="sheet-panel"><div class="section-heading"><div><span class="eyebrow">SPELLCASTING</span><h3>Spell attacks</h3></div></div>${stats.spellAbility?`<div class="spell-stat-block"><span>Spellcasting ability</span><b>${humanize(stats.spellAbility)}</b><span>Spell save DC</span><b>${stats.spellSaveDC}</b><span>Spell attack bonus</span><b>${formatMod(stats.spellAttackBonus)}</b></div><button class="secondary-button full" data-sheet-tab="spells">Open spellbook</button>`:'<p class="muted">Your class does not grant spellcasting at level 1.</p>'}</section><section class="sheet-panel"><div class="section-heading"><div><span class="eyebrow">CLASS FEATURES</span><h3>Actions to remember</h3></div></div>${featureList(actionFeatures)}</section></div>`;
}
function inventoryTab(character,data,stats){
 return `<div class="sheet-panel"><div class="section-heading"><div><span class="eyebrow">EQUIPMENT & CURRENCY</span><h3>My inventory</h3><p>Equip armor and shields to update your Armor Class. Equip weapons to make them available in Actions.</p></div><button class="primary-button" type="button" data-action="add-inventory">＋ Add item</button></div><div class="inventory-summary"><div><b>${stats.ac}</b><span>Armor Class</span></div><div><b>${Number(character.gold)||0} GP</b><span>Carried gold</span></div><div><b>${(character.inventory||[]).reduce((s,i)=>s+(Number(i.quantity)||0),0)}</b><span>Items carried</span></div></div><div class="inventory-list">${inventoryRows(character,data)}</div><div class="inventory-note">An item marked Equipped contributes to your Armor Class where the rules data supports it. Other item effects remain visible in their descriptions for manual adjudication.</div></div>`;
}
function spellsTab(character,data,stats){
 const cls=data.classes.find(c=>c.id===character.classId);
 const spellcasting=Boolean(cls?.spell||character.spells?.length);
 const spells=(character.spells||[]).map(entry=>spellCard(entry,data,stats)).join('');
 const slots=(character.spellSlots||[]).filter(x=>x.total>0);
 return `<div class="sheet-grid-main"><section class="sheet-panel span-two"><div class="section-heading"><div><span class="eyebrow">SPELLBOOK</span><h3>Your spells</h3><p>Descriptions are kept with each spell. Prepared spells are marked for quick access during play.</p></div><button class="primary-button" type="button" data-action="add-spell">＋ Manage spells</button></div>${spellcasting?`<div class="spellcasting-banner"><div><b>${escapeHTML(humanize(stats.spellAbility||cls?.spell?.ab||'Spellcasting'))}</b><span>Spellcasting ability</span></div><div><b>${stats.spellSaveDC??'—'}</b><span>Save DC</span></div><div><b>${formatMod(stats.spellAttackBonus??0)}</b><span>Spell attack</span></div></div>`:''}${slots.length?`<div class="slot-tracker">${slots.map(slot=>`<div class="slot-row"><b>Level ${slot.level}</b><span>${Array.from({length:slot.total},(_,i)=>`<button type="button" class="slot-pip ${i<slot.total-slot.expended?'available':'used'}" data-slot-level="${slot.level}" data-slot-index="${i}" title="Toggle slot"></button>`).join('')}</span><small>${slot.total-slot.expended} / ${slot.total} left</small></div>`).join('')}</div>`:''}${spells||'<div class="empty-panel">No spells have been added. Choose a spell from your class list to begin.</div>'}</section></div>`;
}
function featuresTab(character){
 const bySource=new Map();for(const f of character.features||[]){const source=f.source||'Other';if(!bySource.has(source))bySource.set(source,[]);bySource.get(source).push(f);}
 return `<div class="sheet-panel"><div class="section-heading"><div><span class="eyebrow">FEATURES & TRAITS</span><h3>All your abilities</h3><p>Each entry is separated into a readable card. Expand it to read the complete rule text and any special use notes.</p></div></div>${[...bySource.entries()].map(([source,items])=>`<section class="feature-group"><h4>${escapeHTML(source)}</h4>${featureList(items)}</section>`).join('')||'<p class="muted">No features recorded.</p>'}</div>`;
}
function notesTab(character){
 return `<div class="sheet-grid-main"><section class="sheet-panel"><div class="section-heading"><div><span class="eyebrow">CHARACTER STORY</span><h3>Appearance & backstory</h3></div></div><label class="field-label">Appearance<textarea rows="4" data-character-field="appearance">${escapeHTML(character.appearance||'')}</textarea></label><label class="field-label">Backstory<textarea rows="9" data-character-field="backstory">${escapeHTML(character.backstory||'')}</textarea></label><label class="field-label">Personality and ideals<textarea rows="5" data-character-field="personality">${escapeHTML(character.personality||'')}</textarea></label></section><section class="sheet-panel"><div class="section-heading"><div><span class="eyebrow">SESSION NOTES</span><h3>Notes and reminders</h3></div></div><textarea class="notes-area" rows="20" data-character-field="notes" placeholder="Quest leads, NPC names, secrets, promises, clues...">${escapeHTML(character.notes||'')}</textarea></section></div>`;
}

export function renderSheet(character,data,tab='overview'){
 if(!character)return '<div class="empty-panel">Choose a character to open their sheet.</div>';
 const stats=calculateCharacterStats(character,data),selected=(x)=>x===tab?'active':'';
 const content=({overview:()=>overview(character,data,stats),actions:()=>actionsTab(character,data,stats),inventory:()=>inventoryTab(character,data,stats),spells:()=>spellsTab(character,data,stats),features:()=>featuresTab(character),notes:()=>notesTab(character)})[tab]?.()||overview(character,data,stats);
 const hp=Number(character.hpCurrent??stats.maxHp),max=Number(character.hpMax||stats.maxHp),hpPct=Math.max(0,Math.min(100,hp/max*100)),death=character.deathSaves||{successes:0,failures:0},deathStatus=death.failures>=3?'Dead':death.successes>=3?'Stable':'Unconscious — make a Death Saving Throw';
 const deathPanel=hp<=0?`<div class="death-save-panel"><div><b>Death Saves</b><small>${deathStatus}</small></div><div class="death-save-track"><span>Successes <b>${Math.min(3,death.successes||0)}/3</b></span><span>Failures <b>${Math.min(3,death.failures||0)}/3</b></span></div><div class="death-save-actions"><button type="button" class="secondary-button small" data-roll-death-save ${death.successes>=3||death.failures>=3?'disabled':''}>Roll Death Save</button></div></div>`:'';
 return `<div class="character-sheet"><header class="sheet-hero"><div class="sheet-avatar">${escapeHTML(initials(character.name))}</div><div class="sheet-identity"><span class="eyebrow">LEVEL ${stats.level} · ${escapeHTML(character.backgroundName||'Adventurer')}</span><h2>${escapeHTML(character.name)}</h2><p>${escapeHTML([character.speciesSubName,character.speciesName,character.className,character.subclassName].filter(Boolean).join(' · '))}</p><div class="identity-tags"><span>${escapeHTML(character.alignment||'Unaligned')}</span><span>${escapeHTML((character.languages||[]).join(' · ')||'No languages')}</span></div></div><div class="hero-buttons"><button class="secondary-button" data-action="short-rest">Short rest</button><button class="secondary-button" data-action="long-rest">Long rest</button>${stats.level<20?'<button class="secondary-button" data-action="level-up">Level up</button>':''}<button class="primary-button" data-action="edit-character">Edit details</button></div></header>
 <section class="sheet-vitals"><div class="vital-card hp-vital"><span>HIT POINTS</span><div><strong>${hp}</strong><small> / ${max}</small></div><div class="hp-meter"><i style="width:${hpPct}%"></i></div><div class="hp-controls"><button type="button" data-hp-delta="-1">− Damage</button><button type="button" data-hp-delta="1">+ Heal</button><button type="button" data-action="temp-hp">Temp HP</button></div>${deathPanel}</div><div class="vital-card"><span>ARMOR CLASS</span><strong>${stats.ac}</strong><small>Current protection</small></div><div class="vital-card"><span>INITIATIVE</span><strong>${formatMod(stats.initiative)}</strong><small>Dexterity modifier</small><button class="vital-link" data-roll-initiative>Roll initiative</button></div><div class="vital-card"><span>SPEED</span><strong>${stats.speed} <small>ft.</small></strong><small>Walking speed</small></div><div class="vital-card"><span>PROFICIENCY</span><strong>+${stats.pb}</strong><small>Proficiency Bonus</small></div></section>
 <nav class="sheet-tabs">${[['overview','Overview'],['actions','Actions'],['inventory','Inventory'],['spells','Spells'],['features','Features & Traits'],['notes','Notes']].map(([id,label])=>`<button class="sheet-tab ${selected(id)}" data-sheet-tab="${id}">${label}</button>`).join('')}</nav>
 <div class="sheet-content">${content}</div></div>`;
}

export function rollCheck(character,data,kind,ref){
 const stats=calculateCharacterStats(character,data);let ability=ref,bonus=0,label='';
 if(kind==='skill') { const row=SKILLS.find(x=>x[0]===ref);if(!row)throw new Error('Unknown skill.');ability=row[2];bonus=calculateSkillBonus(character,ref,data);label=row[1]; }
 else if(kind==='save') {bonus=abilityMod(character.abilities?.[ability])+((character.savingThrowProficiencies||[]).includes(ability)?stats.pb:0);label=`${ability.toUpperCase()} saving throw`;}
 else if(kind==='ability') {bonus=abilityMod(character.abilities?.[ability]);label=`${ability.toUpperCase()} ability check`;}
 else if(kind==='initiative') {bonus=stats.initiative;label='Initiative';}
 const roll=rollDie(20),total=roll+bonus;
 return {name:`${character.name} · ${label}`,formula:`d20 ${formatMod(bonus)}`,rolls:[roll],total,detail:`${roll} ${formatMod(bonus)} = ${total}`};
}
export function rollWeapon(character,data,itemId){
 const item=getItem(data,itemId);if(!item?.w)throw new Error('This item is not a weapon.');
 const props=item.w.props||[],dex=abilityMod(character.abilities?.dex),str=abilityMod(character.abilities?.str);
 const ability=props.includes('Finesse')?(dex>str?'dex':'str'):item.w.rng==='ranged'?'dex':'str';
 const mod=abilityMod(character.abilities?.[ability]);
 const classData=data.classes.find(c=>c.id===character.classId);
 const trained=(classData?.weapons||[]).some(x=>x.toLowerCase().includes(item.w.cat)||x==='Simple Weapons'&&item.w.cat==='simple'||x==='Martial Weapons'&&item.w.cat==='martial');
 const stats=calculateCharacterStats(character,data),bonus=mod+(trained?stats.pb:0);
 const d20=rollDie(20),crit=d20===20;
 const damage=rollFormula(item.w.dmg||'1d4');
 let dice=[...damage.rolls];if(crit)dice=[...dice,...damage.rolls];
 const totalDamage=dice.reduce((a,b)=>a+b,0)+mod;
 return {name:`${character.name} · ${item.name}`,formula:`d20 ${formatMod(bonus)}`,rolls:[d20],total:d20+bonus,damage:{formula:crit?`${item.w.dmg} + ${item.w.dmg}`:item.w.dmg,rolls:dice,total:totalDamage,damageType:item.w.dt},detail:`Attack ${d20} ${formatMod(bonus)} = ${d20+bonus}${crit?' · Critical hit; damage dice doubled':''}. Damage ${dice.join(' + ')} ${formatMod(mod)} = ${totalDamage} ${item.w.dt}.`};
}
export function castSpell(character,data,spellId){
 const spell=getSpell(data,spellId);if(!spell)throw new Error('Spell not found.');
 const stats=calculateCharacterStats(character,data);const results={name:`${character.name} · ${spell.name}`,formula:'',rolls:[],total:0,detail:''};
 if(Number(spell.lvl)>0){const slot=character.spellSlots?.find(x=>x.level===Number(spell.lvl)&&x.total>x.expended);if(!slot)throw new Error(`No level ${spell.lvl} spell slot remaining.`);slot.expended++;}
 if(spell.atk){const die=rollDie(20),bonus=Number(stats.spellAttackBonus)||0;results.formula=`d20 ${formatMod(bonus)}`;results.rolls=[die];results.total=die+bonus;results.detail=`Spell attack: ${die} ${formatMod(bonus)} = ${results.total} vs target AC.`;}
 if(spell.dmg){const dmg=rollFormula(spell.dmg);results.damage=dmg;results.detail+=`${results.detail?' ':''}Damage: ${dmg.rolls.join(' + ')} = ${dmg.total} ${spell.dt||''}.`}
 if(spell.dc){results.detail+=` Target makes a ${humanize(spell.dc.ab||'') } saving throw against DC ${stats.spellSaveDC}.`}
 if(!results.detail)results.detail=`${spell.name} cast. Check the full spell text for its effect and targeting details.`;
 return results;
}
