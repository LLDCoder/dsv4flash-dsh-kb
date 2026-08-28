import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const resolverUrl = new URL(
  "../src/components/common/fileIconType.ts",
  import.meta.url,
);

const loadResolver = async () => {
  assert.equal(
    existsSync(resolverUrl),
    true,
    "The shared file icon type resolver must exist",
  );

  const source = readFileSync(resolverUrl, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const encoded = Buffer.from(output).toString("base64");

  return import(`data:text/javascript;base64,${encoded}`);
};

test("resolves supported image and PDF extensions", async () => {
  const { resolveFileIconType } = await loadResolver();

  assert.equal(resolveFileIconType({ fileName: "permit.pdf" }), "pdf");
  assert.equal(resolveFileIconType({ fileName: "poster.jpg" }), "jpg");
  assert.equal(resolveFileIconType({ fileName: "poster.jpeg" }), "jpeg");
  assert.equal(resolveFileIconType({ fileName: "poster.png" }), "png");
});

test("resolves supported video extensions from names and URLs", async () => {
  const { resolveFileIconType } = await loadResolver();
  const extensions = ["mp4", "mov", "m4v", "webm", "ogv", "avi", "mkv"];

  for (const extension of extensions) {
    assert.equal(
      resolveFileIconType({ fileName: `screening.${extension}` }),
      "video",
    );
  }

  assert.equal(
    resolveFileIconType({
      fileUrl: "https://files.example/screening.MP4?token=123#preview",
    }),
    "video",
  );
});

test("uses explicit file types and preserves the caller fallback", async () => {
  const { resolveFileIconType } = await loadResolver();

  assert.equal(resolveFileIconType({ fileType: "WEBM" }), "video");
  assert.equal(resolveFileIconType({ fileType: "PDF" }), "pdf");
  assert.equal(
    resolveFileIconType({ fileName: "archive.bin", fallback: "jpg" }),
    "jpg",
  );
});
