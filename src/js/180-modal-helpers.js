
// ─── MODAL HELPERS ──────────────────────────────
function openModal(id){document.getElementById(id).style.display='flex';}
function closeModal(id){document.getElementById(id).style.display='none';}

/** Show a themed confirmation dialog. onConfirm() is called only if the user clicks Confirm. */
function showConfirm(title, message, onConfirm, confirmLabel) {
  document.getElementById('modal-confirm-title').textContent = title;
  document.getElementById('modal-confirm-msg').textContent   = message;
  const btn = document.getElementById('modal-confirm-ok');
  btn.textContent = confirmLabel || 'Confirm';
  btn.onclick = () => { closeModal('modal-confirm'); onConfirm(); };
  openModal('modal-confirm');
}
/** Show a themed one-button alert dialog. */
function showAlert(message, title) {
  document.getElementById('modal-alert-title').textContent = title || 'Notice';
  document.getElementById('modal-alert-msg').textContent   = message;
  openModal('modal-alert');
}
document.addEventListener('click',e=>{if(e.target.classList.contains('modal-overlay'))e.target.style.display='none';});
