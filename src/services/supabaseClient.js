// src/services/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://fvzzpppxxjcwzbikmkdm.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2enpwcHB4eGpjd3piaWtta2RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MTY2NzYsImV4cCI6MjA5MjE5MjY3Nn0.DD_mvtFsdWq1GV5j0i9b4pk0Sgy0WlkNRJI7wunFB3Q";

export const supabase = createClient(supabaseUrl, supabaseKey);