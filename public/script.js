(() => {
    "use strict";

    const $ = (s, root=document) => root.querySelector(s);
    const $$ = (s, root=document) => [...root.querySelectorAll(s)];

    const state = {
        settings: {},
        activities: []
    };

    const api = async (path) => {
        const response = await fetch(`/api/public${path}`, {
            headers: { "Accept": "application/json" }
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(data?.detail || data?.message || `Request gagal (${response.status})`);
        }
        return data || { data: [] };
    };

    const esc = (value) => String(value ?? "")
        .replace(/&/g,"&amp;")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/"/g,"&quot;")
        .replace(/'/g,"&#039;");

    const formatDate = (value) => {
        if (!value) return "";
        const d = new Date(`${value}T00:00:00`);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleDateString("id-ID", {
            day:"2-digit", month:"long", year:"numeric"
        });
    };

    const monthShort = (value) => {
        if (!value) return "";
        const d = new Date(`${value}T00:00:00`);
        return d.toLocaleDateString("id-ID", {month:"short"});
    };

    const settingMap = (rows) => {
        const out = {};
        (rows || []).forEach(row => out[row.key] = row.value ?? "");
        return out;
    };

    function applySettings(map) {
        state.settings = map;
        const site = map.site_name || "Portal RT";
        const slogan = map.slogan || "Guyub, Rukun, Bersama";
        const desc = map.site_description || "Portal Informasi Warga";
        const rt = map.rt_name || "RT 00";
        const rw = map.rw_name || "RW 00";
        const region = [
            map.desa_name, map.kecamatan_name,
            map.kabupaten_name, map.provinsi_name
        ].filter(Boolean).join(", ");

        document.title = site;
        $("#brandName").textContent = site.toUpperCase();
        $("#footerName").textContent = site.toUpperCase();
        $("#heroTitle").textContent = site;
        $("#heroSlogan").textContent = slogan;
        $("#heroDescription").textContent = desc;
        $("#heroArea").textContent = `${rt} / ${rw}`;
        $("#heroRegion").textContent = region || "Informasi wilayah belum diatur";
        $("#brandArea").textContent = `${rt} • ${rw}`;
        $("#footerArea").textContent = `${rt} • ${rw}`;
        $("#footerDescription").textContent = desc;
        $("#footerCopyright").textContent = `© ${new Date().getFullYear()} ${site}`;
    }

    function renderAnnouncements(rows) {
        const box = $("#announcementList");
        if (!rows.length) {
            box.innerHTML = `<div class="empty">Belum ada pengumuman yang dipublikasikan.</div>`;
            return;
        }
        box.innerHTML = rows.slice(0,6).map(item => {
            const priority = item.prioritas || "normal";
            const cls = priority === "darurat" ? "urgent" : priority === "penting" ? "important" : "";
            const badge = priority === "darurat" ? "DARURAT" : priority === "penting" ? "PENTING" : "INFORMASI";
            return `
                <article class="announcement-card ${cls}">
                    <div>
                        <span class="badge ${priority === "darurat" ? "danger" : priority === "penting" ? "warning" : ""}">${badge}</span>
                        <h3>${esc(item.judul)}</h3>
                        <p>${esc(item.isi)}</p>
                    </div>
                    <div class="meta">${esc(formatDate(item.tanggal_mulai || item.created_at?.slice(0,10)))}</div>
                </article>
            `;
        }).join("");
    }

    function renderAgenda(rows) {
        const box = $("#agendaList");
        if (!rows.length) {
            box.innerHTML = `<div class="empty">Belum ada agenda yang dipublikasikan.</div>`;
            return;
        }
        box.innerHTML = rows.slice(0,6).map(item => {
            const d = item.tanggal ? new Date(`${item.tanggal}T00:00:00`) : null;
            const day = d && !Number.isNaN(d.getTime()) ? d.getDate() : "-";
            return `
                <article class="agenda-card">
                    <div class="date-box">
                        <div class="date-day">${day}</div>
                        <div>
                            <div class="date-month">${esc(monthShort(item.tanggal))}</div>
                            <div class="meta">${esc(item.waktu_mulai || "")}</div>
                        </div>
                    </div>
                    <h3>${esc(item.judul)}</h3>
                    <div class="card-text">${esc(item.deskripsi || "Agenda kegiatan warga.")}</div>
                    ${item.lokasi ? `<div class="card-location">📍 ${esc(item.lokasi)}</div>` : ""}
                </article>
            `;
        }).join("");
    }

    function coverHtml(fileId, icon="📷") {
        // Google Drive is intentionally not configured yet.
        if (fileId && /^https?:\/\//i.test(fileId)) {
            return `<img src="${esc(fileId)}" alt="" loading="lazy">`;
        }
        return `<div>${icon}</div>`;
    }

    function renderActivities(rows, category="ALL") {
        state.activities = rows || [];
        const filtered = category === "ALL"
            ? state.activities
            : state.activities.filter(x => String(x.kategori || "").toUpperCase() === category);
        const box = $("#activityList");
        if (!filtered.length) {
            box.innerHTML = `<div class="empty">Belum ada kegiatan untuk kategori ini.</div>`;
            return;
        }
        box.innerHTML = filtered.slice(0,9).map(item => `
            <article class="activity-card">
                <div class="card-cover">${coverHtml(item.cover_file_id,"⭐")}</div>
                <div class="card-body">
                    <span class="badge">${esc(item.kategori || "LAINNYA")}</span>
                    <h3>${esc(item.judul)}</h3>
                    <div class="card-text">${esc(item.deskripsi || "Kegiatan warga.")}</div>
                    <div class="card-location">${esc(formatDate(item.tanggal))}${item.lokasi ? ` • ${esc(item.lokasi)}` : ""}</div>
                </div>
            </article>
        `).join("");
    }

    function renderGallery(rows) {
        const box = $("#galleryList");
        if (!rows.length) {
            box.innerHTML = `<div class="empty">Belum ada album galeri yang dipublikasikan.</div>`;
            return;
        }
        box.innerHTML = rows.slice(0,9).map(item => `
            <article class="gallery-card">
                <div class="card-cover">${coverHtml(item.cover_file_id,"🖼️")}</div>
                <div class="card-body">
                    <span class="badge">${esc(item.kategori || "LAINNYA")}</span>
                    <h3>${esc(item.nama_album)}</h3>
                    <div class="card-text">${esc(item.deskripsi || "Dokumentasi kegiatan warga.")}</div>
                    <div class="card-location">${esc(formatDate(item.tanggal))}</div>
                </div>
            </article>
        `).join("");
    }

    function renderVideos(rows) {
        const box = $("#videoList");
        if (!rows.length) {
            box.innerHTML = `<div class="empty">Belum ada video yang dipublikasikan.</div>`;
            return;
        }
        box.innerHTML = rows.slice(0,6).map(item => {
            const thumb = item.thumbnail_url ||
                (item.youtube_id ? `https://img.youtube.com/vi/${encodeURIComponent(item.youtube_id)}/hqdefault.jpg` : "");
            const href = item.youtube_id
                ? `https://www.youtube.com/watch?v=${encodeURIComponent(item.youtube_id)}`
                : "#";
            return `
                <article class="video-card">
                    <a href="${href}" target="_blank" rel="noopener noreferrer">
                        <div class="video-thumb">
                            ${thumb ? `<img src="${esc(thumb)}" alt="${esc(item.judul)}" loading="lazy">` : ""}
                            <div class="video-play">▶</div>
                        </div>
                    </a>
                    <div class="card-body">
                        <span class="badge">${esc(item.kategori || "LAINNYA")}</span>
                        <h3>${esc(item.judul)}</h3>
                        <div class="card-text">${esc(item.deskripsi || "")}</div>
                    </div>
                </article>
            `;
        }).join("");
    }

    function renderOfficials(rows) {
        const box = $("#officialList");
        if (!rows.length) {
            box.innerHTML = `<div class="empty">Data pengurus belum dipublikasikan.</div>`;
            return;
        }
        box.innerHTML = rows.slice(0,12).map(item => {
            const initials = (item.nama || "RT").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
            return `
                <article class="official-card">
                    <div class="avatar">${esc(initials)}</div>
                    <h3>${esc(item.nama)}</h3>
                    <div class="role">${esc(item.jabatan)}</div>
                    ${item.deskripsi ? `<div class="card-text" style="margin-top:8px">${esc(item.deskripsi)}</div>` : ""}
                </article>
            `;
        }).join("");
    }

    function renderEmergency(rows) {
        const box = $("#emergencyList");
        if (!rows.length) {
            box.innerHTML = `<div class="empty">Belum ada informasi darurat aktif.</div>`;
            return;
        }
        box.innerHTML = rows.map(item => `
            <article class="emergency-card">
                <h3>⚠️ ${esc(item.judul)}</h3>
                <div class="card-text">${esc(item.deskripsi || "")}</div>
                ${item.kontak || item.nomor ? `<div class="contact">${esc(item.kontak || "")}${item.nomor ? ` • ${esc(item.nomor)}` : ""}</div>` : ""}
                ${item.url ? `<div style="margin-top:10px"><a class="btn btn-light" href="${esc(item.url)}" target="_blank" rel="noopener">Buka Informasi</a></div>` : ""}
            </article>
        `).join("");
    }

    async function loadAll() {
        const tasks = await Promise.allSettled([
            api("/settings"),
            api("/pengumuman"),
            api("/agenda"),
            api("/kegiatan"),
            api("/galeri"),
            api("/video"),
            api("/pengurus"),
            api("/darurat")
        ]);

        const [settings, announcements, agenda, activities, gallery, videos, officials, emergency] = tasks;

        if (settings.status === "fulfilled") applySettings(settingMap(settings.value.data));
        if (announcements.status === "fulfilled") renderAnnouncements(announcements.value.data || []);
        else $("#announcementList").innerHTML = `<div class="empty">Pengumuman belum dapat dimuat.</div>`;
        if (agenda.status === "fulfilled") renderAgenda(agenda.value.data || []);
        else $("#agendaList").innerHTML = `<div class="empty">Agenda belum dapat dimuat.</div>`;
        if (activities.status === "fulfilled") renderActivities(activities.value.data || []);
        else $("#activityList").innerHTML = `<div class="empty">Kegiatan belum dapat dimuat.</div>`;
        if (gallery.status === "fulfilled") renderGallery(gallery.value.data || []);
        else $("#galleryList").innerHTML = `<div class="empty">Galeri belum dapat dimuat.</div>`;
        if (videos.status === "fulfilled") renderVideos(videos.value.data || []);
        else $("#videoList").innerHTML = `<div class="empty">Video belum dapat dimuat.</div>`;
        if (officials.status === "fulfilled") renderOfficials(officials.value.data || []);
        else $("#officialList").innerHTML = `<div class="empty">Pengurus belum dapat dimuat.</div>`;
        if (emergency.status === "fulfilled") renderEmergency(emergency.value.data || []);
        else $("#emergencyList").innerHTML = `<div class="empty">Informasi darurat belum dapat dimuat.</div>`;
    }

    $("#menuToggle").addEventListener("click", () => $("#mainNav").classList.toggle("open"));
    $$("#mainNav a").forEach(a => a.addEventListener("click", () => $("#mainNav").classList.remove("open")));

    $$("#activityFilters .filter").forEach(button => {
        button.addEventListener("click", () => {
            $$("#activityFilters .filter").forEach(x => x.classList.remove("active"));
            button.classList.add("active");
            renderActivities(state.activities, button.dataset.category);
        });
    });

    loadAll();
})();
