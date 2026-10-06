import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { parse } from "@astrojs/compiler";

const locales = ["es", "en", "de", "fr", "ru", "uk"];
const dictionaries = Object.fromEntries(await Promise.all(locales.map(async locale => [
  locale, JSON.parse(await readFile(`src/i18n/json/${locale}.json`, "utf8")),
])));
const entries = Object.entries(dictionaries.es);
const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
for (const [locale, dictionary] of Object.entries(dictionaries)) {
  assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(dictionaries.es).sort(), `${locale}: keys differ`);
  for (const [key, value] of entries) {
    assert.equal(typeof dictionary[key], "string", `${locale}.${key}: not a string`);
    assert.ok(dictionary[key].trim(), `${locale}.${key}: empty`);
    assert.deepEqual(placeholders(dictionary[key]), placeholders(value), `${locale}.${key}: placeholders differ`);
    assert.ok(!/<(?!\/?b>|br\s*\/?>)/i.test(dictionary[key]), `${locale}.${key}: unapproved HTML`);
  }
}

async function sourceFiles(directory) {
  const files = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(files.map(file => file.isDirectory()
    ? sourceFiles(`${directory}/${file.name}`)
    : [`${directory}/${file.name}`]))).flat();
}

const findings = [];
const brands = /^(?:MyPerol|MYPEROL|MP Systems?|Instagram|WhatsApp|ES)$/;
const meaningful = value => {
  const text = value.replace(/&(?:#\d+|\w+);/g, "").trim();
  return /\p{L}/u.test(text) && !brands.test(text);
};
function checkTemplate(node, file, translated = false, ignored = false) {
  const attributes = new Map((node.attributes || []).map(attribute => [attribute.name, attribute]));
  const skip = ignored || ["script", "style"].includes(node.name)
    || attributes.get("aria-hidden")?.value === "true";
  const localized = translated || ["data-i18n", "data-i18n-html", "data-i18n-template"].some(key => attributes.has(key));
  if (node.type === "text" && !skip && !localized && meaningful(node.value)) {
    findings.push(`${file}:${node.position?.start.line}: ${node.value.trim()}`);
  }
  if (!skip) for (const name of ["aria-label", "alt", "title", "placeholder"]) {
    const attribute = attributes.get(name);
    if (attribute?.kind === "quoted" && meaningful(attribute.value) && !attributes.has(`data-i18n-${name}`)) {
      findings.push(`${file}:${attribute.position?.start.line}: ${name}=${attribute.value}`);
    }
  }
  for (const child of node.children || []) {
    if (node.type === "expression" && child.type === "text") continue;
    checkTemplate(child, file, localized, skip);
  }
}

for (const file of await sourceFiles("src")) {
  if (!/\.(astro|ts)$/.test(file)) continue;
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/data-i18n(?:-html|-template|-aria-label|-alt|-title|-placeholder|-content)?="([\w]+)"/g)) {
    assert.ok(match[1] in dictionaries.es, `${file}: unknown key ${match[1]}`);
  }
  if (file.endsWith(".astro")) checkTemplate((await parse(source)).ast, file);
}
assert.deepEqual(findings, [], `Unlocalized template text:\n${findings.join("\n")}`);
console.log(`${locales.length} dictionaries x ${entries.length} keys: matching keys, nonempty values and matching placeholders.`);
console.log("Astro templates: no unmarked descriptive text or accessible labels. Brands and decorative content excluded.");
