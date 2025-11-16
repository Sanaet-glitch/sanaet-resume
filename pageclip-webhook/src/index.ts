import express, { Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import { Resend } from "resend";
import { config as loadEnv } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

// Load .env and .env.local (if present) for local development
loadEnv();
const localEnvPath = resolve(process.cwd(), ".env.local");
if (existsSync(localEnvPath)) {
  loadEnv({ path: localEnvPath, override: true });
}

const {
  RESEND_API_KEY,
  MAIL_TO,
  MAIL_FROM,
  PORT = "8080",
  BASIC_AUTH_USER,
  BASIC_AUTH_PASS,
  ALLOWED_ORIGINS,
  SKIP_EMAIL,
} = process.env;

const dryRun = SKIP_EMAIL === "true";

if (!dryRun && !RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY environment variable.");
}

if (!MAIL_TO || !MAIL_FROM) {
  throw new Error("MAIL_TO and MAIL_FROM environment variables must be set.");
}

const resend = !dryRun ? new Resend(RESEND_API_KEY as string) : null;

if (dryRun) {
  console.warn("SKIP_EMAIL=true: webhook will log payloads instead of sending via Resend");
}

const app = express();
const localDevOrigins = ["http://localhost:4200", "http://127.0.0.1:4200"];
const normalizedAllowedOrigins = ALLOWED_ORIGINS
  ? ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : [];

const combinedOrigins = normalizedAllowedOrigins.length
  ? Array.from(new Set([...normalizedAllowedOrigins, ...localDevOrigins]))
  : "*";

const corsOptions: CorsOptions = {
  origin: combinedOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

type Submission = {
  name?: string;
  email?: string;
  message?: string;
  [key: string]: unknown;
};

const coerceRecord = (input: unknown): Record<string, string> => {
  if (!input) {
    return {};
  }

  if (typeof input === "string") {
    try {
      return coerceRecord(JSON.parse(input));
    } catch {
      return {};
    }
  }

  if (Array.isArray(input)) {
    return input.reduce<Record<string, string>>((acc, item: any) => {
      if (item?.name) {
        const value = item.value ?? item.text ?? item.content;
        if (value !== undefined) {
          acc[item.name] = String(value);
        }
      }
      return acc;
    }, {});
  }

  if (typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).reduce<Record<string, string>>(
      (acc, [key, value]) => {
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
      },
      {}
    );
  }

  return {};
};

const pickField = (record: Record<string, string>, candidates: string[]): string | undefined => {
  for (const key of candidates) {
    const value = record[key];
    if (value && value.trim().length) {
      return value.trim();
    }
  }
  return undefined;
};

const extractSubmission = (body: unknown): Submission => {
  const sources = [
    body,
    (body as any)?.data,
    (body as any)?.payload,
    (body as any)?.fields,
    (body as any)?.submission,
    (body as any)?.context,
  ];
  const merged = sources.reduce<Record<string, string>>((acc, source) => {
    return { ...acc, ...coerceRecord(source) };
  }, {});

  return {
    name: pickField(merged, ["name", "full_name", "fullName", "senderName", "from_name"]),
    email: pickField(merged, ["email", "senderEmail", "from", "from_email", "reply_to"]),
    message: pickField(merged, ["message", "body", "content", "text", "notes"]),
    ...merged,
  };
};

app.post("/contact", async (req: Request, res: Response) => {
  const submission = extractSubmission(req.body);
  const { name, email, message, ...rest } = submission;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (BASIC_AUTH_USER && BASIC_AUTH_PASS) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Basic ")) {
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
    } else {
      await resend!.emails.send({
        to: MAIL_TO,
        from: MAIL_FROM,
        subject: `New contact from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}\n\nExtra:\n${JSON.stringify(rest, null, 2)}`,
        html,
        replyTo: email,
      });
    }

    res.status(200).json({ success: true, dryRun });
  } catch (error) {
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
