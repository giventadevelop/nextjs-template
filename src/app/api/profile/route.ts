import { getServerAuth } from "@/lib/auth";
import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema for profile update validation
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getServerAuth();
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await db.userProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        createdAt: true,
      }
    });

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    return Response.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await getServerAuth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    try {
      // Validate request body
      const validatedData = profileSchema.parse(body);

      // Update or create profile
      const profile = await db.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...validatedData,
        },
        update: validatedData,
      });

      return NextResponse.json(profile);
    } catch (validationError) {
      console.error("[PROFILE_VALIDATION]", validationError);
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
  } catch (error) {
    console.error("[PROFILE_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await getServerAuth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await request.json();

    const profile = await db.userProfile.upsert({
      where: { userId },
      create: { ...data, userId },
      update: data,
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { userId } = await getServerAuth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await db.userProfile.delete({
      where: { userId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting profile:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}