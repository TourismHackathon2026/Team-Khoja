export async function hashAnswer(answer) {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(answer.trim().toLowerCase())
  );
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getVerificationQuestions(supabase, itemId) {
  const { data, error } = await supabase.functions.invoke('verify-claim', {
    body: { itemId }
  });
  if (error) throw error;
  return data?.questions || [];
}

export async function verifyAnswers(supabase, itemId, answers) {
  const { data, error } = await supabase.functions.invoke('verify-claim', {
    body: { itemId, answers }
  });
  if (error) throw error;
  return data;
}
