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
        localStorage.getItem(USER_KEY);

    if (!raw) {
        return null;
    }

    try {

        return JSON.parse(raw);

    } catch (error) {

        return null;
    }
}


function saveSession(token, user) {

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

async function handleLogin(event) {

    event.preventDefault();


    const username =
        usernameInput.value.trim();

    const password =
        passwordInput.value;


    hideLoginError();


    if (!username || !password) {

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

    const user =
        getStoredUser();


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
                id: currentUser.sub,
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


    updateUserInterface(user);


    loadDashboard();
}


function updateUserInterface(user) {

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


function formatRole(role) {

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
         * Endpoint kegiatan belum dibuat
         * pada backend Stage 1.
         *
         * Untuk sementara tampilkan 0.
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
                                ${escapeHtml(row[0])}
                            </span>

                            <span class="site-info-value">
                                ${escapeHtml(row[1])}
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


function buildRegion(map) {

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

function renderPengurus() {

    const target =
        document.getElementById("page-pengurus");

    if (!target) {
        return;
    }

    target.innerHTML = `
        <div class="card">

            <div class="card-header">

                <div>
                    <h3>Daftar Pengurus</h3>
                    <p>Kelola struktur pengurus RT</p>
                </div>

                <button
                    class="btn btn-primary"
                    type="button"
                    onclick="showTambahPengurus()"
                >
                    + Tambah Pengurus
                </button>

            </div>

            <div class="empty-state">

                <div class="empty-icon">
                    ♟
                </div>

                <h3>Belum ada pengurus</h3>

                <p>
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

        </div>
    `;
}


function showTambahPengurus() {

    alert(
        "Form Tambah Pengurus akan kita buat pada langkah berikutnya."
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


function navigateToPage(page) {

    if (!pageConfig[page]) {
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

    if (page === "pengurus") {

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


    if (page === "dashboard") {

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
   ERROR
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

    loginError.textContent = "";

    loginError.classList.add(
        "hidden"
    );
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function showToast(message) {

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

function escapeHtml(value) {

    return String(value)
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


    loginForm.addEventListener(
        "submit",
        handleLogin
    );


    logoutButton.addEventListener(
        "click",
        handleLogout
    );


    await verifySession();
}


document.addEventListener(
    "DOMContentLoaded",
    initialize
);
