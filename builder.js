import { ABILITIES, SKILLS, LANGUAGES, STANDARD_ARRAY, POINT_BUY_COST, pointBuySpent, validatePointBuy, abilityMod, rollAbilitySet, calculateAbilityScores } from './rules.js';
import { allOfType } from './data.js';
import { escapeHTML, rulesText, humanize } from './ui.js';

const STEPS=[['Class','Your role in the party'],['Background','Your life before adventuring'],['Species','Your people and traits'],['Ability scores','Your natural strengths'],['Training & gear','Skills, languages, and equipment'],['Character details','Review and finish']];
const CLASS_COPY={
 barbarian:'A fierce warrior who draws on primal power. Tough, direct, and dangerous in close combat.',
 bard:'A versatile performer whose magic comes from art, inspiration, and words. Supports allies and controls the field.',
 cleric:'A champion of divine power. Combines armor, healing, support, and potent spells.',
 druid:'A guardian of nature who shapes primal magic. Flexible spellcasting and a deep connection to the natural world.',
 fighter:'A master of weapons and tactics. Reliable in combat, with room to specialize in almost any fighting style.',
 monk:'A disciplined martial artist who turns speed, focus, and unarmed skill into a formidable weapon.',
 paladin:'A sworn champion who blends martial skill, resilience, and sacred magic.',
 ranger:'A skilled hunter and explorer, combining weapon mastery with nature magic and keen awareness.',
 rogue:'A precise expert who uses agility, stealth, and cunning to strike where it hurts most.',
 sorcerer:'A spellcaster whose magic is innate. A smaller selection of spells, wielded with unusual flexibility.',
 warlock:'A wielder of pact magic granted through a supernatural bargain. Distinctive powers and customizable invocations.',
 wizard:'A scholarly spellcaster with a broad spellbook and powerful arcane options.'
};
const ABILITY_TIPS={
 str:'Raw physical power. Important for heavy melee attacks, lifting, climbing, and breaking things.',
 dex:'Agility, reflexes, and precision. Helps with initiative, stealth, ranged attacks, and Armor Class.',
 con:'Stamina and resilience. Helps determine your Hit Points and protects your concentration.',
 int:'Reasoning, memory, and learned knowledge. Important for investigation and wizard magic.',
 wis:'Awareness, intuition, and insight. Important for noticing danger, reading people, and several divine or nature classes.',
 cha:'Presence, confidence, and force of personality. Important for social influence and several spellcasting classes.'
};

