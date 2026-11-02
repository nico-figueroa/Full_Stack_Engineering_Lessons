const { test } = require("node:test");
const assert = require("node:assert/strict");

test("shared Supabase client targets restaurants for reads and writes", async (t) => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = "https://schema-test.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "test-server-key";

  let supabase;
  try {
    supabase = require("../provider/supabase");
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousKey;
  }

  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url: new URL(url), options });
    return new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  for (const table of ["restaurants", "categories", "category_restaurants", "starred_restaurants"]) {
    const { error } = await supabase.from(table).select("*");
    assert.equal(error, null);
    const { url, options } = requests.at(-1);
    assert.equal(url.pathname, `/rest/v1/${table}`);
    assert.equal(new Headers(options.headers).get("Accept-Profile"), "restaurants");
  }

  const { error } = await supabase.from("restaurants").insert({ name: "Schema test" }).select();
  assert.equal(error, null);
  assert.equal(requests.at(-1).options.method, "POST");
  assert.equal(new Headers(requests.at(-1).options.headers).get("Content-Profile"), "restaurants");
});
