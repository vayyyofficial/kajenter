async function runTests() {
  const BASE_URL = 'http://localhost:5000/api/portal/auth';
  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, detail: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} - ${detail}`);
    }
  }

  console.log('\n--- STARTING PORTAL AUTH VERIFICATION SUITE ---\n');

  // Test 1: Empty Email
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: 'any' }),
    });
    const data = await res.json();
    assert(
      'Test 1: Empty Email Validation',
      res.status === 400 && data.error === 'Masukkan email anggota kelas.',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e: any) {
    assert('Test 1: Empty Email Validation', false, e.message);
  }

  // Test 2: Empty Password
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fairuzziachmad@gmail.com', password: '' }),
    });
    const data = await res.json();
    assert(
      'Test 2: Empty Password Validation',
      res.status === 400 && data.error === 'Masukkan password Anda.',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e: any) {
    assert('Test 2: Empty Password Validation', false, e.message);
  }

  // Test 3: Unregistered Email
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bukan.anggota@gmail.com', password: 'icptkj35_02' }),
    });
    const data = await res.json();
    assert(
      'Test 3: Unregistered Email',
      res.status === 401 && data.error === 'Akun ini tidak terdaftar sebagai anggota kelas X ICP TKJ.',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e: any) {
    assert('Test 3: Unregistered Email', false, e.message);
  }

  // Test 4: Wrong Password
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fairuzziachmad@gmail.com', password: 'password_salah' }),
    });
    const data = await res.json();
    assert(
      'Test 4: Wrong Password',
      res.status === 401 && data.error === 'Password salah. Silakan coba lagi.',
      `Status: ${res.status}, Error: ${data.error}`
    );
  } catch (e: any) {
    assert('Test 4: Wrong Password', false, e.message);
  }

  // Test 5: Valid Login with fairuzziachmad@gmail.com + icptkj35_02
  let token = '';
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fairuzziachmad@gmail.com', password: 'icptkj35_02' }),
    });
    const data = await res.json();
    token = data.token;
    assert(
      'Test 5: Valid Login with Default Password icptkj35_02',
      res.status === 200 && data.success === true && Boolean(data.token) && data.member?.role === 'Developer',
      `Status: ${res.status}, Member: ${JSON.stringify(data.member)}, Success: ${data.success}`
    );
  } catch (e: any) {
    assert('Test 5: Valid Login', false, e.message);
  }

  // Test 6: Authenticated Session (/me)
  try {
    const res = await fetch(`${BASE_URL}/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    assert(
      'Test 6: Valid Session Token (/me)',
      res.status === 200 && data.success === true && data.member?.email === 'fairuzziachmad@gmail.com',
      `Status: ${res.status}, Member: ${JSON.stringify(data.member)}`
    );
  } catch (e: any) {
    assert('Test 6: Valid Session Token (/me)', false, e.message);
  }

  console.log(`\n--- RESULTS: ${passed}/${total} PASSED ---`);
}

runTests();
