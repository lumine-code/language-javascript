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

  it("injects JSDoc into documentation comments", async () => {
    const editor = await editorFor("/** @param {string} name */\nfunction greet(name) {}");

    expect(scopesAt(editor, "@param")).toContain("keyword.other.tag.jsdoc.js");
  });
});
