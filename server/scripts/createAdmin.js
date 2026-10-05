// Creates (or promotes) an admin account: verified, unlocked, level 50.
// Replaces the old ADMIN_USERNAME/ADMIN_PASSWORD env-var login.
//
//   npm run create-admin -- you@example.com
//
// Prompts for the password (hidden). If the email already has an account,
// its password is replaced and it's promoted/unlocked/verified.
require('dotenv').config();
const readline = require('readline');
const db = require('../src/db/pool');
const {
  validatePassword,
  normalizeEmail,
  isValidEmail,
  hashPassword,
} = require('../src/utils/auth/password');
const { LEVELS } = require('../src/middleware/requireAuth');

// One readline interface for every prompt (a second interface would miss
// input the first one already buffered, e.g. when piped).
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let currentPrompt = '';
rl._writeToOutput = (str) => {
  // Echo the prompt itself, mask everything typed after it.
  if (currentPrompt && str.includes(currentPrompt)) rl.output.write(str);
  else if (str !== '\r\n' && str !== '\n') rl.output.write('*');
};

// Lines are queued so answers that arrive before their prompt (piped
// input) aren't dropped.
const pendingLines = [];
const waiters = [];
rl.on('line', (line) => {
  if (waiters.length) waiters.shift().resolve(line);
  else pendingLines.push(line);
});
rl.on('close', () => {
  while (waiters.length) waiters.shift().reject(new Error('No input received.'));
});

function askHidden(question) {
  currentPrompt = question;
  rl.setPrompt(question);
  rl.prompt();
  return new Promise((resolve, reject) => {
    const done = (answer) => {
      rl.output.write('\n');
      resolve(answer);
    };
    if (pendingLines.length) done(pendingLines.shift());
    else waiters.push({ resolve: done, reject });
  });
}

async function main() {
  const email = normalizeEmail(process.argv[2]);
  if (!isValidEmail(email)) {
    console.error('Usage: npm run create-admin -- you@example.com');
    process.exit(1);
  }

  const password = await askHidden('Password: ');
  const error = validatePassword(password);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  const confirm = await askHidden('Confirm password: ');
  if (confirm !== password) {
    console.error('Passwords do not match.');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await db.query(
    `INSERT INTO account (email, password_hash, access_level, email_verified_dt)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (lower(email)) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           access_level = EXCLUDED.access_level,
           email_verified_dt = COALESCE(account.email_verified_dt, NOW()),
           is_locked = false,
           failed_login_count = 0,
           locked_dt = NULL,
           -- New password: sign out existing sessions everywhere.
           token_version = account.token_version + 1,
           update_dt = NOW()
     RETURNING id, (xmax = 0) AS inserted`,
    [email, passwordHash, LEVELS.ADMIN]
  );

  console.log(
    `${rows[0].inserted ? 'Created' : 'Updated'} admin account #${rows[0].id} (${email}).`
  );
}

main()
  .catch((err) => {
    console.error('create-admin failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
    return db.end();
  });
