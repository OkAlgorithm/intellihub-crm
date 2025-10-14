import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase configuration missing");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Fetching audio from:", audioUrl);

    // Fetch the audio file
    let audioBlob;
    
    // Check if it's a Supabase storage URL
    if (audioUrl.includes('supabase.co/storage')) {
      // Extract the file path from the URL
      const urlParts = audioUrl.split('/storage/v1/object/public/audio-messages/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Download from Supabase storage
        const { data, error } = await supabase.storage
          .from('audio-messages')
          .download(filePath);
        
        if (error) {
          console.error("Storage download error:", error);
          throw new Error(`Failed to download audio: ${error.message}`);
        }
        
        audioBlob = data;
      } else {
        throw new Error("Invalid Supabase storage URL");
      }
    } else {
      // Try to fetch from external URL
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio: ${audioResponse.status}`);
      }
      audioBlob = await audioResponse.blob();
    }

    // Convert to base64
    const audioBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));

    // Determine audio format from blob type or URL
    let format = "wav";
    if (audioBlob.type) {
      if (audioBlob.type.includes("mp3")) format = "mp3";
      else if (audioBlob.type.includes("m4a") || audioBlob.type.includes("mp4")) format = "m4a";
      else if (audioBlob.type.includes("ogg")) format = "ogg";
      else if (audioBlob.type.includes("webm")) format = "webm";
    } else if (audioUrl.toLowerCase().endsWith('.mp3')) {
      format = "mp3";
    } else if (audioUrl.toLowerCase().endsWith('.m4a')) {
      format = "m4a";
    }

    console.log("Transcribing audio with format:", format);

    // Use Gemini to transcribe audio
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: "Please transcribe this audio message accurately. Provide only the transcription text without any additional commentary."
              },
              {
                type: "audio",
                audio: {
                  data: base64Audio,
                  format: format
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const transcription = data.choices[0].message.content;

    console.log("Transcription successful");

    return new Response(JSON.stringify({ transcription }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in transcribe-audio:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An error occurred" }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
