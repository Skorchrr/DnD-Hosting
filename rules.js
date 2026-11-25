export const ABILITIES = [
  ['str', 'Strength'], ['dex', 'Dexterity'], ['con', 'Constitution'],
  ['int', 'Intelligence'], ['wis', 'Wisdom'], ['cha', 'Charisma']
];

export const SKILLS = [
  ['acrobatics','Acrobatics','dex'],['animal-handling','Animal Handling','wis'],['arcana','Arcana','int'],
  ['athletics','Athletics','str'],['deception','Deception','cha'],['history','History','int'],
  ['insight','Insight','wis'],['intimidation','Intimidation','cha'],['investigation','Investigation','int'],
  ['medicine','Medicine','wis'],['nature','Nature','int'],['perception','Perception','wis'],
  ['performance','Performance','cha'],['persuasion','Persuasion','cha'],['religion','Religion','int'],
  ['sleight-of-hand','Sleight of Hand','dex'],['stealth','Stealth','dex'],['survival','Survival','wis']
];

export const LANGUAGES = [
  'Common Sign Language','Draconic','Dwarvish','Elvish','Giant','Gnomish','Goblin','Halfling','Orc'
];

export const STANDARD_ARRAY = [15,14,13,12,10,8];
export const POINT_BUY_COST = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
export const SKILL_BY_ID = Object.fromEntries(SKILLS.map(([id,name,ability])=>[id,{id,name,ability}]));

export function abilityMod(score) { return Math.floor(((Number(score)||10)-10)/2); }
export function formatMod(value) { const n=Number(value)||0; return `${n>=0?'+':''}${n}`; }
export function proficiencyBonus(level=1) { return 2 + Math.floor((Math.max(1,Number(level)||1)-1)/4); }
export function pointBuySpent(scores) { return Object.values(scores||{}).reduce((sum,v)=>sum+(POINT_BUY_COST[Number(v)]??0),0); }
export function validatePointBuy(scores) {
  const vals=ABILITIES.map(([k])=>Number(scores?.[k]??8));
  return vals.every(v=>v>=8&&v<=15&&Number.isInteger(v)) && pointBuySpent(scores)<=27;
}
export function rollDie(sides) { return Math.floor(Math.random()*sides)+1; }
export function rollAbilitySet() {
  return Array.from({length:6},()=>{
    const dice=Array.from({length:4},()=>rollDie(6)).sort((a,b)=>b-a);
    return {score:dice.slice(0,3).reduce((a,b)=>a+b,0),dice,dropped:dice[3]};
  });
}
export function rollFormula(formula) {
  const match=String(formula||'').replace(/\s+/g,'').match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if(!match) throw new Error(`Unsupported dice formula: ${formula}`);
  const count=Math.max(1,Math.min(100,Number(match[1]||1)));
  const sides=Math.max(2,Math.min(1000,Number(match[2])));
  const modifier=Number(match[3]||0);
  const rolls=Array.from({length:count},()=>rollDie(sides));
  return {formula:String(formula),rolls,modifier,total:rolls.reduce((a,b)=>a+b,0)+modifier};
}

export function getClass(data,id) { return data.classes.find(x=>x.id===id)||null; }
export function getSpecies(data,id) { return data.species.find(x=>x.id===id)||null; }
export function getBackground(data,id) { return data.backgrounds.find(x=>x.id===id)||null; }
export function getFeat(data,id) { return data.feats.find(x=>x.id===id)||null; }
export function getItem(data,id) { return data.items.find(x=>x.id===id)||null; }
export function getSpell(data,id) { return data.spells.find(x=>x.id===id)||null; }

export function calculateAbilityScores(baseScores, abilityImprovements={}) {
  return Object.fromEntries(ABILITIES.map(([key])=>[key,Number(baseScores?.[key]??10)+Number(abilityImprovements?.[key]??0)]));
}

export function calculateArmorClass(character,data) {
  const abilities=character.abilities||{};
  const dex=abilityMod(abilities.dex);
  const inventory=(character.inventory||[]).filter(i=>i.equipped!==false&&Number(i.quantity||1)>0);
  const equippedItems=inventory.map(i=>getItem(data,i.itemId)).filter(Boolean);
  const armor=equippedItems.filter(i=>i.a?.base&&i.cat!=='shield'&&i.a?.cat!=='shield').sort((a,b)=>b.a.base-a.a.base)[0];
  const shield=equippedItems.some(i=>i.a?.cat==='shield'||i.cat==='shield');
  const classId=character.classId;
  const unarmored=(classId==='barbarian'&&!armor)?10+dex+abilityMod(abilities.con)
    :(classId==='monk'&&!armor&&!shield)?10+dex+abilityMod(abilities.wis):10+dex;
  if(!armor) return unarmored+(shield?2:0);
  const a=armor.a;
  return Number(a.base)+(a.dex?Math.min(dex,Number.isFinite(a.max)?a.max:99):0)+(shield?2:0);
}