export function createDraft(data) {
 const cls=data.classes.find(x=>x.id==='fighter')||data.classes[0];
 const bg=data.backgrounds[0],species=data.species.find(x=>x.id==='human')||data.species[0];
 const originFeat=data.feats.find(x=>x.type==='origin'&&x.id==='skilled')||data.feats.find(x=>x.type==='origin');
 const spellRow=cls?.table?.[0]||{};
 const spellCount=cls?.id==='wizard'?6:Number(spellRow.p)||0;
 return {
  name:'',classId:cls?.id||'',backgroundId:bg?.id||'',speciesId:species?.id||'',speciesSubId:'',
  abilityMethod:'standard',scores:{str:15,dex:14,con:13,int:12,wis:10,cha:8},rollSet:[],rollAssignment:[0,1,2,3,4,5],
  asiScheme:'two-one',asiChoices:[bg?.abOpts?.[0]||'str',bg?.abOpts?.[1]||'con',bg?.abOpts?.[2]||'dex'],
  classSkills:[],speciesSkills:[],speciesFeatId:species?.originFeat?originFeat?.id||'':'',classFeatId:'',languages:[],
  cantripCount:Number(spellRow.c)||0,startingSpellCount:spellCount,preparedSpellCount:Number(spellRow.p)||0,
  cantrips:[],startingSpells:[],preparedSpells:[],classEquipment:0,backgroundEquipment:0,classEquipmentPicks:{},backgroundEquipmentPicks:{},
  alignment:'Neutral',pronouns:'',appearance:'',backstory:'',personality:'',notes:''
 };
}
function selected(id,value){return id===value?'selected':''}
function optionList(values,chosen){return values.map(([v,l])=>`<option value="${escapeHTML(v)}" ${selected(v,chosen)}>${escapeHTML(l)}</option>`).join('')}
function choiceCards(items,type,selectedId,subline,description){
 return `<div class="choice-grid">${items.map(item=>`<button class="choice-card ${item.id===selectedId?'selected':''}" type="button" data-choice="${type}" data-id="${escapeHTML(item.id)}"><span class="choice-card-top"><strong>${escapeHTML(item.name)}</strong><span class="choice-radio">${item.id===selectedId?'✓':'+'}</span></span><span class="choice-subline">${escapeHTML(subline(item))}</span><span class="choice-description">${escapeHTML(description(item))}</span><span class="choice-more">Select ${escapeHTML(item.name)}</span></button>`).join('')}</div>`;
}
function classStep(draft,data){
 const cls=data.classes.find(x=>x.id===draft.classId)||data.classes[0];
 return `<div class="builder-intro"><div class="eyebrow">STEP 1 OF 6 · START WITH YOUR CLASS</div><h2>What kind of adventurer are you?</h2><p>Your class defines your core abilities, your role in a party, and the features you gain as you level up. Choose the style of play that sounds most interesting. You can read the class details before deciding.</p></div>
 ${choiceCards(data.classes,'class',draft.classId,c=>`Hit Die d${c.hd} · Primary ${ (c.primary||[]).map(x=>x.toUpperCase()).join(' / ')||'Flexible'}`,c=>CLASS_COPY[c.id]||'A distinct adventuring path with its own features and proficiencies.')}
 ${cls?`<section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">SELECTED CLASS</span><h3>${escapeHTML(cls.name)}</h3></div><span class="detail-pill">d${cls.hd} Hit Die</span></div><p>${escapeHTML(CLASS_COPY[cls.id]||'A distinct adventuring path.')}</p><div class="detail-columns"><div><b>Saving throw training</b><span>${(cls.saves||[]).map(x=>escapeHTML(x.toUpperCase())).join(' & ')}</span></div><div><b>Primary abilities</b><span>${(cls.primary||[]).map(x=>escapeHTML(humanize(x))).join(', ')||'Flexible'}</span></div><div><b>Armor training</b><span>${(cls.armor||[]).map(escapeHTML).join(', ')||'None'}</span></div><div><b>Weapon training</b><span>${(cls.weapons||[]).map(escapeHTML).join(', ')||'None'}</span></div></div><details class="read-more"><summary>What will I get at level 1?</summary>${(cls.features||[]).filter(f=>(f.l||1)===1).map(f=>`<div class="feature-mini"><b>${escapeHTML(f.n)}</b>${rulesText(f.d)}</div>`).join('')||'<p>No level 1 features are listed in the available rules data.</p>'}</details></section>`:''}`;
}
function backgroundStep(draft,data){
 const bg=data.backgrounds.find(x=>x.id===draft.backgroundId)||data.backgrounds[0];
 return `<div class="builder-intro"><div class="eyebrow">STEP 2 OF 6 · DETERMINE YOUR ORIGIN</div><h2>What shaped you before you became an adventurer?</h2><p>Your background represents the life you led before taking up the adventuring life. It gives you skills, a tool proficiency, an Origin feat, equipment, and the ability-score improvements you choose later.</p></div>
 ${choiceCards(data.backgrounds,'background',draft.backgroundId,b=>`${(b.skills||[]).map(humanize).join(' · ')} · ${b.feat?humanize(b.feat):'Origin feat'}`,b=>`Ability options: ${(b.abOpts||[]).map(x=>x.toUpperCase()).join(', ')}. ${b.feat?`Grants ${humanize(b.feat)}.`:''}`)}
 ${bg?`<section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">BACKGROUND BENEFITS</span><h3>${escapeHTML(bg.name)}</h3></div><span class="detail-pill">Origin</span></div><div class="detail-columns"><div><b>Skill proficiencies</b><span>${(bg.skills||[]).map(humanize).map(escapeHTML).join(', ')||'None'}</span></div><div><b>Tool training</b><span>${(bg.tools||[]).map(escapeHTML).join(', ')||'None'}</span></div><div><b>Ability score options</b><span>${(bg.abOpts||[]).map(x=>x.toUpperCase()).join(', ')||'No listed options'}</span></div><div><b>Origin feat</b><span>${escapeHTML(humanize(bg.feat||'None'))}</span></div></div>${bg.feat?(data.feats.find(f=>f.id===bg.feat)?rulesText(data.feats.find(f=>f.id===bg.feat).d):''):''}<details class="read-more"><summary>Starting equipment</summary>${(bg.equip||[]).map(e=>`<p>${escapeHTML(e.desc)}</p>`).join('')||'<p>No starting equipment listed.</p>'}</details></section>`:''}`;
}
function speciesStep(draft,data){
 const species=data.species.find(x=>x.id===draft.speciesId)||data.species[0];
 const variant=(species?.subs||[]).find(x=>x.id===draft.speciesSubId);
 return `<div class="builder-intro"><div class="eyebrow">STEP 3 OF 6 · DETERMINE YOUR ORIGIN</div><h2>Who are your people?</h2><p>Your species defines innate traits such as size, speed, senses, and other characteristics. Select a species, then choose a heritage or lineage when that species offers one.</p></div>
 ${choiceCards(data.species,'species',draft.speciesId,s=>`${s.size||'Medium'} · ${s.speed||30} ft. speed · ${(s.traits||[]).length} traits`,s=>(s.traits||[]).slice(0,2).map(t=>t.n).join(' · ')||'Species traits and characteristics')}
 ${species?`<section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">SPECIES DETAILS</span><h3>${escapeHTML(species.name)}</h3></div><span class="detail-pill">${escapeHTML(species.size||'Medium')} · ${Number(species.speed)||30} ft.</span></div>${species.subs?.length?`<label class="field-label">Choose a lineage or heritage<select data-draft="speciesSubId"><option value="">Choose an option</option>${species.subs.map(s=>`<option value="${escapeHTML(s.id)}" ${selected(s.id,draft.speciesSubId)}>${escapeHTML(s.name)}</option>`).join('')}</select></label>`:`<p class="muted">This species has no additional lineage choice in the included SRD data.</p>`}<h4>Species traits</h4>${(species.traits||[]).map(t=>`<details class="rule-entry"><summary>${escapeHTML(t.n)}</summary>${rulesText(t.d)}</details>`).join('')}${variant?(variant.traits||[]).map(t=>`<details class="rule-entry"><summary>${escapeHTML(t.n)}</summary>${rulesText(t.d)}</details>`).join(''):''}</section>`:''}`;
}
function abilityOptionsForBackground(draft,data){return data.backgrounds.find(x=>x.id===draft.backgroundId)?.abOpts||ABILITIES.map(([k])=>k)}
function abilityStep(draft,data,state){
 const bg=data.backgrounds.find(x=>x.id===draft.backgroundId);const allowed=abilityOptionsForBackground(draft,data);
 const scoreSet=draft.rollSet?.map(r=>r.score)||[];
 const scoreAssignments=draft.rollAssignment||[0,1,2,3,4,5];
 const abilityCards=ABILITIES.map(([key,name])=>{
  let score=Number(draft.scores[key]||8);
  const asi=Number(draft.asiChoices?.[0]===key?2:draft.asiChoices?.[1]===key?1:draft.asiChoices?.[2]===key?1:0);
  return `<div class="ability-editor"><div class="ability-title"><b>${name}</b><span class="ability-help">${escapeHTML(ABILITY_TIPS[key])}</span></div>${draft.abilityMethod==='pointbuy'?`<div class="score-adjust"><button type="button" data-score="${key}" data-delta="-1" aria-label="Decrease ${name}">−</button><strong>${score}</strong><button type="button" data-score="${key}" data-delta="1" aria-label="Increase ${name}">+</button></div><div class="score-meta">Modifier ${abilityMod(score)>=0?'+':''}${abilityMod(score)} · Cost ${POINT_BUY_COST[score]??'—'} point(s)</div>`:draft.abilityMethod==='roll'?`<label class="ability-assign"><span>Assign rolled score</span><select data-roll-assignment="${key}">${scoreSet.map((v,i)=>`<option value="${i}" ${Number(scoreAssignments[ABILITIES.findIndex(a=>a[0]===key)])===i?'selected':''}>${v} · Roll ${i+1}</option>`).join('')}</select></label><div class="score-meta">${scoreSet[scoreAssignments[ABILITIES.findIndex(a=>a[0]===key)]]??'—'} · Modifier ${abilityMod(scoreSet[scoreAssignments[ABILITIES.findIndex(a=>a[0]===key)]]||10)>=0?'+':''}${abilityMod(scoreSet[scoreAssignments[ABILITIES.findIndex(a=>a[0]===key)]]||10)}</div>`:`<label class="ability-assign"><span>Assign Standard Array score</span><select data-standard-score="${key}">${STANDARD_ARRAY.map(v=>`<option value="${v}" ${Number(draft.scores[key])===v?'selected':''}>${v}</option>`).join('')}</select></label><div class="score-meta">Modifier ${abilityMod(score)>=0?'+':''}${abilityMod(score)}</div>`}</div>`;
 }).join('');
 const pointSpent=pointBuySpent(draft.scores);
 const asiSelectors=`<section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">BACKGROUND ABILITY SCORE IMPROVEMENTS</span><h3>Choose your increases</h3></div><span class="detail-pill">2024 Background rule</span></div><p>Your background lets you increase the ability scores shown here. Choose either +2 to one and +1 to another, or +1 to three different abilities. These bonuses are applied after your base scores.</p><label class="field-label">How do you want to apply the increases?<select data-draft="asiScheme"><option value="two-one" ${selected('two-one',draft.asiScheme)}>+2 to one ability and +1 to a different ability</option><option value="three-one" ${selected('three-one',draft.asiScheme)}>+1 to three different abilities</option></select></label><div class="asi-grid">${(draft.asiScheme==='three-one'?[0,1,2]:[0,1]).map(i=>`<label class="field-label">${draft.asiScheme==='three-one'?`+1 choice ${i+1}`:i===0?'+2 increase':'+1 increase'}<select data-asi-choice="${i}">${allowed.map(k=>`<option value="${k}" ${selected(k,draft.asiChoices?.[i])}>${humanize(k)}</option>`).join('')}</select></label>`).join('')}</div></section>`;
 return `<div class="builder-intro"><div class="eyebrow">STEP 4 OF 6 · DETERMINE YOUR ABILITY SCORES</div><h2>Set your six abilities</h2><p>These scores describe your character’s natural capabilities. Your class helps you decide which abilities to prioritize, but the final choice is yours. Your background increases are applied separately so you can see both the base score and final result.</p></div>
 <section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">GENERATE YOUR SCORES</span><h3>Choose a method</h3></div></div><div class="method-grid">${[['standard','Standard Array','15, 14, 13, 12, 10, 8','A fixed set of balanced scores. Assign each number once.'],['pointbuy','Point Buy','27 points','Choose each ability from 8 to 15. Stronger scores cost more points.'],['roll','Roll for scores','4d6, drop the lowest','Roll four six-sided dice six times. Each score is the sum of the three highest dice.']].map(([id,title,tag,desc])=>`<button type="button" class="method-card ${draft.abilityMethod===id?'selected':''}" data-method="${id}"><b>${title}</b><span>${tag}</span><small>${desc}</small></button>`).join('')}</div>
 ${draft.abilityMethod==='roll'?`<div class="roll-set-panel"><div><b>Your rolled scores</b><p>Each score is made from four dice, dropping the lowest result.</p><div class="roll-score-pills">${draft.rollSet.length?draft.rollSet.map(r=>`<span><b>${r.score}</b><small>${r.dice.join(' · ')} <em>drop ${r.dropped}</em></small></span>`).join(''):'<span class="muted">No scores rolled yet.</span>'}</div></div><div class="roll-actions"><button class="primary-button" type="button" data-action="roll-scores">${draft.rollSet.length?'Roll a new set':'Roll my six scores'}</button>${draft.rollSet.length&&state.settings.rerollCredits>0?`<small>${state.settings.rerollCredits} DM-granted reroll${state.settings.rerollCredits===1?'':'s'} available</small>`:''}</div></div>`:''}
 <div class="ability-editor-grid">${abilityCards}</div>
 ${draft.abilityMethod==='pointbuy'?`<div class="point-buy-summary"><div><b>${pointSpent} / 27</b><span>Points spent</span></div><div class="point-meter"><i style="width:${Math.min(100,pointSpent/27*100)}%"></i></div><small>${27-pointSpent} points remaining. Scores range from 8 to 15.</small></div>`:''}
 ${draft.abilityMethod==='roll'&&!draft.rollSet.length?'<p class="inline-warning">Roll your scores to continue. Your six results will stay saved while you move through the builder.</p>':''}
 ${draft.abilityMethod==='standard'&&new Set(ABILITIES.map(([k])=>Number(draft.scores[k]))).size!==6?'<p class="inline-warning">Each Standard Array score must be assigned once. Duplicate scores are not allowed in this method.</p>':''}
 ${draft.abilityMethod==='pointbuy'&&!validatePointBuy(draft.scores)?'<p class="inline-warning">Point Buy is over budget or has a score outside the allowed range.</p>':''}
 </section>${asiSelectors}`;
}
function trainingStep(draft,data){
 const cls=data.classes.find(x=>x.id===draft.classId),bg=data.backgrounds.find(x=>x.id===draft.backgroundId),sp=data.species.find(x=>x.id===draft.speciesId);
 const required=Number(cls?.skills?.n||0),available=(cls?.skills?.from||[]).filter(id=>!(bg?.skills||[]).includes(id)&&!(draft.speciesSkills||[]).includes(id));
 const speciesSkillCount=Number(sp?.skillChoice?.n||0);
 const rawSpeciesSkills=sp?.skillChoice?.from;
 const speciesSkillOptions=rawSpeciesSkills==='any'||!Array.isArray(rawSpeciesSkills)?SKILL_BY_LIST():rawSpeciesSkills;
 const speciesSkillAvailable=speciesSkillOptions.filter(id=>!(bg?.skills||[]).includes(id)&&!(draft.classSkills||[]).includes(id));
 const originFeats=data.feats.filter(f=>f.type==='origin');
 const speciesFeatRequired=Number(sp?.originFeat||0)>0;
 const classSpells=(cls?.spell?data.spells.filter(x=>(x.cls||[]).includes(cls.id)):[]);
 const cantrips=classSpells.filter(x=>Number(x.lvl)===0);
 const levelOneSpells=classSpells.filter(x=>Number(x.lvl)===1);
 const spellCount=Number(draft.startingSpellCount)||0,cantripCount=Number(draft.cantripCount)||0,preparedCount=Number(draft.preparedSpellCount)||0;
 const selectedStarting= new Set(draft.startingSpells||[]), selectedCantrips=new Set(draft.cantrips||[]),prepared=new Set(draft.preparedSpells||[]);
 const renderSpellChoices=(items,selectedIds,attribute)=>items.map(spell=>`<label class="spell-choice"><input type="checkbox" ${attribute}="${escapeHTML(spell.id)}" ${selectedIds.has(spell.id)?'checked':''}><span><b>${escapeHTML(spell.name)}</b><small>${escapeHTML(spell.sch||'Spell')} · ${escapeHTML(spell.t||'Action')} · ${escapeHTML(spell.r||'Self')}</small></span><details><summary>Read spell</summary><div>${rulesText(spell.d||'No description supplied.')}</div></details></label>`).join('');
 const spellPanel=cls?.spell?`<section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">STARTING MAGIC</span><h3>Choose your spells</h3></div><span class="detail-pill">${cantripCount} cantrips · ${spellCount} level 1 ${cls.id==='wizard'?'spellbook spells':'spells'}</span></div><p>Your class gives you a starting spell list. Cantrips are at-will magic. Level 1 spells use spell slots. Select exactly the number shown; you can manage your spellbook on the character sheet later.</p>${cantripCount?`<h4>Cantrips — choose ${cantripCount}</h4><div class="spell-choice-list">${renderSpellChoices(cantrips,selectedCantrips,'data-cantrip')}</div><p class="selection-counter">${selectedCantrips.size} of ${cantripCount} selected</p>`:''}${spellCount?`<h4>Level 1 spells — choose ${spellCount}</h4><div class="spell-choice-list">${renderSpellChoices(levelOneSpells,selectedStarting,'data-starting-spell')}</div><p class="selection-counter">${selectedStarting.size} of ${spellCount} selected</p>`:''}${cls.id==='wizard'&&selectedStarting.size?`<div class="prepared-spell-panel"><h4>Prepare ${preparedCount} spells</h4><p>These are the spells you have ready to cast. Your other selected spells remain in your spellbook.</p><div class="spell-choice-list">${[...selectedStarting].map(id=>{const spell=data.spells.find(x=>x.id===id);return spell?`<label class="skill-choice"><input type="checkbox" data-prepared-spell="${escapeHTML(id)}" ${prepared.has(id)?'checked':''}><span><b>${escapeHTML(spell.name)}</b><small>${prepared.has(id)?'Prepared':'In spellbook'}</small></span></label>`:''}).join('')}</div><p class="selection-counter">${prepared.size} of ${preparedCount} prepared</p></div>`:''}</section>`:'';
 const classFeatureChoice=(cls?.features||[]).find(f=>(f.l||1)===1&&f.pick==='fighting-style');
 const classFeatOptions=data.feats.filter(f=>f.type==='fighting-style');
 const classFeat=data.feats.find(f=>f.id===draft.classFeatId);
 const classChoicePanel=classFeatureChoice?`<section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">${escapeHTML(cls.name.toUpperCase())} CLASS FEATURE</span><h3>Choose your Fighting Style</h3></div><span class="detail-pill">Level 1 choice</span></div><p>${rulesText(classFeatureChoice.d)}</p><p>Choose one Fighting Style feat. It gives you a specific combat benefit; it is recorded under Features on your character sheet.</p><label class="field-label">Fighting Style<select data-draft="classFeatId"><option value="">Choose a Fighting Style</option>${classFeatOptions.map(f=>`<option value="${escapeHTML(f.id)}" ${selected(f.id,draft.classFeatId)}>${escapeHTML(f.name)}</option>`).join('')}</select></label>${classFeat?rulesText(classFeat.d):'<p class="modal-help">Choose a style to see its full benefit here.</p>'}</section>`:'';
 const speciesChoices=speciesSkillCount||speciesFeatRequired?`<section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">SPECIES CHOICES</span><h3>Finish your species benefits</h3></div><span class="detail-pill">${escapeHTML(sp?.name||'Species')}</span></div>${speciesSkillCount?`<p>Your species grants ${speciesSkillCount} additional skill proficiency choice${speciesSkillCount===1?'':'s'}. A proficiency means you add your Proficiency Bonus to checks using that skill. Skills already granted by your background or class are not offered again.</p><div class="skill-choice-grid">${speciesSkillAvailable.map(id=>{const x=SKILLS.find(s=>s[0]===id);return `<label class="skill-choice"><input type="checkbox" data-species-skill="${id}" ${draft.speciesSkills.includes(id)?'checked':''}><span><b>${escapeHTML(x?.[1]||humanize(id))}</b><small>${escapeHTML(x?.[2]?.toUpperCase()||'')}</small></span></label>`}).join('')}</div><p class="selection-counter">${draft.speciesSkills.length} of ${speciesSkillCount} selected</p>`:''}${speciesFeatRequired?`<label class="field-label">Choose your additional Origin feat<select data-draft="speciesFeatId">${originFeats.map(f=>`<option value="${escapeHTML(f.id)}" ${selected(f.id,draft.speciesFeatId)}>${escapeHTML(f.name)}</option>`).join('')}</select></label><p class="modal-help">This is an additional feat granted by your species. It is separate from the Origin feat granted by your background.</p>`:''}</section>`:'';
 return `<div class="builder-intro"><div class="eyebrow">STEP 5 OF 6 · TRAINING AND EQUIPMENT</div><h2>Finish your adventuring kit</h2><p>Your background and class provide many benefits automatically. Make the remaining choices below. Each section explains what the choice does, and you can expand spell and equipment notes before deciding.</p></div>
 <section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">CLASS SKILL PROFICIENCIES</span><h3>Choose ${required} skills</h3></div><span class="detail-pill">${(bg?.skills||[]).length} from background</span></div><p>Proficiency means you add your Proficiency Bonus when you make a check using that skill. Your background skills are already included and cannot be selected twice.</p><div class="skill-choice-grid">${available.map(id=>{const x=SKILLS.find(s=>s[0]===id);return `<label class="skill-choice"><input type="checkbox" data-class-skill="${id}" ${draft.classSkills.includes(id)?'checked':''}><span><b>${escapeHTML(x?.[1]||humanize(id))}</b><small>${escapeHTML(x?.[2]?.toUpperCase()||'')}</small></span></label>`}).join('')}</div><p class="selection-counter">${draft.classSkills.length} of ${required} selected</p></section>
 ${speciesChoices}
 <section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">LANGUAGES</span><h3>Common and two more</h3></div><span class="detail-pill">3 languages minimum</span></div><p>Every character knows Common plus two languages chosen from the Standard Languages table. These choices are separate from species and background. A language lets you speak, read, and write it.</p><div class="skill-choice-grid">${LANGUAGES.map(name=>`<label class="skill-choice"><input type="checkbox" data-language="${escapeHTML(name)}" ${draft.languages.includes(name)?'checked':''}><span><b>${escapeHTML(name)}</b></span></label>`).join('')}</div><p class="selection-counter">${draft.languages.length} of 2 selected · Common is automatic</p></section>
 ${spellPanel}
 ${classChoicePanel}
 <section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">STARTING EQUIPMENT</span><h3>${escapeHTML(cls?.name||'Class')} equipment</h3></div></div><p>Your class offers a starting gear package. Compare the equipment and gold in each choice. Your selection is added to the inventory automatically.</p>${renderEquipmentOptions(cls?.equip||[],data,draft,'class','classEquipment','classEquipmentPicks')}</section>
 <section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">BACKGROUND EQUIPMENT</span><h3>${escapeHTML(bg?.name||'Background')} equipment</h3></div></div><p>Your background also grants equipment. Some packages contain a tool or other item you choose from a category.</p>${renderEquipmentOptions(bg?.equip||[],data,draft,'background','backgroundEquipment','backgroundEquipmentPicks')}</section>`;
}
function SKILL_BY_LIST(){return SKILLS.map(([id])=>id)}

