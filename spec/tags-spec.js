const path = require("path");

describe("JavaScript symbol queries", () => {
  let grammar;
  let editor;

  beforeEach(async () => {
    const pack = await lumine.packages.activatePackage(path.resolve(__dirname, ".."));
    grammar = pack.grammars.find(({ scopeName }) => scopeName === "source.js");
  });

  afterEach(() => editor?.destroy());

  async function captures(text) {
    editor = await lumine.workspace.open();
    editor.setGrammar(grammar);
    editor.setText(text);
    await editor.whenGrammarSettled();
    const root = editor.getSyntaxNodeAtBufferPosition([0, 0], (node) => !node.parent);
    expect(root.hasError).toBe(false);
    const groups = await editor.getGrammarQueryCaptureGroups("tagsQuery");
    return groups.find((group) => group.grammar === grammar).captures;
  }

  it("preserves declaration names, method context and call references after comments", async () => {
    const result = await captures(
      [
        "// class documentation",
        "class Example {",
        "  // method documentation",
        "  method() {}",
        "}",
        "// function documentation",
        "function declared() {}",
        "function* generated() {}",
        "// arrow documentation",
        "const arrow = () => {};",
        "// variable documentation",
        "var expression = function internal() {};",
        "called(); receiver.member(); new Constructed();",
      ].join("\n"),
    );
    expect(result.filter(({ name }) => name === "name").map(({ node }) => node.text)).toEqual([
      "Example",
      "method",
      "declared",
      "generated",
      "arrow",
      "expression",
      "internal",
      "called",
      "member",
      "Constructed",
    ]);
    expect(
      result.filter(({ name }) => name.startsWith("definition.")).map(({ name }) => name),
    ).toEqual([
      "definition.class",
      "definition.method",
      "definition.function",
      "definition.function",
      "definition.function",
      "definition.function",
      "definition.function",
    ]);
    const method = result.find(({ name }) => name === "definition.method");
    expect(method.setProperties["symbol.contextNode"]).toBe("parent.parent.parent.firstNamedChild");
    expect(result.filter(({ name }) => name === "reference.call").length).toBe(2);
    expect(result.filter(({ name }) => name === "reference.class").length).toBe(1);
  });

  it("returns no captures for a comment tile before a distant declaration", async () => {
    const source = `${Array.from({ length: 3000 }, (_, i) => `// documentation ${i}\n`).join("")}function value() {}`;
    const language = await grammar.getLanguage();
    const query = await grammar.getQuery("tagsQuery");
    const parser = grammar.createParser(language);
    const tree = parser.parse(source);
    try {
      expect(tree.rootNode.hasError).toBe(false);
      expect(
        query.captures(tree.rootNode, {
          startPosition: { row: 1500, column: 0 },
          endPosition: { row: 1506, column: 0 },
        }),
      ).toEqual([]);
      expect(query.didExceedMatchLimit()).toBe(false);
    } finally {
      tree.delete();
      parser.delete();
    }
    const result = await captures(source);
    expect(result.map(({ name }) => name)).toEqual(["definition.function", "name"]);
    expect(result.find(({ name }) => name === "name").node.text).toBe("value");
  });
});
