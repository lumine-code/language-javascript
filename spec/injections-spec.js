const fs = require("fs");
const path = require("path");
const { Range } = require("lumine");

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

  function hyperlinkRanges(editor) {
    return editor.languageMode
      .getAllInjectionLayers()
      .filter((layer) => layer.grammar.scopeName === "text.hyperlink")
      .flatMap((layer) => layer.tree.rootNode.descendantsOfType("url"))
      .map((node) => Range.fromObject(node.range));
  }

  async function expectExactLink(editor, url) {
    const index = editor.getText().indexOf(url);
    const buffer = editor.getBuffer();
    const range = new Range(
      buffer.positionForCharacterIndex(index),
      buffer.positionForCharacterIndex(index + url.length),
    );
    expect(hyperlinkRanges(editor)).toEqual([range]);
    expect(
      await editor.bufferRangeForScopeAtPosition(".markup.underline.link", range.start),
    ).toEqual(range);
    expect(editor.scopeDescriptorForBufferPosition(range.end).getScopesArray()).not.toContain(
      "markup.underline.link.hyperlink",
    );
    return range;
  }

  it("keeps only the URL linked when a TeX command makes JSDoc malformed", async () => {
    await lumine.packages.activatePackage(packagePath("language-hyperlink"));
    const url = "https://example.com/manual.pdf?q=1&part=2#section";
    const editor = await editorFor(
      String.raw`/** Documentation: \href{${url}}{Caltrans, chapter 8} */` +
        "\nconst after = true;",
    );
    try {
      const jsdoc = editor.languageMode
        .getAllInjectionLayers()
        .find((layer) => layer.grammar.scopeName === "source.jsdoc");
      expect(jsdoc.tree.rootNode.hasError).toBe(true);
      await expectExactLink(editor, url);
      expect(scopesAt(editor, "Caltrans")).not.toContain("markup.underline.link.hyperlink");
      expect(scopesAt(editor, "const after")).not.toContain("markup.underline.link.hyperlink");
    } finally {
      editor.destroy();
    }
  });

  it("retains the description injection without duplicate links in valid JSDoc", async () => {
    await lumine.packages.activatePackage(packagePath("language-hyperlink"));
    const url = "https://example.com/docs";
    const editor = await editorFor(`/** Read ${url}. */\nfunction example() {}`);
    try {
      const jsdoc = editor.languageMode
        .getAllInjectionLayers()
        .find((layer) => layer.grammar.scopeName === "source.jsdoc");
      expect(jsdoc.tree.rootNode.hasError).toBe(false);
      expect(jsdoc.tree.rootNode.descendantsOfType("description").length).toBe(1);
      await expectExactLink(editor, url);
    } finally {
      editor.destroy();
    }
  });

  it("replaces the fallback link injection when malformed JSDoc is repaired and restored", async () => {
    await lumine.packages.activatePackage(packagePath("language-hyperlink"));
    const url = "https://example.com/manual.pdf?q=1&part=2#section";
    const editor = await editorFor(String.raw`/** Documentation: \href{${url}}{Manual} */`);
    const jsdoc = () =>
      editor.languageMode
        .getAllInjectionLayers()
        .find((layer) => layer.grammar.scopeName === "source.jsdoc");
    try {
      expect(jsdoc().tree.rootNode.hasError).toBe(true);
      let range = await expectExactLink(editor, url);
      editor.transact(() => {
        editor
          .getBuffer()
          .delete(new Range(range.end, range.end.translate([0, "}{Manual}".length])));
        editor.getBuffer().delete(new Range(range.start.translate([0, -6]), range.start));
      });
      await editor.whenGrammarSettled();
      expect(jsdoc().tree.rootNode.hasError).toBe(false);
      range = await expectExactLink(editor, url);
      editor.transact(() => {
        editor.getBuffer().insert(range.end, "}{Manual}");
        editor.getBuffer().insert(range.start, String.raw`\href{`);
      });
      await editor.whenGrammarSettled();
      expect(jsdoc().tree.rootNode.hasError).toBe(true);
      await expectExactLink(editor, url);
      expect(scopesAt(editor, "Manual")).not.toContain("markup.underline.link.hyperlink");
    } finally {
      editor.destroy();
    }
  });

  it("keeps JSDoc annotations in their static description rules without duplicate comment layers", async () => {
    await lumine.packages.activatePackage(packagePath("language-hyperlink"));
    await lumine.packages.activatePackage(packagePath("language-todo"));
    const editor = await editorFor(
      "/** TODO https://example.com/docs */\n// TODO https://example.com/code\n// ordinary comment\nconst plain = 'ordinary string';",
    );
    try {
      const layers = editor.languageMode.getAllInjectionLayers();
      const annotations = layers.filter((layer) =>
        ["text.hyperlink", "text.todo"].includes(layer.grammar.scopeName),
      );
      expect(annotations.length).toBe(4);
      expect(annotations.every((layer) => layer.injectionPoint.patternIndex !== undefined)).toBe(
        true,
      );
      expect(scopesAt(editor, "TODO")).toContain("storage.type.class.todo");
      expect(scopesAt(editor, "https://example.com/docs")).toContain(
        "markup.underline.link.hyperlink",
      );
    } finally {
      editor.destroy();
    }
  });

  it("injects the shared regex grammar", async () => {
    const editor = await editorFor("const pattern = /^([a-z]+)$/;");

    expect(scopesAt(editor, "^")).toContain("keyword.control.anchor.regexp");
    expect(scopesAt(editor, "[")).toContain("punctuation.definition.character-class.begin.regexp");
    expect(scopesAt(editor, "+")).toContain("keyword.operator.quantifier.regexp");
  });

  it("aggregates regex patterns into bounded injection layers", async () => {
    const source = Array.from(
      { length: 300 },
      (_, index) => `const pattern_${index} = /^value_${index}+$/;`,
    ).join("\n");
    const editor = await editorFor(source);
    const regexLayers = editor.languageMode
      .getAllInjectionLayers()
      .filter((layer) => layer.grammar.scopeName === "source.regexp");

    expect(regexLayers.length).toBe(3);
    expect(
      regexLayers.map((layer) => layer.getCurrentRanges().length).sort((a, b) => b - a),
    ).toEqual([128, 128, 44]);
    for (const index of [127, 128, 255, 256, 299]) {
      const offset = editor.getText().indexOf(`value_${index}+`) + `value_${index}`.length;
      const position = editor.getBuffer().positionForCharacterIndex(offset);
      expect(editor.scopeDescriptorForBufferPosition(position).getScopesArray()).toContain(
        "keyword.operator.quantifier.regexp",
      );
    }
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

  it("keeps template fragments together and rechecks the tag outside their content", async () => {
    for (const name of ["language-html", "language-css"]) {
      await lumine.packages.activatePackage(packagePath(name));
    }
    const editor = await editorFor("const view = HTML`<section>${name}</section>`;");
    try {
      const layers = () => editor.languageMode.getAllInjectionLayers();
      expect(layers().length).toBe(1);
      expect(layers()[0].grammar.scopeName).toBe("text.html.basic");
      expect(layers()[0].getCurrentRanges().length).toBe(2);
      expect(scopesAt(editor, "name")).not.toContain("text.html.basic");
      const buffer = editor.getBuffer();
      const index = editor.getText().indexOf("HTML");
      buffer.setTextInRange(
        [buffer.positionForCharacterIndex(index), buffer.positionForCharacterIndex(index + 4)],
        "css",
      );
      await editor.languageMode.atGrammarSettlement();
      expect(layers().length).toBe(1);
      expect(layers()[0].grammar.scopeName).toBe("source.css");
      expect(layers()[0].getCurrentRanges().length).toBe(2);
    } finally {
      editor.destroy();
    }
  });

  it("preserves tag mapping precedence, nested tag calls and multiline member guards", async () => {
    await lumine.packages.activatePackage(packagePath("language-css"));
    const editor = await editorFor(
      "const first = styled.graphql`color: red;`;\nconst second = css(options)`a{}`;\nconst excluded = styled\n.div`a{}`;",
    );
    try {
      const layers = editor.languageMode.getAllInjectionLayers();
      expect(layers.length).toBe(2);
      expect(layers.map((layer) => layer.grammar.scopeName)).toEqual(["source.css", "source.css"]);
      expect(scopesAt(editor, "color")).toContain("source.css");
    } finally {
      editor.destroy();
    }
  });

  it("removes an innerHTML injection after its property changes", async () => {
    await lumine.packages.activatePackage(packagePath("language-html"));
    const editor = await editorFor("element.innerHTML = `<b>${name}</b>`;");
    try {
      expect(editor.languageMode.getAllInjectionLayers().length).toBe(1);
      const buffer = editor.getBuffer();
      const index = editor.getText().indexOf("innerHTML");
      buffer.setTextInRange(
        [buffer.positionForCharacterIndex(index), buffer.positionForCharacterIndex(index + 9)],
        "textContent",
      );
      await editor.languageMode.atGrammarSettlement();
      expect(editor.languageMode.getAllInjectionLayers().length).toBe(0);
    } finally {
      editor.destroy();
    }
  });
});

const packagePath = (name) => {
  const sibling = path.resolve(__dirname, "..", "..", name);
  return fs.existsSync(sibling) ? sibling : name;
};
