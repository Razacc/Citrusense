const MAX_CSV_LENGTH = 4000;
const MAX_IMAGE_LENGTH = 2500000;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metode tidak diizinkan.' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Layanan AI belum dikonfigurasi.' });

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Format permintaan tidak valid.' });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  const csvText = typeof body.csvText === 'string' ? body.csvText : '';
  const imageData = typeof body.imageData === 'string' ? body.imageData : '';
  if (question.length > 2000 || csvText.length > MAX_CSV_LENGTH ||
      imageData.length > MAX_IMAGE_LENGTH ||
      (imageData && !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(imageData))) {
    return res.status(413).json({ error: 'Konten terlalu besar atau format lampiran tidak didukung.' });
  }
  if (!question && !csvText && !imageData) {
    return res.status(400).json({ error: 'Pesan atau lampiran wajib diisi.' });
  }

  const sensorData = body.sensorData && typeof body.sensorData === 'object' ? body.sensorData : {};
  const sensor = key => {
    const value = sensorData[key];
    return typeof value === 'string' || typeof value === 'number' ? String(value).slice(0, 32) : '--';
  };
  let prompt = question || 'Tolong analisis data atau gambar yang saya lampirkan.';
  if (csvText) {
    prompt += `\n\n--- DATA CSV TERLAMPIR ---\n${csvText}\n\nAnalisis data CSV di atas dan berikan kesimpulan atau tren yang relevan.`;
  }

  const messages = [{
    role: 'system',
    content: `Kamu adalah CitruSense Bot, asisten AI ahli pertanian jeruk berbasis IoT.
Kondisi kebun real-time: Suhu ${sensor('suhu')}°C, Kelembapan ${sensor('kelembapan_udara')}%, Tanah ${sensor('rata_rata_tanah')}%, TDS ${sensor('tds')} PPM, pH ${sensor('ph')}.
Berikan jawaban ringkas, solutif, dan gunakan markdown.`
  }, {
    role: 'user',
    content: imageData
      ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageData } }]
      : prompt
  }];

  const model = imageData ? 'qwen/qwen3.8-27b' : 'openai/gpt-oss-20b';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 1024 }),
      signal: controller.signal
    });
    const result = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: result.error?.message || 'Layanan AI gagal memproses permintaan.' });
    }

    const answer = result.choices?.[0]?.message?.content;
    if (typeof answer !== 'string') {
      return res.status(502).json({ error: 'Layanan AI mengembalikan respons yang tidak valid.' });
    }
    return res.status(200).json({ answer });
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'Layanan AI melewati batas waktu. Silakan coba lagi.'
      : 'Tidak dapat terhubung ke layanan AI.';
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
};
