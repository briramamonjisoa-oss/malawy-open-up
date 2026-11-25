(function(){
'use strict';
const API='https://malawy-open-up.briramamonjisoa.workers.dev/.netlify/functions/';
const token=()=>localStorage.getItem('mou_player_token')||'';
const $=id=>document.getElementById(id);
let pc=null,stream=null,remoteStream=null,currentCall=null,role='',pollTimer=null,seenIce=new Set(),remoteSet=false,muted=false,cameraOff=false,incomingShown='';
async function api(path,options={}){const r=await fetch(API+path,{...options,headers:{Authorization:'Bearer '+token(),...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})},cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur appel ('+r.status+')');return d;}
function mount(){
 const header=$('mouChatActive')?.querySelector('.mou-chat-header');if(!header||$('mouCallAudio'))return;
 const actions=document.createElement('div');actions.className='mou-call-header-actions';actions.innerHTML='<button type="button" id="mouCallAudio" aria-label="Appel audio" title="Appel audio">☎</button><button type="button" id="mouCallVideo" aria-label="Appel vidéo" title="Appel vidéo">▣</button>';header.append(actions);
 const overlay=document.createElement('section');overlay.id='mouCallOverlay';overlay.hidden=true;overlay.innerHTML='<div class="mou-call-card"><div class="mou-call-top"><span class="mou-call-kicker">MALAWY · APPEL PRIVÉ</span><button type="button" id="mouCallClose" aria-label="Fermer">×</button></div><h2 id="mouCallTitle">Appel</h2><p id="mouCallState">Connexion…</p><div class="mou-call-videos"><video id="mouCallRemote" autoplay playsinline></video><video id="mouCallLocal" autoplay muted playsinline></video></div><div class="mou-call-actions"><button type="button" id="mouCallMute">Micro</button><button type="button" id="mouCallCamera">Caméra</button><button type="button" id="mouCallAccept" hidden>Accepter</button><button type="button" id="mouCallDecline" hidden>Refuser</button><button type="button" id="mouCallHangup" class="hangup">Raccrocher</button></div></div>';
 document.body.append(overlay);
 const style=document.createElement('style');style.textContent=`
 .mou-call-header-actions{display:flex;gap:6px;margin-left:auto}.mou-call-header-actions button{width:40px;height:40px;padding:0;border-radius:50%;border:1px solid rgba(216,193,138,.45);background:rgba(216,193,138,.09);color:#e7d39e;font-size:18px}
 #mouCallOverlay{position:fixed;inset:0;z-index:120000;display:grid;place-items:center;padding:18px;background:rgba(0,0,0,.94);backdrop-filter:blur(18px);color:#f4eee3}
 #mouCallOverlay[hidden]{display:none!important}.mou-call-card{width:min(100%,520px);padding:20px;border:1px solid rgba(216,193,138,.5);border-radius:24px;background:linear-gradient(145deg,#191711,#070809);box-shadow:0 22px 80px #000}
 .mou-call-top{display:flex;justify-content:space-between;align-items:center}.mou-call-kicker{font-size:10px;letter-spacing:.16em;color:#d8c18a;font-weight:900}.mou-call-top button{background:transparent;color:#eee;font-size:25px;padding:5px 10px}
 #mouCallTitle{font:800 26px Inter;margin:15px 0 5px}#mouCallState{color:#c8b98f;margin:0 0 16px}
 .mou-call-videos{position:relative;min-height:230px;overflow:hidden;border-radius:17px;background:#050505;border:1px solid #51452d}
 #mouCallRemote{width:100%;height:min(48vh,360px);object-fit:cover;background:#050505}
 #mouCallLocal{position:absolute;right:10px;bottom:10px;width:clamp(88px,24vw,130px);height:clamp(112px,29vw,170px);object-fit:cover;border:1px solid #d8c18a;border-radius:13px;background:#111}
 .mou-call-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:17px}.mou-call-actions button{background:#252219;color:#f1e3bd;border:1px solid #76643e;padding:12px 14px}.mou-call-actions .hangup,.mou-call-actions #mouCallDecline{background:#6e2020;border-color:#a44848;color:#fff}
 @media(max-width:480px){.mou-call-card{padding:16px}.mou-call-videos{min-height:190px}}
 `;document.head.append(style);
 $('mouCallAudio').onclick=()=>start('audio');$('mouCallVideo').onclick=()=>start('video');
 $('mouCallHangup').onclick=()=>finish(true);$('mouCallClose').onclick=()=>{if(currentCall)finish(true);else hide();};
 $('mouCallMute').onclick=()=>{muted=!muted;stream?.getAudioTracks().forEach(t=>t.enabled=!muted);$('mouCallMute').textContent=muted?'Activer micro':'Couper micro';};
 $('mouCallCamera').onclick=()=>{cameraOff=!cameraOff;stream?.getVideoTracks().forEach(t=>t.enabled=!cameraOff);$('mouCallCamera').textContent=cameraOff?'Activer caméra':'Couper caméra';};
 $('mouCallAccept').onclick=acceptIncoming;$('mouCallDecline').onclick=()=>declineIncoming();
}
function stateText(text){if($('mouCallState'))$('mouCallState').textContent=text;}
function show(name,type){mount();$('mouCallOverlay').hidden=false;$('mouCallTitle').textContent=(type==='video'?'Appel vidéo avec ':'Appel audio avec ')+(name||'ton ami');}
function hide(){$('mouCallOverlay').hidden=true;}
async function media(type){if(!navigator.mediaDevices?.getUserMedia)throw Error('Micro/caméra indisponible. Ouvre le site dans un navigateur sécurisé et autorise les permissions.');return navigator.mediaDevices.getUserMedia({audio:true,video:type==='video'?{facingMode:'user'}:false});}
function setupPeer(iceServers){
 pc=new RTCPeerConnection({iceServers:iceServers||[{urls:'stun:stun.l.google.com:19302'}]});remoteStream=new MediaStream();$('mouCallRemote').srcObject=remoteStream;
 pc.ontrack=e=>{const tracks=e.streams?.[0]?.getTracks?.()||[e.track].filter(Boolean);tracks.forEach(t=>{if(!remoteStream.getTrackById(t.id))remoteStream.addTrack(t);});const remote=$('mouCallRemote');if(remote){remote.srcObject=remoteStream;remote.play().catch(()=>stateText('Appel reçu. Appuie sur lecture si le son ne démarre pas.'));}};
 pc.onicecandidate=e=>{if(e.candidate&&currentCall)api('calls',{method:'POST',body:JSON.stringify({action:'candidate',callId:currentCall.callId,candidate:e.candidate.toJSON()})}).catch(err=>stateText(err.message));};
 pc.onconnectionstatechange=()=>{const s=pc?.connectionState;if(s==='connected')stateText('Appel connecté');if(s==='failed')stateText('Connexion impossible. Un relais TURN peut être nécessaire sur ce réseau.');if(s==='disconnected')stateText('Connexion interrompue…');};
 stream?.getTracks().forEach(t=>pc.addTrack(t,stream));
}
async function start(type){
 const chat=window.MOU_CURRENT_CHAT;if(!chat?.id){alert('Ouvre une conversation privée avec un ami accepté avant d’appeler.');return;}
 try{
  show(chat.name,type);stateText('Demande des autorisations micro/caméra…');stream=await media(type);$('mouCallLocal').srcObject=stream;$('mouCallLocal').hidden=type!=='video';
  const started=await api('calls',{method:'POST',body:JSON.stringify({action:'start',targetId:chat.id,type})});currentCall={callId:started.callId,peerId:chat.id,type};role='caller';setupPeer(started.iceServers);
  const offer=await pc.createOffer();await pc.setLocalDescription(offer);await api('calls',{method:'POST',body:JSON.stringify({action:'offer',callId:currentCall.callId,sdp:JSON.stringify(pc.localDescription)})});
  $('mouCallAccept').hidden=true;$('mouCallDecline').hidden=true;$('mouCallHangup').hidden=false;stateText('Appel en cours… En attente de réponse.');beginPolling();
 }catch(e){stateText(e.message);if(currentCall)await finish(true);else{stream?.getTracks().forEach(t=>t.stop());stream=null;} }
}
async function acceptIncoming(){
 if(!currentCall)return;
 try{
  const data=await api('calls?callId='+encodeURIComponent(currentCall.callId));stream=await media(currentCall.type);$('mouCallLocal').srcObject=stream;$('mouCallLocal').hidden=currentCall.type!=='video';setupPeer(data.iceServers);
  const offer=JSON.parse(data.call.offer);await pc.setRemoteDescription(offer);remoteSet=true;
  const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await api('calls',{method:'POST',body:JSON.stringify({action:'answer',callId:currentCall.callId,sdp:JSON.stringify(pc.localDescription)})});
  $('mouCallAccept').hidden=true;$('mouCallDecline').hidden=true;stateText('Connexion à ton ami…');beginPolling();
 }catch(e){stateText(e.message);await finish(true);}
}
async function declineIncoming(){if(currentCall)await api('calls',{method:'POST',body:JSON.stringify({action:'decline',callId:currentCall.callId})}).catch(()=>{});await finish(false);}
function beginPolling(){clearInterval(pollTimer);pollTimer=setInterval(syncCall,1800);syncCall();}
async function syncCall(){
 if(!currentCall)return;
 try{
  const data=await api('calls?callId='+encodeURIComponent(currentCall.callId)),call=data.call;
  if(call.status==='ended'){stateText('Appel terminé.');await finish(false);return;}
  if(role==='caller'&&call.answer&&!remoteSet){await pc.setRemoteDescription(JSON.parse(call.answer));remoteSet=true;stateText('Réponse reçue. Connexion…');}
  for(const item of call.ice||[]){if(item.senderId===currentCall.peerId&&!seenIce.has(item.candidate?.candidate)){if(remoteSet){await pc.addIceCandidate(item.candidate).catch(()=>{});seenIce.add(item.candidate?.candidate);} }}
 }catch(e){if(e.message.includes('expiré')||e.message.includes('n’existe plus')){stateText(e.message);await finish(false);}}
}
async function pollIncoming(){
 if(!token()||document.hidden||currentCall)return;
 try{const d=await api('calls?incoming=1');const call=d.incoming?.[0];if(!call||call.callId===incomingShown)return;incomingShown=call.callId;currentCall={callId:call.callId,peerId:call.callerId,type:call.type};role='callee';const peer=(window.MOU_CONTACTS||[]).find(x=>x.id===call.callerId);currentCall.name=peer?.pseudo||'Un ami';show(currentCall.name,call.type);stateText('Appel entrant…');$('mouCallAccept').hidden=false;$('mouCallDecline').hidden=false;$('mouCallHangup').hidden=true;}catch(e){console.warn('Appels entrants:',e.message);}
}
async function finish(notify){
 clearInterval(pollTimer);pollTimer=null;
 if(notify&&currentCall)await api('calls',{method:'POST',body:JSON.stringify({action:'end',callId:currentCall.callId})}).catch(()=>{});
 pc?.close();pc=null;stream?.getTracks().forEach(t=>t.stop());stream=null;remoteStream=null;currentCall=null;role='';remoteSet=false;seenIce.clear();muted=false;cameraOff=false;if($('mouCallRemote'))$('mouCallRemote').srcObject=null;if($('mouCallLocal'))$('mouCallLocal').srcObject=null;hide();
}
mount();setInterval(pollIncoming,5000);window.addEventListener('beforeunload',()=>{if(currentCall)api('calls',{method:'POST',body:JSON.stringify({action:'end',callId:currentCall.callId})}).catch(()=>{});});
})();
