import nodemailer from "nodemailer";

export const config = {
  path: "/.netlify/functions/price-request",
  rateLimit: {
    windowLimit: 3,
    windowSize: 180,
    aggregateBy: ["ip", "domain"],
    action: "rate_limit",
  },
};

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
  body: JSON.stringify(body),
});

const sanitizeText = (value) => String(value || "").trim();

const escapeHtml = (value) => sanitizeText(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

const buildEmailHtml = (data) => `
  <div style="font-family: Arial, sans-serif; color: #1f1f1f; line-height: 1.45;">
    <h1 style="margin: 0 0 18px; font-size: 24px;">Nueva solicitud de estudio tecnico MyPerol</h1>

    <h2 style="margin: 24px 0 8px; font-size: 18px;">Datos de contacto</h2>
    <p><strong>Nombre completo:</strong> ${escapeHtml(data.fullName)}</p>
    <p><strong>Telefono:</strong> ${escapeHtml(`${data.phonePrefix} ${data.phone}`)}</p>

    <h2 style="margin: 24px 0 8px; font-size: 18px;">Datos del calculo</h2>
    <p><strong>Rango de precio estimado:</strong> ${escapeHtml(data.priceRange)}</p>
    <p><strong>Tipo de espacio:</strong> ${escapeHtml(data.space)}</p>
    <p><strong>Superficie:</strong> ${escapeHtml(data.squareMeters)} m2</p>
    <p><strong>Soporte existente:</strong> ${escapeHtml(data.support)}</p>
    <p><strong>Retirada de ceramica:</strong> ${escapeHtml(data.ceramicRemoval)}</p>
    <p><strong>Estado del soporte:</strong> ${escapeHtml(data.condition)}</p>
  </div>
`;

const buildEmailText = (data) => [
  "Nueva solicitud de estudio tecnico MyPerol.",
  "",
  "Datos de contacto:",
  `Nombre completo: ${sanitizeText(data.fullName)}`,
  `Telefono: ${sanitizeText(data.phonePrefix)} ${sanitizeText(data.phone)}`.trim(),
  "",
  "Datos del calculo:",
  `Rango de precio estimado: ${sanitizeText(data.priceRange)}`,
  `Tipo de espacio: ${sanitizeText(data.space)}`,
  `Superficie: ${sanitizeText(data.squareMeters)} m2`,
  `Soporte existente: ${sanitizeText(data.support)}`,
  `Retirada de ceramica: ${sanitizeText(data.ceramicRemoval)}`,
  `Estado del soporte: ${sanitizeText(data.condition)}`,
].join("\n");

const buildDirectEmailHtml = (data) => `
  <div style="font-family: Arial, sans-serif; color: #1f1f1f; line-height: 1.45;">
    <h1 style="margin: 0 0 18px; font-size: 24px;">Nueva solicitud de presupuesto directo MyPerol</h1>
    <p><strong>Nombre completo:</strong> ${escapeHtml(data.fullName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
    <p><strong>Telefono:</strong> ${escapeHtml(`${data.phonePrefix || ""} ${data.phone}`)}</p>
    <p><strong>Tipo de espacio:</strong> ${escapeHtml(data.space)}</p>
  </div>
`;

const buildDirectEmailText = (data) => [
  "Nueva solicitud de presupuesto directo MyPerol.",
  "",
  `Nombre completo: ${sanitizeText(data.fullName)}`,
  `Email: ${sanitizeText(data.email)}`,
  `Telefono: ${sanitizeText(data.phonePrefix)} ${sanitizeText(data.phone)}`.trim(),
  "",
  `Tipo de espacio: ${sanitizeText(data.space)}`,
].join("\n");

const handleRequest = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Metodo no permitido." });
  }
  if ((event.body || "").length > 16384) {
    return jsonResponse(413, { error: "Solicitud demasiado grande." });
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "JSON invalido." });
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return jsonResponse(400, { error: "JSON invalido." });
  }
  if (data.privacyAccepted !== "true") {
    return jsonResponse(400, { code: "PRIVACY_REQUIRED", error: "Debes aceptar la politica de privacidad." });
  }

  const isDirectRequest = data.requestType === "direct-quote";
  if (data.requestType !== undefined && !isDirectRequest) {
    return jsonResponse(400, { error: "Tipo de solicitud no valido." });
  }
  if (Object.values(data).some(value => typeof value !== "string" || value.length > 1000 || /[\r\n\u0000]/.test(value))) {
    return jsonResponse(400, { error: "Datos no validos." });
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return jsonResponse(400, { error: "Email no valido." });
  }
  const requiredFields = isDirectRequest
    ? ["fullName", "phone", "phonePrefix", "space"]
    : [
        "fullName",
        "phone",
        "phonePrefix",
        "priceRange",
        "space",
        "squareMeters",
        "support",
        "ceramicRemoval",
        "condition",
      ];

  const missingField = requiredFields.find((field) => !sanitizeText(data[field]));
  if (missingField) {
    return jsonResponse(400, { code: "MISSING_FIELDS", error: "Faltan datos obligatorios." });
  }

  if (isDirectRequest && !["Home", "Garage", "Business", "Industry", "Outdoor"].includes(data.space)) {
    return jsonResponse(400, { code: "INVALID_SPACE", error: "Tipo de espacio no valido." });
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || "465");
  const toEmail = process.env.PRICE_REQUEST_TO_EMAIL;
  const fromEmail = process.env.PRICE_REQUEST_FROM_EMAIL;

  if (!smtpUser || !smtpPass || !toEmail || !fromEmail || ![465, 587].includes(smtpPort)) {
    return jsonResponse(500, {
      error: "El servicio de correo no esta configurado.",
    });
  }

  const subject = isDirectRequest
    ? `Solicitud de presupuesto MyPerol - ${sanitizeText(data.fullName)}`
    : `Solicitud de estudio tecnico MyPerol - ${sanitizeText(data.fullName)}`;
  const privacyRecord = `Politica de privacidad leida y aceptada. Version: 2026-10-22. Recepcion (UTC): ${new Date().toISOString()}.`;
  const transport = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: true,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    const result = await transport.sendMail({
      from: { name: "MyPerol", address: fromEmail },
      to: [{ address: toEmail }],
      ...(isDirectRequest && data.email ? { replyTo: { address: data.email } } : {}),
      subject,
      html: `${isDirectRequest ? buildDirectEmailHtml(data) : buildEmailHtml(data)}<p>${escapeHtml(privacyRecord)}</p>`,
      text: `${isDirectRequest ? buildDirectEmailText(data) : buildEmailText(data)}\n\n${privacyRecord}`,
    });
    if (!result.accepted?.length) throw new Error("Recipient not accepted");
  } catch {
    console.error("SMTP delivery failed");
    return jsonResponse(502, { error: "No se pudo enviar el email." });
  } finally {
    transport.close();
  }

  return jsonResponse(200, { ok: true });
};

export default async (request) => {
  if (Number(request.headers.get("content-length")) > 16384) {
    return new Response(JSON.stringify({ error: "Solicitud demasiado grande." }), {
      status: 413,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  const result = await handleRequest({
    httpMethod: request.method,
    body: request.method === "POST" ? await request.text() : "",
  });
  return new Response(result.body, { status: result.statusCode, headers: result.headers });
};
