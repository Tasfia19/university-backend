import { PrismaClient, Role, SemesterTerm, DegreeLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seeding for University Management System...');

  // Clean old data
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.semesterGPA.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.courseRegistration.deleteMany();
  await prisma.section.deleteMany();
  await prisma.course.deleteMany();
  await prisma.program.deleteMany();
  await prisma.department.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users (Admin, Instructors, Students)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const instructorPassword = await bcrypt.hash('instructor123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@university.edu',
      password: adminPassword,
      name: 'System Admin / Registrar',
      role: Role.ADMIN,
      phone: '+8801711002233',
      address: 'University Main Campus, Dhaka',
    },
  });

  const instructor1 = await prisma.user.create({
    data: {
      email: 'dr.smith@university.edu',
      password: instructorPassword,
      name: 'Dr. Alan Smith',
      role: Role.INSTRUCTOR,
      phone: '+8801711002244',
      address: 'Faculty Quarter, Dhaka',
    },
  });

  const instructor2 = await prisma.user.create({
    data: {
      email: 'prof.johnson@university.edu',
      password: instructorPassword,
      name: 'Prof. Sarah Johnson',
      role: Role.INSTRUCTOR,
      phone: '+8801711002255',
      address: 'Faculty Quarter, Dhaka',
    },
  });

  const student1 = await prisma.user.create({
    data: {
      email: 'student1@university.edu',
      password: studentPassword,
      name: 'Tasfia Rahman',
      role: Role.STUDENT,
      phone: '+8801811002266',
      address: 'Dhanmondi, Dhaka',
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'student2@university.edu',
      password: studentPassword,
      name: 'Karim Ahmed',
      role: Role.STUDENT,
      phone: '+8801811002277',
      address: 'Gulshan, Dhaka',
    },
  });

  console.log('✅ Created 5 Users (Admin, 2 Instructors, 2 Students)');

  // 2. Create Departments
  const cseDept = await prisma.department.create({
    data: {
      code: 'CSE',
      name: 'Computer Science and Engineering',
      description: 'Department of Computer Science & Software Engineering',
    },
  });

  const eeeDept = await prisma.department.create({
    data: {
      code: 'EEE',
      name: 'Electrical and Electronic Engineering',
      description: 'Department of Electrical & Microelectronics',
    },
  });

  console.log('✅ Created 2 Departments (CSE, EEE)');

  // 3. Create Programs
  const cseProgram = await prisma.program.create({
    data: {
      code: 'BSC-CSE',
      name: 'B.Sc. in Computer Science & Engineering',
      degreeLevel: DegreeLevel.BACHELOR,
      totalCredits: 136,
      departmentId: cseDept.id,
    },
  });

  console.log('✅ Created Program: B.Sc. in CSE');

  // 4. Create Courses (with prerequisite relation)
  const cse101 = await prisma.course.create({
    data: {
      code: 'CSE101',
      title: 'Structured Programming Language',
      credits: 3.0,
      departmentId: cseDept.id,
      description: 'Introduction to C programming, loops, arrays, and functions',
    },
  });

  const cse102 = await prisma.course.create({
    data: {
      code: 'CSE102',
      title: 'Data Structures and Algorithms',
      credits: 3.0,
      departmentId: cseDept.id,
      prerequisiteId: cse101.id,
      description: 'Linked lists, trees, graphs, sorting, and dynamic programming',
    },
  });

  const eee101 = await prisma.course.create({
    data: {
      code: 'EEE101',
      title: 'Electrical Circuits I',
      credits: 3.0,
      departmentId: eeeDept.id,
      description: 'Fundamental circuit analysis, KVL, KCL, and AC circuits',
    },
  });

  console.log('✅ Created 3 Courses (CSE101, CSE102 with prerequisite, EEE101)');

  // 5. Create Semester
  const fall2026 = await prisma.semester.create({
    data: {
      name: 'Fall 2026',
      year: 2026,
      term: SemesterTerm.FALL,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-12-31'),
      isRegistrationOpen: true,
    },
  });

  console.log('✅ Created Active Semester: Fall 2026');

  // 6. Create Course Sections
  const sec101 = await prisma.section.create({
    data: {
      sectionNumber: '01',
      courseId: cse101.id,
      semesterId: fall2026.id,
      instructorId: instructor1.id,
      capacity: 30,
      enrolledCount: 0,
      classRoutine: 'Mon/Wed 09:30-11:00 AM',
      room: 'Academic Building Room 402',
    },
  });

  const sec102 = await prisma.section.create({
    data: {
      sectionNumber: '01',
      courseId: cse102.id,
      semesterId: fall2026.id,
      instructorId: instructor2.id,
      capacity: 25,
      enrolledCount: 0,
      classRoutine: 'Sun/Tue 11:30-01:00 PM',
      room: 'Lab Building Room 201',
    },
  });

  console.log('✅ Created 2 Course Sections');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
