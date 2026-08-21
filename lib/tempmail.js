const BASE_URL = "https://tempmail.plus";

function normalizeEmail(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    throw new Error("请输入有效的邮箱地址，例如 xxx@mailto.plus");
  }

  return normalized;
}

async function tempmailRequest(path, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }

  const response = await fetch(`${BASE_URL}${path}?${query.toString()}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok || (payload && payload.result === false)) {
    const message =
      (payload && typeof payload === "object" && (payload.message || payload.error || payload.err?.msg)) ||
      (typeof payload === "string" ? payload : "") ||
      `请求失败 (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

async function tempmailAttachmentRequest({ email, pin, messageId, contentId }) {
  const query = new URLSearchParams({
    email,
    epin: String(pin || "").trim(),
    content_id: contentId,
  });
  const response = await fetch(
    `${BASE_URL}/api/mails/${encodeURIComponent(messageId)}/attachments/0?${query.toString()}`,
    {
      cache: "no-store",
      headers: { Accept: "*/*" },
    },
  );

  if (!response.ok) return null;

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) return null;

  return {
    contentType: response.headers.get("content-type") || "application/octet-stream",
    base64: bytes.toString("base64"),
  };
}

function normalizeMessage(item) {
  return {
    ...item,
    id: String(item.mail_id ?? item.id ?? ""),
    subject: item.subject || "",
    from: item.from_mail || item.from || item.sender || "",
    // TempMail.Plus uses `time` and `is_new` in its mailbox API.
    receivedAt: item.time ?? item.date ?? item.received_at ?? item.created_at ?? null,
    isNew: item.is_new ?? item.isNew,
    isSeen: item.is_seen ?? item.seen,
  };
}

function toHtml(message) {
  if (message.html && message.html.trim()) return message.html;

  const text = String(message.text || "");
  return `<html><body><pre style="white-space: pre-wrap; font: inherit">${text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")}</pre></body></html>`;
}

async function inlineCidImages(html, { email, pin, messageId }) {
  const cidPattern = /\bsrc=(['"])cid:([^'"]+)\1/gi;
  const matches = [...html.matchAll(cidPattern)];
  const contentIds = [...new Set(matches.map((match) => match[2].replace(/^<|>$/g, "")))];

  if (!contentIds.length) return html;

  const resolved = await Promise.all(
    contentIds.map(async (contentId) => {
      try {
        const attachment = await tempmailAttachmentRequest({ email, pin, messageId, contentId });
        return [contentId, attachment];
      } catch {
        return [contentId, null];
      }
    }),
  );

  const attachmentMap = new Map(resolved);
  return html.replace(cidPattern, (full, quote, rawContentId) => {
    const contentId = rawContentId.replace(/^<|>$/g, "");
    const attachment = attachmentMap.get(contentId);
    if (!attachment) return full;
    return `src=${quote}data:${attachment.contentType};base64,${attachment.base64}${quote}`;
  });
}

export async function createInbox({ pin, tempmailEmail }) {
  const email = normalizeEmail(tempmailEmail);
  await tempmailRequest("/api/mails", {
    email,
    epin: String(pin || "").trim(),
    limit: 1,
  });
  return { email };
}

export async function listMessages({ pin, email }) {
  const mailbox = normalizeEmail(email);
  const data = await tempmailRequest("/api/mails", {
    email: mailbox,
    epin: String(pin || "").trim(),
    limit: 50,
  });
  return (Array.isArray(data.mail_list) ? data.mail_list : []).map(normalizeMessage);
}

export async function getMessage({ pin, email, messageId }) {
  const mailbox = normalizeEmail(email);
  const data = await tempmailRequest(`/api/mails/${encodeURIComponent(messageId)}`, {
    email: mailbox,
    epin: String(pin || "").trim(),
  });
  const content = await inlineCidImages(toHtml(data), {
    email: mailbox,
    pin,
    messageId,
  });

  return {
    ...normalizeMessage(data),
    content,
  };
}
