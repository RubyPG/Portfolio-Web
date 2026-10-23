const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const assert = require("node:assert/strict");
const test = require("node:test");

const app = path.resolve(__dirname, "..");
const ts = require(path.join(app, "node_modules/typescript"));
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(app, "src/lib/contact-form.ts"), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

// Every request is intercepted here. This suite never sends a real message.
function harness(
  reply = () => {
    throw new Error("Unexpected request");
  },
) {
  const requests = [];
  const moduleStub = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: moduleStub.exports,
    module: moduleStub,
    fetch: async (...args) => {
      requests.push(args);
      return reply(...args);
    },
  });
  return { ...moduleStub.exports, requests };
}

const values = {
  name: "  Test visitor  ",
  email: "  visitor@example.invalid  ",
  message: "  A test message.  ",
  _gotcha: "",
};
const endpoint = "https://formspree.io/f/test1234";
const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test("required fields, email shape and exact trimmed length limits", () => {
  const { validateContactMessage, requests } = harness();
  const empty = validateContactMessage({
    name: " \n ",
    email: "  ",
    message: "\t ",
    _gotcha: "",
  });
  assert.deepEqual(Object.keys(empty), ["name", "email", "message"]);
  for (const message of Object.values(empty)) assert.ok(message.length > 0);
  assert.deepEqual(Object.keys(validateContactMessage(values)), []);

  for (const email of ["nobody", "a@b", "a b@example.invalid", "a@@b.com"])
    assert.ok(validateContactMessage({ ...values, email }).email, email);

  const limits = {
    name: ` ${"n".repeat(100)} `,
    email: ` ${"a".repeat(248)}@b.com `,
    message: ` ${"m".repeat(5000)} `,
    _gotcha: "",
  };
  assert.equal(limits.email.trim().length, 254);
  assert.deepEqual(Object.keys(validateContactMessage(limits)), []);
  assert.ok(validateContactMessage({ ...limits, name: "n".repeat(101) }).name);
  assert.ok(
    validateContactMessage({ ...limits, email: `${"a".repeat(249)}@b.com` })
      .email,
  );
  assert.ok(
    validateContactMessage({ ...limits, message: "m".repeat(5001) }).message,
  );
  assert.equal(requests.length, 0, "validation never submits");
});

test("missing or malformed public IDs cannot generate an endpoint", () => {
  const { getContactEndpoint, requests } = harness();
  for (const id of [
    undefined,
    "",
    "  ",
    "short",
    "abcd/1234",
    "abcd1234?token=secret",
    "https://formspree.io/f/abcd1234",
    "a".repeat(33),
  ])
    assert.equal(getContactEndpoint(id), null, String(id));
  assert.equal(getContactEndpoint(" test1234 "), endpoint);
  assert.equal(
    getContactEndpoint("A".repeat(32)),
    `https://formspree.io/f/${"A".repeat(32)}`,
  );
  assert.equal(requests.length, 0);
});

test("a confirmed server success sends one trimmed JSON payload", async () => {
  const { sendContactMessage, requests } = harness(() =>
    response(200, { next: "https://formspree.io/thanks" }),
  );
  const controller = new AbortController();
  const result = await sendContactMessage(
    endpoint,
    { ...values, _gotcha: "honeypot value" },
    controller.signal,
  );
  assert.equal(result.ok, true);
  assert.equal(requests.length, 1);
  const [url, init] = requests[0];
  assert.equal(url, endpoint);
  assert.equal(init.method, "POST");
  assert.equal(init.headers.Accept, "application/json");
  assert.equal(init.headers["Content-Type"], "application/json");
  assert.equal(init.credentials, "omit");
  assert.equal(init.redirect, "error");
  assert.equal(init.signal, controller.signal);
  assert.deepEqual(JSON.parse(init.body), {
    name: "Test visitor",
    email: "visitor@example.invalid",
    message: "A test message.",
    _gotcha: "honeypot value",
    _subject: "Nuevo mensaje desde el portfolio de RubenPG",
  });
  assert.equal(values.name, "  Test visitor  ", "caller values are preserved");
});

