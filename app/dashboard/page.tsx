import DashboardClient from '@/components/dashboard-client';
import { getDashboardSnapshot } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const initialProviders = await getDashboardSnapshot();

  return <DashboardClient initialProviders={initialProviders} />;
}
