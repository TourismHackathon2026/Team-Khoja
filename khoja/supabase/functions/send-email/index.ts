/**
 * Supabase Edge Function: send-email
 *
 * Handles all outbound email for Khoja using the Resend API.
 * Set the env var RESEND_API_KEY in your Supabase project secrets.
 * Set FROM_EMAIL to your verified sender address (e.g. no-reply@khoja.app).
 *
 * Supported events:
 *   match_found | claim_code_issued | handover_complete |
 *   listing_rejected | listing_approved
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'no-reply@khoja.app';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://khoja.app';

// ── Template builders ────────────────────────────────────────────────────────

function buildMatchFoundEmail(payload: Record<string, string>) {
  const { recipientName, role, itemTitle, foundItemId, lossReportId } = payload;
  const isOwner = role === 'owner';
  const link = isOwner
    ? `${APP_URL}/found-items/${foundItemId}`
    : `${APP_URL}/lost-reports/${lossReportId}`;

  return {
    subject: `🎉 Possible match found for "${itemTitle}"`,
    html: `
      <h2>Great news, ${recipientName}!</h2>
      <p>
        ${isOwner
          ? `A found item has been matched to your lost report for <strong>${itemTitle}</strong>.`
          : `Your found item <strong>${itemTitle}</strong> may match an existing lost report.`}
      </p>
      <p>
        <a href="${link}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
          View Match
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px;">
        If the match isn't right, you can dismiss it from the item page.
      </p>
    `,
  };
}

function buildClaimCodeEmail(payload: Record<string, string>) {
  const { recipientName, claimCode, itemTitle } = payload;
  return {
    subject: `Your claim code for "${itemTitle}"`,
    html: `
      <h2>Hello ${recipientName},</h2>
      <p>You've passed ownership verification for <strong>${itemTitle}</strong>.</p>
      <p>Show the finder this code to complete the handover:</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:0.2em;color:#2563eb;
                  background:#eff6ff;border:2px dashed #93c5fd;border-radius:10px;
                  padding:20px 30px;text-align:center;font-family:monospace;">
        ${claimCode}
      </div>
      <p style="color:#6b7280;font-size:12px;">
        This code is single-use. Keep it private until you're face-to-face with the finder.
      </p>
    `,
  };
}

function buildHandoverCompleteEmail(payload: Record<string, string>) {
  const { recipientName, role, itemTitle, handoverId, hasPhoto } = payload;
  const isOwner = role === 'owner';
  return {
    subject: `✅ Handover complete — "${itemTitle}"`,
    html: `
      <h2>Handover recorded, ${recipientName}!</h2>
      <p>
        The handover of <strong>${itemTitle}</strong> has been successfully recorded.
        ${isOwner ? 'Your item has been returned.' : 'Thank you for returning this item!'}
      </p>
      ${hasPhoto === 'true' ? '<p>A handover photo has been saved as part of your audit trail.</p>' : ''}
      <p>
        <a href="${APP_URL}/dashboard" style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
          View in Dashboard
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px;">Handover ID: ${handoverId}</p>
    `,
  };
}

function buildListingRejectedEmail(payload: Record<string, string>) {
  const { recipientName, itemTitle, reason } = payload;
  return {
    subject: `Action required — your listing for "${itemTitle}"`,
    html: `
      <h2>Hello ${recipientName},</h2>
      <p>We were unable to publish your found-item listing for <strong>${itemTitle}</strong>.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please review and resubmit with the required details:</p>
      <p>
        <a href="${APP_URL}/post-found" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
          Resubmit Listing
        </a>
      </p>
    `,
  };
}

function buildListingApprovedEmail(payload: Record<string, string>) {
  const { recipientName, itemTitle, foundItemId } = payload;
  return {
    subject: `Your listing for "${itemTitle}" is live!`,
    html: `
      <h2>You're all set, ${recipientName}!</h2>
      <p>Your found-item listing for <strong>${itemTitle}</strong> has passed all checks and is now live.</p>
      <p>
        <a href="${APP_URL}/found-items/${foundItemId}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
          View Listing
        </a>
      </p>
    `,
  };
}

// ── Handler ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured.');
    }

    const { event, payload } = await req.json();

    let emailContent: { subject: string; html: string } | null = null;

    switch (event) {
      case 'match_found':
        emailContent = buildMatchFoundEmail(payload);
        break;
      case 'claim_code_issued':
        emailContent = buildClaimCodeEmail(payload);
        break;
      case 'handover_complete':
        emailContent = buildHandoverCompleteEmail(payload);
        break;
      case 'listing_rejected':
        emailContent = buildListingRejectedEmail(payload);
        break;
      case 'listing_approved':
        emailContent = buildListingApprovedEmail(payload);
        break;
      default:
        throw new Error(`Unknown email event: ${event}`);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Khoja <${FROM_EMAIL}>`,
        to: [payload.to],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API error ${res.status}: ${body}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-email]', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
