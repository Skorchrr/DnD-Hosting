const KEY='shadowkeep-dnd-2024-v1';
export function freshState() {
  return {
    version:1,
    campaign:{name:'The Ashen Crown',description:'A new adventure begins.',dmName:'Dungeon Master'},
    characters:[],activeCharacterId:null,
    encounter:{active:false,round:0,turnIndex:-1,combatants:[],tokens:[],map:{name:'The Ruined Keep',image:null,grid:true,columns:20,rows:15}},
    journal:[],rolls:[],customContent:{},settings:{rerollCredits:0,showRulesHelp:true}
  };
}
export function loadState() {
  try {
    const raw=localStorage.getItem(KEY);
    if(!raw) return freshState();
    const saved=JSON.parse(raw), state={...freshState(),...saved};
    state.campaign={...freshState().campaign,...saved.campaign};
    state.encounter={...freshState().encounter,...saved.encounter,map:{...freshState().encounter.map,...saved.encounter?.map}};
    state.settings={...freshState().settings,...saved.settings};
    state.characters=Array.isArray(saved.characters)?saved.characters:[];
    state.customContent=saved.customContent||{};
    return state;
  } catch { return freshState(); }
}
export function saveState(state) {
  localStorage.setItem(KEY,JSON.stringify({...state,savedAt:new Date().toISOString()}));
}
export function exportState(state) {
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`shadowkeep-${new Date().toISOString().slice(0,10)}.json`;a.click();
  URL.revokeObjectURL(url);
}
export function importState(file) {
  return file.text().then(text=>{
    const parsed=JSON.parse(text);
    if(!parsed||!Array.isArray(parsed.characters)||!parsed.encounter) throw new Error('This does not look like a Shadowkeep campaign backup.');
    return {...freshState(),...parsed};
  });
}
