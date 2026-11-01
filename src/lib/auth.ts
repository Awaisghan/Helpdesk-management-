import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from './db/connect';
import { loginSchema } from './validation/auth';
import { UserModel } from '@/models';

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: process.env.NODE_ENV !== 'production' || process.env.AUTH_TRUST_HOST === 'true' || Boolean(process.env.AUTH_URL) || process.env.VERCEL === '1',
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  providers: [Credentials({
    credentials: { email: {}, password: {} },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;
      await connectToDatabase();
      const user = await UserModel.findOne({ email: parsed.data.email, isActive: true }).select('+hashedPassword').lean();
      if (!user || !await bcrypt.compare(parsed.data.password, user.hashedPassword)) return null;
      return { id: user._id.toString(), email: user.email, name: user.name, role: user.role };
    },
  })],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.role = user.role; token.sub = user.id; }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as 'User'|'Agent'|'Admin';
      }
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
});
