const fs = require("fs");
const path = require("path");

const highlightsPath = path.join(__dirname, "..", "grammars", "tree-sitter", "highlights.scm");

describe("WASM Tree-sitter JavaScript grammar", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("language-javascript");
  });

  it("passes grammar tests", async () => {
    await runGrammarTests(path.join(__dirname, "fixtures", "sample.js"), /\/\//);
  });

  it("roots container punctuation and shorthand-property captures on leaf nodes", () => {
    const query = fs.readFileSync(highlightsPath, "utf8");

    expect(query).not.toMatch(
      /\((?:array|array_pattern|object|arguments|formal_parameters|computed_property_name|subscript_expression)\s*\n\s*"/,
    );
    expect(query).not.toContain("(object\n  (shorthand_property_identifier)");
    expect(query).toContain("(#is? test.childOfType array)");
    expect(query).toContain("(#is? test.childOfType array_pattern)");
    expect(query).toContain("(#is? test.childOfType object)");
    expect(query).toContain("(#is? test.childOfType arguments)");
    expect(query).toContain("(#is? test.childOfType formal_parameters)");
  });
});
