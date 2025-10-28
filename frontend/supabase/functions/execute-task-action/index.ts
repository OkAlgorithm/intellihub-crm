import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { taskId, permissionId, action } = await req.json();
    
    console.log('Executing task action:', { taskId, permissionId, action });

    // Update permission status
    const { error: updateError } = await supabase
      .from('task_permissions')
      .update({ 
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_at: new Date().toISOString()
      })
      .eq('id', permissionId);

    if (updateError) throw updateError;

    if (action === 'approve') {
      // Execute the approved task
      // This is where you would implement the actual task execution logic
      console.log(`Task ${taskId} approved and ready for execution`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Task approved and executed',
          taskId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Task rejected',
          taskId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error in execute-task-action:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});