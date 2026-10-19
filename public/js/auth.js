window.API_URL = "http://localhost:3000/api";

function togglePassword(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    
    if (!input || !icon) return;

    if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
    }
}

function switchAuthTab(tab) {
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');
    const tabLogin = document.getElementById('btn-tab-login');
    const tabReg = document.getElementById('btn-tab-register');

    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        regForm.classList.add('hidden');
        tabLogin.className = "flex-1 py-2.5 text-xs font-bold rounded-xl bg-white shadow-sm text-jade-700 transition";
        tabReg.className = "flex-1 py-2.5 text-xs font-bold rounded-xl text-slate-500 hover:text-slate-700 transition";
    } else {
        loginForm.classList.add('hidden');
        regForm.classList.remove('hidden');
        tabReg.className = "flex-1 py-2.5 text-xs font-bold rounded-xl bg-white shadow-sm text-jade-700 transition";
        tabLogin.className = "flex-1 py-2.5 text-xs font-bold rounded-xl text-slate-500 hover:text-slate-700 transition";
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const nama = document.getElementById('reg-nama').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const no_hp = document.getElementById('reg-hp').value.trim();
    const password = document.getElementById('reg-password').value.trim();

    if (!nama || !email || !no_hp || !password) {
        showToast("Harap isi seluruh kolom pendaftaran.", "error"); // Menggunakan showToast dari ui-core.js
        return;
    }

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ nama, email, no_hp, password })
        });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            localStorage.setItem('smartfarm_user', JSON.stringify(data.user));
            location.reload();
        } else {
            showToast(data.message || "Gagal mendaftarkan akun.", "error");
        }
    } catch (err) {
        showToast("Terjadi kesalahan jaringan saat mendaftar.", "error");
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!email || !password) {
        showToast("Harap isi email dan password.", "error");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok && data.status === 'success') {
            localStorage.setItem('smartfarm_user', JSON.stringify(data.user));
            location.reload();
        } else {
            showToast(data.message || "Gagal masuk. Periksa kembali email dan password.", "error");
        }
    } catch (err) {
        showToast("Terjadi kesalahan jaringan saat masuk.", "error");
    }
}

// === LOGIKA LOGOUT BARU ===

// 1. Fungsi untuk memunculkan/menyembunyikan Modal Logout
function toggleModalLogout() {
    const modal = document.getElementById('modal-logout');
    if (modal) {
        modal.classList.toggle('hidden');
    }
}

// 2. Fungsi ini dipanggil dari Tombol "Keluar Akun" di Header dan Menu Profil
function handleLogout() {
    // Tampilkan Modal Konfirmasi alih-alih menggunakan confirm()
    toggleModalLogout();
}

// 3. Fungsi ini dijalankan JIKA pengguna menekan tombol "Ya, Keluar" di dalam Modal
function confirmLogout() {
    localStorage.removeItem('smartfarm_user');
    location.reload();
}