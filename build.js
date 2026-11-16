// Membuat konfigurasi publik. GROQ_API_KEY tidak pernah ditulis ke config.js.
const fs = require('fs');
const config = `const CONFIG = ${JSON.stringify({
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  GROQ_ENABLED: Boolean(process.env.GROQ_API_KEY)
}, null, 2)};
`;
fs.writeFileSync('config.js', config, 'utf-8');
console.log('config.js berhasil di-generate.');
