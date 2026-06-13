import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';

export function createAuth(db) {
  const isDev = process.env.NODE_ENV !== 'production';
  
  return betterAuth({
    database: mongodbAdapter(db),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://ideavault-client-three.vercel.app',
      'https://ideavault-server-a2po.onrender.com',
    ],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`,
      },
    },
    advanced: {
      useSecureCookies: false,
      defaultCookieAttributes: {
        sameSite: isDev ? 'lax' : 'none',
        secure: !isDev,
        httpOnly: true,
        path: '/',
      },
    },
    user: {
      additionalFields: {
        photoURL: { type: 'string', required: false },
      },
    },
  });
}