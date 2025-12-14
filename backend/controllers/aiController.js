// Node 18+ includes native fetch

// In Node 18+, fetch is available globally. If using older node, might need polyfill.
// Assuming Node 18+ based on project reqs.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const OLLAMA_API_URL = 'http://127.0.0.1:11434/api/generate';
const OLLAMA_MODEL = 'gemma2:2b';

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

    // 1. Try Gemini
    const isValidGeminiKey = GEMINI_API_KEY && GEMINI_API_KEY !== 'PLACEHOLDER_API_KEY' && GEMINI_API_KEY.length > 20;

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

            if (!response.ok) {
                console.warn(`Gemini API returned ${response.status}: ${response.statusText}`);
                // Proceed to fallback
            } else {
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    return res.json({ response: text, source: 'gemini' });
                }
            }
        } catch (error) {
            console.error("Gemini attempt failed:", error.message);
        }
    }

    // 2. Fallback to Ollama
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

        if (!response.ok) {
            throw new Error(`Ollama API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return res.json({ response: data.response, source: 'ollama' });

    } catch (error) {
        console.error("AI Service Error:", error);

        let msg = "Maaf, saya tidak dapat terhubung ke server AI.";
        if (isValidGeminiKey) {
            msg = "Maaf, terjadi kesalahan pada layanan AI (Gemini & Ollama tidak merespons).";
        } else {
            msg = "Maaf, Ollama tidak dapat dihubungi dan API Key Gemini tidak dikonfigurasi.";
        }

        return res.status(503).json({
            error: msg,
            details: error.message
        });
    }
};
