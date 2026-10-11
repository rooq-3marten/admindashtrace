"""
E-mail notifications for field-agent review decisions, sent through Resend (https://resend.com).

Environment variables
  RESEND_API_KEY  API key from the Resend dashboard.
  MAIL_FROM       Sender, e.g.  TraceHarvest <noreply@yourdomain.com>
                  The domain must be verified in Resend.

send_agent_status_email() never raises. It returns one of:
  "sent"            Resend accepted the message
  "failed"          Resend (or the network) refused it; the review decision is still saved
  "not_configured"  RESEND_API_KEY or MAIL_FROM is missing
  "no_recipient"    the agent has no e-mail address on file
"""
import html
import logging
import os
from typing import Optional

import requests

log = logging.getLogger("traceharvest.mailer")
RESEND_URL = "https://api.resend.com/emails"


def _post(payload: dict, api_key: str):
    """Isolated so tests can replace it."""
    return requests.post(
        RESEND_URL,
        json=payload,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        timeout=8,
    )


def _compose(action: str, name: str, reason: Optional[str]):
    first = (name or "there").split(" ")[0]
    reason_text = (reason or "").strip()

    if action == "approve":
        subject = "Your TraceHarvest field agent account has been approved"
        lines = [
            f"Hello {first},",
            "Your field agent application has been approved. You can now sign in to the TraceHarvest "
            "app with your email and password and start syncing farm records.",
        ]
    elif action == "reinstate":
        subject = "Your TraceHarvest field agent account has been reinstated"
        lines = [
            f"Hello {first},",
            "Your field agent account has been reinstated. You can sign in to the TraceHarvest app "
            "and sync farm records again.",
        ]
    elif action == "reject":
        subject = "Update on your TraceHarvest field agent application"
        lines = [
            f"Hello {first},",
            "Thank you for applying. We were not able to approve your application at this time.",
            f"Reason: {reason_text}" if reason_text else "",
            "You can correct your details and resubmit your application from inside the TraceHarvest app.",
        ]
    elif action == "suspend":
        subject = "Your TraceHarvest field agent account has been suspended"
        lines = [
            f"Hello {first},",
            "Your field agent account has been suspended, so you cannot sync farm records for now.",
            f"Reason: {reason_text}" if reason_text else "",
            "Please contact your cooperative coordinator or TraceHarvest support to resolve this.",
        ]
    else:
        raise ValueError(f"unknown action {action}")

    lines = [l for l in lines if l]
    text = "\n\n".join(lines) + "\n\n- The TraceHarvest team"
    body = "".join(f"<p>{html.escape(l)}</p>" for l in lines) + "<p>- The TraceHarvest team</p>"
    return subject, text, body


def send_agent_status_email(*, to: Optional[str], name: str, action: str, reason: Optional[str] = None) -> str:
    recipient = (to or "").strip()
    if not recipient:
        return "no_recipient"
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    sender = os.getenv("MAIL_FROM", "").strip()
    if not api_key or not sender:
        return "not_configured"

    try:
        subject, text, body = _compose(action, name, reason)
        resp = _post({"from": sender, "to": [recipient], "subject": subject, "text": text, "html": body}, api_key)
        if 200 <= resp.status_code < 300:
            return "sent"
        log.warning("Resend rejected the message (HTTP %s): %s", resp.status_code, resp.text[:300])
        return "failed"
    except Exception as exc:
        log.warning("E-mail could not be sent: %s", exc)
        return "failed"
