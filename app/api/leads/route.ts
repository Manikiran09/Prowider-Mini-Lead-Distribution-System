import { NextResponse } from 'next/server';
import { createLeadWithAssignment } from '@/lib/lead-allocation';
import { isValidPhoneNumber, normalizePhoneNumber, normalizeText } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      phone?: string;
      city?: string;
      serviceId?: string;
      description?: string;
    };

    const name = normalizeText(body.name ?? '');
    const phone = normalizePhoneNumber(body.phone ?? '');
    const city = normalizeText(body.city ?? '');
    const description = normalizeText(body.description ?? '');
    const serviceId = String(body.serviceId ?? '');

    if (!name || !city || !description || !serviceId) {
      return NextResponse.json({ message: 'Please fill in all required fields.' }, { status: 400 });
    }

    if (!isValidPhoneNumber(phone)) {
      return NextResponse.json({ message: 'Phone number must contain exactly 10 digits.' }, { status: 400 });
    }

    const result = await createLeadWithAssignment({
      name,
      phone,
      city,
      description,
      serviceId,
    });

    return NextResponse.json({
      message: 'Lead created and assigned successfully.',
      lead: result.lead,
      assignments: result.assignments,
    }, { status: 201 });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { message: 'This phone number already has a lead for the selected service.' },
        { status: 409 },
      );
    }

    const message = error instanceof Error ? error.message : 'Unexpected lead creation failure.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
