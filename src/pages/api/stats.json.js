import { getSiteStats } from "../../lib/content-domain";
import { buildStatsSuccessBody, buildStatsErrorBody } from "../../utils/statsResponse";

export async function GET() {
  try {
    const stats = await getSiteStats();
    return new Response(
      JSON.stringify(buildStatsSuccessBody(stats)),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error generating library stats:", error);

    return new Response(
      JSON.stringify(buildStatsErrorBody(error)),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
