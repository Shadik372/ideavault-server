'use client';

import { createContext, useContext } from 'react';
import { signIn, signOut, signUp, useSession } from '@/lib/auth-client';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { data: session, isPending: loading } = useSession();

  const user = session?.user ? {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    photoURL: session.user.image,
  } : null;

  // Register
  const registerWithEmail = async (name, email, photoURL, password) => {
    try {
      const result = await signUp.email({
        name,
        email,
        password,
        image: photoURL,
      });
      if (result.error) throw new Error(result.error.message);
      toast.success('Registration successful!');
      return result;
    } catch (error) {
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  };

  // Login with email
  const loginWithEmail = async (email, password) => {
    try {
      const result = await signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message);
      toast.success('Login successful!');
      return result;
    } catch (error) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  // Google login
  const loginWithGoogle = async () => {
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
    } catch (error) {
      toast.error('Google login failed');
      throw error;
    }
  };

  // Logout
  const logout = async () => {
    await signOut();
    toast.success('Logged out successfully!');
  };

  const value = {
    user,
    loading,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };