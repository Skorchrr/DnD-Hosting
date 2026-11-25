const KEYS={class:'classes',species:'species',background:'backgrounds',subclass:'subclasses',feat:'feats',spell:'spells',item:'items',monster:'monsters'};
let cachedData;
export async function loadRulesData() {
  if(cachedData) return cachedData;
  const response=await fetch(new URL('../data/srd-5.2-2024.json',import.meta.url));
  if(!response.ok) throw new Error(`Rules data could not load (${response.status}).`);
  const data=await response.json();
  data._base={};for(const key of Object.values(KEYS)) data._base[key]=[...(data[key]||[])];
  data.custom={};cachedData=data;return data;
}
export function applyCustomContent(data,customContent={},includeSrd=true) {
  data.custom=customContent||{};
  for(const [type,key] of Object.entries(KEYS)) data[key]=[...(includeSrd?(data._base?.[key]||data[key]||[]):[]),...(data.custom[type]||[]).filter(x=>x.visible!==false)];
  return data;
}
export function allOfType(data,type) {
  const key=KEYS[type];return key?(data[key]||[]):[];
}
export function getById(data,type,id) { return allOfType(data,type).find(x=>x.id===id)||null; }
export function addCustom(data,type,record) {
  data.custom??={};data.custom[type]??=[];
  const index=data.custom[type].findIndex(x=>x.id===record.id);
  if(index>=0)data.custom[type][index]=record;else data.custom[type].push(record);
  return record;
}
export function removeCustom(data,type,id) {data.custom[type]=(data.custom?.[type]||[]).filter(x=>x.id!==id);}
