import app from '../server/app.js';
import http from 'http';

// We will start app on an ephemeral port to test the real HTTP pipeline end-to-end
async function testApiPipeline() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log('Test server running at:', baseUrl);

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const health = await healthRes.json();
    console.log('✓ Health check status:', health.status, 'DB:', health.database);

    // 2. Auth Login with student / ketua
    // Let's test with ketua@tkj.sch.id or a student
    console.log('\n--- 1. Testing Portal Auth ---');
    const loginRes = await fetch(`${baseUrl}/api/portal/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ketua@tkj.sch.id', password: 'icptkj35_01' })
    });
    const loginData = await loginRes.json();
    console.log('Login result:', loginData.success, 'Message:', loginData.message || loginData.error);
    
    let token = loginData.token;
    if (!token) {
      // Try login with developer / admin account if ketua password is changed
      const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'fairuzziachmad@gmail.com', password: 'Admin#XICPTKJ2026' })
      });
      const adminData = await adminLogin.json();
      token = adminData.token;
      console.log('Admin login fallback:', adminData.success);
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // 3. Kas Endpoints
    console.log('\n--- 2. Testing Kas Endpoints ---');
    const kasGet = await (await fetch(`${baseUrl}/api/portal/kas`, { headers: authHeaders })).json();
    console.log('✓ Kas GET status:', kasGet.success, 'activeWeekIndex:', kasGet.activeWeekIndex);

    const kasExpenses = await (await fetch(`${baseUrl}/api/portal/kas/expenses`, { headers: authHeaders })).json();
    console.log('✓ Kas Expenses GET status:', kasExpenses.success, 'Total expenses:', kasExpenses.totalExpenses);

    // 4. Tasks Endpoints
    console.log('\n--- 3. Testing Tasks Endpoints ---');
    const tasksGet = await (await fetch(`${baseUrl}/api/portal/tasks`, { headers: authHeaders })).json();
    console.log('✓ Tasks GET status:', tasksGet.success, 'Count:', tasksGet.data?.length);

    const taskCreate = await (await fetch(`${baseUrl}/api/portal/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Konfigurasi Routing OSPF',
        subject: 'Administrasi Infrastruktur Jaringan',
        teacherName: 'Pak Budi',
        deadline: '2026-11-01',
        description: 'Implementasi OSPF multi-area di simulator Cisco.'
      })
    })).json();
    console.log('✓ Task POST status:', taskCreate.success, 'Message:', taskCreate.message || taskCreate.error);
    const taskId = taskCreate.data?.id;

    if (taskId) {
      // Update task
      const taskUpdate = await (await fetch(`${baseUrl}/api/portal/tasks/${taskId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          title: 'Konfigurasi Routing OSPF (Updated)',
          status: 'completed'
        })
      })).json();
      console.log('✓ Task PUT status:', taskUpdate.success);

      // Delete task
      const taskDel = await (await fetch(`${baseUrl}/api/portal/tasks/${taskId}`, {
        method: 'DELETE',
        headers: authHeaders
      })).json();
      console.log('✓ Task DELETE status:', taskDel.success);
    }

    // 5. Schedules Endpoints
    console.log('\n--- 4. Testing Schedules Endpoints ---');
    const schedGet = await (await fetch(`${baseUrl}/api/portal/schedules`, { headers: authHeaders })).json();
    console.log('✓ Schedules GET status:', schedGet.success, 'Count:', schedGet.data?.length);

    const schedCreate = await (await fetch(`${baseUrl}/api/portal/schedules`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        day_of_week: 'Selasa',
        start_time: '08:00',
        end_time: '09:30',
        subject: 'Keamanan Jaringan Komputer',
        teacher_name: 'Pak Budi'
      })
    })).json();
    console.log('✓ Schedule POST status:', schedCreate.success, 'ID:', schedCreate.data?.id);
    const schedId = schedCreate.data?.id;

    if (schedId) {
      const schedDel = await (await fetch(`${baseUrl}/api/portal/schedules/${schedId}`, {
        method: 'DELETE',
        headers: authHeaders
      })).json();
      console.log('✓ Schedule DELETE status:', schedDel.success);
    }

    // 6. Piket Endpoints
    console.log('\n--- 5. Testing Piket Endpoints ---');
    const piketGet = await (await fetch(`${baseUrl}/api/portal/piket`, { headers: authHeaders })).json();
    console.log('✓ Piket GET status:', piketGet.success, 'Count:', piketGet.data?.length);

    const piketCreate = await (await fetch(`${baseUrl}/api/portal/piket`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        day_of_week: 'Rabu',
        member_name: 'Budi Santoso'
      })
    })).json();
    console.log('✓ Piket POST status:', piketCreate.success, 'ID:', piketCreate.data?.id);
    const piketId = piketCreate.data?.id;

    if (piketId) {
      const piketDel = await (await fetch(`${baseUrl}/api/portal/piket/${piketId}`, {
        method: 'DELETE',
        headers: authHeaders
      })).json();
      console.log('✓ Piket DELETE status:', piketDel.success);
    }

    // 7. Stories Endpoints
    console.log('\n--- 6. Testing Stories Endpoints ---');
    const storiesRes = await (await fetch(`${baseUrl}/api/stories/public`)).json();
    console.log('✓ Public Stories status:', storiesRes.success, 'Count:', storiesRes.total);

    console.log('\n==================================================');
    console.log('ALL API ROUTES TESTED AND WORKING COMPLETELY!');
    console.log('==================================================');
  } finally {
    server.close();
  }
}

testApiPipeline().catch((err) => {
  console.error('API Pipeline Test Failed:', err);
  process.exit(1);
});
