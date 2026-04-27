/**
 * Home page — redirects to (main)/home or renders as root.
 */
import { redirect } from 'next/navigation';
export default function RootPage() {
  redirect('/home');
}
