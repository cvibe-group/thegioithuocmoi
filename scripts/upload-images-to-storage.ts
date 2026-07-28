/**
 * Upload local public/images/thegioithuocmoi/* to Supabase Storage bucket `images`,
 * then rewrite article/logo paths in the database to public storage URLs.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or anon/publishable key");
}

const supabaseUrl: string = url;
const supabaseKey: string = key;

const BUCKET = "images";
const LOCAL_DIR = path.join(process.cwd(), "public", "images", "thegioithuocmoi");
const REMOTE_PREFIX = "thegioithuocmoi";

const mimeByExt: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function publicUrl(objectPath: string) {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const entries = await readdir(LOCAL_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => Boolean(mimeByExt[path.extname(name).toLowerCase()]));

  console.log(`Uploading ${files.length} files to ${BUCKET}/${REMOTE_PREFIX}/ ...`);

  for (const name of files) {
    const localPath = path.join(LOCAL_DIR, name);
    const objectPath = `${REMOTE_PREFIX}/${name}`;
    const body = await readFile(localPath);
    const contentType = mimeByExt[path.extname(name).toLowerCase()]!;

    const { error } = await supabase.storage.from(BUCKET).upload(objectPath, body, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });

    if (error) {
      throw new Error(`Upload failed for ${name}: ${error.message}`);
    }
    console.log(`  ✓ ${objectPath}`);
  }

  const localPrefix = "/images/thegioithuocmoi/";
  const storagePrefix = publicUrl(`${REMOTE_PREFIX}/`);

  console.log("Rewriting article image URLs...");
  const { data: articles, error: articlesError } = await supabase
    .from("articles")
    .select("path, image")
    .like("image", `${localPrefix}%`);
  if (articlesError) throw new Error(articlesError.message);

  for (const row of articles ?? []) {
    if (!row.image) continue;
    const nextImage = row.image.replace(localPrefix, storagePrefix);
    const { error } = await supabase
      .from("articles")
      .update({ image: nextImage })
      .eq("path", row.path);
    if (error) throw new Error(`article ${row.path}: ${error.message}`);
  }

  console.log("Rewriting logo_src...");
  const logoUrl = publicUrl(`${REMOTE_PREFIX}/TGTM-Final-06-750x254.png`);
  const { error: logoError } = await supabase
    .from("site_settings")
    .upsert({ key: "logo_src", value: logoUrl });
  if (logoError) throw new Error(logoError.message);

  console.log("Done.");
  console.log(`Public base: ${storagePrefix}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
