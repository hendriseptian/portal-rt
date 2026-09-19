"use strict";


/* =========================================================
   CONFIGURATION
========================================================= */

const API_BASE = "/api";

const TOKEN_KEY = "portal_rt_token";
const USER_KEY = "portal_rt_user";


/* =========================================================
   ELEMENTS
========================================================= */

const loginPage =
    document.getElementById("loginPage");

const adminApp =
    document.getElementById("adminApp");

const loginForm =
    document.getElementById("loginForm");

const usernameInput =
    document.getElementById("username");

const passwordInput =
    document.getElementById("password");

const loginButton =
    document.getElementById("loginButton");

const loginButtonText =
    document.getElementById("loginButtonText");

const loginSpinner =
    document.getElementById("loginSpinner");

const loginError =
    document.getElementById("loginError");

const togglePassword =
    document.getElementById("togglePassword");

const logoutButton =
    document.getElementById("logoutButton");

const mobileMenuButton =
    document.getElementById("mobileMenuButton");

const sidebar =
    document.getElementById("sidebar");

const pageTitle =
    document.getElementById("pageTitle");

const pageDescription =
    document.getElementById("pageDescription");

const userName =
    document.getElementById("userName");

const userRole =
    document.getElementById("userRole");

const welcomeTitle =
    document.getElementById("welcomeTitle");

const statPengurus =
    document.getElementById("statPengurus");

const statPengumuman =
    document.getElementById("statPengumuman");

const statAgenda =
    document.getElementById("statAgenda");

const statKegiatan =
    document.getElementById("statKegiatan");

const siteInfo =
    document.getElementById("siteInfo");

const toast =
    document.getElementById("toast");


/* =========================================================
   PAGE CONFIG
========================================================= */

const pageConfig = {

    dashboard: {
        title: "Dashboard",
        description: "Ringkasan Portal RT"
    },

    pengurus: {
        title: "Pengurus",
        description: "Kelola struktur pengurus RT"
    },

    pengumuman: {
        title: "Pengumuman",
        description: "Kelola pengumuman warga"
    },

    agenda: {
        title: "Agenda",
        description: "Kelola agenda kegiatan"
    },

    kegiatan: {
        title: "Kegiatan",
        description: "Kelola kegiatan warga"
    },

    galeri: {
        title: "Galeri",
        description: "Kelola dokumentasi foto"
    },

    video: {
        title: "Video",
        description: "Kelola dokumentasi video"
    },

    darurat: {
        title: "Informasi Darurat",
        description: "Kelola informasi penting dan darurat"
    },

    pengaturan: {
        title: "Pengaturan",
        description: "Kelola konfigurasi Portal RT"
    }

};


/* =========================================================
   STORAGE
========================================================= */

function getToken() {

    return localStorage.getItem(
        TOKEN_KEY
    );

}


function getStoredUser() {

    const raw =
        localStorage.getItem(
            USER_KEY
        );


    if (!raw) {

        return null;

    }


    try {

        return JSON.parse(raw);

    } catch (error) {

        return null;

    }

}


function saveSession(
    token,
    user
) {

    localStorage.setItem(
        TOKEN_KEY,
        token
    );


    localStorage.setItem(
        USER_KEY,
        JSON.stringify(user)
    );

}


function clearSession() {

    localStorage.removeItem(
        TOKEN_KEY
    );


    localStorage.removeItem(
        USER_KEY
    );

}


/* =========================================================
   API
========================================================= */

