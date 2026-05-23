import RequestServiceForm from '@/components/request-service-form';
import { getServices } from '@/lib/services';

export const dynamic = 'force-dynamic';

export default async function RequestServicePage() {
  const services = await getServices();

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h2>Public Customer Form</h2>
          <p>Submit a service enquiry and the system will persist the lead, allocate providers, and update the dashboard.</p>
        </div>
      </div>
      <RequestServiceForm services={services} />
    </div>
  );
}
