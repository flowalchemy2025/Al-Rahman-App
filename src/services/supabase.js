import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Replace these with your actual Supabase credentials
const SUPABASE_URL = "https://vzbrjjikbuirogrttddi.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YnJqamlrYnVpcm9ncnR0ZGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzk3NzgsImV4cCI6MjA4NTcxNTc3OH0.a_NKNHjgn59A8hL9_pwYtC7QPT3rtQPrISNApYTDdqs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// User Authentication Functions
export const signUp = async (
  fullName,
  mobileNumber,
  username,
  password,
  role,
) => {
  try {
    // First, create the auth user with email format (using mobile as email)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `${username}@restaurant.app`,
      password: password,
    });

    if (authError) throw authError;

    // Then, create the user profile in the users table
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          user_id: authData.user.id,
          full_name: fullName,
          mobile_number: mobileNumber,
          username: username,
          role: role,
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

export const signIn = async (usernameOrMobile, password) => {
  try {
    // First, find the user by username or mobile number
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .or(
        `username.eq.${usernameOrMobile},mobile_number.eq.${usernameOrMobile}`,
      )
      .single();

    if (userError || !userData) {
      throw new Error("Invalid credentials");
    }

    // Sign in with the constructed email
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: `${userData.username}@restaurant.app`,
        password: password,
      });

    if (authError) throw authError;

    return { success: true, data: userData };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    return null;
  }
};

// Purchase Entry Functions
export const addPurchaseEntry = async (entryData) => {
  try {
    const { data, error } = await supabase
      .from("purchase_entries")
      .insert([entryData])
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updatePurchaseEntry = async (id, entryData) => {
  try {
    const { data, error } = await supabase
      .from("purchase_entries")
      .update(entryData)
      .eq("id", id)
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deletePurchaseEntry = async (id) => {
  try {
    const { error } = await supabase
      .from("purchase_entries")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getPurchaseEntries = async (filters = {}) => {
  try {
    let query = supabase.from("purchase_entries").select(`
        *,
        worker:worker_id(id, full_name, username),
        vendor:vendor_id(id, full_name, username)
      `);

    if (filters.workerId) {
      query = query.eq("worker_id", filters.workerId);
    }

    if (filters.vendorId) {
      query = query.eq("vendor_id", filters.vendorId);
    }

    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate);
    }

    if (filters.searchTerm) {
      query = query.ilike("item_name", `%${filters.searchTerm}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllUsers = async (role = null) => {
  try {
    let query = supabase.from("users").select("*");

    if (role) {
      query = query.eq("role", role);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAnalyticsData = async (days = 10) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("purchase_entries")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