export function calculateCharacterStats(character,data) {
  const level=Math.max(1,Math.min(20,Number(character.level)||1));
  const cls=getClass(data,character.classId);
  const con=abilityMod(character.abilities?.con);
  const hitDie=Number(cls?.hd||8);
  const baseMaxHp=level===1?Math.max(1,hitDie+con):Math.max(1,(hitDie+con)+Array.from({length:level-1},()=>Math.max(1,Math.floor(hitDie/2)+1+con)).reduce((a,b)=>a+b,0));
  const maxHp=Math.max(1,baseMaxHp+(Number(character.hpRollAdjustment)||0));
  const row=cls?.table?.[Math.min(level-1,Math.max(0,(cls?.table?.length||1)-1))]||{};
  const pb=Number(row.pb)||proficiencyBonus(level);
  const spellAbility=cls?.spell?.ab||character.spellAbility||null;
  const spellMod=spellAbility?abilityMod(character.abilities?.[spellAbility]):0;
  return {
    level,pb,maxHp,hitDie,hitDice:`${level}d${hitDie}`,
    ac:calculateArmorClass(character,data),speed:Number(character.speed||30),
    initiative:abilityMod(character.abilities?.dex),
    spellAbility,spellSaveDC:spellAbility?8+pb+spellMod:null,spellAttackBonus:spellAbility?pb+spellMod:null,
    spellSlots:row.s||[],classTable:row
  };
}

export function calculateSkillBonus(character,skillId,data) {
  const skill=SKILL_BY_ID[skillId]; if(!skill) return 0;
  const stats=calculateCharacterStats(character,data);
  const base=abilityMod(character.abilities?.[skill.ability]);
  const prof=(character.skillProficiencies||[]).includes(skillId);
  const expert=(character.expertise||[]).includes(skillId);
  return base+(prof?stats.pb:0)+(expert?stats.pb:0);
}

export function buildEquipmentChoice(option,data,selections={}) {
  const rows=[];
  for(const [itemId,quantity] of option?.items||[]) {
    const item=data.items.find(i=>i.id===itemId);if(item) rows.push({itemId,quantity:Number(quantity)||1,equipped:Boolean(item.a),notes:''});
  }
  for(const [index,pick] of (option?.picks||[]).entries()) {
    const ids=data.cats?.[pick.cat]||[];
    const chosen=selections[`${0}:${index}`]||selections[String(index)];
    const valid=chosen&&ids.includes(chosen)?[chosen]:ids.filter(x=>data.items.some(i=>i.id===x)).slice(0,Number(pick.n)||1);
    for(const id of valid) if(data.items.some(i=>i.id===id)) rows.push({itemId:id,quantity:1,equipped:false,notes:'Chosen from starting equipment options'});
  }
  return {items:rows,gold:Number(option?.gold)||0};
}

