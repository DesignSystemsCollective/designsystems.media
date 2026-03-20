import { getSiteStats } from "../../lib/content-domain";

export async function GET() {
  try {
    const stats = await getSiteStats();
    return new Response(
      JSON.stringify({
        stats,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error generating library stats:", error);
// 
    return new Response(
      JSON.stringify({
        error: "Failed to generate library stats",
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
