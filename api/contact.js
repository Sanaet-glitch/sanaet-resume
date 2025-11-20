const { parse: parseForm } = require("node:querystring");

const MAX_FIELD_LENGTH = 1000;
const MAX_MESSAGE_LENGTH = 5000;

const sanitize = (value, max = MAX_FIELD_LENGTH) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, max);
};

const buildEmailBody = (name, email, message) => {
  const html = `
    <p><strong>Name:</strong> ${name || "(not provided)"}</p>
    <p><strong>Email:</strong> ${email || "(not provided)"}</p>
    <p><strong>Message:</strong></p>
    <p style="white-space: pre-line;">${message || "(empty)"}</p>
  `;

  const text = `Name: ${name || "(not provided)"}\nEmail: ${email || "(not provided)"}\n\n${message || "(empty)"}`;

  return { html, text };
};

const readRequestBody = async (req) => {
  if (typeof req.body === "string") {
    return req.body;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body.toString("utf8");
  }

  if (typeof req.body === "object" && req.body !== null) {
    return req.body;
  }

  return await new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > MAX_MESSAGE_LENGTH * 4) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
};

const normalizeContentType = value => {
  if (!value) {
    return "";
  }
  if (Array.isArray(value)) {
    return value[0] || "";
  }
  return value;
};

const parsePayload = (rawBody, contentType) => {
  if (!rawBody) {
    return {};
  }

  if (typeof rawBody === "object") {
    return rawBody;
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawBody);
    } catch (error) {
      return {};
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return parseForm(rawBody);
  }

  return {};
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const {
    RESEND_API_KEY,
    CONTACT_TO_EMAIL,
    CONTACT_FROM_EMAIL,
    CONTACT_SUBJECT_PREFIX
  } = process.env;

  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    return res.status(500).json({ error: "Contact service not configured." });
  }

  try {
    const contentType = normalizeContentType(req.headers["content-type"]);
    const rawBody = await readRequestBody(req);
    const payload = parsePayload(rawBody, contentType);
    const name = sanitize(payload.name);
    const email = sanitize(payload.email);
    const message = sanitize(payload.message, MAX_MESSAGE_LENGTH);

    if (!message || !email) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const subjectBase = name ? `New contact from ${name}` : "New contact message";
    const subject = CONTACT_SUBJECT_PREFIX ? `${CONTACT_SUBJECT_PREFIX} ${subjectBase}` : subjectBase;

    const { html, text } = buildEmailBody(name, email, message);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: CONTACT_TO_EMAIL.split(",").map(address => address.trim()).filter(Boolean),
        reply_to: email || undefined,
        subject,
        html,
        text
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error", {
        status: resendResponse.status,
        statusText: resendResponse.statusText,
        body: errorText
      });
      return res.status(502).json({
        error: "Unable to send message via email provider.",
        status: resendResponse.status,
        details: errorText
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Contact API error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(502).json({ error: message });
  }
};
