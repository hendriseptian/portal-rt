"use strict";

const API_BASE = "/api";
const TOKEN_KEY = "portal_rt_token";
const USER_KEY = "portal_rt_user";

const loginPage = document.getElementById("loginPage");
const adminApp = document.getElementById("adminApp");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const loginButtonText = document.getElementById("loginButtonText");
const loginSpinner = document.getElementById("loginSpinner");
const loginError = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");
const logoutButton = document.getElementById("logoutButton");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const sidebar = document.getElementById("sidebar");
const pageTitle = document.getElementById("pageTitle");
const pageDescription = document.getElementById("pageDescription");
const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const welcomeTitle = document.getElementById("welcomeTitle");
const statPengurus = document.getElementById("statPengurus");
const statPengumuman = document.getElementById("statPengumuman");
const statAgenda = document.getElementById("statAgenda");
const statKegiatan = document.getElementById("statKegiatan");
const siteInfo = document.getElementById("siteInfo");
const toast = document.getElementById("toast");

const pageConfig = {
    dashboard:{title:"Dashboard",description:"Ringkasan Portal RT"},
    pengurus:{title:"Pengurus",description:"Kelola struktur pengurus RT"},
    pengumuman:{title:"Pengumuman",description:"Kelola pengumuman warga"},
    agenda:{title:"Agenda",description:"Kelola agenda kegiatan"},
    kegiatan:{title:"Kegiatan",description:"Kelola kegiatan warga"},
    galeri:{title:"Galeri",description:"Kelola dokumentasi foto"},
    video:{title:"Video",description:"Kelola dokumentasi video"},
    darurat:{title:"Informasi Darurat",description:"Kelola informasi penting dan darurat"},
    pengaturan:{title:"Pengaturan",description:"Kelola konfigurasi Portal RT"}
};

function getToken(){return localStorage.getItem(TOKEN_KEY);}
function getStoredUser(){try{return JSON.parse(localStorage.getItem(USER_KEY)||"null");}catch(e){return null;}}
function saveSession(token,user){localStorage.setItem(TOKEN_KEY,token);localStorage.setItem(USER_KEY,JSON.stringify(user));}
function clearSession(){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);}

async function apiRequest(endpoint,options={}){
    const headers={...(options.headers||{})};
    if(options.body&&!headers["Content-Type"])headers["Content-Type"]="application/json";
    const token=getToken();
    if(token)headers.Authorization=`Bearer ${token}`;
    const response=await fetch(`${API_BASE}${endpoint}`,{...options,headers});
    let data=null;
    try{data=await response.json();}catch(e){}
    if(response.status===401){clearSession();showLogin();throw new Error("Sesi login sudah berakhir.");}
    if(!response.ok)throw new Error(data?.detail||data?.message||`Request gagal (${response.status})`);
    return data;
}

function escapeHtml(v){
    return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function formatTanggal(v){if(!v)return "-";try{return new Date(v).toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});}catch(e){return v;}}
function formatJam(v){return v?String(v).slice(0,5):"-";}
function slugify(v){return String(v||"").toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/[\s-]+/g,"-").replace(/^-+|-+$/g,"");}
function showToast(message){
    if(!toast){alert(message);return;}
    toast.textContent=message;
    toast.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer=setTimeout(()=>toast.classList.remove("show"),2800);
}
function confirmDelete(name){return window.confirm(`Hapus "${name}"?\nData yang sudah dihapus tidak dapat dikembalikan.`);}

function showLogin(){
    loginPage?.classList.remove("hidden");
    adminApp?.classList.add("hidden");
    if(usernameInput)usernameInput.value="";
    if(passwordInput)passwordInput.value="";
    hideLoginError();
}
function showAdmin(){
    loginPage?.classList.add("hidden");
    adminApp?.classList.remove("hidden");
    updateUserInterface(getStoredUser());
    loadDashboard();
}
function showLoginError(msg){if(loginError){loginError.textContent=msg;loginError.classList.remove("hidden");}}
function hideLoginError(){if(loginError){loginError.textContent="";loginError.classList.add("hidden");}}
function setLoginLoading(loading){
    if(loginButton)loginButton.disabled=loading;
    if(loginSpinner)loginSpinner.classList.toggle("hidden",!loading);
    if(loginButtonText)loginButtonText.textContent=loading?"Memproses...":"Login";
}
function formatRole(role){
    return ({super_admin:"Super Admin",ketua_rt:"Ketua RT",operator:"Operator",admin_pkk:"Admin PKK",admin_remaja:"Admin Remaja"})[role]||"Administrator";
}
function updateUserInterface(user){
    if(!user)return;
    const name=user.name||user.username||"Administrator";
    if(userName)userName.textContent=name;
    if(userRole)userRole.textContent=formatRole(user.role);
    if(welcomeTitle)welcomeTitle.textContent=`Selamat datang, ${name}`;
    const avatar=document.querySelector(".user-avatar");
    if(avatar)avatar.textContent=name.trim().charAt(0).toUpperCase()||"A";
}

