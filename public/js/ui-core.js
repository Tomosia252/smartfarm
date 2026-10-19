// CORE UI FUNCTIONS & TOAST SYSTEM

/**
 * Menampilkan Notifikasi Toast Ringkas
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    container.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = `toast-enter flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border pointer-events-auto backdrop-blur-md bg-slate-900/90 text-white border-slate-700/50 text-xs`;

    let iconHTML = '<i class="fa-solid fa-bell text-jade-400"></i>';
    if (type === 'success') {
        iconHTML = '<i class="fa-solid fa-circle-check text-emerald-400"></i>';
    } else if (type === 'error') {
        iconHTML = '<i class="fa-solid fa-circle-exclamation text-rose-400"></i>';
    }

    toast.innerHTML = `
        <div class="flex-shrink-0 text-sm">${iconHTML}</div>
        <div class="flex-1 font-medium leading-tight text-slate-200">${message}</div>
        <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white ml-1 p-1">
            <i class="fa-solid fa-xmark text-xs"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.remove('toast-enter');
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }
    }, 3500);
}

// FUNGSI NAVIGASI BOTTOM BAR
function switchPage(pageName) {
    const pages = ['dashboard', 'tasks', 'ai', 'profile'];
    pages.forEach(p => {
        const pageEl = document.getElementById(`page-${p}`);
        const navEl = document.getElementById(`nav-${p}`);
        if (pageEl) {
            if (p === pageName) {
                pageEl.classList.remove('hidden');
            } else {
                pageEl.classList.add('hidden');
            }
        }
        if (navEl) {
            if (p === pageName) {
                navEl.className = "flex flex-col items-center gap-1.5 text-jade-600 font-bold transition-all";
            } else {
                navEl.className = "flex flex-col items-center gap-1.5 text-slate-400 hover:text-slate-600 font-medium transition-all";
            }
        }
    });
}

// Override Alert Global
window.alert = function(message) {
    if (message.includes('❌') || message.includes('⚠️') || message.includes('Gagal')) {
        showToast(message.replace(/[❌⚠️]/g, ''), 'error');
    } else if (message.includes('🎉') || message.includes('✅') || message.includes('berhasil')) {
        showToast(message.replace(/[🎉✅]/g, ''), 'success');
    } else {
        showToast(message, 'info');
    }
};