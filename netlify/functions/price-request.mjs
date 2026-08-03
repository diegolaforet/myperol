const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
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

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Metodo no permitido." });
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "JSON invalido." });
  }

  const requiredFields = [
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
    return jsonResponse(400, { error: "Faltan datos obligatorios." });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.PRICE_REQUEST_TO_EMAIL;
  const fromEmail = process.env.PRICE_REQUEST_FROM_EMAIL;

  if (!resendApiKey || !toEmail || !fromEmail) {
    return jsonResponse(500, {
      error: "Faltan variables de entorno para enviar emails.",
      requiredEnv: [
        "RESEND_API_KEY",
        "PRICE_REQUEST_TO_EMAIL",
        "PRICE_REQUEST_FROM_EMAIL",
      ],
    });
  }

  const subject = `Solicitud de estudio tecnico MyPerol - ${sanitizeText(data.fullName)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html: buildEmailHtml(data),
      text: buildEmailText(data),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Resend email error:", errorBody);
    return jsonResponse(502, { error: "No se pudo enviar el email." });
  }

  return jsonResponse(200, { ok: true });
};
