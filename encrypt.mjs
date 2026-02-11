#!/usr/bin/env node
// encrypt.mjs - Converte blob criptografado (data.enc.txt) para JSON com valores criptografados individualmente (data.json)
// Uso: node encrypt.mjs <password>

import { webcrypto } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { assertPlanningData } from './data-schema.mjs';

const crypto = webcrypto;
const { subtle } = crypto;
const PASSWORD = process.argv[2];
if (!PASSWORD) { console.error("Uso: node encrypt.mjs <password>"); process.exit(1); }

const ITERATIONS = 100000;
const ENC_PREFIX = "ENC:";
const VERIFY_PLAINTEXT = "CVCG2026";
const META_BLOCK_TYPES = new Set(["h3","h4","p","ul","grid","note","table","cal"]);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function b64toArr(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function arrToB64(arr) {
  let bin = '';
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin);
}

async function deriveKey(password, salt, usages) {
  const keyMaterial = await subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    usages
  );
}

// --- Passo 1: Descriptografar formato antigo (data.enc.txt) ---
async function decryptOldFormat(password) {
  const raw = (await readFile("data.enc.txt", "utf-8")).trim();
  const parts = raw.split(":");
  const salt = b64toArr(parts[0]);
  const iv = b64toArr(parts[1]);
  const tag = b64toArr(parts[2]);
  const ciphertext = b64toArr(parts[3]);

  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext);
  combined.set(tag, ciphertext.length);

  const key = await deriveKey(password, salt, ["decrypt"]);
  const decrypted = await subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  return JSON.parse(decoder.decode(decrypted));
}

// --- Passo 2: Criptografar valor individual ---
async function encryptValue(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  const combined = new Uint8Array(12 + ct.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ct), 12);
  return ENC_PREFIX + arrToB64(combined);
}

// --- Passo 3: Percorrer árvore e criptografar ---
let encCount = 0;

async function encryptTree(node, key) {
  if (node === null || node === undefined) return node;
  if (typeof node === 'boolean' || typeof node === 'number') return node;

  if (typeof node === 'string') {
    encCount++;
    return encryptValue(key, node);
  }

  if (Array.isArray(node)) {
    return Promise.all(node.map(item => encryptTree(item, key)));
  }

  // Objeto
  const result = {};
  const entries = Object.entries(node);
  await Promise.all(entries.map(async ([k, v]) => {
    if (k === 'milestone') {
      result[k] = v; // booleano, manter plain
    } else if (k === 'type' && typeof v === 'string' && META_BLOCK_TYPES.has(v)) {
      result[k] = v; // tipo de bloco meta, manter plain
    } else {
      result[k] = await encryptTree(v, key);
    }
  }));
  return result;
}

// --- Main ---
console.log("Descriptografando data.enc.txt...");
const data = await decryptOldFormat(PASSWORD);
console.log(`OK: ${data.length} seções descriptografadas.`);
const validation = assertPlanningData(data);
console.log(`Modelo validado: ${validation.summary.sections} seções, ${validation.summary.groups} grupos, ${validation.summary.items} itens.`);

console.log("Gerando nova chave...");
const newSalt = crypto.getRandomValues(new Uint8Array(16));
const newKey = await deriveKey(PASSWORD, newSalt, ["encrypt"]);

console.log("Criando token de verificação...");
const verify = await encryptValue(newKey, VERIFY_PLAINTEXT);

console.log("Criptografando valores individuais...");
const encryptedData = await encryptTree(data, newKey);
console.log(`OK: ${encCount} valores criptografados.`);

const output = {
  version: 2,
  salt: arrToB64(newSalt),
  verify,
  data: encryptedData
};

await writeFile("data.json", JSON.stringify(output, null, 2), "utf-8");
const stats = await readFile("data.json", "utf-8");
console.log(`Escreveu data.json (${(stats.length / 1024).toFixed(1)} KB)`);