async function handleLogin(event){
    event.preventDefault();
    const username=usernameInput?.value.trim();
    const password=passwordInput?.value||"";
    hideLoginError();
    if(!username||!password){showLoginError("Username dan password wajib diisi.");return;}
    setLoginLoading(true);
    try{
        const result=await apiRequest("/auth/login",{method:"POST",body:JSON.stringify({username,password})});
        if(!result.token)throw new Error("Login gagal.");
        saveSession(result.token,result.user);
        showAdmin();
        showToast("Login berhasil.");
    }catch(e){showLoginError(e.message||"Username atau password salah.");}
    finally{setLoginLoading(false);}
}
async function verifySession(){
    if(!getToken()){showLogin();return false;}
    try{
        const r=await apiRequest("/auth/me");
        localStorage.setItem(USER_KEY,JSON.stringify({id:r.user.sub,username:r.user.username,name:r.user.name,role:r.user.role}));
        showAdmin();return true;
    }catch(e){clearSession();showLogin();return false;}
}

async function loadDashboard(){
    await Promise.all([loadStatistics(),loadSettings()]);
}
async function loadStatistics(){
    try{
        const [a,b,c,d]=await Promise.all([apiRequest("/pengurus"),apiRequest("/pengumuman"),apiRequest("/agenda"),apiRequest("/kegiatan")]);
        if(statPengurus)statPengurus.textContent=a.count??0;
        if(statPengumuman)statPengumuman.textContent=b.count??0;
        if(statAgenda)statAgenda.textContent=c.count??0;
        if(statKegiatan)statKegiatan.textContent=d.count??0;
    }catch(e){console.error(e);}
}
async function loadSettings(){
    if(!siteInfo)return;
    try{
        const r=await apiRequest("/settings"),map={};
        (r.data||[]).forEach(x=>map[x.key]=x.value??"");
        const region=[map.desa_name,map.kecamatan_name,map.kabupaten_name,map.provinsi_name].filter(Boolean).join(", ")||"Belum diatur";
        siteInfo.innerHTML=[
            ["Nama Website",map.site_name||"Belum diatur"],
            ["Deskripsi",map.site_description||"Belum diatur"],
            ["RT / RW",`${map.rt_name||"-"} / ${map.rw_name||"-"}`],
            ["Wilayah",region],["Slogan",map.slogan||"Belum diatur"]
        ].map(x=>`<div class="site-info-row"><span class="site-info-label">${escapeHtml(x[0])}</span><span class="site-info-value">${escapeHtml(x[1])}</span></div>`).join("");
    }catch(e){siteInfo.innerHTML=`<div class="loading">Informasi website belum dapat dimuat.</div>`;}
}

function setPage(name){
    Object.keys(pageConfig).forEach(k=>{
        const el=document.getElementById(`page-${k}`);
        if(el){
            el.classList.remove("hidden");
            el.classList.toggle("active",k===name);
        }
    });
    const cfg=pageConfig[name]||pageConfig.dashboard;
    if(pageTitle)pageTitle.textContent=cfg.title;
    if(pageDescription)pageDescription.textContent=cfg.description;
    document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===name));
    if(sidebar)sidebar.classList.remove("open");
    const fn={dashboard:loadDashboard,pengurus:renderPengurus,pengumuman:renderPengumuman,agenda:renderAgenda,kegiatan:renderKegiatan,galeri:renderGaleri,video:renderVideo,darurat:renderDarurat,pengaturan:renderPengaturan}[name];
    if(fn)fn();
}

function initNavigation(){
    document.querySelectorAll("[data-page]").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();setPage(el.dataset.page);}));
    document.querySelectorAll("[data-target]").forEach(el=>el.addEventListener("click",e=>{e.preventDefault();setPage(el.dataset.target);}));
    if(logoutButton)logoutButton.addEventListener("click",()=>{clearSession();showLogin();});
    if(mobileMenuButton)mobileMenuButton.addEventListener("click",()=>sidebar?.classList.toggle("open"));
    if(togglePassword)togglePassword.addEventListener("click",()=>{if(passwordInput)passwordInput.type=passwordInput.type==="password"?"text":"password";});
}

