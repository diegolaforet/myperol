import assert from "node:assert/strict";
import test from "node:test";
import { handler } from "../netlify/functions/price-request.mjs";

const request = body => handler({ httpMethod: "POST", body: JSON.stringify(body) });
const calculatorRequest = {
  fullName: "Privacy test",
  phone: "600000000",
  phonePrefix: "+34",
  priceRange: "1000 - 2000",
  space: "Home",
  squareMeters: "50",
  support: "Concrete",
  ceramicRemoval: "No",
  condition: "Good",
};
const directRequest = {
  requestType: "direct-quote",
  fullName: "Privacy test",
  email: "privacy@example.invalid",
  phone: "600000000",
  space: "Home",
};

test("both request types reject missing or invalid privacy acceptance before sending", async t => {
  const fetchMock = t.mock.method(globalThis, "fetch", () => {
    throw new Error("Unexpected network request");
  });
  for (const payload of [calculatorRequest, directRequest]) {
    for (const privacyAccepted of [undefined, false, "false", "", "on", true]) {
      const response = await request({ ...payload, privacyAccepted });
      assert.equal(response.statusCode, 400);
      assert.equal(JSON.parse(response.body).code, "PRIVACY_REQUIRED");
    }
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("invalid request bodies are rejected without sending", async () => {
  for (const body of [null, [], "invalid"]) {
    assert.equal((await request(body)).statusCode, 400);
  }
});

test("accepted requests include policy version and server receipt time in the email", async t => {
  const names = ["RESEND_API_KEY", "PRICE_REQUEST_TO_EMAIL", "PRICE_REQUEST_FROM_EMAIL"];
  const previous = names.map(name => process.env[name]);
  names.forEach(name => { process.env[name] = "privacy-test"; });
  t.after(() => names.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name];
    else process.env[name] = previous[index];
  }));
  const emails = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    emails.push(JSON.parse(options.body));
    return { ok: true };
  });
  for (const payload of [calculatorRequest, directRequest]) {
    assert.equal((await request({ ...payload, privacyAccepted: "true" })).statusCode, 200);
  }
  assert.equal(emails.length, 2);
  for (const email of emails) {
    for (const content of [email.html, email.text]) {
      assert.match(content, /Politica de privacidad leida y aceptada/);
      assert.match(content, /Version: 2026-10-22/);
      assert.match(content, /Recepcion \(UTC\): \d{4}-\d{2}-\d{2}T/);
    }
  }
});