async function apiRequest(
    endpoint,
    options = {}
) {

    const headers = {
        ...(options.headers || {})
    };


    if (
        options.body &&
        !headers["Content-Type"]
    ) {

        headers["Content-Type"] =
            "application/json";

    }


    const token =
        getToken();


    if (token) {

        headers["Authorization"] =
            `Bearer ${token}`;

    }


    const response =
        await fetch(
            `${API_BASE}${endpoint}`,
            {
                ...options,
                headers
            }
        );


    let data = null;


    try {

        data =
            await response.json();

    } catch (error) {

        data = null;

    }


    if (
        response.status === 401
    ) {

        clearSession();

        showLogin();

        throw new Error(
            "Sesi login sudah berakhir."
        );

    }


    if (!response.ok) {

        throw new Error(
            data?.detail ||
            data?.message ||
            `Request gagal (${response.status})`
        );

    }


    return data;

}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(
    event
) {

    event.preventDefault();


    const username =
        usernameInput.value.trim();


    const password =
        passwordInput.value;


    hideLoginError();


    if (
        !username ||
        !password
    ) {

        showLoginError(
            "Username dan password wajib diisi."
        );

        return;

    }


    setLoginLoading(true);


    try {

        const result =
            await apiRequest(
                "/auth/login",
                {
                    method: "POST",

                    body: JSON.stringify({
                        username,
                        password
                    })
                }
            );


        if (
            result.status !== "success" ||
            !result.token
        ) {

            throw new Error(
                "Login gagal."
            );

        }


        saveSession(
            result.token,
            result.user
        );


        showAdmin();


        showToast(
            "Login berhasil."
        );


    } catch (error) {

        showLoginError(
            error.message ||
            "Username atau password salah."
        );


    } finally {

        setLoginLoading(false);

    }

}


/* =========================================================
   VERIFY SESSION
========================================================= */

async function verifySession() {

    const token =
        getToken();


    if (!token) {

        showLogin();

        return false;

    }


    try {

        const result =
            await apiRequest(
                "/auth/me"
            );


        if (
            result.status !== "success"
        ) {

            throw new Error(
                "Session tidak valid."
            );

        }


        const currentUser =
            result.user;


        localStorage.setItem(
            USER_KEY,
            JSON.stringify({
                id:
                    currentUser.sub,

                username:
                    currentUser.username,

                name:
                    currentUser.name,

                role:
                    currentUser.role
            })
        );


        showAdmin();


        return true;


    } catch (error) {

        clearSession();

        showLogin();

        return false;

    }

}


/* =========================================================
   LOGIN / ADMIN VISIBILITY
========================================================= */

function showLogin() {

    loginPage.classList.remove(
        "hidden"
    );


    adminApp.classList.add(
        "hidden"
    );


    usernameInput.value = "";

    passwordInput.value = "";


    hideLoginError();

}


function showAdmin() {

    loginPage.classList.add(
        "hidden"
    );


    adminApp.classList.remove(
        "hidden"
    );


    const user =
        getStoredUser();


    updateUserInterface(
        user
    );


    loadDashboard();

}


function updateUserInterface(
    user
) {

    if (!user) {

        return;

    }


    const name =
        user.name ||
        user.username ||
        "Administrator";


    const role =
        formatRole(
            user.role
        );


    userName.textContent =
        name;


    userRole.textContent =
        role;


    welcomeTitle.textContent =
        `Selamat datang, ${name}`;


    const firstLetter =
        name
            .trim()
            .charAt(0)
            .toUpperCase();


    const avatar =
        document.querySelector(
            ".user-avatar"
        );


    if (avatar) {

        avatar.textContent =
            firstLetter || "A";

    }

}


function formatRole(
    role
) {

    const roles = {

        super_admin:
            "Super Admin",

        ketua_rt:
            "Ketua RT",

        operator:
            "Operator",

        admin_pkk:
            "Admin PKK",

        admin_remaja:
            "Admin Remaja"

    };


    return roles[role] ||
        "Administrator";

}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    await Promise.all([
        loadStatistics(),
        loadSettings()
    ]);

}


async function loadStatistics() {

    try {

        const [
            pengurus,
            pengumuman,
            agenda
        ] = await Promise.all([

            apiRequest(
                "/pengurus"
            ),

            apiRequest(
                "/pengumuman"
            ),

            apiRequest(
                "/agenda"
            )

        ]);


        statPengurus.textContent =
            pengurus.count ?? 0;


        statPengumuman.textContent =
            pengumuman.count ?? 0;


        statAgenda.textContent =
            agenda.count ?? 0;


        /*
         * Endpoint kegiatan
         * belum dibuat.
         */

        statKegiatan.textContent =
            "0";


    } catch (error) {

        console.error(
            "Gagal memuat statistik:",
            error
        );

    }

}


/* =========================================================
   SETTINGS
========================================================= */