function actionButtons(type,id,name){
    return `<div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" type="button" onclick="edit${type}('${id}')">Edit</button>
        <button class="btn" type="button" style="color:#dc2626" onclick="hapus${type}('${id}',${JSON.stringify(name||"data")})">Hapus</button>
    </div>`;
}
function pageHeader(title,desc,buttonText,handler){
    return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:20px;padding:24px;border-bottom:1px solid #e5e7eb">
        <div><h3 style="margin:0 0 5px;font-size:20px">${title}</h3><p style="margin:0;color:#64748b">${desc}</p></div>
        <button class="btn btn-primary" type="button" onclick="${handler}">${buttonText}</button>
    </div><div id="moduleList" style="padding:24px"><div class="loading">Memuat data...</div></div></div>`;
}
function input(label,id,value="",type="text",required=false){
    return `<label style="display:block;margin-bottom:14px"><span style="display:block;margin-bottom:6px;font-weight:600">${label}</span><input id="${id}" type="${type}" value="${escapeHtml(value)}" ${required?"required":""} style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px"></label>`;
}
function textarea(label,id,value=""){
    return `<label style="display:block;margin-bottom:14px"><span style="display:block;margin-bottom:6px;font-weight:600">${label}</span><textarea id="${id}" rows="5" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px">${escapeHtml(value)}</textarea></label>`;
}
function selectField(label,id,value,items){
    return `<label style="display:block;margin-bottom:14px"><span style="display:block;margin-bottom:6px;font-weight:600">${label}</span><select id="${id}" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px">${items.map(x=>`<option value="${escapeHtml(x[0])}" ${x[0]===value?"selected":""}>${escapeHtml(x[1])}</option>`).join("")}</select></label>`;
}
function formWrap(title,body,submit){
    return `<div class="card" style="padding:24px"><h3 style="margin-top:0">${title}</h3><form id="moduleForm">${body}<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px"><button type="button" class="btn" onclick="render${window.__module||""}()">Batal</button><button class="btn btn-primary" type="submit">${submit}</button></div></form></div>`;
}