function renderEquipmentOptions(groups,data,draft,type,radioName,pickStore){
 if(!groups.length)return '<p class="muted">No equipment package is listed for this entry.</p>';
 return groups.map((group,groupIndex)=>`<div class="equipment-option-list">${(group.opts||[]).map((option,optionIndex)=>{
  const selectedOption=Number(draft[radioName]||0)===optionIndex;
  const picks=selectedOption?(option.picks||[]).map((pick,pickIndex)=>{
   const ids=data.cats?.[pick.cat]||[],key=`${groupIndex}:${pickIndex}`,chosen=draft[pickStore]?.[key]||ids[0];
   const options=ids.map(id=>data.items.find(item=>item.id===id)).filter(Boolean);
   return `<label class="field-label equipment-pick">Choose ${escapeHTML(humanize(pick.cat))}<select data-equipment-pick="${type}:${groupIndex}:${pickIndex}">${options.map(item=>`<option value="${escapeHTML(item.id)}" ${item.id===chosen?'selected':''}>${escapeHTML(item.name)}</option>`).join('')}</select></label>`;
  }).join(''):'';
  const items=(option.items||[]).map(([id,n])=>`${n} × ${humanize(id)}`).join(', ');
  return `<div class="equipment-option-block"><label class="equipment-option"><input type="radio" name="${radioName}" value="${optionIndex}" ${selectedOption?'checked':''}><span><b>Option ${String.fromCharCode(65+optionIndex)}</b><small>${escapeHTML(items||'Gold only')}${option.picks?.length?` · Choose ${option.picks.map(x=>`${x.n} ${humanize(x.cat)}`).join(', ')}`:''}${option.gold?` · ${option.gold} GP`:''}</small></span></label>${option.desc?`<p class="equipment-explanation">${escapeHTML(option.desc)}</p>`:''}${picks}</div>`;
 }).join('')}</div>`).join('');
}

