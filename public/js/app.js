// ==========================================
// SMARTFARM - CORE APP LOGIC (app.js)
// ==========================================

window.API_URL = window.API_URL || 'http://localhost:3000/api';
let currentUser = JSON.parse(localStorage.getItem('smartfarm_user')) || null;
let activeProjectIdForTask = null; 
let activeTaskId = null; // FIX MUTLAK: Mengunci ID Tugas di memori JS, bukan di HTML
let taskPhotoBase64 = null;
let activeProjectsList = []; 

document.addEventListener('DOMContentLoaded', () => {
    checkAuthView();
    if (currentUser) {
        initApp();
    }
});

// ------------------------------------------
// 0. AUTENTIKASI & TOAST (TAMPILAN NOTIF)
// ------------------------------------------
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-xs font-bold text-white z-[9999] transition-opacity duration-300 shadow-lg ${type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(`${window.API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await res.json();

        if (res.ok && result.status === 'success') {
            showToast(result.message, "success");
            localStorage.setItem('smartfarm_user', JSON.stringify(result.user));
            checkAuthView();
            initApp();
        } else {
            showToast(result.message || "Login gagal.", "error");
        }
    } catch (err) {
        showToast("Gagal terhubung ke server.", "error");
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const nama = document.getElementById('reg-nama').value;
    const email = document.getElementById('reg-email').value;
    const no_hp = document.getElementById('reg-hp').value; // Diubah dari reg-phone menjadi reg-hp
    const password = document.getElementById('reg-password').value;

    try {
        const res = await fetch(`${window.API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama, email, password, no_hp })
        });
        const result = await res.json();

        if (res.ok && result.status === 'success') {
            showToast(result.message, "success");
            localStorage.setItem('smartfarm_user', JSON.stringify(result.user));
            checkAuthView();
            initApp();
        } else {
            showToast(result.message || "Pendaftaran gagal.", "error");
        }
    } catch (err) {
        showToast("Gagal terhubung ke server.", "error");
    }
}

function handleLogout() {
    localStorage.removeItem('smartfarm_user');
    currentUser = null;
    activeProjectIdForTask = null;
    activeTaskId = null;
    activeProjectsList = [];
    checkAuthView();
    showToast("Berhasil keluar.", "success");
}

function checkAuthView() {
    currentUser = JSON.parse(localStorage.getItem('smartfarm_user')) || null;
    window.currentUser = currentUser;

    const viewAuth = document.getElementById('view-auth');
    const viewApp = document.getElementById('view-app');
    
    if (currentUser) {
        if (viewAuth) viewAuth.classList.add('hidden');
        if (viewApp) viewApp.classList.remove('hidden');
        
        const profNama = document.getElementById('prof-nama');
        const profEmail = document.getElementById('prof-email');
        const profAvatar = document.getElementById('prof-avatar');
        const headerUser = document.getElementById('header-user-name');
        const greetingText = document.getElementById('greeting-text');

        if (currentUser.nama) {
            if (profNama) profNama.textContent = currentUser.nama;
            if (headerUser) headerUser.textContent = currentUser.nama;
            if (greetingText) greetingText.textContent = `Halo, ${currentUser.nama.split(' ')[0]}! 👋`;
            if (profAvatar) profAvatar.textContent = currentUser.nama.charAt(0).toUpperCase();
        }
        if (currentUser.email && profEmail) profEmail.textContent = currentUser.email;
    } else {
        if (viewAuth) viewAuth.classList.remove('hidden');
        if (viewApp) viewApp.classList.add('hidden');
    }
}

function initApp() {
    initCustomDropdown(); 
    fetchUserProjects();
    fetchWeather();
    
    const slider = document.getElementById('hourly-weather-container');
    if (slider) enableDragScroll(slider);
}

function toggleModalProject() {
    const modal = document.getElementById('modal-project');
    if (modal) {
        modal.classList.toggle('hidden');
    }
}

