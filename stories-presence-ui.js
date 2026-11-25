(()=>{'use strict';
const ROOT='https://malawy-open-up.briramamonjisoa.workers.dev/.netlify/functions/';
const token=()=>localStorage.getItem('mou_player_token')||'';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(name,method='GET',data){const r=await fetch(ROOT+name,{method,headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{}),cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Erreur réseau');return d;}
const cloudinary=async file=>{const kind=file.type.startsWith('video/')?'video':'image';const fd=new FormData();fd.append('file',file);fd.append('upload_preset','malawy_photos');const r=await fetch('https://api.cloudinary.com/v1_1/owc0mtlg/'+kind+'/upload',{method:'POST',body:fd});const d=await r.json();if(!r.ok)throw Error(d.error?.message||'Échec de l’envoi');return d.secure_url;};
let stories=[],heartbeat=null,online=[];
function storyStyles(){if(document.getElementById('mouStoryStyles'))return;const s=document.createElement('style');s.id='mouStoryStyles';s.textContent=`
.mou-story-upload-wrap{margin:16px 0}.mou-story-upload{width:100%;box-sizing:border-box;display:flex!important;align-items:center;gap:14px;padding:13px 15px!important;border:1px solid rgba(211,185,119,.38)!important;border-radius:18px!important;background:linear-gradient(115deg,rgba(211,185,119,.10),rgba(255,255,255,.025))!important;color:#eee!important;text-align:left;font:inherit;cursor:pointer}
.mou-story-upload-icon{position:relative;flex:0 0 48px;width:48px;height:48px;border:1px solid #bda66f;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.42);color:#ddc78e}
.mou-story-upload-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.mou-story-upload-icon i{position:absolute;right:-3px;bottom:-3px;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;background:#d8c18a;color:#090909;font-size:14px;font-style:normal;font-weight:700}
.mou-story-upload>span:last-child{font-size:14px;font-weight:650;color:#f0e8d5}.mou-story-upload small{display:block;color:#a89d84;font-size:11px;font-weight:400;margin-top:4px}
.mou-story-audience{position:relative;margin-top:7px}.mou-story-audience-trigger{width:100%;display:flex;align-items:center;justify-content:space-between;padding:14px 15px;border:1px solid rgba(211,185,119,.4);border-radius:14px;background:linear-gradient(110deg,rgba(211,185,119,.08),rgba(0,0,0,.55));color:#eee;font-size:14px;text-align:left}.mou-audience-chevron{color:#d8c18a;font-size:19px}.mou-story-audience-menu{position:absolute;z-index:5;top:calc(100% + 7px);left:0;right:0;padding:6px;border:1px solid rgba(211,185,119,.48);border-radius:15px;background:rgba(12,12,11,.98);box-shadow:0 14px 35px #000}.mou-story-audience-menu[hidden]{display:none}.mou-story-audience-menu button{width:100%;padding:13px;border:0;border-radius:10px;background:transparent;color:#ddd;text-align:left;font-size:13px}.mou-story-audience-menu button.selected{background:rgba(211,185,119,.13);color:#e2ca8e}.mou-story-audience-menu button:before{content:'○';display:inline-block;width:24px;color:#9b8a62}.mou-story-audience-menu button.selected:before{content:'◉';color:#d8c18a}

.mou-stories-rail{display:flex;gap:14px;overflow-x:auto;padding:8px 2px 14px;scrollbar-width:none}.mou-stories-rail::-webkit-scrollbar{display:none}
.mou-story-tile{flex:0 0 74px;width:74px;border:0;background:none;color:inherit;padding:0;text-align:center;font:inherit;cursor:pointer}
.mou-story-ring{width:66px;height:66px;margin:0 auto 7px;border-radius:50%;padding:3px;display:grid;place-items:center;border:1px solid #bda66f;background:linear-gradient(145deg,#d9c48b,#29231a 60%,#806a3f)}
.mou-story-ring img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid #080808}
.mou-story-ring .mou-story-plus{width:100%;height:100%;border-radius:50%;display:grid;place-items:center;background:#111;color:#d8c18a;font-size:30px}
.mou-story-tile b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;font-weight:600}
.mou-story-viewer{position:fixed;inset:0;z-index:18000;background:rgba(0,0,0,.96);display:flex;align-items:center;justify-content:center;padding:18px}
.mou-story-viewer-inner{position:relative;width:min(100%,460px);height:min(82dvh,800px);border:1px solid rgba(216,193,138,.5);border-radius:22px;overflow:hidden;background:#080808;display:flex;flex-direction:column}
.mou-story-progress{height:3px;background:#555;margin:12px 12px 8px}.mou-story-progress span{display:block;height:100%;background:#d8c18a}
.mou-story-head{display:flex;align-items:center;gap:10px;padding:8px 14px;color:#fff;z-index:1}.mou-story-head img{width:36px;height:36px;border-radius:50%;object-fit:cover}.mou-story-head b{font-size:14px}.mou-story-head small{display:block;color:#bbb;font-size:11px}
.mou-story-media{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#000}.mou-story-media img,.mou-story-media video{width:100%;height:100%;object-fit:contain}
.mou-story-caption{padding:12px 16px;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.8));font-size:14px}
.mou-story-close{position:absolute;right:12px;top:30px;z-index:2;border:0;background:rgba(0,0,0,.5);color:white;font-size:26px;border-radius:50%;width:38px;height:38px}
.mou-story-create{display:none;position:fixed;inset:0;z-index:18001;background:rgba(0,0,0,.86);align-items:center;justify-content:center;padding:18px}.mou-story-create.open{display:flex}
.mou-story-create-card{width:min(100%,420px);padding:22px;border:1px solid #8e784e;border-radius:22px;background:#111;color:#eee}.mou-story-create-card h3{margin:0 0 14px}.mou-story-create-card label{display:block;margin:12px 0;color:#d8c18a}.mou-story-create-card input,.mou-story-create-card select{width:100%;margin-top:7px;padding:12px;border-radius:12px;background:#080808;color:#eee;border:1px solid #5e5137}.mou-story-create-actions{display:flex;gap:10px}.mou-story-create-actions button{flex:1}
.mou-friend-online{display:inline-flex;align-items:center;gap:6px;color:#d8c18a;font-size:11px;margin-top:5px}.mou-friend-online:before{content:'';width:7px;height:7px;border-radius:50%;background:#59cf83;box-shadow:0 0 8px #59cf83}
.mou-presence-settings{margin:14px 0;padding:12px;border:1px solid rgba(216,193,138,.2);border-radius:14px;color:#ddd;font-size:13px}.mou-presence-settings label{display:flex;align-items:center;gap:9px}.mou-presence-settings input{width:auto}

.mou-story-create{backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);background:rgba(0,0,0,.78)}
.mou-story-create-card{position:relative;max-height:min(88dvh,820px);overflow:auto;padding:24px;border:1px solid rgba(211,185,119,.48);border-radius:26px;background:linear-gradient(145deg,rgba(24,23,20,.98),rgba(5,5,5,.98));box-shadow:0 24px 90px #000, inset 0 1px rgba(255,255,255,.06)}
.mou-story-create-top{display:flex;align-items:center;justify-content:space-between}.mou-story-kicker{font-size:10px;letter-spacing:.2em;color:#cdb77c}.mou-story-x{width:38px;height:38px;border-radius:50%;border:1px solid #786640;background:rgba(0,0,0,.4);color:#e4d19b;font-size:24px}
.mou-story-create-card h3{font-size:27px;letter-spacing:-.04em;margin:16px 0 4px;color:#f2ead7}.mou-story-create-card h3 em{font-style:normal;color:#d5bd80}.mou-story-subtitle{font-size:13px;color:#999;margin:0 0 18px}
.mou-story-upload{display:flex!important;align-items:center;gap:13px;padding:16px;border:1px dashed rgba(211,185,119,.55);border-radius:17px;background:linear-gradient(110deg,rgba(211,185,119,.1),rgba(255,255,255,.025));color:#dfca91!important;font-size:25px!important;cursor:pointer}
.mou-story-upload span{font-size:13px;font-weight:650;color:#eee}.mou-story-upload small{display:block;color:#999;font-size:11px;font-weight:400;margin-top:4px}.mou-story-upload input{display:none}
.mou-story-preview{position:relative;height:min(34dvh,290px);margin:12px 0;border:1px solid rgba(211,185,119,.35);border-radius:18px;overflow:hidden;background:#050505}.mou-story-preview img,.mou-story-preview video{width:100%;height:100%;object-fit:contain}.mou-story-preview[hidden]{display:none}.mou-story-remove{position:absolute;right:10px;top:10px;width:34px;height:34px;border-radius:50%;border:1px solid #cdb77c;background:#080808d9;color:#e8d7a5;font-size:20px}
.mou-story-field{display:block!important;margin:14px 0!important;color:#cdb77c!important;font-size:12px!important;letter-spacing:.04em}.mou-story-field input,.mou-story-field select{box-sizing:border-box;width:100%;padding:13px 14px;margin-top:7px;border-radius:13px;border:1px solid rgba(211,185,119,.3);background:#090909;color:#eee;font-size:14px;outline:none}.mou-story-field input:focus,.mou-story-field select:focus{border-color:#d5bd80;box-shadow:0 0 0 3px #d5bd801c}
.mou-story-msg{font-size:12px;color:#a99a75;margin:14px 0}.mou-story-create-actions{display:flex;gap:10px;margin-top:18px}.mou-story-create-actions button{min-height:46px;border-radius:14px;font-size:13px;font-weight:650}.mou-story-cancel{background:#141414;border:1px solid #444;color:#bbb}.mou-story-publish{background:linear-gradient(135deg,#d8c18a,#8c7544);border:1px solid #e4d09a;color:#090909}.mou-story-publish:disabled{opacity:.55}
.mou-story-ring.mou-story-timer{border:0;padding:3px;background:conic-gradient(#d8c18a calc(var(--story-progress,1)*1turn),rgba(216,193,138,.16) 0);box-shadow:0 0 12px rgba(216,193,138,.12)}
.mou-story-avatar{width:100%;height:100%;display:grid;place-items:center;border-radius:50%;background:#090909;border:2px solid #080808;color:#d8c18a;overflow:hidden;font-size:20px}.mou-story-avatar img{width:100%;height:100%;object-fit:cover;border:0}.mou-story-avatar{position:relative}.mou-story-avatar img{object-fit:cover}.mou-story-video-mark{position:absolute;right:1px;bottom:1px;width:17px;height:17px;border-radius:50%;display:grid;place-items:center;background:#090909;color:#d8c18a;font-size:9px;border:1px solid #d8c18a}

/* MALAWY OPEN UP — immersive Black Velvet / Gold / Violet story viewer */
.mou-story-viewer{position:fixed;inset:0;z-index:18000;display:flex;align-items:center;justify-content:center;padding:0;background:rgba(2,2,4,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.mou-story-viewer-inner{position:relative;isolation:isolate;width:min(100%,520px);height:100dvh;max-height:100dvh;margin:0;overflow:hidden;border:1px solid rgba(216,193,138,.55);border-radius:0;background:#050506;box-shadow:0 0 34px rgba(216,193,138,.12),0 0 70px rgba(142,54,220,.12);display:block}
.mou-story-viewer-inner:before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.68) 0%,rgba(0,0,0,.12) 22%,transparent 52%,rgba(0,0,0,.18) 70%,rgba(0,0,0,.88) 100%)}
.mou-story-viewer-inner:after{content:"MALAWY OPEN UP  ·  FREE FIRE COMMUNITY";position:absolute;z-index:4;left:0;right:0;bottom:calc(12px + env(safe-area-inset-bottom));text-align:center;color:rgba(216,193,138,.8);font-size:9px;font-weight:800;letter-spacing:.24em;text-shadow:0 0 16px rgba(216,193,138,.28);pointer-events:none}
.mou-story-progress-list{position:absolute;top:calc(10px + env(safe-area-inset-top));left:12px;right:12px;z-index:5;display:flex;gap:4px}
.mou-story-progress{display:block;flex:1;height:3px;overflow:hidden;border-radius:8px;background:rgba(255,255,255,.26);box-shadow:0 1px 4px #000}
.mou-story-progress i{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,#d8c18a,#f7e5b2 58%,#b45bff);box-shadow:0 0 10px rgba(216,193,138,.7)}
.mou-story-head{position:absolute;top:calc(26px + env(safe-area-inset-top));left:14px;right:14px;z-index:6;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;color:#fff}
.mou-story-owner{display:flex;align-items:center;gap:11px;min-width:0;padding:0;border:0;background:none;color:#fff;text-align:left;font:inherit;cursor:pointer}
.mou-story-owner-avatar{position:relative;flex:none;width:46px;height:46px;display:grid;place-items:center;overflow:visible;border:2px solid #e0c783;border-radius:50%;background:#111;color:#e0c783;box-shadow:0 0 0 3px rgba(216,193,138,.12),0 0 18px rgba(216,193,138,.25);font-weight:800}
.mou-story-owner-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}
.mou-story-owner-avatar:after{content:"M";position:absolute;right:-4px;bottom:-3px;width:17px;height:17px;display:grid;place-items:center;border:1px solid #e0c783;border-radius:50%;background:#090909;color:#e0c783;font-size:10px;font-weight:900}
.mou-story-owner-meta{min-width:0}.mou-story-owner-meta b{display:block;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#fff;font-size:15px;font-weight:800;text-shadow:0 2px 10px #000}
.mou-story-owner-meta small{display:block;margin-top:3px;color:#e1d7c2;font-size:11px;text-shadow:0 1px 8px #000}
.mou-story-close{position:relative;top:auto;right:auto;z-index:7;flex:none;width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(216,193,138,.58);border-radius:14px;background:rgba(7,7,8,.58);color:#f3e6c4;font-size:25px;line-height:1;box-shadow:0 0 18px rgba(0,0,0,.35)}
.mou-story-media{position:absolute;inset:0;z-index:0;display:flex;align-items:center;justify-content:center;min-height:0;background:radial-gradient(ellipse at 50% 40%,#19151d 0%,#050506 75%)}
.mou-story-media img,.mou-story-media video{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain;background:#050506}
.mou-story-caption{position:absolute;left:18px;right:18px;bottom:calc(42px + env(safe-area-inset-bottom));z-index:5;margin:0;padding:12px 15px;border:1px solid rgba(216,193,138,.28);border-radius:15px;background:linear-gradient(110deg,rgba(8,8,9,.76),rgba(35,20,46,.38));color:#fff;font-size:15px;font-weight:650;line-height:1.4;text-shadow:0 2px 8px #000;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.mou-story-caption[hidden]{display:none}
.mou-story-hit{position:absolute;top:90px;bottom:55px;z-index:3;width:28%;padding:0;border:0;background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent}
.mou-story-prev{left:0}.mou-story-next{right:0}
.mou-story-hit:disabled{opacity:0;pointer-events:none}
@media(min-width:600px){.mou-story-viewer{padding:18px}.mou-story-viewer-inner{height:min(94dvh,900px);max-height:900px;border-radius:26px}.mou-story-viewer-inner:after{bottom:12px}.mou-story-progress-list{top:14px}.mou-story-head{top:30px}.mou-story-caption{bottom:40px}}
@media(max-height:560px) and (orientation:landscape){.mou-story-viewer-inner{width:min(100vw,900px);height:100dvh}.mou-story-owner-avatar{width:38px;height:38px}.mou-story-caption{bottom:28px;padding:8px 12px}}

/* MALAWY signature refinement — compact esports identity, less empty black space */
.mou-story-viewer-inner{
  border-color:rgba(218,193,132,.72);
  box-shadow:0 0 0 1px rgba(127,77,181,.18),0 0 38px rgba(218,193,132,.14),0 0 90px rgba(117,55,173,.18);
  background:
    radial-gradient(ellipse at 50% 18%,rgba(107,54,151,.16),transparent 42%),
    radial-gradient(ellipse at 50% 82%,rgba(194,158,91,.10),transparent 40%),
    #050506;
}
.mou-story-viewer-inner:before{
  background:
    linear-gradient(180deg,rgba(5,5,8,.74) 0%,rgba(8,6,12,.30) 17%,transparent 36%,transparent 68%,rgba(5,5,8,.24) 78%,rgba(5,5,8,.92) 100%),
    linear-gradient(115deg,rgba(119,66,166,.10),transparent 32%,transparent 70%,rgba(210,184,119,.08));
}
.mou-story-viewer-inner:after{
  content:"M  ·  MALAWY OPEN UP  ·  ESPORT";
  bottom:calc(15px + env(safe-area-inset-bottom));
  color:#d8c18a;
  letter-spacing:.22em;
  font-size:9px;
  text-shadow:0 0 9px rgba(216,193,138,.38),0 0 20px rgba(130,72,180,.22);
}
.mou-story-progress-list{
  top:calc(12px + env(safe-area-inset-top));
  left:15px;right:15px;gap:5px;
}
.mou-story-progress{height:3px;background:rgba(255,255,255,.20);box-shadow:0 0 8px rgba(0,0,0,.7)}
.mou-story-progress i{
  background:linear-gradient(90deg,#a9874e 0%,#f0d99e 52%,#9a63c5 100%);
  box-shadow:0 0 12px rgba(216,193,138,.65),0 0 15px rgba(154,99,197,.28);
}
.mou-story-head{
  top:calc(27px + env(safe-area-inset-top));
  left:13px;right:13px;
  padding:8px 9px 8px 10px;
  border:1px solid rgba(216,193,138,.34);
  border-radius:18px;
  background:linear-gradient(110deg,rgba(7,7,9,.76),rgba(35,23,47,.48));
  box-shadow:0 8px 28px rgba(0,0,0,.25),inset 0 1px rgba(255,255,255,.06);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
}
.mou-story-owner{gap:12px}
.mou-story-owner-avatar{
  width:44px;height:44px;
  border-color:#ddc582;
  background:linear-gradient(145deg,#17131d,#080808);
  box-shadow:0 0 0 3px rgba(216,193,138,.10),0 0 20px rgba(151,94,196,.24);
}
.mou-story-owner-avatar:after{
  background:linear-gradient(145deg,#17111f,#080808);
  box-shadow:0 0 10px rgba(151,94,196,.3);
}
.mou-story-owner-meta b{font-size:14px;letter-spacing:.01em}
.mou-story-owner-meta small{color:#c9bb9b;font-size:10px}
.mou-story-close{
  width:36px;height:36px;border-radius:12px;
  border-color:rgba(216,193,138,.48);
  background:linear-gradient(145deg,rgba(24,20,29,.86),rgba(5,5,6,.78));
  color:#e8d49e;font-size:23px;
  box-shadow:0 0 14px rgba(125,76,163,.16);
}
.mou-story-media{
  background:
    radial-gradient(ellipse at 50% 35%,rgba(120,68,160,.22),transparent 38%),
    radial-gradient(ellipse at 50% 75%,rgba(216,193,138,.10),transparent 45%),
    repeating-linear-gradient(135deg,rgba(255,255,255,.012) 0 1px,transparent 1px 22px),
    #050506;
}
.mou-story-media img,.mou-story-media video{
  object-fit:contain;
  filter:drop-shadow(0 8px 28px rgba(0,0,0,.35));
}
.mou-story-caption{
  left:16px;right:16px;
  bottom:calc(48px + env(safe-area-inset-bottom));
  padding:14px 16px 14px 18px;
  border:1px solid rgba(216,193,138,.38);
  border-left:3px solid #9a63c5;
  border-radius:16px;
  background:linear-gradient(110deg,rgba(8,8,10,.88),rgba(30,18,43,.72));
  box-shadow:0 10px 34px rgba(0,0,0,.34),0 0 22px rgba(130,72,180,.10),inset 0 1px rgba(255,255,255,.07);
  font-size:15px;font-weight:650;
}
@media(min-width:600px){
 .mou-story-head{top:30px}
 .mou-story-caption{bottom:48px}
}



.mou-story-social-actions{position:absolute;z-index:8;right:13px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:13px}
.mou-story-social-actions button{width:48px;min-height:54px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:1px solid rgba(216,193,138,.48);border-radius:17px;background:linear-gradient(145deg,rgba(9,9,11,.76),rgba(35,23,45,.58));color:#e4d19b;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:0 8px 24px rgba(0,0,0,.32),0 0 18px rgba(137,83,174,.13);font-size:22px;line-height:1}
.mou-story-social-actions button small{font-size:10px;color:#c6b98f}
.mou-story-social-actions button.active{border-color:#e5cc8d;background:linear-gradient(145deg,rgba(111,78,34,.66),rgba(68,38,83,.70));box-shadow:0 0 18px rgba(216,193,138,.35),0 0 24px rgba(145,91,180,.18)}
.mou-story-reply{position:absolute;z-index:9;left:13px;right:70px;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:8px;padding:7px;border:1px solid rgba(216,193,138,.42);border-radius:19px;background:linear-gradient(110deg,rgba(8,8,10,.82),rgba(32,20,42,.72));box-shadow:0 10px 30px rgba(0,0,0,.38),inset 0 1px rgba(255,255,255,.06);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
.mou-story-reply input{flex:1;min-width:0;border:0!important;outline:0!important;background:transparent!important;color:#f4ead2!important;padding:10px 9px!important;margin:0!important;font-size:13px!important}
.mou-story-reply input::placeholder{color:#b7ad9a}
.mou-story-reply button{flex:0 0 40px;width:40px;height:40px;border:1px solid rgba(216,193,138,.55);border-radius:13px;background:linear-gradient(145deg,#d9c48b,#967849);color:#090909;font-size:18px;font-weight:800}
.mou-story-reply-status{position:absolute;z-index:10;left:18px;right:76px;bottom:calc(66px + env(safe-area-inset-bottom));color:#e3d19d;font-size:11px;text-shadow:0 2px 8px #000}
.mou-story-caption{bottom:calc(74px + env(safe-area-inset-bottom))!important;right:76px!important}
@media(max-height:560px) and (orientation:landscape){.mou-story-social-actions{right:9px;gap:7px}.mou-story-social-actions button{width:42px;min-height:44px}.mou-story-reply{bottom:8px}.mou-story-caption{bottom:64px!important}}
`;document.head.appendChild(s);}
function viewer(group,index){
 let current=Math.max(0,Math.min(index,group.length-1));
 const layer=document.createElement('div');layer.className='mou-story-viewer';
 layer.innerHTML='<section class="mou-story-viewer-inner" role="dialog" aria-modal="true" aria-label="Story"><div class="mou-story-progress-list"></div><header class="mou-story-head"><button type="button" class="mou-story-owner" aria-label="Voir le profil du joueur"><span class="mou-story-owner-avatar"></span><span class="mou-story-owner-meta"><b></b><small></small></span></button><button class="mou-story-close" aria-label="Fermer">×</button></header><div class="mou-story-media"></div><div class="mou-story-caption"></div><div class="mou-story-social-actions"><button type="button" data-story-reaction="Cœur" aria-label="Envoyer un cœur">♥<small>0</small></button><button type="button" data-story-reaction="Étoile" aria-label="Envoyer une étoile">★<small>0</small></button></div><form class="mou-story-reply"><input maxlength="1000" autocomplete="off" placeholder="Envoyer un message privé…" aria-label="Message privé"><button type="submit" aria-label="Envoyer">➤</button></form><div class="mou-story-reply-status" aria-live="polite"></div><button class="mou-story-hit mou-story-prev" aria-label="Story précédente"></button><button class="mou-story-hit mou-story-next" aria-label="Story suivante"></button></section>';
 const inner=layer.querySelector('.mou-story-viewer-inner'),progress=layer.querySelector('.mou-story-progress-list'),media=layer.querySelector('.mou-story-media'),owner=layer.querySelector('.mou-story-owner'),caption=layer.querySelector('.mou-story-caption');
 function render(){
  const s=group[current],isVideo=/\\.(mp4|webm|mov|m4v)(\\?|$)/i.test(s.media)||String(s.media).includes('/video/upload/');
  progress.innerHTML=group.map((x,i)=>'<span class="mou-story-progress"><i style="width:'+(i<current?'100%':'0%')+'"></i></span>').join('');
  owner.querySelector('.mou-story-owner-avatar').innerHTML=s.photo?'<img src="'+esc(s.photo)+'" alt="">':esc((s.pseudo||'?').slice(0,1).toUpperCase());
  owner.querySelector('b').textContent=s.pseudo||'Joueur';
  owner.querySelector('small').textContent='Propriétaire de la story · '+new Date(s.created).toLocaleString('fr-FR');
  owner.dataset.pseudo=s.pseudo||'';
  media.innerHTML=isVideo?'<video src="'+esc(s.media)+'" controls autoplay playsinline></video>':'<img src="'+esc(s.media)+'" alt="Story de '+esc(s.pseudo)+'">';
  caption.textContent=s.caption||'';
  caption.hidden=!s.caption;
  layer.querySelectorAll('[data-story-reaction]').forEach(btn=>{const type=btn.dataset.storyReaction;btn.classList.toggle('active',s.myReaction===type);btn.querySelector('small').textContent=String(s.reactionCounts?.[type]||0);});
  const replyInput=layer.querySelector('.mou-story-reply input'),replyButton=layer.querySelector('.mou-story-reply button');
  replyInput.disabled=!!s.mine;replyButton.disabled=!!s.mine;replyInput.placeholder=s.mine?'Ta propre story':'Envoyer un message privé…';
  layer.querySelector('.mou-story-reply-status').textContent='';
  layer.querySelector('.mou-story-prev').disabled=current===0;
  layer.querySelector('.mou-story-next').disabled=current===group.length-1;
 }
 const close=()=>{layer.querySelector('video')?.pause();layer.remove();};
 const move=delta=>{const next=current+delta;if(next<0||next>=group.length)return;current=next;render();};
 layer.querySelector('.mou-story-close').onclick=close;
 layer.querySelector('.mou-story-prev').onclick=()=>move(-1);
 layer.querySelector('.mou-story-next').onclick=()=>move(1);
 layer.querySelectorAll('[data-story-reaction]').forEach(btn=>btn.onclick=async()=>{
  const s=group[current],type=btn.dataset.storyReaction;btn.disabled=true;
  try{const result=await api('stories','POST',{action:'react',storyId:s.id,type});const before=s.myReaction||'';if(before&&s.reactionCounts) s.reactionCounts[before]=Math.max(0,(s.reactionCounts[before]||0)-1);if(result.reaction){s.reactionCounts=s.reactionCounts||{};s.reactionCounts[result.reaction]=(s.reactionCounts[result.reaction]||0)+1;}s.myReaction=result.reaction||'';render();}
  catch(err){layer.querySelector('.mou-story-reply-status').textContent=err.message;}finally{btn.disabled=false;}
 });
 layer.querySelector('.mou-story-reply').onsubmit=async e=>{
  e.preventDefault();const s=group[current],input=e.currentTarget.querySelector('input'),status=layer.querySelector('.mou-story-reply-status'),button=e.currentTarget.querySelector('button'),content=input.value.trim();
  if(!content)return;if(s.mine){status.textContent='Tu ne peux pas envoyer un message à toi-même.';return;}
  button.disabled=true;status.textContent='Envoi du message…';
  try{await api('messages','POST',{action:'send',targetId:s.authorId,content});input.value='';status.textContent='Message privé envoyé';}
  catch(err){status.textContent=err.message;}finally{button.disabled=false;}
 };
 owner.onclick=()=>{const name=owner.dataset.pseudo;close();if(name&&window.MOU_OPEN_PUBLIC_PLAYER)window.MOU_OPEN_PUBLIC_PLAYER(name);};
 layer.addEventListener('click',e=>{if(e.target===layer)close();});
 document.addEventListener('keydown',function onKey(e){if(!layer.isConnected){document.removeEventListener('keydown',onKey);return;}if(e.key==='Escape'){close();document.removeEventListener('keydown',onKey);}if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);});
 render();document.body.appendChild(layer);
}
function storyThumb(s){const url=String(s.media||'');if(!url)return String(s.photo||'');if(/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)||url.includes('/video/upload/'))return url.replace('/video/upload/','/video/upload/so_0/').replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i,'.jpg');return url;}
async function loadStories(){
 const rail=document.querySelector('.mou-stories-rail');if(!rail||!token())return;
 try{
  const response=await api('stories');stories=Array.isArray(response.stories)?response.stories:[];
  const groups=new Map();
  stories.forEach(s=>{if(!s.authorId)return;if(!groups.has(s.authorId))groups.set(s.authorId,[]);groups.get(s.authorId).push(s);});
  let html='<button class="mou-story-tile" id="mouAddStory" type="button"><span class="mou-story-ring"><span class="mou-story-plus">＋</span></span><b>Ma story</b></button>';
  for(const group of groups.values()){
   group.sort((x,y)=>Date.parse(x.created||0)-Date.parse(y.created||0));
   const s=group[group.length-1],expires=Date.parse(s.expires||'')||Date.parse(s.created||'')+86400000;
   const remaining=Math.max(0,Math.min(1,(expires-Date.now())/86400000)),thumb=storyThumb(s);
   const video=/video_upload|\\.(mp4|mov|webm|m4v)(\\?|$)/i.test(String(s.media||''));
   html+='<button class="mou-story-tile" type="button" data-story-author="'+esc(s.authorId)+'"><span class="mou-story-ring mou-story-timer" style="--story-progress:'+remaining+'"><span class="mou-story-avatar">'+(thumb?'<img src="'+esc(thumb)+'" alt="Aperçu de la story" loading="lazy">':'✦')+(video?'<span class="mou-story-video-mark">▶</span>':'')+'</span></span><b>'+esc(s.pseudo||'Joueur')+'</b></button>';
  }
  rail.innerHTML=html;
  rail.querySelector('#mouAddStory').onclick=openComposer;
  rail.querySelectorAll('[data-story-author]').forEach(btn=>btn.onclick=()=>viewer(groups.get(btn.dataset.storyAuthor)||[],0));
  rail.dataset.loaded='true';
 }catch(e){
  console.error('MOU stories load failed:',e);
  rail.innerHTML='<button class="mou-story-tile" id="mouAddStory" type="button"><span class="mou-story-ring"><span class="mou-story-plus">＋</span></span><b>Ma story</b></button><p class="mou-story-error">Stories indisponibles pour le moment. <button type="button" id="mouStoryRetry">Réessayer</button></p>';
  rail.querySelector('#mouAddStory').onclick=openComposer;
  rail.querySelector('#mouStoryRetry').onclick=loadStories;
 }
}
function openComposer(){document.querySelector('.mou-story-create')?.classList.add('open');}
function mountComposer(){if(document.querySelector('.mou-story-create'))return;const layer=document.createElement('div');layer.className='mou-story-create';layer.innerHTML='<form class="mou-story-create-card"><div class="mou-story-create-top"><span class="mou-story-kicker">MALAWY SOCIAL · 24H</span><button type="button" class="mou-story-x" data-cancel aria-label="Fermer">×</button></div><h3>Créer une <em>story</em></h3><p class="mou-story-subtitle">Partage un instant avec tes amis.</p><div class="mou-story-upload-wrap"><button type="button" class="mou-story-upload" id="mouStoryPick" aria-label="Ajouter une photo ou vidéo"><span class="mou-story-upload-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg><i>＋</i></span><span>Ajouter un média<small>Photo ou vidéo</small></span></button><input name="media" type="file" accept="image/*,video/*" required hidden></div><div class="mou-story-preview" hidden><img alt="Aperçu de la story"><video muted playsinline controls hidden></video><button type="button" class="mou-story-remove" aria-label="Retirer le média">×</button></div><label class="mou-story-field">Légende <input name="caption" maxlength="180" placeholder="Un instant à partager…"></label><div class="mou-story-field"><span>Audience</span><div class="mou-story-audience"><button type="button" class="mou-story-audience-trigger" aria-expanded="false"><span class="mou-audience-current">Seulement mes amis</span><span class="mou-audience-chevron">⌄</span></button><div class="mou-story-audience-menu" hidden><button type="button" data-audience="Amis" class="selected">Seulement mes amis</button><button type="button" data-audience="Tous">Toute la communauté</button></div><input type="hidden" name="audience" value="Amis"></div></div><p class="mou-story-msg">⏳ Ta story disparaît après 24 heures.</p><div class="mou-story-create-actions"><button type="button" class="mou-story-cancel" data-cancel>Annuler</button><button type="submit" class="mou-story-publish">Publier la story ↗</button></div></form>';layer.addEventListener('click',e=>{if(e.target===layer||e.target.closest('[data-cancel]'))layer.classList.remove('open');});const picker=layer.querySelector('input[name=media]');layer.querySelector('#mouStoryPick').onclick=()=>picker.click();const audience=layer.querySelector('.mou-story-audience'),audienceTrigger=audience.querySelector('.mou-story-audience-trigger');audienceTrigger.onclick=()=>{const menu=audience.querySelector('.mou-story-audience-menu');menu.hidden=!menu.hidden;audienceTrigger.setAttribute('aria-expanded',String(!menu.hidden));};audience.querySelectorAll('[data-audience]').forEach(option=>option.onclick=()=>{audience.querySelector('input[name=audience]').value=option.dataset.audience;audience.querySelector('.mou-audience-current').textContent=option.textContent;audience.querySelectorAll('[data-audience]').forEach(x=>x.classList.toggle('selected',x===option));audience.querySelector('.mou-story-audience-menu').hidden=true;audienceTrigger.setAttribute('aria-expanded','false');});const preview=layer.querySelector('.mou-story-preview'),previewImg=preview.querySelector('img'),previewVideo=preview.querySelector('video');let previewUrl='';picker.addEventListener('change',()=>{const file=picker.files[0];if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';preview.hidden=!file;if(!file)return;previewUrl=URL.createObjectURL(file);const isVideo=file.type.startsWith('video/');previewImg.hidden=isVideo;previewVideo.hidden=!isVideo;if(isVideo){previewVideo.src=previewUrl;previewVideo.load();}else previewImg.src=previewUrl;});layer.querySelector('.mou-story-remove').onclick=()=>{picker.value='';preview.hidden=true;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';};layer.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const form=e.target,btn=form.querySelector('[type=submit]'),msg=form.querySelector('.mou-story-msg'),file=form.elements.media.files[0];if(!file)return;btn.disabled=true;try{msg.textContent='Envoi du média…';const media=await cloudinary(file);const published=await api('stories','POST',{action:'publish',media,caption:form.elements.caption.value,audience:form.elements.audience.value});if(!published.success)throw Error(published.error||'La story n’a pas été enregistrée.');msg.textContent='Story publiée !';form.reset();layer.classList.remove('open');await loadStories();}catch(err){msg.textContent=err.message;}finally{btn.disabled=false;}});document.body.appendChild(layer);}
async function pulse(){if(!token())return;try{const d=await api('presence','POST',{action:'heartbeat'});online=d.online||[];renderOnline();}catch(e){console.warn('MOU presence',e);}}
function renderOnline(){const host=document.getElementById('mouFriendOnlineList');if(!host)return;host.innerHTML=online.map(p=>'<div class="mou-friend-online">'+esc(p.pseudo)+' est en ligne</div>').join('')||'<p class="mou-friend-empty">Aucun ami en ligne actuellement.</p>';}
function mountPresence(){const profile=document.getElementById('mouFriends');if(!profile||document.getElementById('mouPresenceSettings'))return;const section=document.createElement('div');section.id='mouPresenceSettings';section.className='mou-presence-settings';section.innerHTML='<b>PRÉSENCE EN LIGNE</b><p>Seuls tes amis acceptés peuvent voir quand tu es en ligne.</p><label><input id="mouHidePresence" type="checkbox"> Masquer ma présence, même à mes amis</label><div id="mouFriendOnlineList"></div>';profile.appendChild(section);section.querySelector('input').addEventListener('change',async e=>{try{await api('presence','POST',{action:'privacy',hidden:e.target.checked});await pulse();}catch(err){e.target.checked=!e.target.checked;alert(err.message);}});api('presence').then(d=>{section.querySelector('input').checked=!!d.hidden;online=d.online||[];renderOnline();}).catch(()=>{});}
function start(){storyStyles();if(!token()){const rail=document.querySelector('.mou-stories-rail');if(rail)rail.innerHTML='<button class="mou-story-tile" id="mouAddStory"><span class="mou-story-ring"><span class="mou-story-plus">＋</span></span><b>Ma story</b></button><p class="mou-story-login-hint">Connecte-toi pour voir les stories de tes amis</p>';return;}mountComposer();loadStories();mountPresence();pulse();if(heartbeat)clearInterval(heartbeat);heartbeat=setInterval(pulse,45000);}
document.addEventListener('DOMContentLoaded',start);window.addEventListener('mou:player-auth',start);
let communityWasActive=false;new MutationObserver(()=>{const active=!!document.querySelector('#community.active');if(active&&!communityWasActive&&token())loadStories();communityWasActive=active;}).observe(document.querySelector('main'),{subtree:true,attributes:true,attributeFilter:['class']});new MutationObserver(()=>{if(token()){mountPresence();if(!document.querySelector('.mou-story-create'))mountComposer();}}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)pulse();});
})();