function detailsStep(draft,data){
 const cls=data.classes.find(x=>x.id===draft.classId),bg=data.backgrounds.find(x=>x.id===draft.backgroundId),sp=data.species.find(x=>x.id===draft.speciesId);
 const bgAllowed=bg?.abOpts||[];const inc={};const incKeys=draft.asiScheme==='three-one'?draft.asiChoices.slice(0,3):draft.asiChoices.slice(0,2);if(draft.asiScheme==='three-one')incKeys.forEach(k=>inc[k]=(inc[k]||0)+1);else{if(incKeys[0])inc[incKeys[0]]=2;if(incKeys[1])inc[incKeys[1]]=1;}const abilityFinal=calculateAbilityScores(draft.abilityMethod==='roll'?Object.fromEntries(ABILITIES.map(([k],i)=>[k,draft.rollSet[draft.rollAssignment[i]]?.score||10])):draft.scores,inc);
 const allowed=bg?.abOpts||[];
 return `<div class="builder-intro"><div class="eyebrow">STEP 6 OF 6 · CHARACTER DETAILS AND REVIEW</div><h2>Give your adventurer a name</h2><p>These details make the character yours. The rules choices are already summarized below; add as much personality and history as you like. You can expand your notes later on the character sheet.</p></div>
 <section class="selection-detail"><div class="form-grid two"><label class="field-label">Character name<input data-draft="name" maxlength="60" value="${escapeHTML(draft.name)}" placeholder="e.g. Elowen Dawnwhisper"></label><label class="field-label">Alignment<select data-draft="alignment">${optionList(['Lawful Good','Neutral Good','Chaotic Good','Lawful Neutral','Neutral','Chaotic Neutral','Lawful Evil','Neutral Evil','Chaotic Evil','Unaligned'].map(x=>[x,x]),draft.alignment)}</select></label><label class="field-label">Pronouns (optional)<input data-draft="pronouns" value="${escapeHTML(draft.pronouns)}" placeholder="e.g. she / her"></label></div><label class="field-label">Appearance<textarea data-draft="appearance" rows="3" placeholder="Describe what the party sees when you enter the room.">${escapeHTML(draft.appearance)}</textarea></label><label class="field-label">Backstory<textarea data-draft="backstory" rows="5" placeholder="Where did you come from? What brought you to the adventuring life?">${escapeHTML(draft.backstory)}</textarea></label><label class="field-label">Personality and ideals<textarea data-draft="personality" rows="3" placeholder="What motivates your character? What do they believe?"></textarea></label><label class="field-label">Private notes<textarea data-draft="notes" rows="3" placeholder="Secrets, reminders, story hooks..."></textarea></label></section>
 <section class="selection-detail"><div class="detail-heading"><div><span class="eyebrow">CHARACTER SUMMARY</span><h3>Review your choices</h3></div><span class="detail-pill">Level 1 · 2024 rules</span></div><div class="review-columns"><div><b>Class</b><span>${escapeHTML(cls?.name||'—')}</span></div><div><b>Background</b><span>${escapeHTML(bg?.name||'—')}</span></div><div><b>Species</b><span>${escapeHTML(sp?.name||'—')} ${escapeHTML((sp?.subs||[]).find(x=>x.id===draft.speciesSubId)?.name||'')}</span></div><div><b>Ability scores</b><span>${ABILITIES.map(([k,n])=>`${k.toUpperCase()} ${abilityFinal[k]}`).join(' · ')}</span></div><div><b>Skill training</b><span>${[...(bg?.skills||[]),...draft.classSkills,...draft.speciesSkills].map(humanize).join(', ')||'None selected'}</span></div><div><b>Languages</b><span>${['Common',...(sp?.langs||[]),...draft.languages].join(', ')}</span></div></div><p class="muted">Your character begins at level 1. Hit Points, Armor Class, saving throws, skill modifiers, spellcasting ability, and starting equipment are calculated from your choices.</p></section>`;
}