// ------------------------------------------
// 1. UI CUSTOM DROPDOWN (PENGGANTI <SELECT> KAKU)
// ------------------------------------------
function initCustomDropdown() {
    const selectElement = document.getElementById('proj-crop');
    if (!selectElement) return;
    if (document.getElementById('custom-crop-dropdown')) return; 

    selectElement.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.id = 'custom-crop-dropdown';
    wrapper.className = 'relative w-full mb-4';

    const options = Array.from(selectElement.options).map(opt => ({
        value: opt.value,
        text: opt.text
    }));
    
    let selectedText = options.length > 0 ? options[0].text : 'Pilih Varietas';

    const trigger = document.createElement('div');
    trigger.className = 'w-full px-4 py-3 border-2 border-emerald-400 text-slate-700 rounded-2xl flex justify-between items-center cursor-pointer bg-white transition-all hover:border-emerald-500';
    trigger.innerHTML = `
        <span id="custom-dropdown-text" class="text-[13px] font-bold">${selectedText}</span> 
        <i class="fa-solid fa-chevron-down text-emerald-500 transition-transform duration-300" id="custom-dropdown-icon"></i>
    `;

    const menu = document.createElement('ul');
    menu.className = 'absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl hidden overflow-hidden';
    
    let menuHtml = '';
    options.forEach((opt, index) => {
        const isFirst = index === 0;
        menuHtml += `
            <li class="px-4 py-3 text-[13px] font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${isFirst ? 'bg-emerald-50 text-emerald-700 font-bold' : ''}" data-value="${opt.value}">
                ${opt.text}
            </li>
        `;
    });
    menu.innerHTML = menuHtml;

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    selectElement.parentNode.insertBefore(wrapper, selectElement.nextSibling);

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
        document.getElementById('custom-dropdown-icon').classList.toggle('rotate-180');
    });

    menu.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = li.getAttribute('data-value');
            const txt = li.textContent.trim();
            
            selectElement.value = val;
            document.getElementById('custom-dropdown-text').textContent = txt;
            
            menu.classList.add('hidden');
            document.getElementById('custom-dropdown-icon').classList.remove('rotate-180');
            
            menu.querySelectorAll('li').forEach(el => {
                el.classList.remove('bg-emerald-50', 'text-emerald-700', 'font-bold');
            });
            li.classList.add('bg-emerald-50', 'text-emerald-700', 'font-bold');
        });
    });

    document.addEventListener('click', () => {
        menu.classList.add('hidden');
        const icon = document.getElementById('custom-dropdown-icon');
        if(icon) icon.classList.remove('rotate-180');
    });
}

