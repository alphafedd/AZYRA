import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, duration = 5 } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    console.log("Generating video with prompt:", prompt, "duration:", duration);

    // Use OpenAI's video generation API (when available) or fallback to image animation
    // For now, we'll use Lovable AI gateway with video generation capability
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate a high-quality image first using Gemini
    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: `Create a highly detailed, cinematic image for video generation: ${prompt}. 
Make it visually stunning with dynamic composition suitable for animation.
Ultra high resolution, professional cinematography, dramatic lighting.`
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!imageResponse.ok) {
      if (imageResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (imageResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await imageResponse.text();
      console.error("Image generation error:", imageResponse.status, errorText);
      throw new Error(`Image generation failed: ${imageResponse.status}`);
    }

    const imageData = await imageResponse.json();
    const generatedImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textDescription = imageData.choices?.[0]?.message?.content;

    if (!generatedImageUrl) {
      throw new Error("Failed to generate base image for video");
    }

    console.log("Base image generated successfully");

    // Return the generated image with video metadata
    // In a full implementation, this would animate the image using a video API
    return new Response(JSON.stringify({ 
      success: true,
      videoUrl: null, // Video URL would be here when using actual video API
      thumbnailUrl: generatedImageUrl,
      description: textDescription,
      prompt: prompt,
      duration: duration,
      status: "image_generated",
      message: "Image de base générée. La génération vidéo complète sera disponible prochainement avec l'API VEO3."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-video:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