async function loadSettings() {

    try {

        const result =
            await apiRequest(
                "/settings"
            );


        const settings =
            result.data || [];


        const map = {};


        settings.forEach(
            item => {

                map[item.key] =
                    item.value ?? "";

            }
        );


        const rows = [

            [
                "Nama Website",
                map.site_name ||
                "Belum diatur"
            ],

            [
                "Deskripsi",
                map.site_description ||
                "Belum diatur"
            ],

            [
                "RT / RW",
                `${map.rt_name || "-"} / ${map.rw_name || "-"}`
            ],

            [
                "Wilayah",
                buildRegion(map)
            ],

            [
                "Slogan",
                map.slogan ||
                "Belum diatur"
            ]

        ];


        siteInfo.innerHTML =
            rows
                .map(
                    row => `

                        <div class="site-info-row">

                            <span class="site-info-label">
                                ${escapeHtml(
                                    row[0]
                                )}
                            </span>

                            <span class="site-info-value">
                                ${escapeHtml(
                                    row[1]
                                )}
                            </span>

                        </div>

                    `
                )
                .join("");


    } catch (error) {

        console.error(
            "Gagal memuat settings:",
            error
        );


        siteInfo.innerHTML = `

            <div class="loading">
                Informasi website belum dapat dimuat.
            </div>

        `;

    }

}


function buildRegion(
    map
) {

    const parts = [

        map.desa_name,

        map.kecamatan_name,

        map.kabupaten_name,

        map.provinsi_name

    ].filter(
        value =>
            value &&
            value.trim()
    );


    return parts.length
        ? parts.join(", ")
        : "Belum diatur";

}


/* =========================================================
   PENGURUS
========================================================= */