export function renderBuilder(draft,data,step,state){
 const content=[classStep,backgroundStep,speciesStep,(d,dt,st)=>abilityStep(d,dt,st),(d,dt)=>trainingStep(d,dt),(d,dt)=>detailsStep(d,dt)][step](draft,data,state);
 return `<div class="builder-layout"><aside class="builder-sidebar"><div class="builder-brand"><span>✦</span><b>CHARACTER BUILDER</b></div><div class="builder-steps">${STEPS.map(([name,sub],i)=>`<button type="button" class="builder-step ${i===step?'active':''} ${i<step?'complete':''}" data-step="${i}"><span class="step-number">${i<step?'✓':i+1}</span><span><b>${name}</b><small>${sub}</small></span></button>`).join('')}</div><div class="builder-help"><b>Need a hand?</b><p>Each step includes notes explaining what the choice does. You can go back at any time without losing your selections.</p><a href="https://www.dndbeyond.com/sources/dnd/br-2024/creating-a-character" target="_blank" rel="noreferrer">2024 character creation rules ↗</a></div></aside><main class="builder-main"><div class="builder-main-top"><span>THE ASHEN CROWN · NEW ADVENTURER</span><button type="button" class="icon-close" data-action="close-builder" aria-label="Close builder">×</button></div><div class="builder-content">${content}</div><footer class="builder-footer"><button type="button" class="secondary-button" data-action="builder-back" ${step===0?'disabled':''}>← Back</button><span class="builder-progress-label">Step ${step+1} of ${STEPS.length}</span>${step===STEPS.length-1?`<button type="button" class="primary-button" data-action="builder-create">Create character</button>`:`<button type="button" class="primary-button" data-action="builder-next">Continue →</button>`}</footer></main></div>`;
}