// ------------------------------------------
// 2. MANAJEMEN MULTI-PROYEK (BERANDA)
// ------------------------------------------
async function fetchUserProjects() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${window.API_URL}/projects/user/${currentUser.id_user}`, { cache: 'no-store' });
        const result = await res.json();

        const dashCropName = document.getElementById('dash-crop-name');
        let oldStaticProjectCard = null;
        if (dashCropName) {
            oldStaticProjectCard = dashCropName.closest('.bg-white') || dashCropName.parentElement;
        }

        let accordionContainer = document.getElementById('smartfarm-accordion-container');
        if (!accordionContainer) {
            accordionContainer = document.createElement('div');
            accordionContainer.id = 'smartfarm-accordion-container';
            accordionContainer.className = 'space-y-4 mb-6 mt-2';
            
            if (oldStaticProjectCard && oldStaticProjectCard.parentNode) {
                oldStaticProjectCard.parentNode.insertBefore(accordionContainer, oldStaticProjectCard);
                oldStaticProjectCard.style.display = 'none'; 
            } else {
                const insertPoint = document.getElementById('predictive-container') || document.querySelector('.mt-6');
                if (insertPoint && insertPoint.parentNode) {
                    insertPoint.parentNode.insertBefore(accordionContainer, insertPoint);
                }
            }
        }

        if (result.status === 'success' && result.data && result.data.length > 0) {
            activeProjectsList = result.data; 
            let html = '<h3 class="font-bold text-slate-800 text-sm mb-2 px-1">Manajemen Kebun Aktif</h3>';
            
            result.data.forEach((proj, index) => {
                const start = new Date(proj.tanggal_mulai);
                start.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const diffDays = Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24)));
                const percent = Math.min(100, Math.round((diffDays / proj.masa_tanam_hari) * 100));
                const nextFertilizerDay = Math.ceil((diffDays === 0 ? 1 : diffDays) / 7) * 7;
                const daysLeft = Math.max(0, nextFertilizerDay - diffDays);

                let displayNama = proj.nama_tanaman;
                let displayLokasi = proj.lokasi_lahan || "";
                if (displayLokasi.includes('[') && displayLokasi.includes(']')) {
                    const parts = displayLokasi.split('[');
                    displayLokasi = parts[0].trim();
                    displayNama = parts[1].replace(']', '').trim();
                }

                html += `
                    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300 mb-4">
                        <div class="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50" onclick="toggleProjectAccordion(${proj.id_project})">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 flex-shrink-0">
                                    <i class="fa-solid fa-leaf"></i>
                                </div>
                                <div>
                                    <h3 class="font-bold text-sm text-slate-800">${displayNama}</h3>
                                    <p class="text-[10px] text-slate-500"><i class="fa-solid fa-location-dot text-emerald-500 mr-1"></i>${displayLokasi} • ${proj.ukuran_lahan_m2}m²</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="text-right">
                                    <span class="block font-bold text-emerald-600 text-[11px]">${diffDays === 0 ? "Hari ke-0" : `Hari ke-${diffDays}`}</span>
                                    <span class="block text-[9px] text-slate-400">Progres ${percent}%</span>
                                </div>
                                <i class="fa-solid fa-chevron-down text-slate-400 transition-transform duration-300" id="icon-acc-${proj.id_project}"></i>
                            </div>
                        </div>

                        <div id="body-acc-${proj.id_project}" class="hidden border-t border-slate-100 p-4 bg-slate-50/50">
                            <div class="flex justify-between text-[10px] text-slate-500 mb-1 font-bold">
                                <span>Masa Tanam (${proj.masa_tanam_hari} Hari)</span>
                                <span>${percent}%</span>
                            </div>
                            <div class="w-full bg-slate-200 rounded-full h-2 mb-4">
                                <div class="bg-emerald-500 h-2 rounded-full" style="width: ${percent}%"></div>
                            </div>

                            <div class="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl flex items-center justify-between mb-4">
                                <div class="flex items-center gap-2">
                                    <i class="fa-solid fa-flask text-indigo-500"></i>
                                    <div>
                                        <h4 class="text-[10px] font-bold text-indigo-900">Jadwal Pupuk Susulan</h4>
                                        <p class="text-[9px] text-indigo-600">${daysLeft === 0 ? "⚠️ Waktunya pemupukan hari ini!" : `${daysLeft} hari lagi (Hari ke-${nextFertilizerDay})`}</p>
                                    </div>
                                </div>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-[10px] text-slate-500 italic">Cek Bar bawah untuk jadwal tugas.</span>
                                <button onclick="deleteProject(${proj.id_project})" class="text-[10px] text-rose-500 font-bold bg-white border border-rose-200 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition shadow-sm"><i class="fa-solid fa-trash mr-1"></i>Hapus Kebun</button>
                            </div>
                        </div>
                    </div>
                `;
            });
            accordionContainer.innerHTML = html;
            
            fetchAllTasks();

            if(result.data.length > 0) {
                const firstBody = document.getElementById(`body-acc-${result.data[0].id_project}`);
                const firstIcon = document.getElementById(`icon-acc-${result.data[0].id_project}`);
                if(firstBody && firstIcon) {
                    firstBody.classList.remove('hidden');
                    firstIcon.style.transform = 'rotate(180deg)';
                }
            }
            
        } else {
            activeProjectsList = [];
            fetchAllTasks(); 
            accordionContainer.innerHTML = `
                <div class="bg-white p-6 text-center rounded-3xl text-slate-400 border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <i class="fa-solid fa-seedling text-3xl mb-3 text-slate-300"></i>
                    <p class="text-xs font-bold text-slate-600 mb-1">Belum Ada Proyek Aktif</p>
                    <p class="text-[10px]">Silakan klik tombol di bawah untuk mulai menanam.</p>
                </div>
            `;
        }
    } catch (err) {
        showToast("Gagal merender data proyek lokal.", "info");
        console.error(err);
    }
}

window.toggleProjectAccordion = function(id) {
    const body = document.getElementById(`body-acc-${id}`);
    const icon = document.getElementById(`icon-acc-${id}`);
    if (!body || !icon) return;
    
    if (body.classList.contains('hidden')) {
        body.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        body.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}

async function handleCreateProject(e) {
    e.preventDefault();
    if (!currentUser) return;

    let idCrop = 1; 
    let selectedCropName = "Melon Alina";
    
    const cropSelect = document.getElementById('proj-crop');
    if (cropSelect) {
        const val = cropSelect.value;
        if (cropSelect.options) {
            selectedCropName = cropSelect.options[cropSelect.selectedIndex].text;
        } else {
            selectedCropName = val;
        }

        if (!isNaN(parseInt(val))) {
            idCrop = parseInt(val);
        } else {
            if (val.toLowerCase().includes('glamour')) idCrop = 2;
            else if (val.toLowerCase().includes('intanon')) idCrop = 3;
        }
    }

    const payload = {
        id_user: currentUser.id_user,
        id_crop: idCrop, 
        ukuran_lahan_m2: parseInt(document.getElementById('proj-area')?.value) || 50,
        lokasi_lahan: document.getElementById('proj-location')?.value || "Halaman Rumah",
        modal_awal: parseInt(document.getElementById('proj-modal')?.value) || 250000,
        tanggal_mulai: new Date().toISOString().split('T')[0]
    };

    try {
        let res = await fetch(`${window.API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            payload.id_crop = 1; 
            payload.lokasi_lahan = payload.lokasi_lahan + ` [${selectedCropName}]`;
            
            res = await fetch(`${window.API_URL}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        
        const result = await res.json();
        
        if (res.ok) {
            showToast("Proyek berhasil dibuat!", "success");
            toggleModalProject();
            
            if (document.getElementById('proj-location')) document.getElementById('proj-location').value = '';
            if (document.getElementById('proj-area')) document.getElementById('proj-area').value = '';
            
            await fetchUserProjects(); 
        } else {
            showToast(result.message || "Gagal membuat proyek baru.", "error");
        }
    } catch (err) {
        showToast("Gagal terhubung ke server.", "error");
    }
}

// ------------------------------------------
// 3. TAB SOP TUGAS (DENGAN PROJECT ACCORDION)
// ------------------------------------------
async function fetchAllTasks() {
    const tasksContainer = document.getElementById('tasks-container');
    const badgeCount = document.getElementById('task-badge-count');
    
    if (!activeProjectsList || activeProjectsList.length === 0) {
        if (tasksContainer) tasksContainer.innerHTML = `
            <div class="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                <i class="fa-regular fa-calendar-xmark text-3xl text-slate-300 mb-3"></i>
                <span class="text-[11px] font-bold text-slate-600">Belum Ada Tugas SOP</span>
                <span class="text-[9px] text-slate-400 mt-1">Buat kebun baru terlebih dahulu di Beranda.</span>
            </div>
        `;
        if (badgeCount) badgeCount.textContent = `0 Pending`;
        return;
    }

    let totalPending = 0;
    let finalHtml = '';

    for (const proj of activeProjectsList) {
        try {
            const res = await fetch(`${window.API_URL}/tasks/${proj.id_project}`, { cache: 'no-store' }); 
            const result = await res.json();
            
            if (result.status === 'success' && result.data) {
                let hasPending = false;
                let taskListHtml = '';

                let displayNama = proj.nama_tanaman;
                let displayLokasi = proj.lokasi_lahan || "";
                if (displayLokasi.includes('[') && displayLokasi.includes(']')) {
                    const parts = displayLokasi.split('[');
                    displayLokasi = parts[0].trim();
                    displayNama = parts[1].replace(']', '').trim();
                }
                
                result.data.forEach(task => {
                    if (task.status === 'pending' || !task.is_completed) {
                        hasPending = true;
                        totalPending++;
                        taskListHtml += `
                            <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-2 cursor-pointer transition-all hover:border-emerald-300" onclick="toggleTaskDetail(${task.id_task})">
                                <div class="flex items-center justify-between gap-3">
                                    <div class="w-full">
                                        <div class="flex items-center justify-between mb-1">
                                            <h4 class="font-bold text-slate-800 text-[11px]">${task.nama_tugas}</h4>
                                            <span class="inline-block text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                                                ${task.tanggal_tenggat ? new Date(task.tanggal_tenggat).toLocaleDateString('id-ID') : 'Hari ini'}
                                            </span>
                                        </div>
                                        <div id="desc-task-${task.id_task}" class="hidden mt-2 pt-2 border-t border-slate-100">
                                            <p class="text-[9px] text-slate-500 leading-snug mb-2">${task.deskripsi}</p>
                                            <button onclick="event.stopPropagation(); openTaskModal(${task.id_task}, this.closest('.bg-white'), ${proj.id_project})" type="button" class="w-full py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center text-[10px] font-bold transition border border-emerald-200/60">
                                                <i class="fa-solid fa-check mr-1"></i> Tandai Selesai
                                            </button>
                                        </div>
                                    </div>
                                    <div id="check-icon-${task.id_task}" class="w-6 h-6 rounded-full border border-slate-300 flex-shrink-0 flex items-center justify-center text-slate-300 bg-slate-50 transition-colors">
                                        <i class="fa-solid fa-chevron-down text-[9px]"></i>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                });

                if (hasPending) {
                    finalHtml += `
                        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-4">
                            <div class="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50" onclick="toggleTaskProjectAccordion(${proj.id_project})">
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 flex-shrink-0">
                                        <i class="fa-solid fa-clipboard-list"></i>
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-[12px] text-slate-800">${displayNama}</h3>
                                        <p class="text-[9px] text-slate-500">Tugas SOP • ${displayLokasi}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <span class="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">Perlu Aksi</span>
                                    <i class="fa-solid fa-chevron-down text-slate-400 transition-transform duration-300" id="icon-task-proj-${proj.id_project}"></i>
                                </div>
                            </div>
                            <div id="body-task-proj-${proj.id_project}" class="hidden border-t border-slate-100 p-3 bg-slate-50/50">
                                ${taskListHtml}
                            </div>
                        </div>
                    `;
                }
            }
        } catch(e) {
            console.error(e);
        }
    }

    if (tasksContainer) {
        tasksContainer.innerHTML = finalHtml || `
            <div class="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                <i class="fa-solid fa-clipboard-check text-3xl text-emerald-400 mb-3"></i>
                <span class="text-[11px] font-bold text-emerald-700">Semua SOP Selesai 🎉</span>
                <span class="text-[9px] text-emerald-600/80 mt-1">Kebun Anda sudah terawat dengan baik hari ini.</span>
            </div>
        `;
    }
    if (badgeCount) badgeCount.textContent = `${totalPending} Pending`;
}

