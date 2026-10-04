/**
 * DEVELOPMENT SEED — fictional demo data only.
 *
 *   npm run db:seed
 *
 * - Refuses to run when NODE_ENV=production.
 * - Every record is obviously fake: "Demo" hospital names, @example.com emails, 555 phone numbers.
 * - Idempotent: re-running upserts the same records.
 * - The UI never presents these as real statistics; all counts shown are live DB counts, so they
 *   simply reflect whatever is in your local database.
 */
import { PrismaClient, type OrganStatus, type OrganType } from '@prisma/client';
import bcrypt from 'bcryptjs';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed demo data with NODE_ENV=production.');
  process.exit(1);
}

const prisma = new PrismaClient();
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'DemoPass123';

const hospitals = [
  { name: 'Demo General Hospital', city: 'Mangalore', state: 'Karnataka', address: '1 Demo Road, Hampankatta', phone: '+91 555 010 0001' },
  { name: 'Demo City Medical Centre', city: 'Bengaluru', state: 'Karnataka', address: '22 Sample Street, Indiranagar', phone: '+91 555 010 0002' },
  { name: 'Demo Lakeside Hospital', city: 'Mangalore', state: 'Karnataka', address: '9 Placeholder Avenue, Kadri', phone: '+91 555 010 0003' },
];

const donors = [
  { email: 'demo.donor1@example.com', donorCode: 'DNDEMO01', firstName: 'Asha', lastName: 'Demo', gender: 'FEMALE', city: 'Mangalore' },
  { email: 'demo.donor2@example.com', donorCode: 'DNDEMO02', firstName: 'Ravi', lastName: 'Sample', gender: 'MALE', city: 'Bengaluru' },
] as const;

const organs: Array<{ donor: number; hospital: number; organType: OrganType; status: OrganStatus; date: string }> = [
  { donor: 0, hospital: 0, organType: 'KIDNEY', status: 'AVAILABLE', date: '2026-08-14' },
  { donor: 0, hospital: 2, organType: 'CORNEA', status: 'AVAILABLE', date: '2026-08-20' },
  { donor: 1, hospital: 1, organType: 'LIVER', status: 'PENDING', date: '2026-09-02' },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const hospitalRows = [];
  for (const h of hospitals) {
    hospitalRows.push(
      await prisma.hospital.upsert({
        where: { name_city: { name: h.name, city: h.city } },
        create: h,
        update: h,
      }),
    );
  }

  await prisma.user.upsert({
    where: { email: 'demo.admin@example.com' },
    create: { email: 'demo.admin@example.com', passwordHash, role: 'ADMIN', admin: { create: { displayName: 'Demo Admin' } } },
    update: { passwordHash },
  });

  const donorRows = [];
  for (const d of donors) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      create: {
        email: d.email,
        passwordHash,
        role: 'DONOR',
        donor: {
          create: {
            donorCode: d.donorCode,
            firstName: d.firstName,
            lastName: d.lastName,
            gender: d.gender,
            dateOfBirth: new Date('1990-01-15T00:00:00Z'),
            phone: '+91 555 020 0000',
            address: '100 Example Lane',
            city: d.city,
            state: 'Karnataka',
            personalDoctor: 'Dr. Demo Physician',
            hospitalId: hospitalRows[0]!.id,
            medicalConditions: 'None reported (demo record)',
            nextOfKin: { create: { name: 'Demo Relative', phone: '+91 555 030 0000', relationship: 'Sibling' } },
          },
        },
      },
      update: { passwordHash },
      select: { donor: { select: { id: true } } },
    });
    donorRows.push(user.donor!);
  }

  // Only create demo organs once (no natural unique key to upsert on).
  const existingOrgans = await prisma.organ.count({ where: { donorId: { in: donorRows.map((d) => d.id) } } });
  if (existingOrgans === 0) {
    for (const o of organs) {
      await prisma.organ.create({
        data: {
          donorId: donorRows[o.donor]!.id,
          hospitalId: hospitalRows[o.hospital]!.id,
          organType: o.organType,
          status: o.status,
          procurementDate: new Date(`${o.date}T00:00:00Z`),
          notes: 'Demo record',
        },
      });
    }
  }

  console.log('Seeded DEMO data (development only).');
  console.log(`  Admin:  demo.admin@example.com / ${DEMO_PASSWORD}`);
  console.log(`  Donors: demo.donor1@example.com, demo.donor2@example.com / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
