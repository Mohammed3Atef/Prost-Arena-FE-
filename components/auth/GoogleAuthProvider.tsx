'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import type { ReactNode } from 'react';

/**
 * Wraps the tree with Google's OAuth context. Renders children unwrapped if
 * NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing so dev environments without OAuth
 * configured still boot without crashing.
 */
export default function ProstGoogleAuthProvider({ children }: { children: ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return <>{children}</>;
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
