import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectMongo } from '@/lib/mongodb';
import { Provider, WebhookEvent } from '@/lib/models';
import { getCurrentMonthKey } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { eventId?: string; reason?: string };
  const eventId = body.eventId?.trim();

  if (!eventId) {
    return NextResponse.json({ message: 'eventId is required.' }, { status: 400 });
  }

  try {
    await connectMongo();
    const session = await mongoose.startSession();

    try {
      const result = await session.withTransaction(async () => {
        await WebhookEvent.create(
          [
            {
              eventId,
              eventType: 'reset-provider-quota',
              payload: body,
            },
          ],
          { session },
        );

        const providers = await Provider.find().session(session).select({ _id: 1 }).lean();
        if (providers.length > 0) {
          await Provider.updateMany(
            { _id: { $in: providers.map((provider) => provider._id) } },
            { $set: { quotaUsed: 0, quotaCycleKey: getCurrentMonthKey() } },
            { session },
          );
        }

        return { providerCount: providers.length };
      });

      return NextResponse.json({
        message: 'Provider quota reset to 10 through webhook.',
        idempotent: false,
        ...result,
      });
    } finally {
      session.endSession();
    }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
      return NextResponse.json({
        message: 'Webhook already processed. No changes applied.',
        idempotent: true,
      });
    }

    const message = error instanceof Error ? error.message : 'Webhook processing failed.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