window.toggleTaskProjectAccordion = function(id) {
    const body = document.getElementById(`body-task-proj-${id}`);
    const icon = document.getElementById(`icon-task-proj-${id}`);
    if (!body || !icon) return;

    if (body.classList.contains('hidden')) {
        body.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        body.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}

window.toggleTaskDetail = function(id) {
    const desc = document.getElementById(`desc-task-${id}`);
    const checkIcon = document.getElementById(`check-icon-${id}`);
    if (!desc) return;
    
    if (desc.classList.contains('hidden')) {
        desc.classList.remove('hidden');
        if(checkIcon) {
            checkIcon.classList.remove('bg-slate-50', 'text-slate-300', 'border-slate-300');
            checkIcon.classList.add('bg-emerald-100', 'text-emerald-500', 'border-emerald-300');
            checkIcon.innerHTML = `<i class="fa-solid fa-chevron-up text-[9px]"></i>`;
        }
    } else {
        desc.classList.add('hidden');
        if(checkIcon) {
            checkIcon.classList.add('bg-slate-50', 'text-slate-300', 'border-slate-300');
            checkIcon.classList.remove('bg-emerald-100', 'text-emerald-500', 'border-emerald-300');
            checkIcon.innerHTML = `<i class="fa-solid fa-chevron-down text-[9px]"></i>`;
        }
    }
}

// ------------------------------------------
// 4. LAPORAN TUGAS & FOTO KAMERA
// ------------------------------------------
let currentTaskBtn = null;

window.openTaskModal = function(taskId, btn, projectId) {
    activeTaskId = taskId; // FIX: Mengunci task ID ke memori Javascript
    activeProjectIdForTask = projectId; 
    currentTaskBtn = btn;
    
    // Opsional, fallback untuk field HTML lama
    const idField = document.getElementById('current-task-id');
    if (idField) idField.value = taskId;
    
    const modal = document.getElementById('modal-task');
    if (modal) modal.classList.remove('hidden');
}

function closeTaskModal() {
    const modal = document.getElementById('modal-task');
    if (modal) modal.classList.add('hidden');
    removeTaskPhoto();
}

function previewTaskPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        taskPhotoBase64 = event.target.result;
        document.getElementById('task-photo-preview').src = taskPhotoBase64;
        document.getElementById('task-photo-preview-container').classList.remove('hidden');
        document.getElementById('task-photo-name').textContent = file.name;
    };
    reader.readAsDataURL(file);
}

