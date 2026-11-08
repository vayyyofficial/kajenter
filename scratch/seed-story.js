async function seedDemoStory() {
  const l1 = await (await fetch('http://localhost:5000/api/portal/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ketua@tkj.sch.id', password: 'icptkj35_01' })
  })).json();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
    <rect width="100%" height="100%" fill="#0d1117"/>
    <rect x="20" y="20" width="560" height="760" rx="16" fill="#161b22" stroke="#30363d" stroke-width="2"/>
    <circle cx="300" cy="350" r="70" fill="#2563eb"/>
    <text x="300" y="470" fill="#ffffff" font-size="22" font-family="sans-serif" text-anchor="middle" font-weight="bold">Kegiatan Lab Jaringan</text>
    <text x="300" y="510" fill="#94a3b8" font-size="15" font-family="sans-serif" text-anchor="middle">Praktikum Mikrotik &amp; Cisco Packet Tracer</text>
  </svg>`;
  
  const formData = new FormData();
  formData.append('image', new File([Buffer.from(svg)], 'lab-tkj.svg', { type: 'image/svg+xml' }));
  formData.append('caption', 'Praktikum jaringan hari ini lancar jaya! Tetap semangat tim X ICP TKJ.');
  formData.append('expirationType', '24h');

  const res = await (await fetch('http://localhost:5000/api/portal/stories', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + l1.token },
    body: formData
  })).json();
  console.log('Demo story response:', res);
}
seedDemoStory();
