import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';

export function createAuth(db) {
  return betterAuth({
    database: mongodbAdapter(db),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
    trustedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://ideavault-client-three.vercel.app',
      'https://ideavault-client.vercel.app',
      process.env.CLIENT_URL,
    ].filter(Boolean),
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
    user: {
      additionalFields: {
        photoURL: { type: 'string', required: false },
      },
    },
    // Remove the advanced config
    rateLimit: {
      enabled: false,
    },
    // Add session configuration
    session: {
      expiresIn: 30 * 24 * 60 * 60, // 30 days
      updateAge: 24 * 60 * 60, // 24 hours
    },
  });
}