export function buildCharacter(draft,data) {
  const cls=getClass(data,draft.classId),species=getSpecies(data,draft.speciesId),background=getBackground(data,draft.backgroundId);
  if(!cls||!species||!background) throw new Error('Choose a class, species, and background before creating your character.');
  const baseScores={...draft.scores};
  if(draft.abilityMethod==='roll') {
    const chosen=draft.rollAssignment||[];
    if(chosen.length!==6||new Set(chosen).size!==6) throw new Error('Assign each of your six rolled scores once.');
    ABILITIES.forEach(([key],i)=>{const rolled=draft.rollSet?.[Number(chosen[i])];if(!rolled)throw new Error('One or more rolled scores are missing.');baseScores[key]=Number(rolled.score);});
  }
  if(draft.abilityMethod==='pointbuy'&&!validatePointBuy(baseScores)) throw new Error('Point Buy must use scores from 8–15 and no more than 27 points.');
  if(draft.abilityMethod==='standard'&&new Set(ABILITIES.map(([k])=>Number(baseScores[k]))).size!==6) throw new Error('Assign each Standard Array score to one ability.');
  const skillIds=[...new Set([...(background.skills||[]),...(draft.classSkills||[]),...(draft.speciesSkills||[])])];
  const speciesSub=(species.subs||[]).find(s=>s.id===draft.speciesSubId);
  const abilityImprovements={};
  const asiKeys=draft.asiScheme==='three-one'?(draft.asiChoices||[]).slice(0,3):(draft.asiChoices||[]).slice(0,2);
  if(draft.asiScheme==='three-one') asiKeys.forEach(key=>abilityImprovements[key]=(abilityImprovements[key]||0)+1);
  else { if(asiKeys[0]) abilityImprovements[asiKeys[0]]=2; if(asiKeys[1]) abilityImprovements[asiKeys[1]]=1; }
  const abilities=calculateAbilityScores(baseScores,abilityImprovements);
  const clsOption=cls.equip?.[0]?.opts?.[Number(draft.classEquipment)||0];
  const bgOption=background.equip?.[0]?.opts?.[Number(draft.backgroundEquipment)||0];
  const classGear=buildEquipmentChoice(clsOption,data,draft.classEquipmentPicks||{}),backgroundGear=buildEquipmentChoice(bgOption,data,draft.backgroundEquipmentPicks||{});
  const inventory=[...classGear.items,...backgroundGear.items];
  const duplicate=new Map();
  for(const item of inventory){const existing=duplicate.get(item.itemId)||{quantity:0,equipped:false};existing.quantity+=item.quantity;existing.equipped=existing.equipped||item.equipped;duplicate.set(item.itemId,existing);}
  const mergedInventory=[...duplicate.entries()].map(([itemId,value])=>({itemId,quantity:value.quantity,equipped:value.equipped,notes:''}));
  const classFeatures=(cls.features||[]).filter(f=>(f.l||1)<=1 && !f.pick).map(f=>({id:f.id,name:f.n,description:f.d,source:`${cls.name} — Level ${f.l||1}`}));
  const speciesFeatures=[...(species.traits||[]),...(speciesSub?.traits||[])].map(f=>({id:`species-${species.id}-${f.n}`,name:f.n,description:f.d,source:species.name}));
  const backgroundFeat=getFeat(data,background.feat);
  const speciesFeat=getFeat(data,draft.speciesFeatId);
  const classChoiceFeat=getFeat(data,draft.classFeatId);
  const featList=[backgroundFeat,speciesFeat,classChoiceFeat].filter(Boolean);
  const featFeatures=[
    ...(backgroundFeat?[{id:backgroundFeat.id,name:backgroundFeat.name,description:backgroundFeat.d,source:`Background feat — ${background.name}`}]:[]),
    ...(speciesFeat?[{id:speciesFeat.id,name:speciesFeat.name,description:speciesFeat.d,source:`Species feat — ${species.name}`}]:[]),
    ...(classChoiceFeat?[{id:classChoiceFeat.id,name:classChoiceFeat.name,description:classChoiceFeat.d,source:`Class feature choice — ${cls.name}`}]:[])
  ];
  const languages=[...new Set(['Common',...(species.langs||[]),...(draft.languages||[])])];
  const spells=[...(draft.cantrips||[]).map(spellId=>({spellId,prepared:true,known:true})),...(draft.startingSpells||[]).map(spellId=>({spellId,prepared:(draft.preparedSpells||[]).includes(spellId),known:true}))];
  const character={
    id:crypto.randomUUID(),name:String(draft.name||'Unnamed Adventurer').trim(),
    classId:cls.id,className:cls.name,backgroundId:background.id,backgroundName:background.name,
    speciesId:species.id,speciesName:species.name,speciesSubId:speciesSub?.id||null,speciesSubName:speciesSub?.name||null,
    level:1,alignment:draft.alignment||'Unaligned',pronouns:draft.pronouns||'',appearance:draft.appearance||'',backstory:draft.backstory||'',personality:draft.personality||'',notes:draft.notes||'',
    abilityMethod:draft.abilityMethod,baseScores,abilityImprovements,abilities,
    skillProficiencies:skillIds,savingThrowProficiencies:cls.saves||[],
    armorTraining:cls.armor||[],weaponTraining:cls.weapons||[],toolTraining:[...(cls.tools||[]),...(background.tools||[])],languages,
    featIds:featList.map(x=>x.id),features:[...classFeatures,...speciesFeatures,...featFeatures],
    inventory:mergedInventory,gold:classGear.gold+backgroundGear.gold,
    spells,spellSlots:(cls.table?.[0]?.s||[]).map((total,level)=>({level,total,expended:0})).filter(x=>x.total>0),
    hitDiceSpent:0,hpCurrent:Math.max(1,Number(cls.hd||8)+abilityMod(abilities.con)),temporaryHp:0,
    deathSaves:{successes:0,failures:0},conditions:[],exhaustion:0,
    resources:{},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()
  };
  const stats=calculateCharacterStats(character,data);
  character.hpMax=stats.maxHp; character.ac=stats.ac; character.speed=stats.speed;
  return character;
}

export function rollInitiative(character,data) {
  const stats=calculateCharacterStats(character,data);
  const roll=rollDie(20);
  return {roll,bonus:stats.initiative,total:roll+stats.initiative};
}