export function validateBuilderStep(draft,data,step,state){
 if(step===0&&!data.classes.some(x=>x.id===draft.classId)) return 'Choose a class to continue.';
 if(step===1&&(!data.backgrounds.some(x=>x.id===draft.backgroundId)||!data.species.some(x=>x.id===draft.speciesId))) return 'Choose a background and species to continue.';
 if(step===3){
  if(draft.abilityMethod==='roll'&&(!draft.rollSet?.length||new Set(draft.rollAssignment).size!==6)) return 'Roll your six scores and assign each result once.';
  if(draft.abilityMethod==='pointbuy'&&!validatePointBuy(draft.scores)) return 'Point Buy must use scores from 8–15 and no more than 27 points.';
  if(draft.abilityMethod==='standard'&&new Set(ABILITIES.map(([k])=>Number(draft.scores[k]))).size!==6) return 'Assign each Standard Array score once.';
  const bg=data.backgrounds.find(x=>x.id===draft.backgroundId),allowed=bg?.abOpts||[];
  const choices=draft.asiScheme==='three-one'?draft.asiChoices.slice(0,3):draft.asiChoices.slice(0,2);
  if(choices.some(x=>!allowed.includes(x))||new Set(choices).size!==choices.length) return 'Choose distinct ability score improvements from the list allowed by your background.';
 }
 if(step===4){
  const cls=data.classes.find(x=>x.id===draft.classId),bg=data.backgrounds.find(x=>x.id===draft.backgroundId),species=data.species.find(x=>x.id===draft.speciesId);
  const needed=Number(cls?.skills?.n||0),available=(cls?.skills?.from||[]).filter(x=>!(bg?.skills||[]).includes(x)&&!(draft.speciesSkills||[]).includes(x));
  if(draft.classSkills.length!==Math.min(needed,available.length)) return `Choose ${Math.min(needed,available.length)} class skill proficiencies.`;
  const skillChoice=species?.skillChoice,skillCount=Number(skillChoice?.n||0);
  if((draft.speciesSkills||[]).length!==skillCount) return `Choose ${skillCount} skill proficiency${skillCount===1?'':'ies'} from your species.`;
  if(Number(species?.originFeat||0)>0&&!data.feats.some(f=>f.id===draft.speciesFeatId&&f.type==='origin')) return 'Choose an Origin feat granted by your species.';
  const fightingStyleRequired=(cls?.features||[]).some(f=>(f.l||1)===1&&f.pick==='fighting-style');
  if(fightingStyleRequired&&!data.feats.some(f=>f.id===draft.classFeatId&&f.type==='fighting-style')) return 'Choose a Fighting Style for your class.';
  if(draft.languages.length!==2) return 'Choose exactly two additional languages. Common is included automatically.';
  const cantripCount=Number(draft.cantripCount)||0,spellCount=Number(draft.startingSpellCount)||0,preparedCount=Number(draft.preparedSpellCount)||0;
  if((draft.cantrips||[]).length!==cantripCount) return `Choose ${cantripCount} cantrips for your class.`;
  if((draft.startingSpells||[]).length!==spellCount) return `Choose ${spellCount} starting spells for your class.`;
  if((draft.preparedSpells||[]).length!==preparedCount) return `Choose ${preparedCount} spells to prepare.`;
 }
 if(step===5&&!String(draft.name||'').trim()) return 'Give your character a name before finishing.';
 return '';
}

