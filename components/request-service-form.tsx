'use client';

import { useMemo, useState } from 'react';

type ServiceOption = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  services: ServiceOption[];
};

const initialForm = {
  name: '',
  phone: '',
  city: '',
  serviceId: '',
  description: '',
};

export default function RequestServiceForm({ services }: Props) {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedService = useMemo(
    () => services.find((service) => String(service.id) === form.serviceId),
    [form.serviceId, services],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setMessageType('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          city: form.city,
          serviceId: form.serviceId,
          description: form.description,
        }),
      });

      const payload = (await response.json()) as { message?: string; lead?: { id: string } };

      if (!response.ok) {
        throw new Error(payload.message ?? 'Unable to submit lead.');
      }

      setMessageType('success');
      setMessage(`Lead ${payload.lead?.id ?? ''} saved successfully. The dashboard will update automatically.`);
      setForm(initialForm);
    } catch (error) {
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Unexpected submission failure.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="form-card">
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              placeholder="Jane Cooper"
            />
          </div>

          <div className="field">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              required
              placeholder="9999999999"
              inputMode="tel"
            />
          </div>

          <div className="field">
            <label htmlFor="city">City</label>
            <input
              id="city"
              name="city"
              value={form.city}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              required
              placeholder="Hyderabad"
            />
          </div>

          <div className="field">
            <label htmlFor="serviceId">Service Type</label>
            <select
              id="serviceId"
              name="serviceId"
              value={form.serviceId}
              onChange={(event) => setForm((current) => ({ ...current, serviceId: event.target.value }))}
              required
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field full">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              required
              placeholder="Describe the service requirement..."
            />
          </div>
        </div>

        <div className="actions">
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Lead'}
          </button>
          <span className="helper">
            {selectedService ? `Selected: ${selectedService.name}` : 'Choose a service to continue.'}
          </span>
        </div>
      </form>

      {message ? <div className={`feedback ${messageType}`}>{message}</div> : null}
      <p className="form-note">
        Duplicate protection is enforced by the database for the same phone number and service combination.
      </p>
    </div>
  );
}
