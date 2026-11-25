import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshUserSession,
  signupUser,
} from '../lib/auth';
import { setSessionExpiredHandler } from '../lib/api';
import { COOKIE_SESSION_ACCESS_TOKEN } from '../lib/sessionAuth';
import AuthContext from './authContext';

const COOKIE_SESSION = { accessToken: COOKIE_SESSION_ACCESS_TOKEN, refreshToken: null };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setTokens(null);
    });

    return () => {
      setSessionExpiredHandler(null);
    };
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setTokens(COOKIE_SESSION);
      } catch {
        try {
          const refreshedSession = await refreshUserSession();
          setUser(refreshedSession.user);
          setTokens(refreshedSession.tokens ?? COOKIE_SESSION);
        } catch {
          setUser(null);
          setTokens(null);
        }
      } finally {
        setAuthReady(true);
      }
    };

    bootstrap();
  }, []);

  const persistSession = (session) => {
    setUser(session.user);
    setTokens(session.tokens ?? COOKIE_SESSION);
  };

  const signIn = async (credentials) => {
    const session = await loginUser(credentials);
    persistSession(session);
    return session.user;
  };

  const signUp = async (payload) => {
    const session = await signupUser(payload);
    persistSession(session);
    return session.user;
  };

  const signOut = async () => {
    try {
      await logoutUser();
    } catch {
      // Keep local sign-out reliable even if the backend logout request fails.
    }

    setUser(null);
    setTokens(null);
  };

  const value = {
    authReady,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    tokens,
    user,
    signIn,
    signOut,
    signUp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
