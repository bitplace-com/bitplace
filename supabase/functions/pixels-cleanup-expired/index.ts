import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[pixels-cleanup-expired] Starting cleanup...");

    // Call the DB function that atomically deletes expired pixels and refunds VPE
    const { data: expiredPixels, error } = await supabase
      .rpc("cleanup_expired_pixels");

    if (error) {
      console.error("[pixels-cleanup-expired] RPC error:", error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const deletedCount = expiredPixels?.length || 0;
    console.log(`[pixels-cleanup-expired] Cleaned up ${deletedCount} expired pixels`);

    // Insert notifications for each expired pixel owner
    if (expiredPixels && expiredPixels.length > 0) {
      // Group by owner for batch notification
      const ownerPixels = new Map<string, Array<{ x: number; y: number; refund: number }>>();
      
      for (const p of expiredPixels) {
        if (!p.owner_id) continue;
        const list = ownerPixels.get(p.owner_id) || [];
        list.push({ x: Number(p.pixel_x), y: Number(p.pixel_y), refund: Number(p.refund_amount) });
        ownerPixels.set(p.owner_id, list);
      }

      const notifications = [];
      for (const [ownerId, pixels] of ownerPixels) {
        const totalRefund = pixels.reduce((sum, p) => sum + p.refund, 0);
        const pixelCount = pixels.length;
        
        notifications.push({
          user_id: ownerId,
          type: "PIXEL_EXPIRED",
          title: pixelCount === 1 
            ? "Your pixel expired" 
            : `${pixelCount} pixels expired`,
          body: pixelCount === 1
            ? `Pixel at (${pixels[0].x}, ${pixels[0].y}) expired after 72h. ${totalRefund} PE returned.`
            : `${pixelCount} pixels expired after 72h. ${totalRefund} PE returned.`,
          meta: { 
            pixel_count: pixelCount, 
            total_refund: totalRefund,
            pixels: pixels.slice(0, 10), // Limit stored coords
          },
        });
      }

      if (notifications.length > 0) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notifications);
        
        if (notifError) {
          console.error("[pixels-cleanup-expired] Notification insert error:", notifError);
        } else {
          console.log(`[pixels-cleanup-expired] Sent ${notifications.length} expiry notifications`);
        }
      }
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      deletedCount,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[pixels-cleanup-expired] Error:", error);
    return new Response(JSON.stringify({ ok: false, error: "INTERNAL_ERROR" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
