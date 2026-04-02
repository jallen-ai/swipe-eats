const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY")!;

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Places API (New) Text Search — same API key as fetch-restaurants
    const url = "https://places.googleapis.com/v1/places:searchText";
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": "places.location,places.formattedAddress,places.displayName",
      },
      body: JSON.stringify({ textQuery: query }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("Places Text Search error:", resp.status, err);
      return new Response(
        JSON.stringify({ error: "Location not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json();
    if (!data.places?.length) {
      return new Response(
        JSON.stringify({ error: "Location not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const place = data.places[0];
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    const formattedAddress = place.formattedAddress || place.displayName?.text || query;

    if (lat == null || lng == null) {
      return new Response(
        JSON.stringify({ error: "Location not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ lat, lng, formattedAddress }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Geocode error:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
