import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';

export function createAuth(db) {
  return betterAuth({
    database: mongodbAdapter(db),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [
      'http://localhost:3000',
      'http://localhost:5000',
      'https://ideavault-client-sooty.vercel.app',
      'https://ideavault-server-a2po.onrender.com',
      'https://ideavault-server-production.up.railway.app',
    ],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 6,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ['google', 'email-password'],
      },
    },
    user: {
      additionalFields: {
        photoURL: { type: 'string', required: false },
      },
    },
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
      }
    }
  });
}