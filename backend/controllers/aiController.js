// Node 18+ includes native fetch

// In Node 18+, fetch is available globally. If using older node, might need polyfill.
// Assuming Node 18+ based on project reqs.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const OLLAMA_API_URL = 'http://127.0.0.1:11434/api/generate';
const OLLAMA_MODEL = 'gemma2:2b';

const HF_API_KEY = process.env.HF_API_KEY; // Hugging Face Token

exports.analyze = async (req, res) => {
    const { query, stockSummary, unitSummary, recentLogs } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    const context = `
    PERAN:
    Anda adalah Asisten Cerdas SIAPPMEN (Sistem Aplikasi Pengambilan dan Pendistribusian Instrumen) di Unit sterilisasi (CSSD) Rumah Sakit.
    Tugas Anda adalah membantu staf memantau stok dan aktivitas instrumen berdasarkan data yang diberikan.

    INSTRUKSI:
    1. Jawablah HANYA berdasarkan data "Data Inventaris", "Data Unit", dan "Log Aktivitas" di bawah ini.
    2. Jika informasi tidak ada di data, katakan "Maaf, data tidak tersedia untuk menjawab hal tersebut".
    3. Gunakan Bahasa Indonesia yang sopan, formal, dan ringkas.
    4. Hindari kalimat pembuka yang basa-basi. Langsung ke inti jawaban.

    DATA INVENTARIS LIVE:
    ${stockSummary || 'Data Kosong'}

    DATA UNIT / RUANGAN:
    ${unitSummary || 'Data Kosong'}

    LOG AKTIVITAS TERBARU (10 Terakhir):
    ${recentLogs || 'Belum ada aktivitas'}
    `;

    // Priority 1: Gemini (Google)
    const isValidGeminiKey = GEMINI_API_KEY && GEMINI_API_KEY.length > 20;

    if (isValidGeminiKey) {
        try {
            console.log("Attempting Gemini AI...");
            const response = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: context + `\n\nPertanyaan Pengguna: "${query}"\n\nJawablah dengan ringkas dan profesional (Bahasa Indonesia).` }]
                    }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) return res.json({ response: text, source: 'gemini' });
            } else {
                const errText = await response.text();
                console.error(`Gemini API Error: ${response.status} - ${errText}`);
            }
        } catch (error) {
            console.error("Gemini attempt failed:", error.message);
        }
    }

    // Priority 2: Hugging Face (Open Source Models - Mistral/Llama)
    if (HF_API_KEY) {
        try {
            console.log("Attempting Hugging Face...");
            // Using Qwen2.5-Coder-32B-Instruct as a robust alternative
            const HF_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-Coder-32B-Instruct";

            const response = await fetch(HF_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${HF_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    inputs: `[INST] ${context}\n\n${query} [/INST]`,
                    parameters: { max_new_tokens: 500, return_full_text: false }
                })
            });

            if (response.ok) {
                const data = await response.json();
                // HF returns array of objects with generated_text
                const text = data[0]?.generated_text;
                if (text) return res.json({ response: text, source: 'huggingface' });
            } else {
                console.warn(`HF API Error: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error("Hugging Face attempt failed:", error.message);
        }
    }

    // Priority 3: Pollinations.ai (Free, No Auth Key Required)
    try {
        console.log("Attempting Pollinations.ai (No Auth)...");
        const POLLINATIONS_URL = "https://text.pollinations.ai/";

        const response = await fetch(POLLINATIONS_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: context + "\n\nInstruksi: Jawab ringkas dalam Bahasa Indonesia." },
                    { role: "user", content: query }
                ],
                model: "openai", // Pollinations default
                seed: 42,
                jsonMode: false
            })
        });

        if (response.ok) {
            const data = await response.text(); // Pollinations usually returns raw text
            if (data) return res.json({ response: data, source: 'pollinations (free)' });
        } else {
            console.warn(`Pollinations Error: ${response.status}`);
        }
    } catch (error) {
        console.error("Pollinations attempt failed:", error.message);
    }

    // Priority 4: Fallback to Ollama (Local Only - Fails on Vercel)
    try {
        console.log("Attempting Ollama...");
        const prompt = `${context}\n\nPertanyaan Pengguna: "${query}"\n\nInstruksi: Jawab dengan ringkas (Bahasa Indonesia).`;

        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                options: { temperature: 0.7 }
            })
        });

        if (!response.ok) throw new Error(`Ollama API Error: ${response.statusText}`);

        const data = await response.json();
        return res.json({ response: data.response, source: 'ollama' });

    } catch (error) {
        console.error("AI Service Error:", error.message);

        let msg = "Maaf, layanan AI tidak tersedia saat ini.";
        // Debugging info
        const debugInfo = {
            gemini_check: isValidGeminiKey ? 'KEY_PRESENT' : 'KEY_MISSING',
            hf_check: HF_API_KEY ? 'KEY_PRESENT' : 'KEY_MISSING',
            hf_key_sample: HF_API_KEY ? HF_API_KEY.substring(0, 5) + '...' : 'null'
        };
        console.log("AI DEBUG STATUS:", debugInfo);

        if (!isValidGeminiKey && !HF_API_KEY) {
            msg = "Sistem AI belum dikonfigurasi. Harap tambahkan GEMINI_API_KEY atau HF_API_KEY (Hugging Face) di environment variables.";
        } else {
            msg = "Gagal terhubung ke semua penyedia AI (Gemini/HuggingFace/Ollama). Periksa konsol server untuk detail error.";
        }

        return res.status(503).json({ error: msg, details: error.message, debug: debugInfo });
    }
};
