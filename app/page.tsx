import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function HomePage() {
  const hasCookie = cookies().get('os-auth')?.value === '1';
  redirect(hasCookie ? '/dashboard' : '/login');
}
