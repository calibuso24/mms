#!/usr/bin/env node

/**
 * Helper script to set passwords for test accounts
 * Usage: node setup-test-accounts.js
 */

import pkg from 'pg';
import bcrypt from 'bcryptjs';
import { config } from './dist/config/env.js';

const { Pool } = pkg;

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
});

async function setTestPasswords() {
  try {
    console.log('Setting up test account passwords...\n');

    // Hash passwords
    const superuserHash = await bcrypt.hash('superuser123', 10);
    const adminHash = await bcrypt.hash('admin123', 10);

    // Update superuser password
    await pool.query(
      'UPDATE account SET password_hash = $1 WHERE account_name = $2',
      [superuserHash, 'superuser']
    );
    console.log('✓ superuser password set to: superuser123');

    // Update admin password
    await pool.query(
      'UPDATE account SET password_hash = $1 WHERE account_name = $2',
      [adminHash, 'admin']
    );
    console.log('✓ admin password set to: admin123');

    console.log('\nTest accounts are ready to use!');
    console.log('\nYou can now login with:');
    console.log('  Account: superuser, Password: superuser123');
    console.log('  Account: admin, Password: admin123');

    await pool.end();
  } catch (error) {
    console.error('Error setting up test accounts:', error);
    process.exit(1);
  }
}

setTestPasswords();
