import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { RegisterRequestSchema } from "@/shared/types";
import { z } from "zod";

// Create two clients - one for public auth operations, one for admin operations
const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed`,
    });
  }

  try {
    // Validate request body
    const validatedData = RegisterRequestSchema.parse(req.body);
    const { email, password, username } = validatedData;

    // Check if username is already taken using admin client
    const { data: existingUser, error: usernameCheckError } = await supabaseAdmin
      .from("users")
      .select("username")
      .eq("username", username)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Username already taken",
      });
    }

    // Create user with Supabase Auth using public client
    const { data, error } = await supabasePublic.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });

    if (error) {
      console.error('Supabase registration error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || "Registration failed",
        code: error.code || 'UNKNOWN_ERROR'
      });
    }

    if (!data.user) {
      return res.status(400).json({
        success: false,
        error: "Registration failed",
      });
    }

    // Create user profile in our users table using admin client
    const { error: profileError } = await supabaseAdmin.from("users").insert({
      id: data.user.id,
      email: email,
      username: username,
      is_guest: false,
      created_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error("Error creating user profile:", profileError);
      // Don't fail the registration if profile creation fails
    }

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          username: username,
          isGuest: false,
          createdAt: data.user.created_at,
        },
        session: data.session
          ? {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
            }
          : null,
        needsEmailConfirmation: !data.session, // If no session, email confirmation is needed
      },
      message: data.session
        ? "Account created successfully"
        : "Account created successfully. Please check your email to confirm your account.",
    });
  } catch (error: any) {
    console.error("Register API Error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation error",
        details: error.errors,
      });
    }

    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
}