async function renderPengurus() {

    const target =
        document.getElementById(
            "page-pengurus"
        );


    if (!target) {

        return;

    }


    target.innerHTML = `

        <div class="card">

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:20px;
                    padding:24px;
                    border-bottom:1px solid #e5e7eb;
                "
            >

                <div>

                    <h3
                        style="
                            margin:0 0 5px 0;
                            font-size:20px;
                        "
                    >
                        Daftar Pengurus
                    </h3>

                    <p
                        style="
                            margin:0;
                            color:#64748b;
                        "
                    >
                        Kelola struktur pengurus RT
                    </p>

                </div>


                <button
                    class="btn btn-primary"
                    type="button"
                    onclick="showTambahPengurus()"
                >
                    + Tambah Pengurus
                </button>

            </div>


            <div
                id="pengurusList"
                style="padding:24px;"
            >

                <div
                    style="
                        text-align:center;
                        padding:40px;
                        color:#64748b;
                    "
                >
                    Memuat data pengurus...
                </div>

            </div>

        </div>

    `;


    try {

        const result =
            await apiRequest(
                "/pengurus"
            );


        const data =
            result.data || [];


        const list =
            document.getElementById(
                "pengurusList"
            );


        if (!list) {

            return;

        }


        /*
         * BELUM ADA DATA
         */

        if (!data.length) {

            list.innerHTML = `

                <div
                    style="
                        text-align:center;
                        padding:50px 20px;
                        color:#64748b;
                    "
                >

                    <div
                        style="
                            font-size:40px;
                            margin-bottom:15px;
                        "
                    >
                        ♟
                    </div>


                    <h3
                        style="
                            margin:0 0 8px 0;
                            color:#0f172a;
                        "
                    >
                        Belum ada pengurus
                    </h3>


                    <p
                        style="
                            margin:0 0 20px 0;
                        "
                    >
                        Belum ada data pengurus yang ditambahkan.
                    </p>


                    <button
                        class="btn btn-primary"
                        type="button"
                        onclick="showTambahPengurus()"
                    >
                        + Tambah Pengurus
                    </button>

                </div>

            `;


            return;

        }


        /*
         * ADA DATA
         */

        list.innerHTML = `

            <div
                style="
                    overflow-x:auto;
                "
            >

                <table
                    style="
                        width:100%;
                        border-collapse:collapse;
                    "
                >

                    <thead>

                        <tr
                            style="
                                border-bottom:2px solid #e5e7eb;
                                text-align:left;
                            "
                        >

                            <th
                                style="
                                    padding:12px;
                                    width:60px;
                                "
                            >
                                No
                            </th>


                            <th
                                style="
                                    padding:12px;
                                "
                            >
                                Nama
                            </th>


                            <th
                                style="
                                    padding:12px;
                                "
                            >
                                Jabatan
                            </th>


                            <th
                                style="
                                    padding:12px;
                                "
                            >
                                Periode
                            </th>


                            <th
                                style="
                                    padding:12px;
                                "
                            >
                                Status
                            </th>


                            <th
                                style="
                                    padding:12px;
                                    width:120px;
                                "
                            >
                                Aksi
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${data.map(
                            (item, index) => {

                                const periodeMulai =
                                    formatTanggal(
                                        item.periode_mulai
                                    );


                                const periodeSelesai =
                                    formatTanggal(
                                        item.periode_selesai
                                    );


                                return `

                                    <tr
                                        style="
                                            border-bottom:1px solid #e5e7eb;
                                        "
                                    >

                                        <td
                                            style="
                                                padding:14px 12px;
                                            "
                                        >
                                            ${index + 1}
                                        </td>


                                        <td
                                            style="
                                                padding:14px 12px;
                                                font-weight:600;
                                            "
                                        >
                                            ${escapeHtml(
                                                item.nama || "-"
                                            )}
                                        </td>


                                        <td
                                            style="
                                                padding:14px 12px;
                                            "
                                        >
                                            ${escapeHtml(
                                                item.jabatan || "-"
                                            )}
                                        </td>


                                        <td
                                            style="
                                                padding:14px 12px;
                                            "
                                        >

                                            ${
                                                periodeMulai
                                            }

                                            <br>

                                            <span
                                                style="
                                                    color:#64748b;
                                                    font-size:12px;
                                                "
                                            >
                                                s/d
                                                ${
                                                    periodeSelesai
                                                }
                                            </span>

                                        </td>


                                        <td
                                            style="
                                                padding:14px 12px;
                                            "
                                        >

                                            <span
                                                style="
                                                    display:inline-block;
                                                    padding:5px 10px;
                                                    border-radius:20px;
                                                    font-size:12px;
                                                    font-weight:600;
                                                    background:${
                                                        item.is_active
                                                            ? "#dcfce7"
                                                            : "#f1f5f9"
                                                    };
                                                    color:${
                                                        item.is_active
                                                            ? "#166534"
                                                            : "#64748b"
                                                    };
                                                "
                                            >
                                                ${
                                                    item.is_active
                                                        ? "Aktif"
                                                        : "Tidak Aktif"
                                                }
                                            </span>

                                        </td>


                                        <td
                                            style="
                                                padding:14px 12px;
                                            "
                                        >

                                            <button
                                                class="btn"
                                                type="button"
                                                onclick="editPengurus('${item.id}')"
                                            >
                                                Edit
                                            </button>

                                        </td>

                                    </tr>

                                `;

                            }
                        ).join("")}

                    </tbody>

                </table>

            </div>

        `;


    } catch (error) {

        console.error(
            "Gagal memuat pengurus:",
            error
        );


        const list =
            document.getElementById(
                "pengurusList"
            );


        if (list) {

            list.innerHTML = `

                <div
                    style="
                        text-align:center;
                        padding:40px;
                        color:#dc2626;
                    "
                >

                    <strong>
                        Gagal memuat data pengurus.
                    </strong>

                    <br><br>

                    <span
                        style="
                            font-size:13px;
                        "
                    >
                        ${escapeHtml(
                            error.message ||
                            "Terjadi kesalahan."
                        )}
                    </span>

                    <br><br>

                    <button
                        class="btn"
                        type="button"
                        onclick="renderPengurus()"
                    >
                        Coba Lagi
                    </button>

                </div>

            `;

        }

    }

}


/* =========================================================
   FORMAT TANGGAL
========================================================= */

function formatTanggal(
    value
) {

    if (!value) {

        return "-";

    }


    try {

        return new Date(
            value
        ).toLocaleDateString(
            "id-ID",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        );

    } catch (error) {

        return "-";

    }

}


