const path = require("node:path");

describe("JavaScript unfinished template payloads", () => {
  let editor;
  const scopes = ["source.js"];

  beforeEach(async () => {
    jasmine.useRealClock();
    await lumine.packages.activatePackage(path.resolve(__dirname, ".."));
    editor = await lumine.workspace.open();
    editor.update({ autoIndent: true, tabLength: 2, softTabs: true });
  });
  afterEach(() => editor?.destroy());

  async function start(scope, source) {
    editor.setGrammar(lumine.grammars.grammarForScopeName(scope));
    editor.setText(source);
    expect(await editor.whenGrammarSettled()).toBe(true);
  }

  it("keeps later raw payload margins across repeated Enter, including after interpolation", async () => {
    for (const scope of scopes) {
      for (const source of [
        "const value = `\n      {",
        "const value = `\n      payload [",
        "const value = `head ${value}\n      {",
        "const value = `head ${value} tail\n      [",
      ]) {
        await start(scope, source);
        editor.setCursorBufferPosition([1, Infinity]);
        for (const row of [2, 3]) {
          await editor.insertNewline();
          await editor.whenGrammarSettled();
          expect(editor.lineTextForBufferRow(row))
            .withContext(scope + source)
            .toBe("      ");
        }
      }
    }
  });

  it("preserves six-space unfinished and complete payloads during explicit reindent", async () => {
    for (const scope of scopes) {
      for (const source of [
        "const value = `\n      {\n      payload [",
        "const value = `\n      {\n      payload [\n`;",
        "function run() {\n  const value = `\n      {\n      payload [",
        "const value = `head ${value}\n      {\n      payload [",
      ]) {
        await start(scope, source);
        await editor.autoIndentBufferRows(0, editor.getLastBufferRow());
        expect(editor.getText())
          .withContext(scope + source)
          .toBe(source);
      }
    }
  });

  it("retains real containers in active interpolations and after complete templates", async () => {
    for (const scope of scopes) {
      for (const source of [
        "const value = `${run(",
        "const value = `text`; function run() {",
        "const value = `head ${value}`; function run() {",
        "const value = `head ${value} ${run(",
        "const value = `head ${value} ${({",
      ]) {
        await start(scope, source);
        editor.moveToEndOfLine();
        await editor.insertNewline();
        await editor.whenGrammarSettled();
        expect(editor.lineTextForBufferRow(1))
          .withContext(scope + source)
          .toBe("  ");
      }
    }
  });
});
