const path = require("node:path");

describe("javascript editing settings", () => {
  let editor;

  beforeEach(async () => {
    jasmine.useRealClock();
    const pack = await lumine.packages.activatePackage(path.resolve(__dirname, ".."));
    await pack.resourceLoadPromise;
    editor = await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.js"));
    editor.update({ autoIndent: false });
    await editor.whenGrammarSettled();
  });

  afterEach(() => editor?.destroy());

  async function setText(text) {
    editor.setText(text);
    expect(await editor.whenGrammarSettled()).toBe(true);
  }

  it("selects private names together with their identifier prefix", async () => {
    await setText("class Value { #privateName = 1; }");
    editor.setCursorBufferPosition(
      editor.getBuffer().positionForCharacterIndex(editor.getText().indexOf("privateName") + 1),
    );
    editor.selectWordsContainingCursors();
    expect(editor.getSelectedText()).toBe("#privateName");
  });

  it("keeps explicit user word-boundary overrides authoritative", async () => {
    lumine.config.set("editor.nonWordCharacters", "$#-", { scopeSelector: ".source.js" });
    try {
      await setText("$value");
      editor.setCursorBufferPosition(
        editor.getBuffer().positionForCharacterIndex(editor.getText().indexOf("value") + 1),
      );
      editor.selectWordsContainingCursors();
      expect(editor.getSelectedText()).toBe("value");
    } finally {
      lumine.config.unset("editor.nonWordCharacters", { scopeSelector: ".source.js" });
    }
  });

  it("uses native JSX comments for markup rows and whole expression rows", async () => {
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.js"));
    for (const text of ["hello", "{value}"]) {
      const source = "const node = (\n  <div>\n    " + text + "\n  </div>\n);";
      await setText(source);
      editor.setCursorBufferPosition([2, 4]);
      const delimiters = await editor.getCommentDelimitersForBufferPosition([2, 4]);
      expect(delimiters.line).toBeUndefined();
      expect(delimiters.block).toEqual(["{/*", "*/}"]);
      await editor.toggleLineCommentsInSelection();
      await editor.whenGrammarSettled();
      expect(editor.lineTextForBufferRow(2).trim()).toMatch(/^\{\/\*/);
      expect(editor.languageMode.tree.rootNode.hasError).toBe(false);
      await editor.toggleLineCommentsInSelection();
      expect(editor.getText()).toBe(source);
    }
  });

  it("uses ordinary JavaScript comments for code rows inside JSX braces", async () => {
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.js"));
    const source = "const node = (\n  <div prop={\n    value\n  } />\n);";
    await setText(source);
    editor.setCursorBufferPosition([2, 6]);
    const delimiters = await editor.getCommentDelimitersForBufferPosition([2, 6]);
    expect(delimiters.line).toBe("//");
    expect(delimiters.block).toEqual(["/*", "*/"]);
    await editor.toggleLineCommentsInSelection();
    await editor.whenGrammarSettled();
    expect(editor.lineTextForBufferRow(2)).toBe("    // value");
    expect(editor.languageMode.tree.rootNode.hasError).toBe(false);
    await editor.toggleLineCommentsInSelection();
    expect(editor.getText()).toBe(source);
  });

  it("recognizes real node shebangs without claiming TypeScript runner names", async () => {
    const grammar = editor.getGrammar();
    for (const text of [
      "#!/usr/bin/node",
      "#!/usr/bin/env node",
      "#!/usr/bin/env -S node --test\nrun()",
      "#!/usr/bin/node\r\nrun()",
      "#! /opt/node --test",
      "#!/usr/bin/env /opt/node",
      "#!/usr/bin/env -S /opt/node --test",
      "#!C:/tools/node.exe --test",
      "#!/usr/bin/env node.exe",
      "#!/usr/bin/env -S node.exe --test",
    ]) {
      expect(lumine.grammars.grammarMatchesPrefix(grammar, text)).withContext(text).toBe(true);
      expect(lumine.grammars.selectGrammar("extensionless-runner", text).scopeName)
        .withContext(text)
        .toBe("source.js");
    }
    for (const text of [
      "#!/usr/bin/env ts-node\nrun()",
      "#!/usr/bin/not-node\nrun()",
      "#!/usr/bin/nodeish\nrun()",
      "#!/usr/bin/python /tmp/node",
      "#!/usr/bin/env printf node",
      "#!/bin/sh -c 'echo node '",
      "#!/usr/bin/env -S printf /tmp/node",
      "#!/usr/bin/env nodeish node",
      "#!/usr/bin/env node.exe-helper",
      "#!/usr/bin/env bun.exe",
      "#!/usr/bin/env deno.exe",
    ]) {
      expect(lumine.grammars.grammarMatchesPrefix(grammar, text)).withContext(text).toBe(false);
      expect(lumine.grammars.selectGrammar("extensionless-runner", text).scopeName)
        .withContext(text)
        .not.toBe("source.js");
    }
  });

  it("preserves filename and explicit user associations independently of shebang arguments", async () => {
    const text = "#!/usr/bin/python /tmp/node";
    expect(lumine.grammars.selectGrammar("explicit.js", text).scopeName).toBe("source.js");
    const previous = lumine.config.get("core.customFileTypes");
    lumine.config.set("core.customFileTypes", { ...previous, "source.js": ["user-runner"] });
    try {
      expect(lumine.grammars.selectGrammar("explicit.user-runner", text).scopeName).toBe(
        "source.js",
      );
    } finally {
      if (previous === undefined) lumine.config.unset("core.customFileTypes");
      else lumine.config.set("core.customFileTypes", previous);
    }
  });

  it("keeps code comment metadata before final lexical captures on JSX constant leaves", async () => {
    for (const value of ["Infinity", "undefined", "null"]) {
      const source = `const node = (\n  <div>{\n    ${value}\n  }</div>\n);`;
      await setText(source);
      editor.setCursorBufferPosition([2, 5]);
      const scopes = editor.scopeDescriptorForBufferPosition([2, 5]).getScopesArray();
      expect(scopes).toContain("meta.embedded.code.jsx.js");
      if (value === "Infinity") expect(scopes).toContain("constant.language.infinity.js");
      expect((await editor.getCommentDelimitersForBufferPosition([2, 5])).line).toBe("//");
      await editor.toggleLineCommentsInSelection();
      await editor.whenGrammarSettled();
      expect(editor.lineTextForBufferRow(2)).toBe(`    // ${value}`);
      expect(editor.languageMode.tree.rootNode.hasError).toBe(false);
      await editor.toggleLineCommentsInSelection();
      expect(editor.getText()).toBe(source);
    }
  });

  it("pairs JavaScript syntax while leaving prose smart quotes untouched", async () => {
    await lumine.packages.activatePackage("bracket-matcher");
    for (const [typed, expected] of [
      ["(", "()"],
      ["[", "[]"],
      ["{", "{}"],
      ['"', '""'],
      ["'", "''"],
      ["`", "``"],
      ["“", "“"],
      ["‘", "‘"],
    ]) {
      await setText("");
      await editor.insertText(typed);
      await editor.whenGrammarSettled();
      expect(editor.getText()).withContext(typed).toBe(expected);
    }
  });
});
