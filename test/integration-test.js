(async () => {
  const baseUrl = 'http://localhost:3000';

  async function fetchJson(url, options) {
    const response = await fetch(url, options);

    const respClone = response.clone();
    try {
      return { status: response.status, body: await response.json() };
    } catch (e) {
      return { status: response.status, body: await respClone.text() };
    }
  }

  console.log('\nFetching available services...');
  const servicesRes = await fetchJson(`${baseUrl}/api/services`);
  if (servicesRes.status !== 200) {
    console.error('Could not load services:', servicesRes);
    process.exit(2);
  }

  const services = servicesRes.body.services;
  console.log('Available services:', services.map((s) => `${s.name} (${s.id})`).join(', '));

  const service1 = services.find((service) => service.slug === 'service-1') || services[0];
  const service2 = services.find((service) => service.slug === 'service-2') || services[1] || services[0];
  const service3 = services.find((service) => service.slug === 'service-3') || services[2] || services[0];

  console.log('\nVerifying duplicate-lead protection...');
  const duplicateLead = {
    name: 'Dup Tester',
    phone: '9999999999',
    city: 'City',
    serviceId: service1.id,
    description: 'Dup test',
  };

  const firstLead = await fetchJson(`${baseUrl}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(duplicateLead),
  });

  const secondLead = await fetchJson(`${baseUrl}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(duplicateLead),
  });

  console.log('First submission result:', firstLead.status, firstLead.body.message ?? JSON.stringify(firstLead.body));
  console.log('Second submission (expected duplicate):', secondLead.status, secondLead.body.message ?? JSON.stringify(secondLead.body));

  console.log('\nSnapshot: dashboard before bulk create');
  const beforeDash = await fetchJson(`${baseUrl}/api/dashboard`);
  console.log('Providers in system:', beforeDash.status === 200 ? beforeDash.body.providers.length : 'unavailable');

  console.log('\nSubmitting 10 leads concurrently...');
  const concurrentRequests = Array.from({ length: 10 }, (_, index) => {
    const phone = `9000000${String(index + 1).padStart(3, '0')}`;
    const service = [service1, service2, service3][index % 3];

    return fetchJson(`${baseUrl}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Bulk ${index + 1}`,
        phone,
        city: ['Hyderabad', 'Bengaluru', 'Chennai'][index % 3],
        serviceId: service.id,
        description: `Bulk ${index + 1}`,
      }),
    });
  });

  const results = await Promise.all(concurrentRequests);
  const successfulCreates = results.filter((result) => result.status === 201).length;
  console.log(`Result: ${successfulCreates}/10 leads created successfully.`);
  results.forEach((result, index) => {
    console.log(`  ${index + 1}) ${result.status} ${result.body.message ?? ''}`.trim());
  });

  console.log('\nSnapshot: dashboard after concurrent creates');
  const afterDash = await fetchJson(`${baseUrl}/api/dashboard`);
  if (afterDash.status === 200) {
    console.log('Provider usage summary:');
    afterDash.body.providers.forEach((p) => {
      console.log(`  ${p.name}: ${p.quotaUsed} used — ${p.remainingQuota} remaining`);
    });
  } else {
    console.log('Unable to retrieve dashboard:', afterDash);
  }

  console.log('\nTesting webhook idempotency (same event ID)');
  const eventId = `itest-reset-${Date.now()}`;
  const webhookCalls = await Promise.all([
    fetchJson(`${baseUrl}/api/webhook/reset-quota`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, reason: 'itest' }),
    }),
    fetchJson(`${baseUrl}/api/webhook/reset-quota`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, reason: 'itest' }),
    }),
    fetchJson(`${baseUrl}/api/webhook/reset-quota`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, reason: 'itest' }),
    }),
  ]);

  webhookCalls.forEach((result, index) => {
    console.log(`  call ${index + 1}: ${result.status} ${result.body.message ?? JSON.stringify(result.body)}`);
  });

  console.log('\nSnapshot: dashboard after webhook reset');
  const finalDash = await fetchJson(`${baseUrl}/api/dashboard`);
  if (finalDash.status === 200) {
    console.log('Providers after reset:');
    finalDash.body.providers.forEach((p) => {
      console.log(`  ${p.name}: ${p.quotaUsed} used — ${p.remainingQuota} remaining`);
    });
  } else {
    console.log('Unable to retrieve dashboard:', finalDash);
  }

  console.log('\nIntegration test finished.');
})();