async function renderPengurus(){
    const t=document.getElementById("page-pengurus");if(!t)return;
    t.innerHTML=pageHeader("Daftar Pengurus","Kelola struktur pengurus RT","+ Tambah Pengurus","showTambahPengurus()");
    try{
        const r=await apiRequest("/pengurus"),d=r.data||[],l=document.getElementById("moduleList");
        if(!d.length){l.innerHTML=`<div style="text-align:center;padding:40px;color:#64748b">Belum ada data pengurus.<br><br><button class="btn btn-primary" onclick="showTambahPengurus()">+ Tambah Pengurus</button></div>`;return;}
        l.innerHTML=`<div style="overflow:auto"><table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:12px">Nama</th><th style="text-align:left;padding:12px">Jabatan</th><th style="text-align:left;padding:12px">Periode</th><th style="text-align:left;padding:12px">Status</th><th style="text-align:left;padding:12px">Aksi</th></tr></thead><tbody>${d.map(x=>`<tr style="border-top:1px solid #eee"><td style="padding:12px">${escapeHtml(x.nama)}</td><td style="padding:12px">${escapeHtml(x.jabatan)}</td><td style="padding:12px">${formatTanggal(x.periode_mulai)} - ${formatTanggal(x.periode_selesai)}</td><td style="padding:12px">${x.is_active?"Aktif":"Tidak Aktif"}</td><td style="padding:12px">${actionButtons("Pengurus",x.id,x.nama)}</td></tr>`).join("")}</tbody></table></div>`;
    }catch(e){document.getElementById("moduleList").innerHTML=`<div style="color:#dc2626">${escapeHtml(e.message)}</div>`;}
}
function pengurusForm(data={}){
    return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">
        ${input("Nama","pNama",data.nama||"", "text",true)}
        ${input("Jabatan","pJabatan",data.jabatan||"", "text",true)}
        ${input("Google Drive File ID Foto","pFoto",data.foto_file_id||"")}
        ${input("Urutan","pUrutan",data.urutan??0,"number")}
        ${input("Periode Mulai","pMulai",data.periode_mulai||"","date")}
        ${input("Periode Selesai","pSelesai",data.periode_selesai||"","date")}
    </div>${textarea("Deskripsi","pDeskripsi",data.deskripsi||"")}
    ${selectField("Status","pAktif",String(data.is_active??true),[["true","Aktif"],["false","Tidak Aktif"]])}`;
}
function showTambahPengurus(){
    const t=document.getElementById("page-pengurus");window.__module="Pengurus";
    t.innerHTML=formWrap("Tambah Pengurus",pengurusForm(),"Simpan Pengurus");
    document.getElementById("moduleForm").onsubmit=async e=>{
        e.preventDefault();await savePengurus(null);
    };
}
async function savePengurus(id){
    const body={nama:pNama.value.trim(),jabatan:pJabatan.value.trim(),foto_file_id:pFoto.value.trim()||null,
        deskripsi:pDeskripsi.value.trim()||null,urutan:Number(pUrutan.value)||0,periode_mulai:pMulai.value||null,
        periode_selesai:pSelesai.value||null,is_active:pAktif.value==="true"};
    await apiRequest(id?`/pengurus/${id}`:"/pengurus",{method:id?"PUT":"POST",body:JSON.stringify(body)});
    showToast(id?"Pengurus berhasil diperbarui":"Pengurus berhasil ditambahkan");renderPengurus();
}
async function editPengurus(id){
    const r=await apiRequest("/pengurus"),x=(r.data||[]).find(a=>a.id===id);if(!x)return;
    const t=document.getElementById("page-pengurus");window.__module="Pengurus";t.innerHTML=formWrap("Edit Pengurus",pengurusForm(x),"Simpan Perubahan");
    document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await savePengurus(id);};
}
async function hapusPengurus(id,nama){if(!confirmDelete(nama))return;await apiRequest(`/pengurus/${id}`,{method:"DELETE"});showToast("Pengurus berhasil dihapus");renderPengurus();}

function renderTable(items,columns,type){
    const l=document.getElementById("moduleList");
    if(!items.length){l.innerHTML=`<div style="text-align:center;padding:40px;color:#64748b">Belum ada data.</div>`;return;}
    l.innerHTML=`<div style="overflow:auto"><table style="width:100%;border-collapse:collapse"><thead><tr>${columns.map(c=>`<th style="text-align:left;padding:12px">${c.label}</th>`).join("")}<th style="text-align:left;padding:12px">Aksi</th></tr></thead><tbody>${items.map(x=>`<tr style="border-top:1px solid #eee">${columns.map(c=>`<td style="padding:12px">${c.render?c.render(x):escapeHtml(x[c.key])}</td>`).join("")}<td style="padding:12px">${actionButtons(type,x.id,x.judul||x.nama_album||x.judul||"data")}</td></tr>`).join("")}</tbody></table></div>`;
}

async function renderPengumuman(){
    const t=document.getElementById("page-pengumuman");if(!t)return;
    t.innerHTML=pageHeader("Daftar Pengumuman","Kelola pengumuman warga","+ Tambah Pengumuman","showTambahPengumuman()");
    try{const r=await apiRequest("/pengumuman");renderTable(r.data||[],[
        {label:"Judul",key:"judul"},{label:"Kategori",key:"kategori"},{label:"Prioritas",key:"prioritas"},
        {label:"Mulai",render:x=>formatTanggal(x.tanggal_mulai)},{label:"Status",key:"status"}],"Pengumuman");
    }catch(e){document.getElementById("moduleList").innerHTML=`<div style="color:#dc2626">${escapeHtml(e.message)}</div>`;}
}
function pengumumanForm(d={}){
    return input("Judul","uJudul",d.judul||"","text",true)+
        input("Slug","uSlug",d.slug||"")+textarea("Isi","uIsi",d.isi||"")+
        `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">
        ${input("Kategori","uKategori",d.kategori||"umum")}
        ${selectField("Prioritas","uPrioritas",d.prioritas||"normal",[["normal","Normal"],["penting","Penting"],["darurat","Darurat"]])}
        ${input("Tanggal Mulai","uMulai",d.tanggal_mulai||"","date")}${input("Tanggal Selesai","uSelesai",d.tanggal_selesai||"","date")}
        ${selectField("Status","uStatus",d.status||"draft",[["draft","Draft"],["published","Published"],["archived","Archived"]])}</div>`;
}
function showTambahPengumuman(){const t=document.getElementById("page-pengumuman");t.innerHTML=formWrap("Tambah Pengumuman",pengumumanForm(),"Simpan Pengumuman");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await savePengumuman();};}
async function savePengumuman(id){
    const body={judul:uJudul.value.trim(),slug:uSlug.value.trim()||slugify(uJudul.value),isi:uIsi.value.trim(),kategori:uKategori.value.trim()||"umum",prioritas:uPrioritas.value,status:uStatus.value,tanggal_mulai:uMulai.value||null,tanggal_selesai:uSelesai.value||null};
    await apiRequest(id?`/pengumuman/${id}`:"/pengumuman",{method:id?"PUT":"POST",body:JSON.stringify(body)});showToast(id?"Pengumuman diperbarui":"Pengumuman ditambahkan");renderPengumuman();
}
async function editPengumuman(id){const r=await apiRequest("/pengumuman"),x=(r.data||[]).find(a=>a.id===id);if(!x)return;document.getElementById("page-pengumuman").innerHTML=formWrap("Edit Pengumuman",pengumumanForm(x),"Simpan Perubahan");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await savePengumuman(id);};}
async function hapusPengumuman(id,nama){if(!confirmDelete(nama))return;await apiRequest(`/pengumuman/${id}`,{method:"DELETE"});showToast("Pengumuman dihapus");renderPengumuman();}

async function renderAgenda(){
    const t=document.getElementById("page-agenda");if(!t)return;
    t.innerHTML=pageHeader("Daftar Agenda","Kelola agenda kegiatan","+ Tambah Agenda","showTambahAgenda()");
    try{const r=await apiRequest("/agenda");renderTable(r.data||[],[
        {label:"Judul",key:"judul"},{label:"Tanggal",render:x=>formatTanggal(x.tanggal)},
        {label:"Waktu",render:x=>`${formatJam(x.waktu_mulai)} - ${formatJam(x.waktu_selesai)}`},
        {label:"Lokasi",key:"lokasi"},{label:"Status",key:"status"}],"Agenda");
    }catch(e){document.getElementById("moduleList").innerHTML=`<div style="color:#dc2626">${escapeHtml(e.message)}</div>`;}
}
function agendaForm(d={}){
    return input("Judul","aJudul",d.judul||"","text",true)+textarea("Deskripsi","aDeskripsi",d.deskripsi||"")+
    `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px">
    ${input("Tanggal","aTanggal",d.tanggal||"","date",true)}${input("Waktu Mulai","aMulai",formatJam(d.waktu_mulai)==="-"?"":formatJam(d.waktu_mulai),"time")}
    ${input("Waktu Selesai","aSelesai",formatJam(d.waktu_selesai)==="-"?"":formatJam(d.waktu_selesai),"time")}${input("Lokasi","aLokasi",d.lokasi||"")}
    ${input("Kategori","aKategori",d.kategori||"RT")}${selectField("Status","aStatus",d.status||"published",[["draft","Draft"],["published","Published"],["cancelled","Dibatalkan"],["completed","Selesai"]])}</div>`;
}
function showTambahAgenda(){document.getElementById("page-agenda").innerHTML=formWrap("Tambah Agenda",agendaForm(),"Simpan Agenda");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await saveAgenda();};}
async function saveAgenda(id){
    const body={judul:aJudul.value.trim(),deskripsi:aDeskripsi.value.trim()||null,tanggal:aTanggal.value,waktu_mulai:aMulai.value||null,waktu_selesai:aSelesai.value||null,lokasi:aLokasi.value.trim()||null,kategori:aKategori.value.trim()||"RT",status:aStatus.value};
    await apiRequest(id?`/agenda/${id}`:"/agenda",{method:id?"PUT":"POST",body:JSON.stringify(body)});showToast(id?"Agenda diperbarui":"Agenda ditambahkan");renderAgenda();
}
async function editAgenda(id){const r=await apiRequest("/agenda"),x=(r.data||[]).find(a=>a.id===id);if(!x)return;document.getElementById("page-agenda").innerHTML=formWrap("Edit Agenda",agendaForm(x),"Simpan Perubahan");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await saveAgenda(id);};}
async function hapusAgenda(id,nama){if(!confirmDelete(nama))return;await apiRequest(`/agenda/${id}`,{method:"DELETE"});showToast("Agenda dihapus");renderAgenda();}

async function renderKegiatan(){
    const t=document.getElementById("page-kegiatan");if(!t)return;
    t.innerHTML=pageHeader("Daftar Kegiatan","PKK, Remaja, 17 Agustus dan lainnya","+ Tambah Kegiatan","showTambahKegiatan()");
    try{const r=await apiRequest("/kegiatan");renderTable(r.data||[],[
        {label:"Judul",key:"judul"},{label:"Kategori",key:"kategori"},{label:"Tanggal",render:x=>formatTanggal(x.tanggal)},
        {label:"Lokasi",key:"lokasi"},{label:"Status",key:"status"}],"Kegiatan");
    }catch(e){document.getElementById("moduleList").innerHTML=`<div style="color:#dc2626">${escapeHtml(e.message)}</div>`;}
}
function kegiatanForm(d={}){
    return input("Judul","kJudul",d.judul||"","text",true)+input("Slug","kSlug",d.slug||"")+selectField("Kategori","kKategori",d.kategori||"LAINNYA",[["PKK","PKK"],["REMAJA","Remaja"],["17_AGUSTUS","17 Agustus"],["LAINNYA","Lainnya"]])+
    textarea("Deskripsi","kDeskripsi",d.deskripsi||"")+`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">${input("Tanggal","kTanggal",d.tanggal||"","date")}${input("Lokasi","kLokasi",d.lokasi||"")}${input("Cover Google Drive File ID","kCover",d.cover_file_id||"")}${selectField("Status","kStatus",d.status||"draft",[["draft","Draft"],["published","Published"],["archived","Archived"]])}</div>`;
}
function showTambahKegiatan(){document.getElementById("page-kegiatan").innerHTML=formWrap("Tambah Kegiatan",kegiatanForm(),"Simpan Kegiatan");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await saveKegiatan();};}
async function saveKegiatan(id){
    const body={judul:kJudul.value.trim(),slug:kSlug.value.trim()||slugify(kJudul.value),kategori:kKategori.value,deskripsi:kDeskripsi.value.trim()||null,tanggal:kTanggal.value||null,lokasi:kLokasi.value.trim()||null,cover_file_id:kCover.value.trim()||null,status:kStatus.value};
    await apiRequest(id?`/kegiatan/${id}`:"/kegiatan",{method:id?"PUT":"POST",body:JSON.stringify(body)});showToast(id?"Kegiatan diperbarui":"Kegiatan ditambahkan");renderKegiatan();
}
async function editKegiatan(id){const r=await apiRequest("/kegiatan"),x=(r.data||[]).find(a=>a.id===id);if(!x)return;document.getElementById("page-kegiatan").innerHTML=formWrap("Edit Kegiatan",kegiatanForm(x),"Simpan Perubahan");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await saveKegiatan(id);};}
async function hapusKegiatan(id,nama){if(!confirmDelete(nama))return;await apiRequest(`/kegiatan/${id}`,{method:"DELETE"});showToast("Kegiatan dihapus");renderKegiatan();}

