'use client';

import { useState } from 'react';

type LogEntry = {
  title: string;
  detail: string;
};

type ServiceOption = {
  id: string;
  name: string;
};

type Props = {
  services: ServiceOption[];
};

export default function TestToolsClient({ services }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function pushLog(title: string, detail: string) {
    setLogs((current) => [{ title, detail }, ...current].slice(0, 8));
  }

  async function resetQuota() {
    setBusy('reset');
    try {
      const response = await fetch('/api/webhook/reset-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: `reset-${Date.now()}`,
          reason: 'simulate-successful-payment',
        }),
      });
      const payload = (await response.json()) as { message?: string; idempotent?: boolean };
      pushLog('Reset quota', payload.message ?? 'Webhook completed.');
    } finally {
      setBusy(null);
    }
  }

  async function callWebhookMultipleTimes() {
    setBusy('webhook');
    const eventId = `duplicate-${Date.now()}`;
    try {
      const responses = await Promise.all(
        Array.from({ length: 3 }, () =>
          fetch('/api/webhook/reset-quota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, reason: 'idempotency-test' }),
          }),
        ),
      );
      const payloads = await Promise.all(responses.map((response) => response.json()));
      pushLog('Webhook idempotency', `Sent 3 calls with one event ID. First status: ${responses[0].status}.`);
      pushLog('Webhook responses', payloads.map((payload) => payload.message ?? 'ok').join(' | '));
    } finally {
      setBusy(null);
    }
  }

  async function generateTenLeads() {
    setBusy('generate');
    try {
      if (services.length === 0) {
        throw new Error('No services are available. Seed the database first.');
      }

      const responses = await Promise.all(
        Array.from({ length: 10 }, (_, index) => {
          const serviceId = services[index % services.length]?.id;
          return fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `Bulk Lead ${index + 1}`,
              phone: `9000000${String(index + 1).padStart(3, '0')}`,
              city: ['Hyderabad', 'Bengaluru', 'Chennai'][index % 3],
              serviceId,
              description: `Concurrent test lead ${index + 1}`,
            }),
          });
        }),
      );

      const successCount = responses.filter((response) => response.ok).length;
      pushLog('Concurrent lead test', `${successCount}/10 leads created successfully.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h2>Test Tools</h2>
          <p>Helpers to simulate the quota-reset webhook, retry the same event, and generate test leads.</p>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <button type="button" onClick={resetQuota} disabled={busy !== null}>
            {busy === 'reset' ? 'Resetting...' : 'Reset provider quotas'}
          </button>
          <button type="button" className="secondary" onClick={callWebhookMultipleTimes} disabled={busy !== null}>
            {busy === 'webhook' ? 'Calling...' : 'Send the same webhook multiple times'}
          </button>
          <button type="button" className="secondary" onClick={generateTenLeads} disabled={busy !== null}>
            {busy === 'generate' ? 'Generating...' : 'Generate 10 test leads'}
          </button>
        </div>

        <p className="form-note">
          Note: quota resets are performed only via the webhook. The repeated-call helper reuses a single event ID to
          demonstrate idempotent handling.
        </p>
      </div>

      <div className="panel">
        <h3 style={{ marginTop: 0 }}>Activity log</h3>
        <div className="log-list">
          {logs.length === 0 ? <div className="log-item">No actions yet.</div> : null}
          {logs.map((entry, index) => (
            <div key={`${entry.title}-${index}`} className="log-item">
              <strong>{entry.title}</strong>
              <div className="meta">{entry.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
