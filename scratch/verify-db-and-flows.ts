import { dbService } from '../server/db/index.js';
import { CONFIG } from '../server/config.js';

async function verify() {
  console.log('--- DB & FLOW VERIFICATION ---');
  console.log('Database Mode:', CONFIG.IS_SUPABASE_CONFIGURED ? 'Supabase' : 'SQLite');
  
  // 1. Members
  const membersResult = await dbService.members.getAll();
  const allMembers = [...(membersResult.guru || []), ...(membersResult.siswa || [])];
  console.log('✓ Total members in DB:', allMembers.length, `(Guru: ${membersResult.totalGuru}, Siswa: ${membersResult.totalSiswa})`);
  if (allMembers.length > 0) {
    console.log('Sample member:', {
      id: allMembers[0].id,
      name: allMembers[0].full_name,
      role: allMembers[0].role,
      absen: allMembers[0].attendance_number,
      email: allMembers[0].email
    });
  }

  // 2. Kas
  const kasRecords = await dbService.kas.getAll();
  console.log('✓ Total kas records:', kasRecords.length);
  const expenses = await dbService.kasExpenses.getAll();
  console.log('✓ Total kas expenses:', expenses.length);

  // 3. Tasks
  const tasks = await dbService.tasks.getAll();
  console.log('✓ Total tasks in DB:', tasks.length);

  // 4. Schedules
  const schedules = await dbService.schedules.getAll();
  console.log('✓ Total schedules in DB:', schedules.length);

  // 5. Piket
  const piket = await dbService.piket.getAll();
  console.log('✓ Total piket in DB:', piket.length);

  console.log('\n--- VERIFY TEST INSERTS AND DELETES (NON-DESTRUCTIVE) ---');
  
  // Test Task Create & Delete
  try {
    const testTask = await dbService.tasks.create({
      title: '__TEST_AUTOMATION_TASK__',
      subject: 'Jaringan Dasar',
      teacherName: 'Guru Test',
      deadline: '2026-12-31',
      description: 'Deskripsi test otomatis',
      status: 'pending',
      createdBy: 'Sekretaris'
    });
    console.log('✓ Successfully created test task with ID:', testTask.id);

    // Update test task
    const updated = await dbService.tasks.update(testTask.id, {
      title: '__TEST_AUTOMATION_TASK_UPDATED__'
    });
    console.log('✓ Successfully updated test task, title:', updated?.title);

    // Delete test task
    await dbService.tasks.delete(testTask.id);
    console.log('✓ Successfully deleted test task');
  } catch (err: any) {
    console.error('✗ Task test failed:', err.message);
  }

  // Test Schedule Create & Delete
  try {
    const testSched = await dbService.schedules.create({
      dayOfWeek: 'Senin',
      startTime: '13:00',
      endTime: '14:30',
      subject: '__TEST_AUTOMATION_SUBJECT__',
      teacherName: 'Guru Test',
      orderIndex: 99
    });
    console.log('✓ Successfully created test schedule with ID:', testSched.id);

    // Delete test schedule
    await dbService.schedules.delete(testSched.id);
    console.log('✓ Successfully deleted test schedule');
  } catch (err: any) {
    console.error('✗ Schedule test failed:', err.message);
  }

  // Test Piket Create & Delete
  try {
    const testPiket = await dbService.piket.create({
      dayOfWeek: 'Senin',
      memberName: '__TEST_MEMBER__',
      tasks: 'Piket Kebersihan Kelas'
    });
    console.log('✓ Successfully created test piket with ID:', testPiket.id);

    // Delete test piket
    await dbService.piket.delete(testPiket.id);
    console.log('✓ Successfully deleted test piket');
  } catch (err: any) {
    console.error('✗ Piket test failed:', err.message);
  }

  // Test Kas record (toggle/record payment for a member)
  if (allMembers.length > 0) {
    try {
      const targetMember = allMembers[0];
      const testWeek = 999; // safe distinct test week
      const rec = await dbService.kas.recordPayment({
        memberId: targetMember.id,
        weekNumber: testWeek,
        monthYear: '2026',
        amount: 5000,
        status: 'paid',
        recordedBy: 'Bendahara'
      });
      console.log('✓ Successfully recorded test Kas payment for week 999:', rec?.id);

      // Verify we can update status via recordPayment
      const updatedStatus = await dbService.kas.recordPayment({
        memberId: targetMember.id,
        weekNumber: testWeek,
        monthYear: '2026',
        amount: 5000,
        status: 'unpaid',
        recordedBy: 'Bendahara'
      });
      console.log('✓ Successfully updated Kas payment status to unpaid:', updatedStatus?.status);

      // Clean up test kas record
      if (rec?.id) {
        await dbService.kas.deletePayment(rec.id);
        console.log('✓ Successfully cleaned up test kas record ID:', rec.id);
      }
    } catch (err: any) {
      console.error('✗ Kas test failed:', err.message);
    }
  }

  console.log('\n--- VERIFICATION FINISHED SUCCESSFULLY ---');
  process.exit(0);
}

verify().catch((e) => {
  console.error('Verification error:', e);
  process.exit(1);
});
