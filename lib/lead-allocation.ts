import mongoose from 'mongoose';
import { ASSIGNMENT_TARGET, serviceMandatoryRules } from './constants';
import { connectMongo } from './mongodb';
import {
  DistributionStateDoc,
  Lead,
  LeadProviderAssignment,
  Provider,
  Service,
  ServiceDistributionState,
  ServicePoolDoc,
  ServiceProviderPool,
  ProviderDoc,
  ServiceDoc,
} from './models';

export type LeadInput = {
  name: string;
  phone: string;
  city: string;
  description: string;
  serviceId: string;
};

type LeadAllocationResult = {
  lead: {
    id: string;
    name: string;
    phone: string;
    city: string;
    description: string;
    serviceId: string;
    createdAt: string;
  };
  assignments: Array<{
    providerId: string;
    providerName: string;
    assignmentKind: 'MANDATORY' | 'FAIR';
  }>;
};

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function toStringId(value: mongoose.Types.ObjectId | string) {
  return typeof value === 'string' ? value : value.toString();
}

export async function createLeadWithAssignment(input: LeadInput): Promise<LeadAllocationResult> {
  await connectMongo();

  const session = await mongoose.startSession();

  try {
    let result: LeadAllocationResult | null = null;

    await session.withTransaction(async () => {
      const service = (await Service.findById(input.serviceId).session(session).lean()) as unknown as ServiceDoc | null;
      if (!service) {
        throw new Error('Service not found.');
      }

      const mandatoryProviderNames = serviceMandatoryRules[service.slug] ?? [];

      const state = (await ServiceDistributionState.findOneAndUpdate(
        { serviceId: service._id },
        { $setOnInsert: { serviceId: service._id, nextPoolIndex: 0 } },
        { new: true, upsert: true, session },
      ).lean()) as unknown as DistributionStateDoc | null;

      if (!state) {
        throw new Error('Unable to initialize allocation state.');
      }

      const pools = (await ServiceProviderPool.find({ serviceId: service._id })
        .sort({ poolOrder: 1 })
        .populate({ path: 'providerId', select: 'name monthlyQuota quotaUsed quotaCycleKey' })
        .session(session)
        .lean()) as unknown as Array<ServicePoolDoc & { providerId: ProviderDoc | null }>;

      const candidateNames = uniqueStrings([
        ...mandatoryProviderNames,
        ...pools.map((pool) => pool.providerId?.name).filter((name): name is string => Boolean(name)),
      ]);

      const providerDocs = (await Provider.find({ name: { $in: candidateNames } }).session(session).lean()) as unknown as ProviderDoc[];
      const providerByName = new Map(providerDocs.map((provider) => [provider.name, provider] as const));

      const assignedProviderIds = new Set<string>();
      const assignments: LeadAllocationResult['assignments'] = [];

      for (const providerName of mandatoryProviderNames) {
        const provider = providerByName.get(providerName);
        if (!provider || assignedProviderIds.has(toStringId(provider._id))) {
          continue;
        }

        const reservedProvider = (await Provider.findOneAndUpdate(
          {
            _id: provider._id,
            quotaUsed: { $lt: provider.monthlyQuota },
          },
          {
            $inc: { quotaUsed: 1 },
          },
          { new: true, session },
        ).lean()) as unknown as ProviderDoc | null;

        if (!reservedProvider) {
          continue;
        }

        assignedProviderIds.add(toStringId(reservedProvider._id));
        assignments.push({
          providerId: toStringId(reservedProvider._id),
          providerName: reservedProvider.name,
          assignmentKind: 'MANDATORY',
        });
      }

      if (pools.length > 0) {
        let cursor = state.nextPoolIndex % pools.length;
        let lastSelectedPoolIndex: number | null = null;

        for (let searched = 0; searched < pools.length && assignments.length < ASSIGNMENT_TARGET; searched += 1) {
          const pool = pools[cursor];
          const provider = pool.providerId ? providerByName.get(pool.providerId.name) : undefined;

          if (provider && !assignedProviderIds.has(toStringId(provider._id))) {
            const reservedProvider = (await Provider.findOneAndUpdate(
              {
                _id: provider._id,
                quotaUsed: { $lt: provider.monthlyQuota },
              },
              {
                $inc: { quotaUsed: 1 },
              },
              { new: true, session },
            ).lean()) as unknown as ProviderDoc | null;

            if (reservedProvider) {
              assignedProviderIds.add(toStringId(reservedProvider._id));
              assignments.push({
                providerId: toStringId(reservedProvider._id),
                providerName: reservedProvider.name,
                assignmentKind: 'FAIR',
              });
              lastSelectedPoolIndex = cursor;
            }
          }

          cursor = (cursor + 1) % pools.length;
        }

        if (lastSelectedPoolIndex !== null) {
          await ServiceDistributionState.updateOne(
            { serviceId: service._id },
            { $set: { nextPoolIndex: (lastSelectedPoolIndex + 1) % pools.length } },
            { session },
          );
        }
      }

      if (assignments.length < ASSIGNMENT_TARGET) {
        throw new Error('Unable to allocate three providers for the selected service.');
      }

      const lead = await Lead.create(
        [
          {
            name: input.name,
            phone: input.phone,
            city: input.city,
            description: input.description,
            serviceId: service._id,
          },
        ],
        { session },
      );

      const createdLead = lead[0];

      await LeadProviderAssignment.insertMany(
        assignments.map((assignment) => ({
          leadId: createdLead._id,
          providerId: assignment.providerId,
          assignmentKind: assignment.assignmentKind,
        })),
        { session },
      );

      result = {
        lead: {
          id: toStringId(createdLead._id),
          name: createdLead.name,
          phone: createdLead.phone,
          city: createdLead.city,
          description: createdLead.description,
          serviceId: toStringId(createdLead.serviceId),
          createdAt: createdLead.createdAt.toISOString(),
        },
        assignments,
      };
    });

    if (!result) {
      throw new Error('Lead creation failed.');
    }

    return result;
  } finally {
    session.endSession();
  }
}
