// Node 18+ includes native fetch

// In Node 18+, fetch is available globally. If using older node, might need polyfill.
// Assuming Node 18+ based on project reqs.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const OLLAMA_API_URL = 'http://127.0.0.1:11434/api/generate';
const OLLAMA_MODEL = 'gemma2:2b';

const HF_API_KEY = process.env.HF_API_KEY; // Hugging Face Token

exports.analyze = async (req, res) => {
    const { query, stockSummary, recentLogs } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    const context = `
    Konteks Sistem:
    Anda adalah asisten cerdas untuk Departemen Pusat Sterilisasi (CSSD) di sebuah Rumah Sakit.
    
    Inventaris Saat Ini:
    ${stockSummary || 'Data tidak tersedia'}

    Log Aktivitas Terbaru:
    ${recentLogs || 'Data tidak tersedia'}
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
            }
        } catch (error) {
            console.error("Gemini attempt failed:", error.message);
        }
    }

    // Priority 2: Hugging Face (Open Source Models - Mistral/Llama)
    if (HF_API_KEY) {
        try {
            console.log("Attempting Hugging Face...");
            // Using Mistral-7B-Instruct-v0.2 as a good open source default
            const HF_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

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

    // Priority 3: Fallback to Ollama (Local Only - Fails on Vercel)
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
        if (!isValidGeminiKey && !HF_API_KEY) {
            msg = "Sistem AI belum dikonfigurasi. Harap tambahkan GEMINI_API_KEY atau HF_API_KEY (Hugging Face) di Vercel Environment Variables.";
        } else {
            msg = "Gagal terhubung ke semua penyedia AI (Gemini/HuggingFace/Ollama).";
        }

        return res.status(503).json({ error: msg, details: error.message });
    }
};