/* =========================================================
   TAMBAH PENGURUS
========================================================= */

function showTambahPengurus() {

    const target =
        document.getElementById(
            "page-pengurus"
        );


    if (!target) {

        return;

    }


    target.innerHTML = `

        <div class="card">

            <div
                style="
                    padding:24px;
                    border-bottom:1px solid #e5e7eb;
                "
            >

                <h3
                    style="
                        margin:0 0 6px 0;
                        font-size:20px;
                    "
                >
                    Tambah Pengurus
                </h3>


                <p
                    style="
                        margin:0;
                        color:#64748b;
                    "
                >
                    Tambahkan data pengurus RT
                </p>

            </div>


            <form
                id="formTambahPengurus"
                style="
                    padding:24px;
                    display:grid;
                    gap:18px;
                "
            >

                <div>

                    <label
                        for="pengurusNama"
                        style="
                            display:block;
                            margin-bottom:7px;
                            font-weight:600;
                        "
                    >
                        Nama Pengurus *
                    </label>


                    <input
                        id="pengurusNama"
                        type="text"
                        required
                        placeholder="Contoh: Budi Santoso"
                        style="
                            width:100%;
                            padding:11px 13px;
                            border:1px solid #d1d5db;
                            border-radius:8px;
                            box-sizing:border-box;
                        "
                    >

                </div>


                <div>

                    <label
                        for="pengurusJabatan"
                        style="
                            display:block;
                            margin-bottom:7px;
                            font-weight:600;
                        "
                    >
                        Jabatan *
                    </label>


                    <input
                        id="pengurusJabatan"
                        type="text"
                        required
                        placeholder="Contoh: Ketua RT"
                        style="
                            width:100%;
                            padding:11px 13px;
                            border:1px solid #d1d5db;
                            border-radius:8px;
                            box-sizing:border-box;
                        "
                    >

                </div>


                <div>

                    <label
                        for="pengurusFoto"
                        style="
                            display:block;
                            margin-bottom:7px;
                            font-weight:600;
                        "
                    >
                        Foto
                    </label>


                    <input
                        id="pengurusFoto"
                        type="text"
                        placeholder="ID file Google Drive (opsional)"
                        style="
                            width:100%;
                            padding:11px 13px;
                            border:1px solid #d1d5db;
                            border-radius:8px;
                            box-sizing:border-box;
                        "
                    >


                    <small
                        style="
                            display:block;
                            margin-top:6px;
                            color:#64748b;
                        "
                    >
                        Upload foto Google Drive akan kita
                        integrasikan pada tahap berikutnya.
                    </small>

                </div>


                <div>

                    <label
                        for="pengurusDeskripsi"
                        style="
                            display:block;
                            margin-bottom:7px;
                            font-weight:600;
                        "
                    >
                        Deskripsi
                    </label>


                    <textarea
                        id="pengurusDeskripsi"
                        rows="4"
                        placeholder="Deskripsi singkat pengurus..."
                        style="
                            width:100%;
                            padding:11px 13px;
                            border:1px solid #d1d5db;
                            border-radius:8px;
                            box-sizing:border-box;
                            resize:vertical;
                        "
                    ></textarea>

                </div>


                <div
                    style="
                        display:grid;
                        grid-template-columns:1fr 1fr;
                        gap:18px;
                    "
                >

                    <div>

                        <label
                            for="pengurusUrutan"
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                            "
                        >
                            Urutan
                        </label>


                        <input
                            id="pengurusUrutan"
                            type="number"
                            min="0"
                            value="0"
                            style="
                                width:100%;
                                padding:11px 13px;
                                border:1px solid #d1d5db;
                                border-radius:8px;
                                box-sizing:border-box;
                            "
                        >

                    </div>


                    <div>

                        <label
                            for="pengurusAktif"
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                            "
                        >
                            Status
                        </label>


                        <select
                            id="pengurusAktif"
                            style="
                                width:100%;
                                padding:11px 13px;
                                border:1px solid #d1d5db;
                                border-radius:8px;
                                box-sizing:border-box;
                                background:white;
                            "
                        >

                            <option value="true">
                                Aktif
                            </option>


                            <option value="false">
                                Tidak Aktif
                            </option>

                        </select>

                    </div>

                </div>


                <div
                    style="
                        display:grid;
                        grid-template-columns:1fr 1fr;
                        gap:18px;
                    "
                >

                    <div>

                        <label
                            for="pengurusMulai"
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                            "
                        >
                            Periode Mulai
                        </label>


                        <input
                            id="pengurusMulai"
                            type="date"
                            style="
                                width:100%;
                                padding:11px 13px;
                                border:1px solid #d1d5db;
                                border-radius:8px;
                                box-sizing:border-box;
                            "
                        >

                    </div>


                    <div>

                        <label
                            for="pengurusSelesai"
                            style="
                                display:block;
                                margin-bottom:7px;
                                font-weight:600;
                            "
                        >
                            Periode Selesai
                        </label>


                        <input
                            id="pengurusSelesai"
                            type="date"
                            style="
                                width:100%;
                                padding:11px 13px;
                                border:1px solid #d1d5db;
                                border-radius:8px;
                                box-sizing:border-box;
                            "
                        >

                    </div>

                </div>


                <div
                    style="
                        display:flex;
                        justify-content:flex-end;
                        gap:10px;
                        margin-top:10px;
                    "
                >

                    <button
                        type="button"
                        class="btn"
                        onclick="renderPengurus()"
                    >
                        Batal
                    </button>


                    <button
                        type="submit"
                        class="btn btn-primary"
                        id="btnSimpanPengurus"
                    >
                        Simpan Pengurus
                    </button>

                </div>

            </form>

        </div>

    `;


    const form =
        document.getElementById(
            "formTambahPengurus"
        );


    if (form) {

        form.addEventListener(
            "submit",
            handleTambahPengurus
        );

    }

}


