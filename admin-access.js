(function(){
 function initAdminGate(){
  const form=document.getElementById('gateAdminForm');
  if(!form||form.dataset.bound==='1')return;
  form.dataset.bound='1';
  const token=sessionStorage.getItem('mou_admin_token');
  if(token){
   document.body.classList.remove('access-locked');
   const gate=document.getElementById('accessGate');if(gate)gate.hidden=true;
   const adminForm=document.getElementById('adminForm');if(adminForm)adminForm.hidden=true;
   const content=document.getElementById('adminContent');if(content)content.hidden=false;
  }
  form.addEventListener('submit',async function(e){
   e.preventDefault();
   const msg=document.getElementById('gateAdminMsg');
   const button=form.querySelector('button[type="submit"]');
   button.disabled=true;msg.textContent='Vérification du code…';
   try{
    const response=await fetch('/.netlify/functions/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:form.elements.namedItem('code').value})});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Connexion administrateur impossible');
    sessionStorage.setItem('mou_admin_token',data.token);
    document.body.classList.remove('access-locked');
    document.getElementById('accessGate').hidden=true;
    document.getElementById('adminForm').hidden=true;
    document.getElementById('adminContent').hidden=false;
    if(typeof loadAll==='function')await loadAll();
    if(typeof tab==='function')tab('admin',false);
    msg.textContent='Connexion administrateur réussie.';
   }catch(error){msg.textContent=error.message;}
   finally{button.disabled=false;}
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initAdminGate);else initAdminGate();
})();