import { connectMongo } from './mongodb';
import { LeadProviderAssignment, Provider } from './models';

export async function getDashboardSnapshot() {
  await connectMongo();

  const providers = await Provider.find().sort({ createdAt: 1 }).lean();
  const typedProviders = providers as unknown as Array<{
    _id: { toString(): string };
    name: string;
    monthlyQuota: number;
    quotaUsed: number;
  }>;

  const providerSnapshots = await Promise.all(
    typedProviders.map(async (provider) => {
      const assignments = await LeadProviderAssignment.find({ providerId: provider._id })
        .sort({ assignedAt: -1 })
        .limit(25)
        .populate({
          path: 'leadId',
          populate: {
            path: 'serviceId',
            select: 'name',
          },
        })
        .lean();

      const typedAssignments = assignments as unknown as Array<{
        _id: { toString(): string };
        assignmentKind: 'MANDATORY' | 'FAIR';
        assignedAt: Date;
        leadId?: {
          _id: { toString(): string };
          name: string;
          phone: string;
          city: string;
          serviceId?: {
            name: string;
          };
        };
      }>;

      return {
        id: provider._id.toString(),
        name: provider.name,
        monthlyQuota: provider.monthlyQuota,
        quotaUsed: provider.quotaUsed,
        remainingQuota: Math.max(provider.monthlyQuota - provider.quotaUsed, 0),
        assignments: typedAssignments.map((assignment) => ({
          id: assignment._id.toString(),
          leadId: assignment.leadId ? assignment.leadId._id.toString() : '',
          leadName: assignment.leadId ? assignment.leadId.name : 'Unknown lead',
          phone: assignment.leadId ? assignment.leadId.phone : '',
          city: assignment.leadId ? assignment.leadId.city : '',
          serviceName: assignment.leadId?.serviceId?.name ?? 'Unknown service',
          assignmentKind: assignment.assignmentKind,
          assignedAt: assignment.assignedAt.toISOString(),
        })),
      };
    }),
  );

  return providerSnapshots;
}
