const KEY='dnd-unlimited-v1';
const LEGACY_KEYS=['shadowkeep-dnd-2024-v1'];

export function freshState() {
  return {
    version:1,
    campaign:{name:'The Ashen Crown',description:'A new adventure begins.',dmName:'Dungeon Master'},
    characters:[],activeCharacterId:null,
    encounter:{active:false,round:0,turnIndex:-1,combatants:[],tokens:[],measureMode:false,measureStart:null,measureEnd:null,map:{name:'The Ruined Keep',image:null,grid:true,columns:20,rows:15}},
    journal:[],rolls:[],customContent:{},settings:{rerollCredits:0,showRulesHelp:true}
  };
}

function normalizeState(saved={}) {
  const base=freshState(),state={...base,...saved};
  state.campaign={...base.campaign,...(saved.campaign||{})};
  state.encounter={...base.encounter,...(saved.encounter||{}),map:{...base.encounter.map,...(saved.encounter?.map||{})}};
  state.settings={...base.settings,...(saved.settings||{})};
  state.characters=Array.isArray(saved.characters)?saved.characters:[];
  state.encounter.tokens=Array.isArray(state.encounter.tokens)?state.encounter.tokens:[];
  state.encounter.combatants=Array.isArray(state.encounter.combatants)?state.encounter.combatants:[];
  state.journal=Array.isArray(saved.journal)?saved.journal:[];
  state.rolls=Array.isArray(saved.rolls)?saved.rolls:[];
  state.customContent=saved.customContent&&typeof saved.customContent==='object'?saved.customContent:{};
  return state;
}

export function loadState() {
  try {
    let raw=localStorage.getItem(KEY);
    if(!raw){
      for(const legacyKey of LEGACY_KEYS){
        raw=localStorage.getItem(legacyKey);
        if(raw){localStorage.setItem(KEY,raw);break;}
      }
    }
    return raw?normalizeState(JSON.parse(raw)):freshState();
  } catch { return freshState(); }
}

export function saveState(state) {
  localStorage.setItem(KEY,JSON.stringify({...state,savedAt:new Date().toISOString()}));
}

export function exportState(state) {
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`dnd-unlimited-${new Date().toISOString().slice(0,10)}.json`;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function importState(file) {
  return file.text().then(text=>{
    const parsed=JSON.parse(text);
    if(!parsed||!Array.isArray(parsed.characters)||!parsed.encounter) throw new Error('This does not look like a D&D Unlimited campaign backup.');
    return normalizeState(parsed);
  });
}
