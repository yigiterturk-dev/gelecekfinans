import assert from "node:assert/strict";
import test from "node:test";
import { resolveArticleAIConfig } from "../lib/bot/writer";

test("Anthropic anahtarı varsa Claude yazarı ve ekonomik doğrulayıcıyı seçer", () => {
  const config = resolveArticleAIConfig({ ANTHROPIC_API_KEY: "test-key" });
  assert.deepEqual(config, {
    provider: "anthropic",
    writerModel: "claude-sonnet-5",
    verifierModel: "claude-haiku-4-5",
  });
});

test("açık OpenAI seçimi mevcut yedek sağlayıcıyı korur", () => {
  const config = resolveArticleAIConfig({
    ARTICLE_AI_PROVIDER: "openai",
    OPENAI_API_KEY: "test-key",
    OPENAI_ARTICLE_MODEL: "writer-test",
    OPENAI_VERIFIER_MODEL: "verifier-test",
  });
  assert.equal(config.provider, "openai");
  assert.equal(config.writerModel, "writer-test");
  assert.equal(config.verifierModel, "verifier-test");
});

test("OpenAI varsayılan yazım ve doğrulama rollerinde Luna kullanır", () => {
  const config = resolveArticleAIConfig({ OPENAI_API_KEY: "test-key" });
  assert.deepEqual(config, {
    provider: "openai",
    writerModel: "gpt-5.6-luna",
    verifierModel: "gpt-5.6-luna",
  });
});

test("iki anahtar birlikteyken OpenAI önceliklidir", () => {
  const config = resolveArticleAIConfig({
    OPENAI_API_KEY: "openai-key",
    ANTHROPIC_API_KEY: "anthropic-key",
  });
  assert.equal(config.provider, "openai");
});

test("Claude zorlanmışsa eksik anahtarda güvenli biçimde durur", () => {
  assert.throws(
    () => resolveArticleAIConfig({ ARTICLE_AI_PROVIDER: "anthropic" }),
    /ANTHROPIC_API_KEY/,
  );
});
