import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "admin@thegioithuocmoi.com",
    password: "Admin@123456",
  });

  if (error) {
    console.error("LOGIN_FAIL:", error.message);
    process.exit(1);
  }

  console.log("LOGIN_OK:", data.user?.email);
  console.log("SESSION:", Boolean(data.session?.access_token));
}

main();
