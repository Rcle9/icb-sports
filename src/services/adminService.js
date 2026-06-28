import { supabase } from "./supabaseClient";
import { createActivityLog } from "./activityLogService";

export async function getAllProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateUserRole(userId, newRole, actorId = null) {
  const { data: beforeProfile, error: beforeError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (beforeError) throw beforeError;

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId)
    .select()
    .single();

  if (error) throw error;

  await createActivityLog({
    actor_id: actorId,
    actor_role: "admin",
    action_type: "update_role",
    entity_type: "profile",
    entity_id: data.id,
    description: `Changed user role from ${beforeProfile.role} to ${data.role}`,
    metadata: {
      target_user_id: data.id,
      before_role: beforeProfile.role,
      after_role: data.role,
      full_name: data.full_name,
    },
  });

  return data;
}