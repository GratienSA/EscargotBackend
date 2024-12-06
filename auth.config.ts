// import NextAuth from 'next-auth';
// import CredentialsProvider from 'next-auth/providers/credentials';
// import GoogleProvider from 'next-auth/providers/google';
// import { PrismaAdapter } from '@next-auth/prisma-adapter';
// import { PrismaClient } from '@prisma/client';
// import bcrypt from 'bcryptjs';

// const prisma = new PrismaClient();

// export const authOptions = {
//   pages: {
//     signIn: '/sign-in',
//     error: '/sign-in',
//   },
//   session: {
//     strategy: 'jwt',
//     maxAge: 30 * 24 * 60 * 60,
//   },
//   adapter: PrismaAdapter(prisma),
//   providers: [
//     CredentialsProvider({
//       name: 'credentials',
//       credentials: {
//         email: { label: 'Email', type: 'email', placeholder: 'jsmith@gmail.com' },
//         password: { label: 'Password', type: 'password' },
//       },
//       async authorize(credentials) {
//         if (!credentials?.email || !credentials?.password) {
//           return null;
//         }
//         const { email, password } = credentials;

//         try {
//           const user = await prisma.user.findUnique({ where: { email } });
//           if (!user || !bcrypt.compareSync(password, user.password)) {
//             return null;
//           }
//           return {
//             id: user.id.toString(),
//             name: user.firstName || '',
//             email: user.email,
//             role: user.roleId || '',
//           };
//         } catch (error) {
//           console.error("ERROR in authorize function:", error);
//           return null;
//         }
//       },
//     }),
//     GoogleProvider({
//       clientId: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//     }),
//   ],
//   callbacks: {
//     async jwt({ token, user }) {
//       if (user) {
//         token.role = user.role;
//       }
//       return token;
//     },
//     async session({ session, token }) {
//       if (session.user) {
//         session.user.role = token.role;
//       }
//       return session;
//     },
//   },
// };

// export default NextAuth(authOptions);