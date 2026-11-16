const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

async function fix() {
  const bePath = 'src/server.ts';
  let beContent = fs.readFileSync(bePath, 'utf8');

  // 1. Fix Analytics logic to use e.totalAmount instead of e.course?.salePrice
  const oldCourseRev = `const courseRevenue = enrollments.reduce((sum: number, e: any) => sum + (e.course?.salePrice || 0), 0);`;
  const newCourseRev = `const courseRevenue = enrollments.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);`;
  
  const oldCourseProf = `const courseProfit = enrollments.reduce((sum: number, e: any) => sum + ((e.course?.salePrice || 0) - (e.totalImportAmount || 0)), 0);`;
  const newCourseProf = `const courseProfit = enrollments.reduce((sum: number, e: any) => sum + ((e.totalAmount || 0) - (e.totalImportAmount || 0)), 0);`;

  beContent = beContent.split(oldCourseRev).join(newCourseRev);
  beContent = beContent.split(oldCourseProf).join(newCourseProf);

  const oldPrevCourseRev = `const prevCourseRevenue = prevEnrollments.reduce((sum: number, e: any) => sum + (e.course?.salePrice || 0), 0);`;
  const newPrevCourseRev = `const prevCourseRevenue = prevEnrollments.reduce((sum: number, e: any) => sum + (e.totalAmount || 0), 0);`;
  
  const oldPrevCourseProf = `const prevCourseProfit = prevEnrollments.reduce((sum: number, e: any) => sum + ((e.course?.salePrice || 0) - (e.totalImportAmount || 0)), 0);`;
  const newPrevCourseProf = `const prevCourseProfit = prevEnrollments.reduce((sum: number, e: any) => sum + ((e.totalAmount || 0) - (e.totalImportAmount || 0)), 0);`;

  beContent = beContent.split(oldPrevCourseRev).join(newPrevCourseRev);
  beContent = beContent.split(oldPrevCourseProf).join(newPrevCourseProf);

  const oldMonthlyCourse = `if (monthlyDataMap.has(d)) monthlyDataMap.set(d, monthlyDataMap.get(d)! + (e.course?.salePrice || 0));`;
  const newMonthlyCourse = `if (monthlyDataMap.has(d)) monthlyDataMap.set(d, monthlyDataMap.get(d)! + (e.totalAmount || 0));`;

  beContent = beContent.split(oldMonthlyCourse).join(newMonthlyCourse);

  // 2. Fix Admin Enrollments logic to set totalAmount = 0
  const oldEnrollAdmin = `totalAmount: course.salePrice || 0`;
  const newEnrollAdmin = `totalAmount: 0`;
  
  beContent = beContent.split(oldEnrollAdmin).join(newEnrollAdmin);

  fs.writeFileSync(bePath, beContent, 'utf8');

  // 3. Reset existing enrollments in DB
  const prisma = new PrismaClient();
  await prisma.enrollment.updateMany({ data: { totalAmount: 0 } });
  
  console.log("Patched server.ts and reset DB enrollments.");
  process.exit(0);
}

fix();
