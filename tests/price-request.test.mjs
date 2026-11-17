import assert from "node:assert/strict";
import test from "node:test";
import nodemailer from "nodemailer";
import handler, { config } from "../netlify/functions/price-request.mjs";

const request = async body => {
  const response = await handler(new Request("https://example.test/.netlify/functions/price-request", {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
  }));
  return { statusCode: response.status, body: await response.text() };
};

test("both forms share a platform-enforced rate limit at the public endpoint", () => {
  assert.equal(config.path, "/.netlify/functions/price-request");
  assert.deepEqual(config.rateLimit, {
    windowLimit: 3, windowSize: 180, aggregateBy: ["ip", "domain"], action: "rate_limit",
  });
});
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
  phonePrefix: "+34",
};

test("both request types reject missing or invalid privacy acceptance before sending", async t => {
  const fetchMock = t.mock.method(nodemailer, "createTransport", () => {
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
  const names = ["SMTP_USER", "SMTP_PASS", "PRICE_REQUEST_TO_EMAIL", "PRICE_REQUEST_FROM_EMAIL"];
  const previous = names.map(name => process.env[name]);
  names.forEach(name => { process.env[name] = "privacy-test"; });
  t.after(() => names.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name];
    else process.env[name] = previous[index];
  }));
  const emails = [];
  t.mock.method(nodemailer, "createTransport", options => {
    assert.equal(options.host, "smtp.gmail.com");
    assert.equal(options.port, 465);
    assert.equal(options.secure, true);
    assert.equal(options.auth.pass, "privacy-test");
    return { sendMail: async email => { emails.push(email); return { accepted: ["privacy-test"] }; }, close() {} };
  });
  for (const payload of [calculatorRequest, directRequest]) {
    assert.equal((await request({ ...payload, privacyAccepted: "true" })).statusCode, 200);
  }
  assert.equal(emails.length, 2);
  assert.deepEqual(emails[1].replyTo, { address: directRequest.email });
  for (const email of emails) {
    for (const content of [email.html, email.text]) {
      assert.match(content, /Politica de privacidad leida y aceptada/);
      assert.match(content, /Version: 2026-10-22/);
      assert.match(content, /Recepcion \(UTC\): \d{4}-\d{2}-\d{2}T/);
    }
  }
});

test("direct requests allow an omitted email, reject malformed input and handle SMTP failures", async t => {
  const names = ["SMTP_USER", "SMTP_PASS", "PRICE_REQUEST_TO_EMAIL", "PRICE_REQUEST_FROM_EMAIL"];
  const previous = names.map(name => process.env[name]);
  names.forEach(name => { process.env[name] = "smtp-test"; });
  t.after(() => names.forEach((name, index) => {
    if (previous[index] === undefined) delete process.env[name];
    else process.env[name] = previous[index];
  }));
  let sent = 0;
  t.mock.method(nodemailer, "createTransport", () => ({
    sendMail: async email => {
      sent++;
      assert.equal(email.replyTo, undefined);
      if (sent === 2) throw new Error("SMTP unavailable");
      return { accepted: ["smtp-test"] };
    },
    close() {},
  }));
  const payload = { ...directRequest, email: "", privacyAccepted: "true" };
  assert.equal((await request(payload)).statusCode, 200);
  assert.equal((await request(payload)).statusCode, 502);
  for (const patch of [{ email: "bad" }, { fullName: {} }, { fullName: "Bad\r\nHeader" }, { space: "invalid" }]) {
    assert.equal((await request({ ...payload, ...patch })).statusCode, 400);
  }
  assert.equal(sent, 2);
});