/* =========================================================
   SIMPAN PENGURUS
========================================================= */

async function handleTambahPengurus(
    event
) {

    event.preventDefault();


    const nama =
        document
            .getElementById(
                "pengurusNama"
            )
            .value
            .trim();


    const jabatan =
        document
            .getElementById(
                "pengurusJabatan"
            )
            .value
            .trim();


    const foto =
        document
            .getElementById(
                "pengurusFoto"
            )
            .value
            .trim();


    const deskripsi =
        document
            .getElementById(
                "pengurusDeskripsi"
            )
            .value
            .trim();


    const urutan =
        Number(
            document
                .getElementById(
                    "pengurusUrutan"
                )
                .value
        );


    const aktif =
        document
            .getElementById(
                "pengurusAktif"
            )
            .value === "true";


    const periodeMulai =
        document
            .getElementById(
                "pengurusMulai"
            )
            .value;


    const periodeSelesai =
        document
            .getElementById(
                "pengurusSelesai"
            )
            .value;


    if (!nama) {

        showToast(
            "Nama pengurus wajib diisi."
        );

        return;

    }


    if (!jabatan) {

        showToast(
            "Jabatan wajib diisi."
        );

        return;

    }


    const button =
        document.getElementById(
            "btnSimpanPengurus"
        );


    if (button) {

        button.disabled = true;

        button.textContent =
            "Menyimpan...";

    }


    try {

        const result =
            await apiRequest(
                "/pengurus",
                {
                    method: "POST",

                    body: JSON.stringify({

                        nama:
                            nama,

                        jabatan:
                            jabatan,

                        foto_file_id:
                            foto ||
                            null,

                        deskripsi:
                            deskripsi ||
                            null,

                        urutan:
                            Number.isFinite(
                                urutan
                            )
                                ? urutan
                                : 0,

                        periode_mulai:
                            periodeMulai ||
                            null,

                        periode_selesai:
                            periodeSelesai ||
                            null,

                        is_active:
                            aktif

                    })
                }
            );


        if (
            result.status !==
            "success"
        ) {

            throw new Error(
                result.message ||
                "Gagal menyimpan pengurus."
            );

        }


        showToast(
            "Pengurus berhasil ditambahkan."
        );


        await renderPengurus();


        /*
         * Update angka Pengurus
         * pada dashboard.
         */

        try {

            const resultPengurus =
                await apiRequest(
                    "/pengurus"
                );


            statPengurus.textContent =
                resultPengurus.count ??
                0;

        } catch (error) {

            console.error(
                "Gagal memperbarui statistik pengurus:",
                error
            );

        }


    } catch (error) {

        console.error(
            "Gagal menambahkan pengurus:",
            error
        );


        showToast(
            error.message ||
            "Gagal menyimpan pengurus."
        );


        if (button) {

            button.disabled = false;

            button.textContent =
                "Simpan Pengurus";

        }

    }

}


