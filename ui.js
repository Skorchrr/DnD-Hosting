export function escapeHTML(value='') {
 return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
export function humanize(value='') {
 return String(value??'').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
export function initials(value='') { return String(value).trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'SK'; }
export function rulesText(value='') {
 const text=String(value??'').trim();
 if(!text) return '<p class="muted">No description available.</p>';
 return text.split(/\n\s*\n/).map(paragraph=>`<p>${escapeHTML(paragraph).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</p>`).join('');
}
export function toast(message,tone='') {
 const node=document.getElementById('toast');if(!node)return;
 node.textContent=message;node.className=`toast show ${tone}`;
 clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>node.className='toast',2800);
}
export function openModal(title,body,actions='') {
 const dialog=document.getElementById('modal');
 document.getElementById('modalContent').innerHTML=`<div class="modal-heading"><div><span class="eyebrow">SHADOWKEEP</span><h2>${escapeHTML(title)}</h2></div><button type="button" class="icon-close" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body">${body}</div>${actions?`<footer class="modal-footer">${actions}</footer>`:''}`;
 dialog.showModal();
}
export function closeModal(){const dialog=document.getElementById('modal');if(dialog.open)dialog.close();}
export function emptyState(title,description,action=''){return `<div class="empty-state"><div class="empty-mark">✦</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${action}</div>`;}
export function formatTextLines(text='') { return escapeHTML(text).replace(/\n/g,'<br>'); }
