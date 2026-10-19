require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server SmartFarm berjalan di port ${PORT}`);
});
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// ==========================================
// 1. ENDPOINT AUTENTIKASI (REGISTER & LOGIN)
// ==========================================

// Register User Baru
app.post('/api/register', async (req, res) => {
    try {
        const { nama, email, password, no_hp } = req.body || {};
        
        if (!nama || !email || !password || !no_hp) {
            return res.status(400).json({ 
                status: "error", 
                message: "Semua kolom (Nama, Email, No HP, Password) wajib diisi!" 
            });
        }

        const [existing] = await db.query(`SELECT id_user FROM users WHERE email = ?`, [email]);
        if (existing.length > 0) {
            return res.status(400).json({ 
                status: "error", 
                message: "Email sudah terdaftar. Silakan gunakan email lain atau pilih menu Masuk." 
            });
        }

        const [result] = await db.query(
            `INSERT INTO users (nama, email, password, no_hp) VALUES (?, ?, ?, ?)`,
            [nama, email, password, no_hp]
        );

        const newUser = { id_user: result.insertId, nama, email, no_hp };
        console.log("✅ USER BARU BERHASIL DIDAFTARKAN:", newUser);

        return res.json({ 
            status: "success", 
            message: "Pendaftaran akun berhasil!", 
            user: newUser 
        });

    } catch (error) {
        console.error("❌ REGISTER DB ERROR:", error);
        return res.status(500).json({ 
            status: "error", 
            message: "Gagal menyimpan ke database: " + error.message 
        });
    }
});

// Login User
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        
        if (!email || !password) {
            return res.status(400).json({ status: "error", message: "Email dan password wajib diisi!" });
        }

        const [rows] = await db.query(
            `SELECT id_user, nama, email, no_hp FROM users WHERE email = ? AND password = ?`,
            [email, password]
        );

        if (rows.length > 0) {
            return res.json({ status: "success", message: "Login berhasil!", user: rows[0] });
        } else {
            return res.status(401).json({ status: "error", message: "Email atau password salah." });
        }
    } catch (error) {
        console.error("❌ DB LOGIN ERROR:", error);
        return res.status(500).json({ status: "error", message: "Terjadi kesalahan server database: " + error.message });
    }
});

// ==========================================
// 2. ENDPOINT CROPS & PROYEK
// ==========================================

app.get('/api/crops', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM crops');
        res.json({ status: "success", data: rows });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Gagal mengambil katalog tanaman." });
    }
});

app.get('/api/projects/user/:id_user', async (req, res) => {
    const { id_user } = req.params;
    try {
        // FIX: Gunakan LEFT JOIN dan COALESCE agar proyek tetap muncul walau db 'crops' kosong
        const [rows] = await db.query(
            `SELECT p.*, 
                    COALESCE(c.nama_tanaman, 'Melon Alina') AS nama_tanaman, 
                    COALESCE(c.masa_tanam_hari, 65) AS masa_tanam_hari 
             FROM farm_projects p 
             LEFT JOIN crops c ON p.id_crop = c.id_crop 
             WHERE p.id_user = ? 
             ORDER BY p.id_project DESC`,
            [id_user]
        );
        res.json({ status: "success", data: rows });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Gagal mengambil data proyek user." });
    }
});

app.post('/api/projects', async (req, res) => {
    const { id_user, id_crop, ukuran_lahan_m2, lokasi_lahan, modal_awal, tanggal_mulai } = req.body;
    try {
        const [projectResult] = await db.query(
            `INSERT INTO farm_projects (id_user, id_crop, ukuran_lahan_m2, lokasi_lahan, modal_awal, tanggal_mulai) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id_user, id_crop, ukuran_lahan_m2, lokasi_lahan, modal_awal, tanggal_mulai]
        );
        const id_project = projectResult.insertId;

        // Akan sukses mengeksekusi walaupun sop_templates kosong (hanya mengembalikan 0 baris)
        await db.query(
            `INSERT INTO tasks (id_project, nama_tugas, deskripsi, tanggal_tenggat)
             SELECT ?, nama_tugas, deskripsi, DATE_ADD(?, INTERVAL hari_ke DAY)
             FROM sop_templates WHERE id_crop = ?`,
            [id_project, tanggal_mulai, id_crop]
        );

        res.json({ status: "success", message: "Proyek & SOP berhasil dibuat!", data: { id_project } });
    } catch (error) {
        console.error("❌ CREATE PROJECT ERROR:", error);
        res.status(500).json({ status: "error", message: "Gagal membuat proyek baru." });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        const projectId = req.params.id;
        const [result] = await db.query('DELETE FROM farm_projects WHERE id_project = ?', [projectId]);
        
        if (result.affectedRows > 0) {
            return res.json({ status: 'success', message: 'Proyek berhasil dihapus' });
        } else {
            return res.status(404).json({ status: 'error', message: 'Proyek tidak ditemukan' });
        }
    } catch (err) {
        console.error("Error hapus proyek:", err);
        return res.status(500).json({ status: 'error', message: 'Gagal menghapus dari database' });
    }
});