async function renderGaleri(){
    const t=document.getElementById("page-galeri");if(!t)return;
    t.innerHTML=pageHeader("Daftar Galeri","Kelola album foto warga","+ Tambah Album","showTambahGaleri()");
    try{const r=await apiRequest("/galeri");renderTable(r.data||[],[
        {label:"Album",key:"nama_album"},{label:"Kategori",key:"kategori"},{label:"Tanggal",render:x=>formatTanggal(x.tanggal)},
        {label:"Jumlah Foto",render:x=>x.jumlah_foto??0},{label:"Status",key:"status"}],"Galeri");
    }catch(e){document.getElementById("moduleList").innerHTML=`<div style="color:#dc2626">${escapeHtml(e.message)}</div>`;}
}
function galeriForm(d={}){
    return input("Nama Album","gNama",d.nama_album||"","text",true)+input("Slug","gSlug",d.slug||"")+textarea("Deskripsi","gDeskripsi",d.deskripsi||"")+
    `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">${input("Tanggal","gTanggal",d.tanggal||"","date")}${input("Kategori","gKategori",d.kategori||"LAINNYA")}${input("Cover Google Drive File ID","gCover",d.cover_file_id||"")}${input("Kegiatan ID","gKegiatan",d.kegiatan_id||"")}${selectField("Status","gStatus",d.status||"published",[["draft","Draft"],["published","Published"],["archived","Archived"]])}</div>`;
}
function showTambahGaleri(){document.getElementById("page-galeri").innerHTML=formWrap("Tambah Album",galeriForm(),"Simpan Album");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await saveGaleri();};}
async function saveGaleri(id){
    const body={nama_album:gNama.value.trim(),slug:gSlug.value.trim()||slugify(gNama.value),deskripsi:gDeskripsi.value.trim()||null,tanggal:gTanggal.value||null,kategori:gKategori.value.trim()||"LAINNYA",cover_file_id:gCover.value.trim()||null,kegiatan_id:gKegiatan.value.trim()||null,status:gStatus.value};
    await apiRequest(id?`/galeri/${id}`:"/galeri",{method:id?"PUT":"POST",body:JSON.stringify(body)});showToast(id?"Album diperbarui":"Album ditambahkan");renderGaleri();
}
async function editGaleri(id){const r=await apiRequest("/galeri"),x=(r.data||[]).find(a=>a.id===id);if(!x)return;document.getElementById("page-galeri").innerHTML=formWrap("Edit Album",galeriForm(x),"Simpan Perubahan");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await saveGaleri(id);};}
async function hapusGaleri(id,nama){if(!confirmDelete(nama))return;await apiRequest(`/galeri/${id}`,{method:"DELETE"});showToast("Album dihapus");renderGaleri();}