test("explicit ok responses stay compatible but server errors always win", async () => {
  const success = harness(() => response(200, { ok: true }));
  assert.equal(
    (
      await success.sendContactMessage(
        endpoint,
        values,
        new AbortController().signal,
      )
    ).ok,
    true,
  );
  for (const body of [
    { next: "/thanks", error: "Form is inactive" },
    { next: "/thanks", errors: [{ code: "INACTIVE", message: "Inactive" }] },
    { ok: true, errors: [{ field: "email", message: "Invalid email" }] },
    { next: "/thanks", ok: false },
  ]) {
    const { sendContactMessage, requests } = harness(() => response(200, body));
    const result = await sendContactMessage(
      endpoint,
      values,
      new AbortController().signal,
    );
    assert.equal(
      result.ok,
      false,
      "an error must not clear the visitor's message",
    );
    assert.equal(requests.length, 1);
  }
});

test("CAPTCHA token errors remain failures rather than confirmed submissions", async () => {
  // Official errors[] envelope and documented token field names; no challenge
  // is solved or simulated as a successful server submission.
  for (const field of [
    "g-recaptcha-response",
    "h-captcha-response",
    "cf-turnstile-response",
  ]) {
    const { sendContactMessage, requests } = harness(() =>
      response(400, {
        errors: [{ field, message: "Verification is required" }],
      }),
    );
    const result = await sendContactMessage(
      endpoint,
      values,
      new AbortController().signal,
    );
    assert.equal(result.ok, false);
    assert.match(result.message, /verificación de seguridad/i);
    assert.deepEqual(Object.keys(result.fields), []);
    assert.equal(
      requests.length,
      1,
      "a challenge does not trigger a repeat POST",
    );
  }
});

test("HTTP failures cannot claim success and expose only known field errors", async () => {
  for (const status of [400, 401, 403, 404, 422, 500]) {
    const { sendContactMessage, requests } = harness(() =>
      response(status, {
        ok: true,
        errors: [
          { field: "name", message: "server name error" },
          { field: "email", message: "server email error" },
          { field: "message", message: "server message error" },
          { field: "unknown", message: "must not become a form field" },
          { field: "__proto__", message: "must not become a form field" },
          null,
          "invalid error",
        ],
      }),
    );
    const result = await sendContactMessage(
      endpoint,
      values,
      new AbortController().signal,
    );
    assert.equal(result.ok, false, `HTTP ${status}`);
    assert.deepEqual(Object.keys(result.fields), ["name", "email", "message"]);
    assert.match(result.message, /no se ha podido enviar/i);
    assert.equal(requests.length, 1, "failed requests are never retried");
  }
});

test("rate limiting produces a specific notice without retrying", async () => {
  const { sendContactMessage, requests } = harness(() =>
    response(429, { errors: [] }),
  );
  const result = await sendContactMessage(
    endpoint,
    values,
    new AbortController().signal,
  );
  assert.equal(result.ok, false);
  assert.match(result.message, /temporalmente limitado/i);
  assert.equal(requests.length, 1);
});

test("unconfirmed and malformed responses never report success", async () => {
  for (const body of [
    null,
    {},
    [],
    "ok",
    true,
    { ok: false },
    { ok: "true" },
    { next: "" },
    { next: "   " },
    { next: 42 },
  ]) {
    const { sendContactMessage, requests } = harness(() => response(200, body));
    const result = await sendContactMessage(
      endpoint,
      values,
      new AbortController().signal,
    );
    assert.equal(result.ok, false);
    assert.equal(requests.length, 1);
  }
  const invalidJson = new SyntaxError("Invalid JSON response");
  const { sendContactMessage, requests } = harness(() => ({
    ok: true,
    status: 200,
    json: async () => {
      throw invalidJson;
    },
  }));
  await assert.rejects(
    sendContactMessage(endpoint, values, new AbortController().signal),
    (error) => error === invalidJson,
    "caller handles an unconfirmed response without clearing the message",
  );
  assert.equal(requests.length, 1);
});

test("network failures and aborted requests propagate once with no retries", async () => {
  const offline = new TypeError("Network unavailable");
  const failed = harness(async () => {
    throw offline;
  });
  await assert.rejects(
    failed.sendContactMessage(endpoint, values, new AbortController().signal),
    (error) => error === offline,
  );
  assert.equal(failed.requests.length, 1);

  const controller = new AbortController();
  const aborted = harness(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener(
          "abort",
          () => reject(init.signal.reason),
          {
            once: true,
          },
        );
      }),
  );
  const pending = aborted.sendContactMessage(
    endpoint,
    values,
    controller.signal,
  );
  const rejected = assert.rejects(
    pending,
    (error) => error.name === "AbortError",
  );
  controller.abort();
  await rejected;
  assert.equal(aborted.requests.length, 1);
  assert.equal(aborted.requests[0][1].signal.aborted, true);
});
