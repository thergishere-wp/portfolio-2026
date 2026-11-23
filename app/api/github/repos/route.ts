import { connection } from "next/server";
import { getRepos } from "@/lib/github";

// Request time, so nothing is fetched at build. The data itself is cached for
// 60 s inside getRepos().
export async function GET() {
  await connection();
  const data = await getRepos();
  return Response.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
