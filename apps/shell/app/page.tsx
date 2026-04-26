import { redirect } from 'next/navigation';
import { readSession } from '~/src/ctx';

export const dynamic = 'force-dynamic';

export default async function Landing() {
  const session = await readSession();
  if (session) redirect(`/${session.orgSlug}`);
  redirect('/api/auth/sign-in');
}
