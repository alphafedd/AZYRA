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
    const { imageUrl, prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!imageUrl) {
      throw new Error("imageUrl is required");
    }

    console.log("Editing image with prompt:", prompt);

    // Enhanced prompt to preserve facial features with maximum precision
    const enhancedPrompt = `CRITICAL IMAGE EDITING INSTRUCTIONS - FOLLOW EXACTLY:

🔒 ABSOLUTE FACIAL PRESERVATION RULES (NON-NEGOTIABLE):
1. FACE LOCK: The face must remain 100% IDENTICAL - zero modifications allowed
2. FACIAL FEATURES: Do NOT change eyes, eyebrows, nose, lips, mouth, ears, chin, jawline, cheekbones
3. SKIN: Preserve exact skin tone, texture, pores, freckles, moles, wrinkles, scars
4. EXPRESSION: Keep the exact same facial expression and emotion
5. FACE SHAPE: Maintain identical face proportions and structure
6. LIGHTING ON FACE: Preserve original shadows and highlights on facial features
7. HAIR: If hair is near the face, keep the hairline and hair near face unchanged unless specifically requested

📝 USER REQUEST: ${prompt}

⚠️ MODIFICATION SCOPE:
- ONLY modify what the user explicitly requested
- If user asks to change clothes: change ONLY the clothing, nothing else
- If user asks to change background: change ONLY the background, nothing else
- If user asks to add accessories: add them WITHOUT affecting the face
- The person MUST be 100% recognizable as the exact same individual

🎯 QUALITY REQUIREMENTS:
- Seamless integration of changes
- Maintain original image quality and resolution
- Natural lighting consistency
- Professional, realistic result

REMEMBER: The face is SACRED. Any modification to facial features = FAILURE.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: [
              {
                type: "text",
                text: enhancedPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Image edit response received");

    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textContent = data.choices?.[0]?.message?.content;

    if (!editedImageUrl) {
      throw new Error("No image returned from AI");
    }

    return new Response(JSON.stringify({ imageUrl: editedImageUrl, text: textContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in edit-image:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});