async function renderVideo(){
    const t=document.getElementById("page-video");if(!t)return;
    t.innerHTML=pageHeader("Daftar Video","Kelola dokumentasi video YouTube","+ Tambah Video","showTambahVideo()");
    try{const r=await apiRequest("/video");renderTable(r.data||[],[
        {label:"Judul",key:"judul"},{label:"YouTube ID",key:"youtube_id"},{label:"Kategori",key:"kategori"},
        {label:"Tanggal",render:x=>formatTanggal(x.tanggal)},{label:"Status",key:"status"}],"Video");
    }catch(e){document.getElementById("moduleList").innerHTML=`<div style="color:#dc2626">${escapeHtml(e.message)}</div>`;}
}
function videoForm(d={}){
    return input("Judul","vJudul",d.judul||"","text",true)+textarea("Deskripsi","vDeskripsi",d.deskripsi||"")+input("YouTube Video ID","vYoutube",d.youtube_id||"","text",true)+
    `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">${input("Thumbnail URL","vThumb",d.thumbnail_url||"")}${input("Kategori","vKategori",d.kategori||"LAINNYA")}${input("Tanggal","vTanggal",d.tanggal||"","date")}${input("Kegiatan ID","vKegiatan",d.kegiatan_id||"")}${input("Urutan","vUrutan",d.urutan??0,"number")}${selectField("Status","vStatus",d.status||"published",[["draft","Draft"],["published","Published"],["archived","Archived"]])}</div>`;
}
function showTambahVideo(){document.getElementById("page-video").innerHTML=formWrap("Tambah Video",videoForm(),"Simpan Video");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await saveVideo();};}
async function saveVideo(id){
    const body={judul:vJudul.value.trim(),deskripsi:vDeskripsi.value.trim()||null,youtube_id:vYoutube.value.trim(),thumbnail_url:vThumb.value.trim()||null,kategori:vKategori.value.trim()||"LAINNYA",tanggal:vTanggal.value||null,kegiatan_id:vKegiatan.value.trim()||null,status:vStatus.value,urutan:Number(vUrutan.value)||0};
    await apiRequest(id?`/video/${id}`:"/video",{method:id?"PUT":"POST",body:JSON.stringify(body)});showToast(id?"Video diperbarui":"Video ditambahkan");renderVideo();
}
async function editVideo(id){const r=await apiRequest("/video"),x=(r.data||[]).find(a=>a.id===id);if(!x)return;document.getElementById("page-video").innerHTML=formWrap("Edit Video",videoForm(x),"Simpan Perubahan");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await saveVideo(id);};}
async function hapusVideo(id,nama){if(!confirmDelete(nama))return;await apiRequest(`/video/${id}`,{method:"DELETE"});showToast("Video dihapus");renderVideo();}