/* =========================================================
   EDIT PENGURUS
========================================================= */

function editPengurus(
    id
) {

    showToast(
        "Fitur edit pengurus akan dibuat pada tahap berikutnya."
    );

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    const page =
                        item.dataset.page;


                    navigateToPage(
                        page
                    );

                }
            );

        }
    );


    const pageButtons =
        document.querySelectorAll(
            "[data-page]"
        );


    pageButtons.forEach(
        button => {

            if (
                button.classList.contains(
                    "nav-item"
                )
            ) {

                return;

            }


            button.addEventListener(
                "click",
                () => {

                    const page =
                        button.dataset.page;


                    navigateToPage(
                        page
                    );

                }
            );

        }
    );

}


function navigateToPage(
    page
) {

    if (
        !pageConfig[page]
    ) {

        return;

    }


    const sections =
        document.querySelectorAll(
            ".page-section"
        );


    sections.forEach(
        section => {

            section.classList.remove(
                "active"
            );

        }
    );


    const target =
        document.getElementById(
            `page-${page}`
        );


    if (target) {

        target.classList.add(
            "active"
        );

    }


    /*
     * KHUSUS PENGURUS
     */

    if (
        page === "pengurus"
    ) {

        renderPengurus();

    }


    const navItems =
        document.querySelectorAll(
            ".nav-item"
        );


    navItems.forEach(
        item => {

            item.classList.toggle(
                "active",
                item.dataset.page === page
            );

        }
    );


    pageTitle.textContent =
        pageConfig[page].title;


    pageDescription.textContent =
        pageConfig[page].description;


    sidebar.classList.remove(
        "open"
    );


    if (
        page === "dashboard"
    ) {

        loadDashboard();

    }

}


/* =========================================================
   LOGOUT
========================================================= */

function handleLogout() {

    clearSession();

    showLogin();

    showToast(
        "Anda telah keluar."
    );

}


/* =========================================================
   PASSWORD
========================================================= */

function setupPasswordToggle() {

    if (!togglePassword) {

        return;

    }


    togglePassword.addEventListener(
        "click",
        () => {

            const isPassword =
                passwordInput.type ===
                "password";


            passwordInput.type =
                isPassword
                    ? "text"
                    : "password";


            togglePassword.textContent =
                isPassword
                    ? "🙈"
                    : "👁";

        }
    );

}


/* =========================================================
   LOADING
========================================================= */

function setLoginLoading(
    loading
) {

    loginButton.disabled =
        loading;


    loginSpinner.classList.toggle(
        "hidden",
        !loading
    );


    loginButtonText.textContent =
        loading
            ? "Memproses..."
            : "Masuk";

}


/* =========================================================
   LOGIN ERROR
========================================================= */

function showLoginError(
    message
) {

    loginError.textContent =
        message;


    loginError.classList.remove(
        "hidden"
    );

}


function hideLoginError() {

    loginError.textContent =
        "";


    loginError.classList.add(
        "hidden"
    );

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(
    message
) {

    if (!toast) {

        return;

    }


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2800
        );

}


/* =========================================================
   SECURITY / HTML ESCAPE
========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {

    if (!mobileMenuButton) {

        return;

    }


    mobileMenuButton.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );

        }
    );

}


/* =========================================================
   YEAR
========================================================= */

function setYear() {

    const year =
        document.getElementById(
            "loginYear"
        );


    if (year) {

        year.textContent =
            new Date()
                .getFullYear();

    }

}


/* =========================================================
   INITIALIZATION
========================================================= */

async function initialize() {

    setYear();


    setupNavigation();


    setupPasswordToggle();


    setupMobileMenu();


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            handleLogout
        );

    }


    await verifySession();

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);
