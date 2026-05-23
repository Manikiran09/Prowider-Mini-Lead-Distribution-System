import TestToolsClient from '@/components/test-tools-client';
import { getServices } from '@/lib/services';

export const dynamic = 'force-dynamic';

export default async function TestToolsPage() {
  const services = await getServices();

  return <TestToolsClient services={services} />;
}