async function renderDarurat(){
    const t=document.getElementById("page-darurat");if(!t)return;
    t.innerHTML=pageHeader("Informasi Darurat","Kontak dan informasi penting","+ Tambah Informasi","showTambahDarurat()");
    try{const r=await apiRequest("/informasi-darurat");renderTable(r.data||[],[
        {label:"Judul",key:"judul"},{label:"Kategori",key:"kategori"},{label:"Kontak",key:"kontak"},
        {label:"Nomor",key:"nomor"},{label:"Status",render:x=>x.is_active?"Aktif":"Tidak Aktif"}],"Darurat");
    }catch(e){document.getElementById("moduleList").innerHTML=`<div style="color:#dc2626">${escapeHtml(e.message)}</div>`;}
}
function daruratForm(d={}){
    return input("Judul","dJudul",d.judul||"","text",true)+textarea("Deskripsi","dDeskripsi",d.deskripsi||"")+
    `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px">${input("Kategori","dKategori",d.kategori||"LAINNYA")}${input("Kontak","dKontak",d.kontak||"")}${input("Nomor","dNomor",d.nomor||"")}${input("URL","dUrl",d.url||"")}${input("Urutan","dUrutan",d.urutan??0,"number")}${selectField("Status","dAktif",String(d.is_active??true),[["true","Aktif"],["false","Tidak Aktif"]])}</div>`;
}
function showTambahDarurat(){document.getElementById("page-darurat").innerHTML=formWrap("Tambah Informasi Darurat",daruratForm(),"Simpan Informasi");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await saveDarurat();};}
async function saveDarurat(id){
    const body={judul:dJudul.value.trim(),deskripsi:dDeskripsi.value.trim()||null,kategori:dKategori.value.trim()||"LAINNYA",kontak:dKontak.value.trim()||null,nomor:dNomor.value.trim()||null,url:dUrl.value.trim()||null,urutan:Number(dUrutan.value)||0,is_active:dAktif.value==="true"};
    await apiRequest(id?`/informasi-darurat/${id}`:"/informasi-darurat",{method:id?"PUT":"POST",body:JSON.stringify(body)});showToast(id?"Informasi diperbarui":"Informasi ditambahkan");renderDarurat();
}
async function editDarurat(id){const r=await apiRequest("/informasi-darurat"),x=(r.data||[]).find(a=>a.id===id);if(!x)return;document.getElementById("page-darurat").innerHTML=formWrap("Edit Informasi Darurat",daruratForm(x),"Simpan Perubahan");document.getElementById("moduleForm").onsubmit=async e=>{e.preventDefault();await saveDarurat(id);};}
async function hapusDarurat(id,nama){if(!confirmDelete(nama))return;await apiRequest(`/informasi-darurat/${id}`,{method:"DELETE"});showToast("Informasi dihapus");renderDarurat();}

