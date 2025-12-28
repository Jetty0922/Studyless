// Supabase Edge Function to delete a user and all their data
// Deploy with: supabase functions deploy delete-user

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user's JWT and get their info
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Deleting user: ${user.id} (${user.email})`)

    // Delete user's data from all tables (cascade should handle flashcards via deck deletion)
    // But we'll be explicit for safety
    
    // 1. Delete review history
    const { error: reviewError } = await supabaseAdmin
      .from('review_history')
      .delete()
      .eq('user_id', user.id)
    
    if (reviewError) {
      console.error('Error deleting review history:', reviewError)
    }

    // 2. Delete flashcards
    const { error: flashcardsError } = await supabaseAdmin
      .from('flashcards')
      .delete()
      .eq('user_id', user.id)
    
    if (flashcardsError) {
      console.error('Error deleting flashcards:', flashcardsError)
    }

    // 3. Delete decks
    const { error: decksError } = await supabaseAdmin
      .from('decks')
      .delete()
      .eq('user_id', user.id)
    
    if (decksError) {
      console.error('Error deleting decks:', decksError)
    }

    // 4. Delete profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
    }

    // 5. Delete storage files (if any)
    try {
      const { data: files } = await supabaseAdmin
        .storage
        .from('flashcard-images')
        .list(user.id)
      
      if (files && files.length > 0) {
        const filePaths = files.map(f => `${user.id}/${f.name}`)
        await supabaseAdmin.storage.from('flashcard-images').remove(filePaths)
      }
    } catch (storageError) {
      console.error('Error deleting storage files:', storageError)
      // Continue even if storage deletion fails
    }

    // 6. Finally, delete the auth user
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
    
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account', details: deleteUserError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Successfully deleted user: ${user.id}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

