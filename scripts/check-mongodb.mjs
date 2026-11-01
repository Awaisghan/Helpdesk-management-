import mongoose from 'mongoose';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MongoDB check failed: MONGODB_URI is not configured.');
  process.exit(1);
}

function safeUriChecks(value) {
  try {
    const parsed = new URL(value);
    const authority = value.match(/^mongodb(?:\+srv)?:\/\/([^/?#]*)/)?.[1] ?? '';
    const userInfo = authority.slice(0, authority.lastIndexOf('@'));
    const passwordPart = userInfo.includes(':') ? userInfo.slice(userInfo.indexOf(':') + 1) : '';
    const malformedEscapes = /%(?![0-9a-fA-F]{2})/;
    return {
      usernamePresent: parsed.username.length > 0,
      passwordPresent: parsed.password.length > 0,
      databaseIsHelpdeskDb: parsed.pathname === '/helpdesk_db',
      authSourceIsAdmin: parsed.searchParams.get('authSource') === 'admin',
      authorityHasSingleSeparator: authority.split('@').length === 2,
      credentialPercentEscapesValid: !malformedEscapes.test(userInfo),
      passwordReservedCharactersEncoded: !/[:/?#\[\]@\s]/.test(passwordPart),
      authSourceOptionApplied: true,
    };
  } catch {
    return { connectionStringParses: false };
  }
}

try {
  await mongoose.connect(uri, {
    dbName: 'helpdesk_db',
    authSource: 'admin',
    serverSelectionTimeoutMS: 10_000,
    bufferCommands: false,
  });
  if (mongoose.connection.name !== 'helpdesk_db') {
    throw new Error('CONNECTED_TO_WRONG_DATABASE');
  }
  console.log('MongoDB connection verified for helpdesk_db.');
} catch (error) {
  const codes = new Set();
  let current = error;
  for (let depth=0; current && depth<5; depth++) {
    if (typeof current === 'object') {
      if ('code' in current && /^[A-Z0-9_]+$/.test(String(current.code))) codes.add(String(current.code));
      if ('reason' in current && current.reason && typeof current.reason === 'object' && 'servers' in current.reason && current.reason.servers instanceof Map) {
        for (const server of current.reason.servers.values()) {
          const cause=server.error;
          if (cause && 'code' in cause && /^[A-Z0-9_]+$/.test(String(cause.code))) codes.add(String(cause.code));
        }
      }
      current='cause' in current ? current.cause : null;
    } else break;
  }
  const errorName = error instanceof Error && /^[A-Za-z]+$/.test(error.name) ? error.name : 'ConnectionError';
  console.error(`MongoDB connection failed (${errorName})${codes.size ? `; network code(s): ${[...codes].join(', ')}` : ''}.`);
  if (errorName === 'MongoParseError') console.error('Safe URI checks:', JSON.stringify(safeUriChecks(uri)));
  console.error('Check the MongoDB username, URI formatting, percent-encoding of reserved password characters, and authSource=admin.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
