import { Instrument, LogEntry, Transaction } from '../types';

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

  // 2. Call Backend API
  try {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        stockSummary,
        recentLogs
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `Server error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;

  } catch (error: any) {
    console.error("AI Service Error:", error);
    return `Maaf, terjadi kesalahan: ${error.message || 'Gagal terhubung ke layanan AI'}. Pastikan backend berjalan dan Ollama (jika digunakan) aktif.`;
  }
};
