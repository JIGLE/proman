import { redirect } from 'next/navigation';

export default async function Home() {
  // If user is authenticated, go straight to dashboard
  try {
    const { getServerSession } = await import('next-auth/next');
    const { getAuthOptions } = await import('@/lib/services/auth/auth');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session: any = await getServerSession(getAuthOptions() as any);
    if (session?.user) {
      redirect('/pt/overview');
    }
  } catch (e) {
    // redirect() throws a special error — re-throw it
    if (e && typeof e === 'object' && 'digest' in e) throw e;
  }
  redirect('/pt');
}
