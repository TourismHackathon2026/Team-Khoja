import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { itemId, answers } = await req.json();
    if (!itemId) throw new Error('Missing itemId');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: item, error } = await supabase
      .from('found_items')
      .select('verification_questions, claim_attempts, locked_until')
      .eq('id', itemId)
      .single();

    if (error) throw error;

    const questions = item?.verification_questions || [];
    if (!answers) {
      return json({ questions: questions.map(({ q }, index) => ({ index, q })) });
    }

    const lockedUntil = item?.locked_until;
    if (lockedUntil && new Date(lockedUntil) > new Date()) {
      return json({ pass: false, attemptsLeft: 0, lockedUntil });
    }

    const pass = questions.length > 0 && questions.every((question, index) => {
      const answer = answers.find((a) => a.index === index);
      return answer?.hash === question.a_hash;
    });

    if (pass) {
      await supabase
        .from('found_items')
        .update({ claim_attempts: 0, locked_until: null })
        .eq('id', itemId);
      return json({ pass: true, attemptsLeft: 3, lockedUntil: null });
    }

    const attempts = (item?.claim_attempts || 0) + 1;
    const nextLockedUntil = attempts >= 3 ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null;

    await supabase
      .from('found_items')
      .update({ claim_attempts: attempts, locked_until: nextLockedUntil })
      .eq('id', itemId);

    return json({
      pass: false,
      attemptsLeft: Math.max(0, 3 - attempts),
      lockedUntil: nextLockedUntil
    });
  } catch (error) {
    return json({ error: error.message || 'Verification failed' }, 400);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
