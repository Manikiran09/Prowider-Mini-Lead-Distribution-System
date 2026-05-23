import mongoose, { Schema, model, models } from 'mongoose';

const serviceSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

const providerSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    monthlyQuota: { type: Number, required: true, default: 10 },
    quotaUsed: { type: Number, required: true, default: 0 },
    quotaCycleKey: { type: String, required: true, default: 'initial' },
  },
  { timestamps: true },
);

const serviceProviderPoolSchema = new Schema(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
    poolOrder: { type: Number, required: true },
  },
  { timestamps: true },
);

serviceProviderPoolSchema.index({ serviceId: 1, providerId: 1 }, { unique: true });
serviceProviderPoolSchema.index({ serviceId: 1, poolOrder: 1 }, { unique: true });

const serviceDistributionStateSchema = new Schema(
  {
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true, unique: true },
    nextPoolIndex: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

const leadSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    city: { type: String, required: true },
    description: { type: String, required: true },
    serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  },
  { timestamps: true },
);

leadSchema.index({ phone: 1, serviceId: 1 }, { unique: true });
leadSchema.index({ serviceId: 1, createdAt: -1 });

const leadProviderAssignmentSchema = new Schema(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    providerId: { type: Schema.Types.ObjectId, ref: 'Provider', required: true },
    assignmentKind: { type: String, enum: ['MANDATORY', 'FAIR'], required: true },
  },
  { timestamps: { createdAt: 'assignedAt', updatedAt: false } },
);

leadProviderAssignmentSchema.index({ leadId: 1, providerId: 1 }, { unique: true });
leadProviderAssignmentSchema.index({ providerId: 1, assignedAt: -1 });

const webhookEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'processedAt', updatedAt: false } },
);

export const Service = models.Service || model('Service', serviceSchema);
export const Provider = models.Provider || model('Provider', providerSchema);
export const ServiceProviderPool = models.ServiceProviderPool || model('ServiceProviderPool', serviceProviderPoolSchema);
export const ServiceDistributionState = models.ServiceDistributionState || model('ServiceDistributionState', serviceDistributionStateSchema);
export const Lead = models.Lead || model('Lead', leadSchema);
export const LeadProviderAssignment = models.LeadProviderAssignment || model('LeadProviderAssignment', leadProviderAssignmentSchema);
export const WebhookEvent = models.WebhookEvent || model('WebhookEvent', webhookEventSchema);

export type ServiceDoc = mongoose.InferSchemaType<typeof serviceSchema> & { _id: mongoose.Types.ObjectId };
export type ProviderDoc = mongoose.InferSchemaType<typeof providerSchema> & { _id: mongoose.Types.ObjectId };
export type ServicePoolDoc = mongoose.InferSchemaType<typeof serviceProviderPoolSchema> & { _id: mongoose.Types.ObjectId };
export type DistributionStateDoc = mongoose.InferSchemaType<typeof serviceDistributionStateSchema> & { _id: mongoose.Types.ObjectId };
export type LeadDoc = mongoose.InferSchemaType<typeof leadSchema> & { _id: mongoose.Types.ObjectId };
export type LeadAssignmentDoc = mongoose.InferSchemaType<typeof leadProviderAssignmentSchema> & { _id: mongoose.Types.ObjectId };
