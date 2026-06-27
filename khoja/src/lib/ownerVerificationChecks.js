/**
 * ownerVerificationChecks.js
 *
 * Runs a series of anti-scam / quality checks on a found-item listing
 * BEFORE it is saved to the database.  Any failed check returns a human-
 * readable reason so the poster can correct the problem.
 *
 * Usage (in PostFound.jsx handleSubmit):
 *
 *   const result = await runOwnerVerificationChecks(supabase, user, itemData, verificationQuestions);
 *   if (!result.pass) {
 *     setError(result.reason);
 *     return;
 *   }
 */

// Minimum character lengths for meaningful content
const MIN_TITLE_LEN = 6;
const MIN_DESCRIPTION_LEN = 20;
const MIN_ANSWER_LEN = 2;

// How many found items one account may have open at once (scam signal)
const MAX_OPEN_LISTINGS_PER_USER = 10;

// ── Individual checks ─────────────────────────────────────────────────────────

function checkQuestionsPresent(verificationQuestions) {
  const filled = verificationQuestions.filter(({ q, a }) => q?.trim() && a?.trim());
  if (filled.length < 2) {
    return { pass: false, reason: 'Please set at least 2 verification questions so the owner can prove the item is theirs.' };
  }
  return { pass: true };
}

function checkQuestionQuality(verificationQuestions) {
  for (const { q, a } of verificationQuestions) {
    if (!q?.trim() || !a?.trim()) continue; // optional third question is fine empty

    if (q.trim().length < 10) {
      return { pass: false, reason: `Verification question "${q.slice(0, 30)}..." is too short. Write a specific question that only the owner would know.` };
    }
    if (a.trim().length < MIN_ANSWER_LEN) {
      return { pass: false, reason: 'One or more verification answers are too short. Provide a meaningful answer.' };
    }

    // Reject trivially guessable answers
    const trivial = ['yes', 'no', 'mine', 'idk', '?', 'n/a', '-', 'na'];
    if (trivial.includes(a.trim().toLowerCase())) {
      return { pass: false, reason: `The answer "${a}" is too easy to guess. Use a specific detail only the owner would know.` };
    }

    // Prevent Q === A (a common lazy shortcut)
    if (q.trim().toLowerCase() === a.trim().toLowerCase()) {
      return { pass: false, reason: 'A verification question cannot be the same as its answer.' };
    }
  }
  return { pass: true };
}

function checkItemDetails(itemData) {
  if (!itemData.title || itemData.title.trim().length < MIN_TITLE_LEN) {
    return { pass: false, reason: `Please provide a more descriptive title (at least ${MIN_TITLE_LEN} characters).` };
  }
  if (!itemData.description || itemData.description.trim().length < MIN_DESCRIPTION_LEN) {
    return { pass: false, reason: `Please add a description with at least ${MIN_DESCRIPTION_LEN} characters so the owner can recognise their item.` };
  }
  if (!itemData.category) {
    return { pass: false, reason: 'Please select a category for the item.' };
  }
  return { pass: true };
}

function checkLocationPresent(itemData) {
  if (!itemData.found_lat || !itemData.found_lng) {
    return { pass: false, reason: 'Please pick the location where you found the item on the map.' };
  }
  // Rough sanity — coordinates should be non-zero and plausible
  if (itemData.found_lat === 0 && itemData.found_lng === 0) {
    return { pass: false, reason: 'The selected location looks incorrect (0, 0). Please re-pick it on the map.' };
  }
  return { pass: true };
}

async function checkUserNotBanned(supabase, userId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_banned, ban_reason')
    .eq('id', userId)
    .single();

  if (error) return { pass: true }; // fail-open if table not yet seeded
  if (profile?.is_banned) {
    return {
      pass: false,
      reason: profile.ban_reason
        ? `Your account has been restricted: ${profile.ban_reason}`
        : 'Your account has been restricted from posting listings. Please contact support.',
    };
  }
  return { pass: true };
}

async function checkOpenListingLimit(supabase, userId) {
  const { count, error } = await supabase
    .from('found_items')
    .select('id', { count: 'exact', head: true })
    .eq('posted_by', userId)
    .in('status', ['unclaimed', 'pending_review']);

  if (error) return { pass: true }; // fail-open
  if ((count ?? 0) >= MAX_OPEN_LISTINGS_PER_USER) {
    return {
      pass: false,
      reason: `You have ${count} open listings. Please resolve or remove some before posting a new one.`,
    };
  }
  return { pass: true };
}

async function checkEmailVerified(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { pass: false, reason: 'You must be signed in to post a listing.' };
  if (!user.email_confirmed_at) {
    return { pass: false, reason: 'Please verify your email address before posting. Check your inbox for a confirmation link.' };
  }
  return { pass: true };
}

// ── Main runner ───────────────────────────────────────────────────────────────

/**
 * Run all pre-listing checks.
 * @returns {{ pass: boolean, reason?: string }}
 */
export async function runOwnerVerificationChecks(supabase, user, itemData, verificationQuestions) {
  // 1. User account checks (async)
  const emailCheck = await checkEmailVerified(supabase);
  if (!emailCheck.pass) return emailCheck;

  const banCheck = await checkUserNotBanned(supabase, user.id);
  if (!banCheck.pass) return banCheck;

  const limitCheck = await checkOpenListingLimit(supabase, user.id);
  if (!limitCheck.pass) return limitCheck;

  // 2. Item content checks (sync)
  const detailsCheck = checkItemDetails(itemData);
  if (!detailsCheck.pass) return detailsCheck;

  const locationCheck = checkLocationPresent(itemData);
  if (!locationCheck.pass) return locationCheck;

  // 3. Verification-question checks (sync)
  const questionsCheck = checkQuestionsPresent(verificationQuestions);
  if (!questionsCheck.pass) return questionsCheck;

  const qualityCheck = checkQuestionQuality(verificationQuestions);
  if (!qualityCheck.pass) return qualityCheck;

  return { pass: true };
}

/**
 * Helper: derive a human-readable summary of which checks passed/failed
 * for display in a pre-submit review UI (optional).
 */
export function getChecklistStatus(itemData, verificationQuestions) {
  return [
    {
      label: 'Item title & description',
      pass: checkItemDetails(itemData).pass,
    },
    {
      label: 'Location pinned on map',
      pass: checkLocationPresent(itemData).pass,
    },
    {
      label: 'At least 2 verification questions',
      pass: checkQuestionsPresent(verificationQuestions).pass,
    },
    {
      label: 'Question quality',
      pass: checkQuestionQuality(verificationQuestions).pass,
    },
  ];
}