export function updateDraftFromControl(draft,control){
 if(control.dataset.draft) draft[control.dataset.draft]=control.value;
 if(control.dataset.standardScore){draft.scores[control.dataset.standardScore]=Number(control.value);}
 if(control.dataset.rollAssignment){const index=ABILITIES.findIndex(x=>x[0]===control.dataset.rollAssignment);draft.rollAssignment[index]=Number(control.value);}
 if(control.dataset.classSkill){const id=control.dataset.classSkill;draft.classSkills=control.checked?[...new Set([...draft.classSkills,id])]:draft.classSkills.filter(x=>x!==id);}
 if(control.dataset.language){const id=control.dataset.language;draft.languages=control.checked?[...new Set([...draft.languages,id])]:draft.languages.filter(x=>x!==id);}
 if(control.dataset.speciesSkill){const id=control.dataset.speciesSkill;draft.speciesSkills=control.checked?[...new Set([...draft.speciesSkills,id])]:draft.speciesSkills.filter(x=>x!==id);}
 if(control.dataset.cantrip){const id=control.dataset.cantrip;draft.cantrips=control.checked?[...new Set([...draft.cantrips,id])]:draft.cantrips.filter(x=>x!==id);}
 if(control.dataset.startingSpell){const id=control.dataset.startingSpell;draft.startingSpells=control.checked?[...new Set([...draft.startingSpells,id])]:draft.startingSpells.filter(x=>x!==id);draft.preparedSpells=draft.classId==='wizard'?draft.startingSpells.slice(0,draft.preparedSpellCount):[...draft.startingSpells];}
 if(control.dataset.preparedSpell){const id=control.dataset.preparedSpell;draft.preparedSpells=control.checked?[...new Set([...draft.preparedSpells,id])]:draft.preparedSpells.filter(x=>x!==id);}
 if(control.dataset.asiChoice!==undefined) draft.asiChoices[Number(control.dataset.asiChoice)]=control.value;
 if(control.name==='classEquipment') draft.classEquipment=Number(control.value);
 if(control.name==='backgroundEquipment') draft.backgroundEquipment=Number(control.value);
 if(control.dataset.equipmentPick){const [type,group,pick]=control.dataset.equipmentPick.split(':');const store=type==='class'?'classEquipmentPicks':'backgroundEquipmentPicks';draft[store]??={};draft[store][`${group}:${pick}`]=control.value;}
}

