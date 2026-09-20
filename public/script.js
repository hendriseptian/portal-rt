(() => {
"use strict";
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={settings:{},activities:[]};
const api=async path=>{const r=await fetch(`/api/public${path}`,{headers:{Accept:"application/json"}});const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.detail||d?.message||`Request gagal (${r.status})`);return d||{data:[]}};
const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
const formatDate=v=>{if(!v)return"";const d=new Date(`${v}T00:00:00`);return Number.isNaN(d.getTime())?v:d.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})};
const monthShort=v=>{if(!v)return"";const d=new Date(`${v}T00:00:00`);return Number.isNaN(d.getTime())?"":d.toLocaleDateString("id-ID",{month:"short"})};
const settingMap=rows=>{const o={};(rows||[]).forEach(r=>o[r.key]=r.value??"");return o};
const toast=m=>{const e=$("#toast");if(!e)return;e.textContent=m;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2600)};
function applySettings(m){
 state.settings=m;const site=m.site_name||"Portal RT",slogan=m.slogan||"Guyub, Rukun, Bersama",desc=m.site_description||"Portal Informasi Warga",rt=m.rt_name||"RT 00",rw=m.rw_name||"RW 00";
 const region=[m.desa_name,m.kecamatan_name,m.kabupaten_name,m.provinsi_name].filter(Boolean).join(", "),area=`${rt} / ${rw}`;
 document.title=site;$("#brandName").textContent=site.toUpperCase();$("#brandArea").textContent=`${rt} • ${rw}`;$("#topArea").textContent=area;$("#topRegion").textContent=region||"Informasi wilayah";$("#heroTitle").textContent=site;$("#heroRegion").textContent=region?`${area} • ${region}`:area;$("#heroSlogan").textContent=slogan;$("#heroDescription").textContent=desc;$("#footerName").textContent=site.toUpperCase();$("#footerArea").textContent=`${rt} • ${rw}`;$("#footerDescription").textContent=desc;$("#footerCopyright").textContent=`© ${new Date().getFullYear()} ${site}`;
 if(m.logo_file_id&&/^https?:\/\//i.test(m.logo_file_id))$("#brandLogo").innerHTML=`<img src="${esc(m.logo_file_id)}" alt="Logo" loading="lazy">`;
}
function renderAnnouncements(rows){
 const b=$("#announcementList");if(!rows.length){b.innerHTML=`<div class="empty">Belum ada pengumuman yang dipublikasikan.</div>`;return}
 b.innerHTML=rows.slice(0,6).map(x=>{const p=String(x.prioritas||"normal").toLowerCase(),c=p==="darurat"?"urgent":p==="penting"?"important":"",badge=p==="darurat"?"DARURAT":p==="penting"?"PENTING":"INFORMASI";return `<article class="announcement-card ${c}" data-search="${esc(`${x.judul} ${x.isi}`)}"><div><span class="badge ${p==="darurat"?"danger":p==="penting"?"warning":""}">${badge}</span><h3>${esc(x.judul)}</h3><p>${esc(x.isi)}</p></div><div class="meta">${esc(formatDate(x.tanggal_mulai||String(x.created_at||"").slice(0,10)))}</div></article>`}).join("");
}
function renderAgenda(rows){
 const b=$("#agendaList");if(!rows.length){b.innerHTML=`<div class="empty">Belum ada agenda yang dipublikasikan.</div>`;return}
 b.innerHTML=rows.slice(0,6).map(x=>{const d=x.tanggal?new Date(`${x.tanggal}T00:00:00`):null,day=d&&!Number.isNaN(d.getTime())?d.getDate():"-";return `<article class="agenda-card" data-search="${esc(`${x.judul} ${x.deskripsi||""} ${x.lokasi||""}`)}"><div class="date-box"><div class="date-day">${day}</div><div><div class="date-month">${esc(monthShort(x.tanggal))}</div><div class="meta">${esc(x.waktu_mulai||"")}</div></div></div><h3>${esc(x.judul)}</h3><div class="card-text">${esc(x.deskripsi||"Agenda kegiatan warga.")}</div>${x.lokasi?`<div class="card-location">📍 ${esc(x.lokasi)}</div>`:""}</article>`}).join("");
}
const cover=(id,icon="📷")=>id&&/^https?:\/\//i.test(id)?`<img src="${esc(id)}" alt="" loading="lazy">`:`<div>${icon}</div>`;
function renderActivities(rows,cat="ALL"){
 state.activities=rows||[];const f=cat==="ALL"?state.activities:state.activities.filter(x=>String(x.kategori||"").toUpperCase()===cat),b=$("#activityList");
 if(!f.length){b.innerHTML=`<div class="empty">Belum ada kegiatan untuk kategori ini.</div>`;return}
 b.innerHTML=f.slice(0,9).map(x=>`<article class="activity-card" data-search="${esc(`${x.judul} ${x.deskripsi||""} ${x.kategori||""}`)}"><div class="card-cover">${cover(x.cover_file_id,"★")}</div><div class="card-body"><span class="badge">${esc(x.kategori||"LAINNYA")}</span><h3>${esc(x.judul)}</h3><div class="card-text">${esc(x.deskripsi||"Kegiatan warga.")}</div><div class="card-location">${esc(formatDate(x.tanggal))}${x.lokasi?` • ${esc(x.lokasi)}`:""}</div></div></article>`).join("");
}
function renderGallery(rows){
 const b=$("#galleryList");if(!rows.length){b.innerHTML=`<div class="empty">Belum ada album galeri yang dipublikasikan.</div>`;return}
 b.innerHTML=rows.slice(0,9).map(x=>`<article class="gallery-card" data-search="${esc(`${x.nama_album} ${x.deskripsi||""}`)}"><div class="card-cover">${cover(x.cover_file_id,"▧")}</div><div class="card-body"><span class="badge">${esc(x.kategori||"LAINNYA")}</span><h3>${esc(x.nama_album)}</h3><div class="card-text">${esc(x.deskripsi||"Dokumentasi kegiatan warga.")}</div><div class="card-location">${esc(formatDate(x.tanggal))}</div></div></article>`).join("");
}
function renderVideos(rows){
 const b=$("#videoList");if(!rows.length){b.innerHTML=`<div class="empty">Belum ada video yang dipublikasikan.</div>`;return}
 b.innerHTML=rows.slice(0,6).map(x=>{const t=x.thumbnail_url||(x.youtube_id?`https://img.youtube.com/vi/${encodeURIComponent(x.youtube_id)}/hqdefault.jpg`:""),h=x.youtube_id?`https://www.youtube.com/watch?v=${encodeURIComponent(x.youtube_id)}`:"#";return `<article class="video-card" data-search="${esc(`${x.judul} ${x.deskripsi||""}`)}"><a href="${h}" target="_blank" rel="noopener noreferrer"><div class="video-thumb">${t?`<img src="${esc(t)}" alt="${esc(x.judul)}" loading="lazy">`:""}<div class="video-play">▶</div></div></a><div class="card-body"><span class="badge">${esc(x.kategori||"LAINNYA")}</span><h3>${esc(x.judul)}</h3><div class="card-text">${esc(x.deskripsi||"")}</div></div></article>`}).join("");
}
function renderOfficials(rows){
 const b=$("#officialList");if(!rows.length){b.innerHTML=`<div class="empty">Data pengurus belum dipublikasikan.</div>`;return}
 b.innerHTML=rows.slice(0,12).map(x=>{const initials=(x.nama||"RT").trim().split(/\s+/).slice(0,2).map(v=>v[0]).join("").toUpperCase();const photo=x.foto_file_id&&/^https?:\/\//i.test(x.foto_file_id)?`<img src="${esc(x.foto_file_id)}" alt="${esc(x.nama)}" loading="lazy">`:esc(initials);return `<article class="official-card"><div class="avatar">${photo}</div><h3>${esc(x.nama)}</h3><div class="role">${esc(x.jabatan)}</div>${x.deskripsi?`<div class="card-text official-desc">${esc(x.deskripsi)}</div>`:""}</article>`}).join("");
}
function renderEmergency(rows){
 const b=$("#emergencyList");if(!rows.length){b.innerHTML=`<div class="empty dark">Belum ada informasi darurat aktif.</div>`;return}
 b.innerHTML=rows.map(x=>`<article class="emergency-card" data-search="${esc(`${x.judul} ${x.deskripsi||""} ${x.kontak||""}`)}"><h3>⚠ ${esc(x.judul)}</h3><div class="card-text">${esc(x.deskripsi||"")}</div>${x.kontak||x.nomor?`<div class="contact">${esc(x.kontak||"")}${x.nomor?` • ${esc(x.nomor)}`:""}</div>`:""}${x.url?`<div style="margin-top:10px"><a class="btn btn-light" href="${esc(x.url)}" target="_blank" rel="noopener">Buka Informasi</a></div>`:""}</article>`).join("");
}
function setup(){
 $("#todayText").textContent=new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(new Date());
 $$(".filter").forEach(b=>b.addEventListener("click",()=>{$$(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderActivities(state.activities,b.dataset.category||"ALL")}));
 $("#menuToggle")?.addEventListener("click",()=>$("#mainNav").classList.toggle("open"));
 $$("#mainNav a").forEach(a=>a.addEventListener("click",()=>$("#mainNav").classList.remove("open")));
 const links=$$("#mainNav a");
 const views=["pengumuman","agenda","kegiatan","galeri","video","pengurus","darurat"];
 const setView=()=>{
   const requested=(location.hash||"#beranda").slice(1);
   const target=views.includes(requested)?requested:"beranda";
   document.body.classList.toggle("home-view",target==="beranda");
   document.body.classList.toggle("content-view",target!=="beranda");
   $$(".page-view").forEach(s=>s.classList.toggle("active-view",s.id===target));
   links.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+target));
   window.scrollTo({top:0,behavior:"instant"});
 };
 window.addEventListener("hashchange",setView);
 setView();
 const top=$("#backTop");window.addEventListener("scroll",()=>top.classList.toggle("show",scrollY>500));top.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
 const search=()=>{const q=$("#searchInput").value.trim().toLowerCase();if(!q)return toast("Ketik kata yang ingin dicari.");const f=$$("[data-search]").find(e=>(e.dataset.search||"").toLowerCase().includes(q));if(f){f.scrollIntoView({behavior:"smooth",block:"center"});f.classList.add("search-hit");setTimeout(()=>f.classList.remove("search-hit"),1500);toast("Informasi ditemukan.")}else toast("Informasi tidak ditemukan.")};$("#searchBtn").onclick=search;$("#searchInput").onkeydown=e=>{if(e.key==="Enter")search()};
}
async function load(){
 const t=await Promise.allSettled([api("/settings"),api("/pengumuman"),api("/agenda"),api("/kegiatan"),api("/galeri"),api("/video"),api("/pengurus"),api("/darurat")]);
 const [s,a,g,k,ga,v,p,d]=t;
 if(s.status==="fulfilled")applySettings(settingMap(s.value.data));
 if(a.status==="fulfilled")renderAnnouncements(a.value.data||[]);else $("#announcementList").innerHTML=`<div class="empty">Pengumuman belum dapat dimuat.</div>`;
 if(g.status==="fulfilled")renderAgenda(g.value.data||[]);else $("#agendaList").innerHTML=`<div class="empty">Agenda belum dapat dimuat.</div>`;
 if(k.status==="fulfilled")renderActivities(k.value.data||[]);else $("#activityList").innerHTML=`<div class="empty">Kegiatan belum dapat dimuat.</div>`;
 if(ga.status==="fulfilled")renderGallery(ga.value.data||[]);else $("#galleryList").innerHTML=`<div class="empty">Galeri belum dapat dimuat.</div>`;
 if(v.status==="fulfilled")renderVideos(v.value.data||[]);else $("#videoList").innerHTML=`<div class="empty">Video belum dapat dimuat.</div>`;
 if(p.status==="fulfilled")renderOfficials(p.value.data||[]);else $("#officialList").innerHTML=`<div class="empty">Pengurus belum dapat dimuat.</div>`;
 if(d.status==="fulfilled")renderEmergency(d.value.data||[]);else $("#emergencyList").innerHTML=`<div class="empty dark">Informasi darurat belum dapat dimuat.</div>`;
}
setup();load();
})();
