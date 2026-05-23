import { connectMongo } from './mongodb';
import { Service } from './models';

export async function getServices() {
  await connectMongo();

  const services = await Service.find().sort({ createdAt: 1 }).lean();
  const typedServices = services as unknown as Array<{
    _id: { toString(): string };
    name: string;
    slug: string;
  }>;

  return typedServices.map((service) => ({
    id: service._id.toString(),
    name: service.name,
    slug: service.slug,
  }));
}
