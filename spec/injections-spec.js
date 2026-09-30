describe("JavaScript Tree-sitter injections", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("language-regex");
    await lumine.packages.activatePackage("language-javascript");
  });

  async function editorFor(text) {
    const editor = await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.js"));
    editor.setText(text);
    await editor.languageMode.ready;
    await editor.languageMode.atTransactionEnd();
    return editor;
  }

  function scopesAt(editor, needle) {
    const index = editor.getText().indexOf(needle);
    const point = editor.getBuffer().positionForCharacterIndex(index);
    return editor.scopeDescriptorForBufferPosition(point).getScopesArray();
  }

  it("injects the shared regex grammar", async () => {
    const editor = await editorFor("const pattern = /^([a-z]+)$/;");

    expect(scopesAt(editor, "^")).toContain("keyword.control.anchor.regexp");
    expect(scopesAt(editor, "[")).toContain("punctuation.definition.character-class.begin.regexp");
    expect(scopesAt(editor, "+")).toContain("keyword.operator.quantifier.regexp");
  });

  it("aggregates regex patterns into one injection layer", async () => {
    const source = Array.from(
      { length: 300 },
      (_, index) => `const pattern_${index} = /^value_${index}+$/;`,
    ).join("\n");
    const editor = await editorFor(source);
    const regexLayers = editor.languageMode
      .getAllInjectionLayers()
      .filter((layer) => layer.grammar.scopeName === "source.regexp");

    expect(regexLayers.length).toBe(1);
    expect(scopesAt(editor, "+")).toContain("keyword.operator.quantifier.regexp");
  });

  it("isolates unfinished patterns and combines them once repaired", async () => {
    const editor = await editorFor("const partial = /(/;\nconst safe = /x+/;\nconst other = /y*/;");
    const regexLayers = () =>
      editor.languageMode
        .getAllInjectionLayers()
        .filter((layer) => layer.grammar.scopeName === "source.regexp");
    expect(regexLayers().length).toBe(2);
    expect(scopesAt(editor, "const safe")).not.toContain("meta.group.capturing.regexp");
    expect(scopesAt(editor, "+")).toContain("keyword.operator.quantifier.regexp");
    const buffer = editor.getBuffer();
    const index = editor.getText().indexOf("(");
    buffer.setTextInRange(
      [buffer.positionForCharacterIndex(index), buffer.positionForCharacterIndex(index + 1)],
      "()",
    );
    await editor.languageMode.atTransactionEnd();
    expect(regexLayers().length).toBe(1);
    expect(scopesAt(editor, "const safe")).not.toContain("meta.group.capturing.regexp");
  });

  it("checks literal flags before combining patterns", async () => {
    const editor = await editorFor(
      "const partial = /x/gg;\nconst safe = /y+/;\nconst other = /z*/;",
    );
    const regexLayers = () =>
      editor.languageMode
        .getAllInjectionLayers()
        .filter((layer) => layer.grammar.scopeName === "source.regexp");
    expect(regexLayers().length).toBe(2);
    const buffer = editor.getBuffer();
    const index = editor.getText().indexOf("gg");
    buffer.setTextInRange(
      [buffer.positionForCharacterIndex(index), buffer.positionForCharacterIndex(index + 2)],
      "g",
    );
    await editor.languageMode.atTransactionEnd();
    expect(regexLayers().length).toBe(1);
  });

  it("keeps very large patterns outside synchronous combination validation", async () => {
    const editor = await editorFor(`const large = /${"a".repeat(17000)}/;\nconst safe = /x+/;`);
    const regexLayers = editor.languageMode
      .getAllInjectionLayers()
      .filter((layer) => layer.grammar.scopeName === "source.regexp");
    expect(regexLayers.length).toBe(2);
  });

  it("preserves literal boundaries around legacy escapes and numeric backreferences", async () => {
    for (const separator of ["; const b = ", ";\nconst b = "]) {
      for (const [first, second] of [
        [String.raw`\x`, "41"],
        [String.raw`\c`, "A"],
        [String.raw`(a)\1`, "1"],
      ]) {
        const editor = await editorFor(
          `const a = /${first}/${separator}/${second}/; const safe = /z+/;`,
        );
        const index = editor.getText().indexOf("const b");
        const position = editor.getBuffer().positionForCharacterIndex(index);
        expect(editor.scopeDescriptorForBufferPosition(position).getScopesArray()).not.toContain(
          "constant.character.escape.backslash.regexp",
        );
        const regexLayers = editor.languageMode
          .getAllInjectionLayers()
          .filter((layer) => layer.grammar.scopeName === "source.regexp");
        expect(regexLayers.length).toBe(2);
        editor.destroy();
      }
    }
  });

  it("isolates grammar features that cannot safely share regex recovery", async () => {
    for (const literal of [String.raw`/[[a-z]--[aeiou]]/v`, "/(?<ż>a)/u", String.raw`/\k<ż>/`]) {
      const editor = await editorFor(`const a = ${literal}; const safe = /x+/;`);
      const regexLayers = editor.languageMode
        .getAllInjectionLayers()
        .filter((layer) => layer.grammar.scopeName === "source.regexp");
      expect(regexLayers.length).toBe(2);
      expect(scopesAt(editor, "const safe")).not.toContain("meta.group.capturing.named.regexp");
      editor.destroy();
    }
  });

  it("injects JSDoc into documentation comments", async () => {
    const editor = await editorFor("/** @param {string} name */\nfunction greet(name) {}");

    expect(scopesAt(editor, "@param")).toContain("keyword.other.tag.jsdoc.js");
  });
});
