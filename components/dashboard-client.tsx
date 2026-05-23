'use client';

import { useEffect, useState } from 'react';

type Assignment = {
  id: string;
  leadId: string;
  leadName: string;
  phone: string;
  city: string;
  serviceName: string;
  assignmentKind: 'MANDATORY' | 'FAIR';
  assignedAt: string;
};

type ProviderSnapshot = {
  id: string;
  name: string;
  monthlyQuota: number;
  quotaUsed: number;
  remainingQuota: number;
  assignments: Assignment[];
};

type Props = {
  initialProviders: ProviderSnapshot[];
};

export default function DashboardClient({ initialProviders }: Props) {
  const [providers, setProviders] = useState(initialProviders);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date().toISOString());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let active = true;

    async function refresh() {
      setIsRefreshing(true);
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to refresh dashboard.');
        }

        const payload = (await response.json()) as { providers: ProviderSnapshot[] };
        if (active) {
          setProviders(payload.providers);
          setLastRefreshedAt(new Date().toISOString());
        }
      } finally {
        if (active) {
          setIsRefreshing(false);
        }
      }
    }

    refresh();
    const timer = setInterval(refresh, 4000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h2>Provider Dashboard</h2>
          <p>Live database view with automatic polling every few seconds.</p>
        </div>
        <span className="badge">Last refresh: {new Date(lastRefreshedAt).toLocaleTimeString()}</span>
      </div>

      <div className="kpi-row">
        <div className="stat-card">
          <strong>{providers.length}</strong>
          Providers in system
        </div>
        <div className="stat-card">
          <strong>{providers.reduce((sum, provider) => sum + provider.quotaUsed, 0)}</strong>
          Leads used in current quota cycle
        </div>
        <div className="stat-card">
          <strong>{isRefreshing ? 'Refreshing' : 'Live'}</strong>
          Dashboard status
        </div>
      </div>

      <div className="grid providers">
        {providers.map((provider) => (
          <article key={provider.id} className="provider-card">
            <div className="provider-head">
              <div>
                <h3 style={{ margin: 0 }}>{provider.name}</h3>
                <p className="meta">Monthly quota: {provider.monthlyQuota}</p>
              </div>
              <span className="badge">Remaining {provider.remainingQuota}</span>
            </div>

            <div className="assignment-list">
              <div className="stat-card" style={{ padding: '14px 16px' }}>
                <strong>{provider.quotaUsed}</strong>
                Leads received in this quota cycle
              </div>

              {provider.assignments.length === 0 ? (
                <div className="assignment-card">No leads assigned yet.</div>
              ) : (
                provider.assignments.map((assignment) => (
                  <div key={assignment.id} className="assignment-card">
                    <strong>
                      {assignment.leadName} · {assignment.serviceName}
                    </strong>
                    <div className="meta">
                      {assignment.phone} · {assignment.city} · {assignment.assignmentKind}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
