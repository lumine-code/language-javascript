const path = require("node:path");

describe("language-javascript conservative indentation", () => {
  let editor;

  beforeEach(async () => {
    const pack = await lumine.packages.activatePackage(path.resolve(__dirname, ".."));
    for (const grammar of pack.grammars) {
      if (grammar.queryPaths?.indentsQuery) await grammar.getQuery("indentsQuery");
    }
    editor = await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName("source.js"));
    editor.update({ tabLength: 2, softTabs: true });
  });

  afterEach(() => editor?.destroy());

  async function setText(source) {
    editor.setText(source);
    expect(await editor.whenGrammarSettled()).toBe(true);
  }

  async function enter(source, expected, row = 0) {
    await setText(source);
    editor.setCursorBufferPosition([row, Infinity]);
    editor.insertText("\n", { autoIndent: true, autoIndentNewline: true });
    await editor.whenGrammarSettled();
    expect(editor.lineTextForBufferRow(row + 1))
      .withContext(source)
      .toBe(" ".repeat(expected));
    expect(editor.getCursorBufferPosition().column).withContext(source).toBe(expected);
  }

  it("keeps ambiguous continuations at the current indentation by default", async () => {
    for (const source of [
      "if (ready)",
      "else",
      "const value = test ?",
      "const value = first &&",
      "const value = first ||",
    ]) {
      await enter(source, 0);
    }
  });

  it("still indents unambiguous delimiters and balances one-line constructs", async () => {
    for (const source of ["function run() {", "const values = [", "run("]) await enter(source, 2);
    for (const source of [
      "function run() {}",
      "const value = { nested: [] };",
      "// {",
      "const value = '{';",
    ])
      await enter(source, 0);
  });

  it("keeps a brace on its own line aligned with the conditional", async () => {
    await setText("if (ready)\n{\nrun();\n}");
    await editor.autoIndentBufferRows(0, 3);
    expect(editor.getText()).toBe("if (ready)\n{\n  run();\n}");
  });

  it("keeps unfinished template text separate from recovered code delimiters", async () => {
    for (const source of ["const value = `{", "const value = `text {", "const value = `["])
      await enter(source, 0);
    await enter("function run() {\n  const value = `{", 2, 1);
    await enter("const value = `text`; function run() {", 2);
    await enter("const value = `${run(", 2);
  });

  it("opens case bodies only after a label ending at its colon", async () => {
    for (const label of ["case 1:", "default:"]) {
      await enter("switch (value) {\n  " + label, 4, 1);
      await enter("switch (value) {\n  " + label + " run();", 2, 1);
      await enter("switch (value) {\n  " + label + " run();\n}", 2, 1);
    }
  });

  it("uses the JSX owner's margin after multiline tags", async () => {
    await enter('const node = <div\n  prop="value">', 2, 1);
    await enter('const node = <div\n  prop="value"\n  >', 2, 2);
    await enter('const node = <div\n  prop="value" />', 0, 1);
    await enter('const node = <div\n  prop="value"\n/>', 0, 2);
  });

  it("keeps JSX attributes indented while typing their self-closing delimiter", async () => {
    for (const [source, row, expected] of [
      ['const node = <div\n  prop="value" ', 1, '  prop="value" />'],
      ['const node = <div\n  prop="value"\n  ', 2, "/>"],
    ]) {
      await setText(source);
      editor.setCursorBufferPosition([row, Infinity]);
      for (const character of "/>") {
        await editor.insertText(character, { autoIndent: true, autoDecreaseIndent: true });
        await editor.whenGrammarSettled();
      }
      expect(editor.lineTextForBufferRow(row)).toBe(expected);
    }
  });

  it("dedents a closing brace typed after Enter", async () => {
    await enter("function run() {", 2);
    editor.insertText("}", { autoIndent: true, autoDecreaseIndent: true });
    await editor.whenGrammarSettled();
    expect(editor.lineTextForBufferRow(1)).toBe("}");
  });

  it("keeps speculative indentation available as an explicit preference", async () => {
    lumine.config.set("language-javascript.indentation.indentAfterBracelessIf", true);
    try {
      await enter("if (ready)", 2);
    } finally {
      lumine.config.unset("language-javascript.indentation.indentAfterBracelessIf");
    }
  });

  it("preserves whitespace inside multiline literals and comments when reindenting", async () => {
    const source =
      "function run() {\n  const text = `head\n       literal {\n raw }\n`;\n  /* comment\n       aligned\n  */\n}";
    await setText(source);
    const before = editor.getText().split("\n");
    await editor.autoIndentBufferRows(0, editor.getLastBufferRow());
    for (const row of [2, 3, 4, 6, 7]) {
      expect(editor.lineTextForBufferRow(row)).withContext(String(row)).toBe(before[row]);
    }
  });
});
