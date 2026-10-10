describe("JavaScript native console method scopes", () => {
  let editor;

  beforeEach(async () => {
    jasmine.useRealClock();
    for (const method of ["openExternal", "openPath", "showItemInFolder", "openApplication"])
      spyOn(lumine.shell, method).and.resolveTo();
    spyOn(lumine.application, "openWindow").and.resolveTo();
    const pack = await lumine.packages.activatePackage("language-javascript");
    await pack.resourceLoadPromise;
    editor = await lumine.workspace.open();
    editor.setGrammar(pack.grammars.find((grammar) => grammar.scopeName === "source.js"));
  });

  afterEach(() => editor?.destroy());

  async function scopesFor(method) {
    editor.setText(`console.${method}();\n`);
    expect(await editor.whenGrammarSettled()).toBeTrue();
    const root = editor.getSyntaxNodeAtBufferPosition([0, 0], (node) => !node.parent);
    expect(root.hasError).toBeFalse();
    return editor.scopeDescriptorForBufferPosition([0, 9]).getScopesArray();
  }

  it("recognizes group, groupEnd and info as separate built-in console methods", async () => {
    for (const method of ["group", "groupEnd", "info"])
      expect(await scopesFor(method)).toContain("support.function.builtin.console.js");
  });

  it("does not recognize a groupinfo concatenation as a built-in method", async () => {
    expect(await scopesFor("groupinfo")).not.toContain("support.function.builtin.console.js");
  });

  it("retains the ordinary log built-in scope", async () => {
    expect(await scopesFor("log")).toContain("support.function.builtin.console.js");
  });
});
