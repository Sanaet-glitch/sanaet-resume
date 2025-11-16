"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const resend_1 = require("resend");
const { RESEND_API_KEY, MAIL_TO, MAIL_FROM, PORT = "8080", BASIC_AUTH_USER, BASIC_AUTH_PASS, ALLOWED_ORIGINS, SKIP_EMAIL, } = process.env;
const dryRun = SKIP_EMAIL === "true";
if (!dryRun && !RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
}
if (!MAIL_TO || !MAIL_FROM) {
    throw new Error("MAIL_TO and MAIL_FROM environment variables must be set.");
}
const resend = !dryRun ? new resend_1.Resend(RESEND_API_KEY) : null;
if (dryRun) {
    console.warn("SKIP_EMAIL=true: webhook will log payloads instead of sending via Resend");
}
const app = (0, express_1.default)();
const localDevOrigins = ["http://localhost:4200", "http://127.0.0.1:4200"];
const normalizedAllowedOrigins = ALLOWED_ORIGINS
    ? ALLOWED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];
const combinedOrigins = normalizedAllowedOrigins.length
    ? Array.from(new Set([...normalizedAllowedOrigins, ...localDevOrigins]))
    : "*";
const corsOptions = {
    origin: combinedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
app.use((0, cors_1.default)(corsOptions));
app.options("*", (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
const coerceRecord = (input) => {
    if (!input) {
        return {};
    }
    if (typeof input === "string") {
        try {
            return coerceRecord(JSON.parse(input));
        }
        catch {
            return {};
        }
    }
    if (Array.isArray(input)) {
        return input.reduce((acc, item) => {
            var _a, _b;
            if (item === null || item === void 0 ? void 0 : item.name) {
                const value = (_b = (_a = item.value) !== null && _a !== void 0 ? _a : item.text) !== null && _b !== void 0 ? _b : item.content;
                if (value !== undefined) {
                    acc[item.name] = String(value);
                }
            }
            return acc;
        }, {});
    }
    if (typeof input === "object") {
        return Object.entries(input).reduce((acc, [key, value]) => {
            if (value === undefined || value === null) {
                return acc;
            }
            if (typeof value === "string") {
                acc[key] = value;
                return acc;
            }
            if (typeof value === "number" || typeof value === "boolean") {
                acc[key] = String(value);
                return acc;
            }
            acc[key] = JSON.stringify(value);
            return acc;
        }, {});
    }
    return {};
};
const pickField = (record, candidates) => {
    for (const key of candidates) {
        const value = record[key];
        if (value && value.trim().length) {
            return value.trim();
        }
    }
    return undefined;
};
const extractSubmission = (body) => {
    const sources = [
        body,
        body === null || body === void 0 ? void 0 : body.data,
        body === null || body === void 0 ? void 0 : body.payload,
        body === null || body === void 0 ? void 0 : body.fields,
        body === null || body === void 0 ? void 0 : body.submission,
        body === null || body === void 0 ? void 0 : body.context,
    ];
    const merged = sources.reduce((acc, source) => {
        return { ...acc, ...coerceRecord(source) };
    }, {});
    return {
        name: pickField(merged, ["name", "full_name", "fullName", "senderName", "from_name"]),
        email: pickField(merged, ["email", "senderEmail", "from", "from_email", "reply_to"]),
        message: pickField(merged, ["message", "body", "content", "text", "notes"]),
        ...merged,
    };
};
app.post("/contact", async (req, res) => {
    const submission = extractSubmission(req.body);
    const { name, email, message, ...rest } = submission;
    if (!name || !email || !message) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    if (BASIC_AUTH_USER && BASIC_AUTH_PASS) {
        const header = req.headers.authorization;
        if (!(header === null || header === void 0 ? void 0 : header.startsWith("Basic "))) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const encoded = header.replace("Basic ", "");
        const decoded = Buffer.from(encoded, "base64").toString("utf-8");
        const [user, pass] = decoded.split(":");
        if (user !== BASIC_AUTH_USER || pass !== BASIC_AUTH_PASS) {
            return res.status(401).json({ error: "Unauthorized" });
        }
    }
    const html = `
    <h2>New Resume Contact</h2>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Message:</strong></p>
    <p>${message.replace(/\n/g, "<br/>")}</p>
    <hr />
    <p><strong>Raw payload:</strong></p>
    <pre>${JSON.stringify(rest, null, 2)}</pre>
  `;
    try {
        if (dryRun) {
            console.log("[SKIP_EMAIL] Would send contact email", { name, email, rest });
        }
        else {
            await resend.emails.send({
                to: MAIL_TO,
                from: MAIL_FROM,
                subject: `New contact from ${name}`,
                text: `Name: ${name}\nEmail: ${email}\n\n${message}\n\nExtra:\n${JSON.stringify(rest, null, 2)}`,
                html,
                replyTo: email,
            });
        }
        res.status(200).json({ success: true, dryRun });
    }
    catch (error) {
        console.error("Failed to send email", error);
        res.status(502).json({ error: "Email dispatch failed" });
    }
});
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});
app.listen(Number(PORT), () => {
    console.log(`Pageclip webhook listening on port ${PORT}`);
});