function removeTaskPhoto() {
    taskPhotoBase64 = null;
    document.getElementById('task-photo').value = '';
    document.getElementById('task-photo-preview-container').classList.add('hidden');
    document.getElementById('task-photo-name').textContent = 'Belum ada foto';
}

async function submitTaskReport(e) {
    e.preventDefault();
    
    // FIX: Cegah pengiriman jika memori JS tidak menyimpan ID yang akurat
    if (!activeProjectIdForTask || !activeTaskId) {
        showToast("Error referensi tugas. Silakan refresh halaman.", "error");
        return;
    }

    const inputCondition = document.getElementById('task-condition');
    let condition = inputCondition ? inputCondition.value.trim() : "Aman";
    if (!condition) condition = "Aman";

    const payload = {
        id_project: activeProjectIdForTask,
        id_task: activeTaskId, // Mengambil langsung dari memori JS
        tanggal: new Date().toISOString().split('T')[0],
        status_siram: true,
        kondisi_tanaman: condition,
        foto_kondisi: taskPhotoBase64,
        catatan_petani: 'Dilaporkan via PWA'
    };

    closeTaskModal(); 

    if (!navigator.onLine) {
        let offlineQueue = JSON.parse(localStorage.getItem('smartfarm_offline_queue')) || [];
        offlineQueue.push(payload);
        localStorage.setItem('smartfarm_offline_queue', JSON.stringify(offlineQueue));
        showToast("Laporan disimpan offline.", "info");
        
        fetchTasksForProject(activeProjectIdForTask); // Refresh mini dasbor
        fetchAllTasks(); // Refresh tab SOP
        return;
    }

    try {
        await fetch(`${window.API_URL}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        showToast(`Tugas selesai!`, "success");
        
        // Refresh UI secara individual agar tidak menghilangkan tugas proyek lainnya
        fetchTasksForProject(activeProjectIdForTask); 
        fetchAllTasks(); 
        
    } catch (err) {
        showToast("Gagal menyinkronkan ke server.", "error");
    }
}

// ------------------------------------------
// 5. RESET KEBUN / HAPUS PROYEK
// ------------------------------------------
function toggleModalDeleteProject() {
    const modal = document.getElementById('modal-delete-project');
    if (modal) {
        modal.classList.toggle('hidden');
    }
}

window.deleteProject = function(id) {
    activeProjectIdForTask = id;
    toggleModalDeleteProject();
}

async function confirmDeleteProject() {
    toggleModalDeleteProject();
    if(!activeProjectIdForTask) return;

    try {
        const res = await fetch(`${window.API_URL}/projects/${activeProjectIdForTask}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (res.ok) {
            showToast("Proyek berhasil dihapus!", "success");
            fetchUserProjects(); 
        } else {
            showToast("Gagal menghapus proyek.", "error");
        }
    } catch (err) {
        showToast("Kesalahan jaringan saat menghapus proyek.", "error");
    }
}

// ------------------------------------------
// 6. WEATHER & DRAG SCROLL
// ------------------------------------------
async function fetchWeather() {
    try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-6.8886&longitude=109.6273&hourly=temperature_2m,relative_humidity_2m,weather_code&current_weather=true&timezone=Asia%2FJakarta');
        const data = await res.json();

        if (data.current_weather) {
            const temp = document.getElementById('weather-temp');
            if (temp) temp.textContent = `${Math.round(data.current_weather.temperature)}°C`;
        }

        const container = document.getElementById('hourly-weather-container');
        if (container && data.hourly) {
            let hourlyHTML = '';
            const currentHour = new Date().getHours();
            for (let i = currentHour; i < currentHour + 12; i++) {
                const timeStr = `${String(i % 24).padStart(2, '0')}.00`;
                const tempVal = Math.round(data.hourly.temperature_2m[i]);
                hourlyHTML += `
                    <div class="bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 text-center flex-shrink-0 snap-start">
                        <span class="text-[9px] text-jade-100 block">${timeStr}</span>
                        <i class="fa-solid fa-cloud-sun text-amber-300 text-xs my-1 block"></i>
                        <span class="text-xs font-bold block">${tempVal}°C</span>
                    </div>
                `;
            }
            container.innerHTML = hourlyHTML;
        }
    } catch (err) {
        console.error("Gagal mengambil data cuaca:", err);
    }
}