async function renderPengaturan(){
    const t=document.getElementById("page-pengaturan");if(!t)return;
    try{
        const r=await apiRequest("/settings"),d=r.data||[];
        t.innerHTML=`<div class="card"><div style="padding:24px;border-bottom:1px solid #e5e7eb"><h3 style="margin:0">Pengaturan Portal RT</h3><p style="margin:5px 0 0;color:#64748b">Kelola identitas website dan statistik warga</p></div><div style="padding:24px"><form id="settingsForm">${d.map(x=>`<label style="display:block;margin-bottom:15px"><span style="display:block;font-weight:600;margin-bottom:6px">${escapeHtml(x.key)}</span><input data-setting-key="${escapeHtml(x.key)}" value="${escapeHtml(x.value||"")}" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:8px"><small style="color:#64748b">${escapeHtml(x.description||"")}</small></label>`).join("")}<button class="btn btn-primary" type="submit">Simpan Semua Pengaturan</button></form></div></div>`;
        document.getElementById("settingsForm").onsubmit=async e=>{
            e.preventDefault();
            const btn=e.target.querySelector("button");btn.disabled=true;btn.textContent="Menyimpan...";
            try{
                for(const el of e.target.querySelectorAll("[data-setting-key]"))await apiRequest(`/settings/${encodeURIComponent(el.dataset.settingKey)}`,{method:"PUT",body:JSON.stringify({value:el.value})});
                showToast("Pengaturan berhasil disimpan");loadSettings();
            }catch(err){showToast(err.message);}
            finally{btn.disabled=false;btn.textContent="Simpan Semua Pengaturan";}
        };
    }catch(e){t.innerHTML=`<div class="card" style="padding:24px;color:#dc2626">${escapeHtml(e.message)}</div>`;}
}

/* Foto di dalam album: dipanggil dari Galeri bila dibutuhkan */
async function kelolaFoto(galeriId){
    const r=await apiRequest(`/foto?galeri_id=${encodeURIComponent(galeriId)}`);
    const data=r.data||[];
    let html=`<div class="card" style="padding:24px"><h3>Foto Album</h3>`;
    html+=data.map(x=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:10px;border-bottom:1px solid #eee"><span>${escapeHtml(x.file_name||x.google_drive_file_id)}</span><button class="btn" onclick="hapusFoto('${x.id}')">Hapus</button></div>`).join("");
    html+=`</div>`;document.getElementById("page-galeri").innerHTML=html;
}
async function hapusFoto(id){if(!confirm("Hapus foto ini?"))return;await apiRequest(`/foto/${id}`,{method:"DELETE"});showToast("Foto dihapus");}

document.addEventListener("DOMContentLoaded",()=>{
    if(loginForm)loginForm.addEventListener("submit",handleLogin);
    initNavigation();
    verifySession();
});
