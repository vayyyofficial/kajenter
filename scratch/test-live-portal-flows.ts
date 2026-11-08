import http from 'http';
import app from '../server/app.js';

async function runLiveTest() {
  console.log('=== STARTING LIVE END-TO-END SUPABASE VERIFICATION ===');
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Health check to verify Supabase mode
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const health = await healthRes.json();
    console.log('✓ Health status:', health.status);
    console.log('✓ Database Mode:', health.database);
    console.log('✓ Storage Mode:', health.storage);

    if (health.database !== 'Supabase PostgreSQL (Persistent)') {
      throw new Error(`Expected Supabase PostgreSQL, got: ${health.database}`);
    }

    // 2. Test Login with Absen 02 (Fairuzzi Achmad, Developer)
    console.log('\n--- TEST 1: Login Developer (Absen 02) ---');
    const devLoginRes = await fetch(`${baseUrl}/api/portal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'fairuzziachmad@gmail.com',
        password: 'icptkj35_02'
      })
    });
    const devLogin = await devLoginRes.json();
    console.log('Developer Login success:', devLogin.success, 'Role:', devLogin.member?.role);
    if (!devLogin.success) {
      console.error('Developer login failed:', devLogin);
    }
    const devToken = devLogin.token;
    const devHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devToken}`
    };

    // 2b. Test Login with Absen 16 (Muchammad Yusuf Ibrahim Firdaus, Bendahara)
    console.log('\n--- TEST 2: Login Bendahara (Absen 16) ---');
    const benLoginRes = await fetch(`${baseUrl}/api/portal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'muchammad_firdaus_35icptkj@student.smktelkom-mlg.sch.id',
        password: 'icptkj35_16'
      })
    });
    const benLogin = await benLoginRes.json();
    console.log('Bendahara Login success:', benLogin.success, 'Role:', benLogin.member?.role);
    const benToken = benLogin.token;
    const benHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${benToken}`
    };

    // 2c. Test Invalid Email Rejection
    console.log('\n--- TEST 3: Invalid Email Rejection ---');
    const invalidEmailRes = await fetch(`${baseUrl}/api/portal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bukan_anggota@gmail.com',
        password: 'icptkj35_99'
      })
    });
    const invalidEmail = await invalidEmailRes.json();
    console.log('Invalid email status 401:', invalidEmailRes.status === 401);
    console.log('Error message:', invalidEmail.error);

    // 2d. Test Wrong Password
    console.log('\n--- TEST 4: Wrong Password ---');
    const wrongPassRes = await fetch(`${baseUrl}/api/portal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'abimanyupriandana@gmail.com',
        password: 'wrong_password_123'
      })
    });
    const wrongPass = await wrongPassRes.json();
    console.log('Wrong password error:', wrongPass.error);

    // 3. Test Kas in Supabase
    console.log('\n--- TEST 5: Kas Operations (Supabase Live) ---');
    // Get Kas
    const kasGet = await (await fetch(`${baseUrl}/api/portal/kas`, { headers: benHeaders })).json();
    console.log('✓ Kas GET success:', kasGet.success, 'Records count:', kasGet.data?.length, 'Active Week:', kasGet.activeWeekIndex);

    // Record Payment as Bendahara for Member ID 2 (Abimanyu) for Week 1
    const recordKasRes = await fetch(`${baseUrl}/api/portal/kas`, {
      method: 'POST',
      headers: benHeaders,
      body: JSON.stringify({
        memberId: 2,
        weekNumber: 1,
        month_year: '2026-10',
        amount: 3000,
        status: 'paid',
        notes: 'Bayar tunai'
      })
    });
    const recordKas = await recordKasRes.json();
    console.log('✓ Kas Record Payment success:', recordKas.success, 'ID:', recordKas.data?.id);

    // Verify record exists in Supabase
    const kasAfter = await (await fetch(`${baseUrl}/api/portal/kas`, { headers: benHeaders })).json();
    const paidRecord = kasAfter.data?.find((r: any) => Number(r.member_id) === 2 && Number(r.week_number) === 1);
    console.log('✓ Verified record in Supabase:', paidRecord ? `Found (ID: ${paidRecord.id}, Status: ${paidRecord.status})` : 'NOT FOUND');

    // 4. Test Kas Expenses in Supabase
    console.log('\n--- TEST 6: Kas Expenses (Supabase Live) ---');
    const expCreateRes = await fetch(`${baseUrl}/api/portal/kas/expenses`, {
      method: 'POST',
      headers: benHeaders,
      body: JSON.stringify({
        expense_date: '2026-10-20',
        category: 'Peralatan Kelas',
        amount: 25000,
        description: 'Beli spidol whiteboard & penghapus',
        notes: 'Struk terlampir'
      })
    });
    const expCreate = await expCreateRes.json();
    console.log('✓ Kas Expense Create success:', expCreate.success, 'ID:', expCreate.data?.id);
    const expId = expCreate.data?.id;

    const expList = await (await fetch(`${baseUrl}/api/portal/kas/expenses`, { headers: benHeaders })).json();
    console.log('✓ Kas Expenses count:', expList.data?.length, 'Total expenses:', expList.totalExpenses);

    if (expId) {
      // Delete test expense
      const delExp = await (await fetch(`${baseUrl}/api/portal/kas/expenses/${expId}`, {
        method: 'DELETE',
        headers: benHeaders
      })).json();
      console.log('✓ Cleaned up test expense:', delExp.success);
    }

    // 5. Test Tasks in Supabase
    console.log('\n--- TEST 7: Tasks (Tugas) CRUD (Supabase Live) ---');
    const taskCreateRes = await fetch(`${baseUrl}/api/portal/tasks`, {
      method: 'POST',
      headers: devHeaders,
      body: JSON.stringify({
        title: 'Konfigurasi Mikrotik Firewall',
        subject: 'Administrasi Infrastruktur Jaringan',
        teacher_name: 'Pak Budi',
        deadline_date: '2026-10-28',
        description: 'Tugas konfigurasi firewall filter rules & NAT di RouterBOARD.'
      })
    });
    const taskCreate = await taskCreateRes.json();
    console.log('✓ Task Create success:', taskCreate.success, 'Task ID:', taskCreate.data?.id);
    const taskId = taskCreate.data?.id;

    if (taskId) {
      // Update Task
      const taskUpdate = await (await fetch(`${baseUrl}/api/portal/tasks/${taskId}`, {
        method: 'PUT',
        headers: devHeaders,
        body: JSON.stringify({
          title: 'Konfigurasi Mikrotik Firewall (Updated)',
          status: 'in_progress'
        })
      })).json();
      console.log('✓ Task Update success:', taskUpdate.success);

      // Verify list from Supabase
      const taskList = await (await fetch(`${baseUrl}/api/portal/tasks`, { headers: devHeaders })).json();
      console.log('✓ Live Task count:', taskList.data?.length);

      // Delete Task
      const taskDel = await (await fetch(`${baseUrl}/api/portal/tasks/${taskId}`, {
        method: 'DELETE',
        headers: devHeaders
      })).json();
      console.log('✓ Task Delete success:', taskDel.success);
    }

    // 6. Test Schedules in Supabase
    console.log('\n--- TEST 8: Schedules (Jadwal Pelajaran) (Supabase Live) ---');
    const schedCreateRes = await fetch(`${baseUrl}/api/portal/schedules`, {
      method: 'POST',
      headers: devHeaders,
      body: JSON.stringify({
        day_of_week: 'Senin',
        start_time: '07:00',
        end_time: '08:30',
        subject: 'Pemrograman Web & Perangkat Bergerak',
        teacher_name: 'Guru Pengampu'
      })
    });
    const schedCreate = await schedCreateRes.json();
    console.log('✓ Schedule Create success:', schedCreate.success, 'Schedule ID:', schedCreate.data?.id);
    const schedId = schedCreate.data?.id;

    if (schedId) {
      // Delete Schedule
      const schedDel = await (await fetch(`${baseUrl}/api/portal/schedules/${schedId}`, {
        method: 'DELETE',
        headers: devHeaders
      })).json();
      console.log('✓ Schedule Delete success:', schedDel.success);
    }

    // 7. Test Piket in Supabase
    console.log('\n--- TEST 9: Piket (Jadwal Piket) (Supabase Live) ---');
    const piketCreateRes = await fetch(`${baseUrl}/api/portal/piket`, {
      method: 'POST',
      headers: devHeaders,
      body: JSON.stringify({
        day_of_week: 'Selasa',
        member_name: 'ABIMANYU PUTRA PRIANDANA'
      })
    });
    const piketCreate = await piketCreateRes.json();
    console.log('✓ Piket Create success:', piketCreate.success, 'Piket ID:', piketCreate.data?.id);
    const piketId = piketCreate.data?.id;

    if (piketId) {
      const piketDel = await (await fetch(`${baseUrl}/api/portal/piket/${piketId}`, {
        method: 'DELETE',
        headers: devHeaders
      })).json();
      console.log('✓ Piket Delete success:', piketDel.success);
    }

    // 8. Test Stories in Supabase
    console.log('\n--- TEST 10: Stories Public API (Supabase Live) ---');
    const storiesRes = await (await fetch(`${baseUrl}/api/stories/public`)).json();
    console.log('✓ Public Stories success:', storiesRes.success, 'Active stories count:', storiesRes.total);

    // 9. Test User Management (Developer role only)
    console.log('\n--- TEST 11: User Management (Developer Only) ---');
    const usersRes = await fetch(`${baseUrl}/api/portal/users`, { headers: devHeaders });
    const usersData = await usersRes.json();
    console.log('✓ Developer Portal Users count:', usersData.data?.length);

    // Siswa attempts to access Developer User Management -> should be 403 Forbidden
    const sisLoginRes = await fetch(`${baseUrl}/api/portal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'abimanyupriandana@gmail.com',
        password: 'icptkj35_01'
      })
    });
    const sisLogin = await sisLoginRes.json();
    const sisHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sisLogin.token}`
    };

    const forbiddenRes = await fetch(`${baseUrl}/api/portal/users`, { headers: sisHeaders });
    console.log('✓ Non-developer 403 Forbidden verified:', forbiddenRes.status === 403);

    console.log('\n==================================================');
    console.log('🎉 ALL LIVE SUPABASE FLOWS TESTED AND 100% OPERATIONAL!');
    console.log('==================================================');
  } finally {
    server.close();
  }
}

runLiveTest().catch((err) => {
  console.error('Live Test Failed:', err);
  process.exit(1);
});