function enableDragScroll(slider) {
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        slider.classList.add('cursor-grabbing');
        slider.classList.remove('cursor-grab');
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => {
        isDown = false;
        slider.classList.remove('cursor-grabbing');
        slider.classList.add('cursor-grab');
    });
    slider.addEventListener('mouseup', () => {
        isDown = false;
        slider.classList.remove('cursor-grabbing');
        slider.classList.add('cursor-grab');
    });
    slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 2;
        slider.scrollLeft = scrollLeft - walk;
    });
}

// ------------------------------------------
// 7. AI PENYULUH CHAT & UPLOAD FOTO
// ------------------------------------------
async function handleAIChat(e) {
    e.preventDefault();
    const input = document.getElementById('ai-input');
    const chatBox = document.getElementById('chat-box');
    const query = input.value.trim();
    if (!query) return;

    chatBox.innerHTML += `
        <div class="bg-jade-600 text-white p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-sm ml-auto">
            ${query}
        </div>
    `;
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `
        <div id="${loadingId}" class="bg-indigo-50 text-indigo-900 p-3.5 rounded-2xl max-w-[85%] border border-indigo-100 text-xs shadow-sm flex items-center gap-2">
            <i class="fa-solid fa-circle-notch fa-spin text-indigo-600"></i> AI Penyuluh sedang berpikir...
        </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const res = await fetch(`${window.API_URL}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: query })
        });
        const data = await res.json();

        document.getElementById(loadingId)?.remove();

        if (data.status === 'success') {
            let formattedReply = data.reply
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

            chatBox.innerHTML += `
                <div class="bg-indigo-50 text-indigo-900 p-3.5 rounded-2xl max-w-[85%] border border-indigo-100 text-xs leading-relaxed shadow-sm space-y-1">
                    ${formattedReply}
                </div>
            `;
        } else {
            showToast(data.message || "Gagal mendapatkan respon AI.", "error");
        }
    } catch (err) {
        document.getElementById(loadingId)?.remove();
        showToast("Gagal terhubung ke server AI Penyuluh.", "error");
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

function handleCameraUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const chatBox = document.getElementById('chat-box');
    const reader = new FileReader();

    reader.onload = async function(event) {
        const base64Image = event.target.result;

        chatBox.innerHTML += `
            <div class="bg-jade-600 text-white p-2 rounded-2xl max-w-[70%] shadow-sm ml-auto">
                <img src="${base64Image}" class="w-full h-32 object-cover rounded-xl mb-1">
                <p class="text-[10px] px-1">Foto tanaman dikirim...</p>
            </div>
        `;
        chatBox.scrollTop = chatBox.scrollHeight;

        const loadingId = 'loading-' + Date.now();
        chatBox.innerHTML += `
            <div id="${loadingId}" class="bg-indigo-50 text-indigo-900 p-3.5 rounded-2xl max-w-[85%] border border-indigo-100 text-xs shadow-sm flex items-center gap-2">
                <i class="fa-solid fa-circle-notch fa-spin text-indigo-600"></i> Memeriksa kondisi tanaman dari foto...
            </div>
        `;
        chatBox.scrollTop = chatBox.scrollHeight;

        try {
            const res = await fetch(`${window.API_URL}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: "Tolong analisa kondisi tanaman pada foto ini dan berikan saran perawatan yang cocok.",
                    imageBase64: base64Image
                })
            });
            const data = await res.json();

            document.getElementById(loadingId)?.remove();

            if (data.status === 'success') {
                let formattedReply = data.reply
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br>');

                chatBox.innerHTML += `
                    <div class="bg-indigo-50 text-indigo-900 p-3.5 rounded-2xl max-w-[85%] border border-indigo-100 text-xs leading-relaxed shadow-sm">
                        ${formattedReply}
                    </div>
                `;
            } else {
                showToast(data.message || "Gagal mendapatkan respon AI.", "error");
            }
        } catch (err) {
            document.getElementById(loadingId)?.remove();
            showToast("Gagal menganalisis foto.", "error");
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    reader.readAsDataURL(file);
}