import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vzbrjjikbuirogrttddi.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YnJqamlrYnVpcm9ncnR0ZGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDEzOTc3OCwiZXhwIjoyMDg1NzE1Nzc4fQ.0wqvEwjgYwHd8h49TOSZlkmHcU-lBZfx88KtI_U2jxQ"; // Keep your secret key here

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  },
);

// Create User (Simplified to just Username, Password, Role, Branches)
export const createUserAsAdmin = async (username, password, role, branches) => {
  try {
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: `${username}@restaurant.app`,
        password: password,
        email_confirm: true,
      });
    if (authError) throw authError;

    const { data, error } = await supabaseAdmin
      .from("users")
      .insert([
        {
          user_id: authData.user.id,
          username: username,
          full_name: "", // Set later by user
          mobile_number: "", // Set later by user
          role: role,
          branches: branches,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Update User (Full Details)
export const updateUserAsAdmin = async (
  userId,
  authId,
  currentUsername,
  updates,
) => {
  try {
    // 1. If username or password changes, update Auth
    const authUpdates = {};
    if (updates.username && updates.username !== currentUsername) {
      authUpdates.email = `${updates.username}@restaurant.app`;
    }
    if (updates.password) {
      authUpdates.password = updates.password;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(authId, authUpdates);
      if (authError) throw authError;
    }

    // 2. Update Public Users Table (Remove password from object as it doesn't belong in public table)
    const tableUpdates = { ...updates };
    delete tableUpdates.password;

    const { data, error } = await supabaseAdmin
      .from("users")
      .update(tableUpdates)
      .eq("id", userId)
      .select();
    if (error) throw error;

    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Delete User
export const deleteUserAsAdmin = async (authId, userId) => {
  try {
    // 1. Delete from public table
    const { error: tableError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId);
    if (tableError) throw tableError;

    // 2. Delete from Auth
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(authId);
    if (authError) throw authError;

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