// ==========================================
// 3. ENDPOINT TASKS & PROGRESS
// ==========================================

app.get('/api/tasks/:id_project', async (req, res) => {
    const { id_project } = req.params;
    try {
        const [rows] = await db.query(
            `SELECT * FROM tasks WHERE id_project = ? AND status = 'pending' ORDER BY tanggal_tenggat ASC`,
            [id_project]
        );
        res.json({ status: "success", data: rows });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Gagal mengambil daftar tugas." });
    }
});

app.post('/api/progress', async (req, res) => {
    const { id_project, id_task, tanggal, status_siram, kondisi_tanaman, catatan_petani } = req.body;
    try {
        await db.query(
            `INSERT INTO daily_progress (id_project, tanggal, status_siram, kondisi_tanaman, catatan_petani) VALUES (?, ?, ?, ?, ?)`,
            [id_project, tanggal, status_siram, kondisi_tanaman, catatan_petani]
        );
        if (id_task) {
            await db.query(`UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id_task = ?`, [id_task]);
        }
        res.json({ status: "success", message: "Laporan harian tersimpan!" });
    } catch (error) {
        res.status(500).json({ status: "error", message: "Gagal menyimpan laporan." });
    }
});

// ==========================================
// 4. ENDPOINT CHATBOT AI PENYULUH (GEMINI API)
// ==========================================
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { prompt, imageBase64 } = req.body;

        if (!prompt && !imageBase64) {
            return res.status(400).json({ status: 'error', message: 'Input tidak boleh kosong.' });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: `Kamu adalah "Penyuluh AI Pertanian", asisten pintar budidaya tanaman dan melon yang ramah, santai, solutif, serta universal. Gunakan bahasa Indonesia sehari-hari yang merakyat, lugas, dan mudah dipahami. Berikan poin-poin solusi praktis tanpa berbelit-belit.`
        });

        const contents = [];

        if (imageBase64) {
            let mimeType = 'image/jpeg';
            let rawData = imageBase64;
            const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                rawData = matches[2];
            }
            contents.push({
                inlineData: { mimeType: mimeType, data: rawData }
            });
        }

        contents.push(prompt || "Tolong periksa foto kondisi tanaman ini dan berikan saran penanganannya.");

        const result = await model.generateContent(contents);
        const reply = result.response.text();

        return res.json({ status: 'success', reply });

    } catch (err) {
        console.error("===== ERROR GEMINI API =====", err);
        return res.status(500).json({ status: 'error', message: 'Waduh, AI Penyuluh sedang berhalangan. Coba lagi ya!' });
    }
});

app.listen(PORT, () => console.log(`✅ Server SmartFarm berjalan di http://localhost:${PORT}`));