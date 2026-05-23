import mongoose from 'mongoose';
import { connectMongo } from '../lib/mongodb';
import {
  Lead,
  LeadProviderAssignment,
  Provider,
  Service,
  ServiceDistributionState,
  ServiceProviderPool,
  WebhookEvent,
} from '../lib/models';

const currentMonthKey = new Date().toISOString().slice(0, 7);

const services = [
  { name: 'Service 1', slug: 'service-1' },
  { name: 'Service 2', slug: 'service-2' },
  { name: 'Service 3', slug: 'service-3' },
];

const providers = Array.from({ length: 8 }, (_, index) => ({
  name: `Provider ${index + 1}`,
  monthlyQuota: 10,
  quotaUsed: 0,
  quotaCycleKey: currentMonthKey,
}));

const servicePools = [
  { serviceSlug: 'service-1', providerNames: ['Provider 2', 'Provider 3', 'Provider 4'] },
  { serviceSlug: 'service-2', providerNames: ['Provider 6', 'Provider 7', 'Provider 8'] },
  { serviceSlug: 'service-3', providerNames: ['Provider 2', 'Provider 3', 'Provider 5', 'Provider 6', 'Provider 7', 'Provider 8'] },
];

async function main() {
  await connectMongo();
  await mongoose.connection.dropDatabase();

  const insertedServices = await Service.insertMany(services);
  const insertedProviders = await Provider.insertMany(providers);

  const serviceBySlug = new Map(insertedServices.map((service) => [service.slug, service] as const));
  const providerByName = new Map(insertedProviders.map((provider) => [provider.name, provider] as const));

  for (const pool of servicePools) {
    const service = serviceBySlug.get(pool.serviceSlug);
    if (!service) {
      throw new Error(`Missing service seed for ${pool.serviceSlug}`);
    }

    for (let index = 0; index < pool.providerNames.length; index += 1) {
      const provider = providerByName.get(pool.providerNames[index]);
      if (!provider) {
        throw new Error(`Missing provider seed for ${pool.providerNames[index]}`);
      }

      await ServiceProviderPool.create({
        serviceId: service._id,
        providerId: provider._id,
        poolOrder: index,
      });
    }

    await ServiceDistributionState.create({
      serviceId: service._id,
      nextPoolIndex: 0,
    });
  }

  await Lead.deleteMany({});
  await LeadProviderAssignment.deleteMany({});
  await WebhookEvent.deleteMany({});
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
