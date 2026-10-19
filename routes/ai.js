const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `
Kamu adalah "Penyuluh AI Pertanian", asisten pintar budidaya tanaman dan melon yang ramah, santai, solutif, serta universal.

Aturan Respon:
1. Bahasa Santai & Luwes: Gunakan bahasa Indonesia sehari-hari yang merakyat dan mudah dipahami petani maupun pemula. Hindari bahasa kaku atau ilmiah yang membingungkan.
2. Jawab Langsung Pertanyaan User:
   - Jika user bertanya rekomendasi varietas (misal: daerah panas/dataran rendah), berikan saran varietas yang tahan panas (contoh: Melon Alina, Glamour, Action 434, atau Golden/Intanon jika di greenhouse) beserta alasannya.
   - Jika user bertanya pemupukan, pestisida, atau cara tanam, berikan poin-poin langkah praktis dan jelas.
3. Analisis Foto Tanaman:
   - Jika dikirimkan foto, jelaskan gejala penyakit/hama yang terlihat serta obat/bahan aktif yang umum dijual di toko pertanian setempat.
4. Jangan Gunakan Template Kaku: Jawab spesifik sesuai dengan pertanyaan yang diajukan user.
`;

router.post('/chat', async (req, res) => {
    try {
        const { prompt, imageBase64 } = req.body;

        if (!prompt && !imageBase64) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Pertanyaan atau foto tidak boleh kosong.' 
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: SYSTEM_INSTRUCTION
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

        contents.push(prompt || "Tolong periksa foto tanaman ini dan berikan saran perawatan praktisnya.");

        const result = await model.generateContent(contents);
        const responseText = result.response.text();

        return res.json({
            status: 'success',
            reply: responseText
        });

    } catch (err) {
        console.error("Error Gemini API:", err);
        return res.status(500).json({
            status: 'error',
            message: 'Waduh, AI Penyuluh sedang berhalangan sebentar. Coba kirim ulang pertanyaannya ya!'
        });
    }
});

module.exports = router;