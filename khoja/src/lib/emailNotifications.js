/**
 * Email notification service for Khoja
 * Sends automated emails via Supabase Edge Function when matches are found,
 * handovers complete, or owner verification succeeds.
 */

export const EMAIL_EVENTS = {
  MATCH_FOUND: 'match_found',
  CLAIM_CODE_ISSUED: 'claim_code_issued',
  HANDOVER_COMPLETE: 'handover_complete',
  LISTING_REJECTED: 'listing_rejected',
  LISTING_APPROVED: 'listing_approved',
};

/**
 * Send an email notification via the Supabase Edge Function `send-email`.
 * @param {object} supabase - Supabase client
 * @param {string} event   - One of EMAIL_EVENTS
 * @param {object} payload - Event-specific data
 */
export async function sendEmailNotification(supabase, event, payload) {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { event, payload },
    });
    if (error) {
      console.error('[emailNotifications] Edge function error:', error.message);
    }
  } catch (err) {
    // Non-fatal — never block the main flow for an email
    console.error('[emailNotifications] Failed to invoke send-email:', err.message);
  }
}

/**
 * Notify both the finder and the loss reporter when a match is detected.
 */
export async function notifyMatchFound(supabase, { foundItem, lossReport }) {
  // Email the reporter (owner)
  if (lossReport?.profiles?.email) {
    await sendEmailNotification(supabase, EMAIL_EVENTS.MATCH_FOUND, {
      to: lossReport.profiles.email,
      recipientName: lossReport.profiles.full_name || 'there',
      role: 'owner',
      itemTitle: foundItem.title || lossReport.title,
      foundItemId: foundItem.id,
      lossReportId: lossReport.id,
    });
  }

  // Email the finder
  if (foundItem?.profiles?.email) {
    await sendEmailNotification(supabase, EMAIL_EVENTS.MATCH_FOUND, {
      to: foundItem.profiles.email,
      recipientName: foundItem.profiles.full_name || 'there',
      role: 'finder',
      itemTitle: foundItem.title,
      foundItemId: foundItem.id,
      lossReportId: lossReport.id,
    });
  }
}

/**
 * Notify the claimant when a claim code is issued after passing verification.
 */
export async function notifyClaimCodeIssued(supabase, { userEmail, userName, claimCode, itemTitle }) {
  if (!userEmail) return;
  await sendEmailNotification(supabase, EMAIL_EVENTS.CLAIM_CODE_ISSUED, {
    to: userEmail,
    recipientName: userName || 'there',
    claimCode,
    itemTitle,
  });
}

/**
 * Notify both parties when a handover is recorded as complete.
 */
export async function notifyHandoverComplete(supabase, { handover, foundItem, claimantEmail, claimantName, finderEmail, finderName }) {
  const emails = [];

  if (claimantEmail) {
    emails.push(
      sendEmailNotification(supabase, EMAIL_EVENTS.HANDOVER_COMPLETE, {
        to: claimantEmail,
        recipientName: claimantName || 'there',
        role: 'owner',
        itemTitle: foundItem?.title,
        handoverId: handover?.id,
        hasPhoto: !!handover?.handover_photo_url,
      })
    );
  }

  if (finderEmail) {
    emails.push(
      sendEmailNotification(supabase, EMAIL_EVENTS.HANDOVER_COMPLETE, {
        to: finderEmail,
        recipientName: finderName || 'there',
        role: 'finder',
        itemTitle: foundItem?.title,
        handoverId: handover?.id,
        hasPhoto: !!handover?.handover_photo_url,
      })
    );
  }

  await Promise.allSettled(emails);
}

/**
 * Notify the poster when their listing is rejected by owner-verification checks.
 */
export async function notifyListingRejected(supabase, { userEmail, userName, itemTitle, reason }) {
  if (!userEmail) return;
  await sendEmailNotification(supabase, EMAIL_EVENTS.LISTING_REJECTED, {
    to: userEmail,
    recipientName: userName || 'there',
    itemTitle,
    reason,
  });
}

/**
 * Notify the poster when their listing passes all checks and goes live.
 */
export async function notifyListingApproved(supabase, { userEmail, userName, itemTitle, foundItemId }) {
  if (!userEmail) return;
  await sendEmailNotification(supabase, EMAIL_EVENTS.LISTING_APPROVED, {
    to: userEmail,
    recipientName: userName || 'there',
    itemTitle,
    foundItemId,
  });
}