export function handleDraftClick(draft,data,button,state){
 if(button.dataset.choice){const key=({class:'classId',background:'backgroundId',species:'speciesId'})[button.dataset.choice];draft[key]=button.dataset.id;if(key==='speciesId'){draft.speciesSubId='';draft.speciesSkills=[];const chosen=data.species.find(x=>x.id===draft.speciesId);draft.speciesFeatId=Number(chosen?.originFeat||0)>0?(data.feats.find(x=>x.id==='skilled'&&x.type==='origin')?.id||data.feats.find(x=>x.type==='origin')?.id||''):'';}if(key==='classId'){const chosen=data.classes.find(x=>x.id===draft.classId),row=chosen?.table?.[0]||{};draft.classSkills=[];draft.classFeatId='';draft.cantripCount=Number(row.c)||0;draft.startingSpellCount=chosen?.id==='wizard'?6:Number(row.p)||0;draft.preparedSpellCount=Number(row.p)||0;draft.cantrips=[];draft.startingSpells=[];draft.preparedSpells=[];}if(key==='backgroundId'){draft.classSkills=[];draft.asiChoices=[...(data.backgrounds.find(x=>x.id===draft.backgroundId)?.abOpts||['str','dex','con']).slice(0,3)];}}
 if(button.dataset.method){draft.abilityMethod=button.dataset.method;if(button.dataset.method==='roll'&&!draft.rollSet.length)draft.rollAssignment=[0,1,2,3,4,5];}
 if(button.dataset.score){const key=button.dataset.score,delta=Number(button.dataset.delta),next=Math.max(8,Math.min(15,Number(draft.scores[key])+delta));const scores={...draft.scores,[key]:next};if(pointBuySpent(scores)<=27)draft.scores=scores;}
 if(button.dataset.action==='roll-scores'){
  if(draft.rollSet.length&&state.settings.rerollCredits<=0) return 'No DM-granted rerolls are available. Ask the DM to grant one in Campaign Settings.';
  if(draft.rollSet.length) state.settings.rerollCredits=Math.max(0,state.settings.rerollCredits-1);
  draft.rollSet=rollAbilitySet();draft.rollAssignment=[0,1,2,3,4,5];
 }
 if(button.dataset.draft==='asiScheme') draft.asiScheme=button.value;
 return '';
}

export { STEPS };
