/**
 * EduScan — Create / fix admin user directly in MongoDB
 * Run from inside EDUSCANnewB: node create_admin.mjs
 */
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read .env from same directory as this script
const envPath = path.join(__dirname, '.env');
let MONGO_URI = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/MONGO_URI\s*=\s*(.+)/);
  if (match) MONGO_URI = match[1].trim();
} catch (e) {
  console.error('Could not read .env:', e.message, '\nPath tried:', envPath);
  process.exit(1);
}

if (!MONGO_URI) {
  console.error('MONGO_URI not found in .env');
  process.exit(1);
}

console.log('\nConnecting to MongoDB...');
const client = new MongoClient(MONGO_URI);

try {
  await client.connect();
  console.log('✅ Connected to MongoDB');

  const db = client.db();
  const users = db.collection('users');

  const email = 'admin@bitsindri.ac.in';
  const password = 'Admin@12345';
  const hash = await bcrypt.hash(password, 10);

  const existing = await users.findOne({ email });

  if (existing) {
    console.log('\n⚠  User already exists:');
    console.log(`   email:    ${existing.email}`);
    console.log(`   role:     ${existing.role}`);
    console.log(`   verified: ${existing.verified}`);

    // Ensure role=admin, verified=true, not blocked, reset password
    await users.updateOne(
      { _id: existing._id },
      { $set: { role: 'admin', verified: true, blocked: false, password: hash, updatedAt: new Date() } }
    );
    console.log('✅ Updated → role: admin, verified: true, password reset');
  } else {
    console.log('\n➕ Creating new admin user...');
    const result = await users.insertOne({
      fullname:            'EduScan Admin',
      email,
      password:            hash,
      registrationNo:      'ADMIN001',
      role:                'admin',
      verified:            true,
      blocked:             false,
      semester:            '',
      branch:              '',
      phoneNumber:         `ADMIN_${Date.now()}`,
      subject:             '',
      profilephoto:        '',
      refreshToken:        '',
      points:              0,
      status:              'Active',
      attendancePercentage: 100,
      join_date:           new Date(),
      createdAt:           new Date(),
      updatedAt:           new Date(),
    });
    console.log('✅ Admin user created with _id:', result.insertedId.toString());
  }

  console.log('\n════════════════════════════════════');
  console.log('  Admin Login Credentials');
  console.log('════════════════════════════════════');
  console.log('  Email:    admin@bitsindri.ac.in');
  console.log('  Password: Admin@12345');
  console.log('  URL:      http://localhost:3002/login');
  console.log('════════════════════════════════════\n');

} catch (e) {
  console.error('❌ Error:', e.message);
} finally {
  await client.close();
  console.log('Connection closed.');
}
