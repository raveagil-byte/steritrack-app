import { Instrument, LogEntry, Transaction } from '../types';

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Clean key to ensure it's not a placeholder or empty
const IS_VALID_GEMINI_KEY = GEMINI_API_KEY && GEMINI_API_KEY !== 'PLACEHOLDER_API_KEY' && GEMINI_API_KEY.length > 20;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const OLLAMA_API_URL = 'http://127.0.0.1:11434/api/generate';
const OLLAMA_MODEL = 'gemma2:2b';

export const analyzeSystemState = async (
  query: string,
  instruments: Instrument[],
  transactions: Transaction[],
  logs: LogEntry[]
): Promise<string> => {

  // 1. Prepare Context Summary
  const stockSummary = instruments.map(i =>
    `- ${i.name}: Steril(${i.cssdStock}), Kotor(${i.dirtyStock}), Terdistribusi(${Object.values(i.unitStock).reduce((a: any, b: any) => a + b, 0)})`
  ).join('\n');

  const recentLogs = logs.slice(0, 10).map(l =>
    `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.message}`
  ).join('\n');

  // 2. Construct the Prompt
  const context = `
    Konteks Sistem:
    Anda adalah asisten cerdas untuk Departemen Pusat Sterilisasi (CSSD) di sebuah Rumah Sakit.
    
    Inventaris Saat Ini:
    ${stockSummary}

    Log Aktivitas Terbaru:
    ${recentLogs}
  `;

  // 3. Try Gemini First (if key exists)
  if (IS_VALID_GEMINI_KEY) {
    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: context + `\n\nPertanyaan Pengguna: "${query}"\n\nJawablah drngan ringkas dan profesional (Bahasa Indonesia).` }]
          }]
        }),
      });

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch (e) {
          errData = { error: response.statusText };
        }
        console.warn("Gemini API Error:", errData);
        throw new Error(`Gemini Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;

    } catch (error) {
      console.error("Gemini failed, falling back to Ollama...", error);
    }
  }

  // 4. Fallback to Ollama
  try {
    const prompt = `${context}\n\nPertanyaan Pengguna: "${query}"\n\nInstruksi: Jawab dengan ringkas (Bahasa Indonesia).`;

    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: { temperature: 0.7 }
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || "Tidak ada respons dari Ollama.";

  } catch (error) {
    console.error("AI Service Error:", error);
    if (IS_VALID_GEMINI_KEY) {
      return "Maaf, terjadi kesalahan pada layanan AI (Gemini & Ollama tidak merespons). Periksa koneksi internet Anda.";
    }
    return "Maaf, saya tidak dapat terhubung ke Ollama (Local AI). Pastikan Ollama berjalan di port 11434 atau tambahkan VITE_GEMINI_API_KEY di .env agar bisa menggunakan Google Gemini.";
  }
};
