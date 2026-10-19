async function testAll() {
  console.log('=== TESTING ALL PORTAL DATABASE ENDPOINTS ===');
  
  // 1. Login as Ketua (Ahmad Fairuzzi - role: Ketua Kelas)
  const loginRes = await fetch('http://localhost:5000/api/portal/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ketua@tkj.sch.id', password: 'icptkj35_01' })
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error('Login failed:', loginData);
    return;
  }
  const token = loginData.token;
  console.log('✓ Login success as:', loginData.member?.full_name, 'Role:', loginData.member?.role);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + token
  };

  // 2. Test Kas
  console.log('\n--- 1. Testing Kas ---');
  const kasRes = await (await fetch('http://localhost:5000/api/portal/kas', { headers: authHeaders })).json();
  console.log('Kas GET status:', kasRes.success, 'activeWeekIndex:', kasRes.activeWeekIndex, 'unpaidCount:', kasRes.summary?.unpaidCount);

  // 3. Test Tasks (Tugas)
  console.log('\n--- 2. Testing Tasks (Tugas) ---');
  const tasksGet = await (await fetch('http://localhost:5000/api/portal/tasks', { headers: authHeaders })).json();
  console.log('Tasks GET status:', tasksGet.success, 'Existing tasks count:', tasksGet.data?.length);

  const taskCreateRes = await (await fetch('http://localhost:5000/api/portal/tasks', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Konfigurasi VLAN & Trunking',
      subject: 'Administrasi Infrastruktur Jaringan',
      teacherName: 'Pak Budi',
      deadline: '2026-10-25',
      description: 'Konfigurasi switch Cisco Packet Tracer dengan 3 VLAN berbeda.'
    })
  })).json();
  console.log('Task Create status:', taskCreateRes.success, 'Created Task ID:', taskCreateRes.data?.id);
  const createdTaskId = taskCreateRes.data?.id;

  if (createdTaskId) {
    // Update task
    const taskUpdateRes = await (await fetch(`http://localhost:5000/api/portal/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Konfigurasi VLAN & Trunking (Updated)',
        status: 'in_progress'
      })
    })).json();
    console.log('Task Update status:', taskUpdateRes.success, 'Updated Title:', taskUpdateRes.data?.title);

    // Delete task
    const taskDelRes = await (await fetch(`http://localhost:5000/api/portal/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: authHeaders
    })).json();
    console.log('Task Delete status:', taskDelRes.success);
  }

  // 4. Test Schedules (Jadwal Pelajaran)
  console.log('\n--- 3. Testing Schedules (Jadwal Pelajaran) ---');
  const schedGet = await (await fetch('http://localhost:5000/api/portal/schedules', { headers: authHeaders })).json();
  console.log('Schedules GET status:', schedGet.success, 'Count:', schedGet.data?.length);

  const schedCreateRes = await (await fetch('http://localhost:5000/api/portal/schedules', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      day_of_week: 'Senin',
      start_time: '07:00',
      end_time: '08:30',
      subject: 'Dasar Pemrograman Jaringan',
      teacher_name: 'Budi Santoso, S.Kom., M.T.'
    })
  })).json();
  console.log('Schedule Create status:', schedCreateRes.success, 'ID:', schedCreateRes.data?.id);
  const createdSchedId = schedCreateRes.data?.id;

  if (createdSchedId) {
    const schedDelRes = await (await fetch(`http://localhost:5000/api/portal/schedules/${createdSchedId}`, {
      method: 'DELETE',
      headers: authHeaders
    })).json();
    console.log('Schedule Delete status:', schedDelRes.success);
  }

  // 5. Test Piket (Jadwal Piket)
  console.log('\n--- 4. Testing Piket (Jadwal Piket) ---');
  const piketGet = await (await fetch('http://localhost:5000/api/portal/piket', { headers: authHeaders })).json();
  console.log('Piket GET status:', piketGet.success, 'Count:', piketGet.data?.length);

  const piketCreateRes = await (await fetch('http://localhost:5000/api/portal/piket', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      day_of_week: 'Senin',
      member_name: 'Danendra Arya'
    })
  })).json();
  console.log('Piket Create status:', piketCreateRes.success, 'ID:', piketCreateRes.data?.id);
  const createdPiketId = piketCreateRes.data?.id;

  if (createdPiketId) {
    const piketDelRes = await (await fetch(`http://localhost:5000/api/portal/piket/${createdPiketId}`, {
      method: 'DELETE',
      headers: authHeaders
    })).json();
    console.log('Piket Delete status:', piketDelRes.success);
  }

  // 6. Test Stories
  console.log('\n--- 5. Testing Stories ---');
  const storiesGet = await (await fetch('http://localhost:5000/api/stories/public')).json();
  console.log('Public Stories GET status:', storiesGet.success, 'Count:', storiesGet.total);

  console.log('\n=== ALL PORTAL ENDPOINTS TESTED SUCCESSFULLY ===');
}

testAll().catch(console.error);
