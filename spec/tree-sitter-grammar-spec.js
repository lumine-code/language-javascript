const fs = require("fs");
const path = require("path");
const { Point } = require("lumine");

const highlightsPath = path.join(__dirname, "..", "grammars", "javascript-highlights.scm");

describe("WASM Tree-sitter JavaScript grammar", () => {
  let editor;
  let languageMode;

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-javascript");
  });

  afterEach(() => editor?.destroy());

  async function setUp(text) {
    editor = await lumine.workspace.open("structural-highlights.js");
    editor.setText(text);
    languageMode = editor.getBuffer().languageMode;
    await languageMode.ready;
  }

  function scopesAt(row, text, occurrence = 0) {
    const line = editor.lineTextForBufferRow(row);
    let column = -1;
    for (let i = 0; i <= occurrence; i++) column = line.indexOf(text, column + 1);
    expect(column).not.toBe(-1);
    return editor.scopeDescriptorForBufferPosition([row, column]).getScopesArray();
  }

  function capturesForRows(startRow, endRow) {
    const options =
      startRow == null
        ? undefined
        : {
            startPosition: new Point(startRow, 0),
            endPosition: new Point(endRow, 0),
          };
    const layer = languageMode.rootLanguageLayer;
    return layer.queries.highlightsQuery.captures(layer.tree.rootNode, options);
  }

  it("passes grammar tests", async () => {
    await runGrammarTests(path.join(__dirname, "fixtures", "sample.js"), /\/\//);
  });

  it("keeps unbounded containers leaf-rooted and bounded context structural", () => {
    const query = fs.readFileSync(highlightsPath, "utf8");

    expect(query).not.toContain(
      '(formal_parameters\n  "(" @punctuation.definition.parameters.begin',
    );
    expect(query).not.toContain("(formal_parameters\n  [");
    expect(query).not.toContain("(formal_parameters\n  (rest_pattern");
    expect(query).not.toContain("(formal_parameters\n  (assignment_pattern");
    expect(query).not.toMatch(/^\((?:object_pattern|array_pattern)\b/m);
    expect(query).not.toContain('(arguments\n  "(" @punctuation.definition.arguments.begin');
    expect(query).not.toContain('(object\n  "{" @punctuation.definition.object.begin');
    expect(query).not.toContain('(array\n  "[" @punctuation.definition.array.begin');
    expect(query).not.toContain('(array_pattern\n  "[" @punctuation.definition.array.begin');
    expect(query).toContain("(#is? test.childOfType formal_parameters)");
    expect(query).toContain("(#is? test.childOfType arguments)");
    expect(query).toContain("(#is? test.childOfType object)");
    expect(query).toContain('("[" @punctuation.definition.array.begin.bracket.square.js');
    expect(query).toContain('(subscript_expression\n  "["');
    expect(query).toContain("(#is? test.childOfType string)");
    expect(query).not.toContain("(template_string\n  (escape_sequence)");
    expect(query).toContain('(#is? test.childOfType "string template_string")');
    expect(query).not.toMatch(/\(jsx_(?:opening|closing|self_closing)_element\s+(?:name:|["(])/);
    expect(query).toContain("(#is? test.field name)");
    expect(query).toContain(
      '(#is? test.childOfType "jsx_opening_element jsx_closing_element jsx_self_closing_element")',
    );
    expect(query).toContain(
      '((hash_bang_line) @comment.line.shebang.js\n  (#set! adjust.endBeforeFirstMatchOf "\\\\r?$"))',
    );
  });

  it("preserves string, regex, container, and JSX scopes", async () => {
    await setUp(`function declared(a, b) {
  const object = {shorthand, key: [value]};
  const computed = {[key]: value};
  const indexed = object[index];
  const [head, ...tail] = values;
  return invoke(object);
}
const single = 's';
const double = "d";
const template = \`t\${value}\`;
const regex = /ab+/gi;
const element = <Namespace.Widget ns:prop={value} />;
const emptySingle = '';
const emptyDouble = "";
const emptyTemplate = \`\`;`);

    expect(scopesAt(0, "(")).toContain("punctuation.definition.parameters.begin.bracket.round.js");
    expect(scopesAt(0, ")")).toContain("punctuation.definition.parameters.end.bracket.round.js");
    expect(scopesAt(1, "{")).toContain("punctuation.definition.object.begin.bracket.curly.js");
    expect(scopesAt(1, "}")).toContain("punctuation.definition.object.end.bracket.curly.js");
    expect(scopesAt(1, "[")).toContain("punctuation.definition.array.begin.bracket.square.js");
    expect(scopesAt(1, "]")).toContain("punctuation.definition.array.end.bracket.square.js");
    expect(scopesAt(1, "shorthand")).toContain("entity.other.attribute-name.shorthand.js");
    expect(scopesAt(2, "[")).toContain(
      "punctuation.definition.computed-property.begin.bracket.square.js",
    );
    expect(scopesAt(2, "]")).toContain(
      "punctuation.definition.computed-property.end.bracket.square.js",
    );
    expect(scopesAt(3, "[")).toContain("punctuation.definition.subscript.begin.bracket.square.js");
    expect(scopesAt(3, "]")).toContain("punctuation.definition.subscript.end.bracket.square.js");
    expect(scopesAt(4, "[")).toContain("punctuation.definition.array.begin.bracket.square.js");
    expect(scopesAt(4, "]")).toContain("punctuation.definition.array.end.bracket.square.js");
    expect(scopesAt(5, "(")).toContain("punctuation.definition.arguments.begin.bracket.round.js");
    expect(scopesAt(5, ")")).toContain("punctuation.definition.arguments.end.bracket.round.js");
    expect(scopesAt(7, "'", 0)).toContain("punctuation.definition.string.begin.js");
    expect(scopesAt(7, "'", 1)).toContain("punctuation.definition.string.end.js");
    expect(scopesAt(8, '"', 0)).toContain("punctuation.definition.string.begin.js");
    expect(scopesAt(8, '"', 1)).toContain("punctuation.definition.string.end.js");
    expect(scopesAt(9, "`", 0)).toContain("punctuation.definition.string.begin.js");
    expect(scopesAt(9, "`", 1)).toContain("punctuation.definition.string.end.js");
    expect(scopesAt(10, "/", 0)).toContain("punctuation.definition.string.begin.js");
    expect(scopesAt(10, "/", 1)).toContain("punctuation.definition.string.end.js");
    expect(scopesAt(11, "Namespace.Widget")).toContain("entity.name.tag.jsx.js");
    expect(scopesAt(11, "Namespace.Widget")).not.toContain("support.other.object.js");
    expect(scopesAt(11, "ns:")).toContain("meta.attribute-namespace.jsx.js");
    expect(scopesAt(12, "'", 0)).toContain("punctuation.definition.string.begin.js");
    expect(scopesAt(12, "'", 1)).toContain("punctuation.definition.string.end.js");
    expect(scopesAt(13, '"', 0)).toContain("punctuation.definition.string.begin.js");
    expect(scopesAt(13, '"', 1)).toContain("punctuation.definition.string.end.js");
    expect(scopesAt(14, "`", 0)).toContain("punctuation.definition.string.begin.js");
    expect(scopesAt(14, "`", 1)).toContain("punctuation.definition.string.end.js");
  });

  it("keeps leaf-rooted captures viewport-local", async () => {
    await setUp(`function declared(
  first,
  second,
) {
  return invoke(
    first,
    second,
  );
}`);

    const parameterCaptures = capturesForRows(2, 4).filter((capture) =>
      capture.name.startsWith("punctuation.definition.parameters."),
    );
    expect(parameterCaptures.map((capture) => capture.node.startPosition.row)).toEqual([3]);
    expect(parameterCaptures.every((capture) => capture.node.startPosition.row >= 2)).toBe(true);

    const argumentCaptures = capturesForRows(6, 8).filter((capture) =>
      capture.name.startsWith("punctuation.definition.arguments."),
    );
    expect(argumentCaptures.map((capture) => capture.node.startPosition.row)).toEqual([7]);
    expect(argumentCaptures.every((capture) => capture.node.startPosition.row >= 6)).toBe(true);
  });

  it("bounds raw work inside a 6000-row object parent", async () => {
    const lines = ["const value = {"];
    for (let i = 0; i < 6000; i++) lines.push(`  key_${i}: value_${i},`);
    lines.push("};");
    await setUp(lines.join("\r\n"));

    const tileCaptures = capturesForRows(2998, 3004);
    expect(tileCaptures.length).toBeLessThanOrEqual(80);
  });

  it("bounds raw work inside a 6000-row formal-parameters parent", async () => {
    const lines = ["function benchmark("];
    for (let i = 0; i < 6000; i++) {
      lines.push(`  value_${i}${i === 5999 ? "" : ","}`);
    }
    lines.push(") {}");
    await setUp(lines.join("\r\n"));

    const tileCaptures = capturesForRows(2998, 3004);
    expect(tileCaptures.length).toBeLessThanOrEqual(64);
    expect(
      tileCaptures
        .filter((capture) => capture.name.startsWith("variable.parameter"))
        .every(
          (capture) =>
            capture.node.startPosition.row >= 2998 && capture.node.startPosition.row < 3004,
        ),
    ).toBe(true);
  });

  it("bounds raw work inside a 6000-row template string parent", async () => {
    const lines = ["const value = `"];
    for (let i = 0; i < 6000; i++) lines.push(`  value_${i} = \${value};`);
    lines.push("`;");
    await setUp(lines.join("\r\n"));

    const tileCaptures = capturesForRows(2998, 3004);
    expect(tileCaptures.length).toBeLessThanOrEqual(72);
    const substitutions = tileCaptures.filter((capture) =>
      capture.name.startsWith("punctuation.section.embedded."),
    );
    expect(substitutions.length).toBeGreaterThan(0);
    expect(
      substitutions.every(
        (capture) =>
          capture.node.startPosition.row >= 2998 && capture.node.startPosition.row < 3004,
      ),
    ).toBe(true);
  });

  it("bounds raw work inside a 6000-attribute JSX opening tag", async () => {
    const lines = ["const element = <Component"];
    for (let i = 0; i < 6000; i++) lines.push(`  property_${i}={value_${i}}`);
    lines.push(">content</Component>;");
    await setUp(lines.join("\r\n"));
    expect(languageMode.tree.rootNode.hasError).toBe(false);

    const startRow = 2998;
    const endRow = startRow + 6;
    const tileCaptures = capturesForRows(startRow, endRow);
    expect(tileCaptures.length).toBeLessThanOrEqual(96);
    expect(
      tileCaptures
        .filter(({ name }) => !name.startsWith("meta."))
        .every(({ node }) => node.startPosition.row >= startRow && node.startPosition.row < endRow),
    ).toBe(true);
  });

  it("bounds raw work inside 6000-row destructuring patterns", async () => {
    const objectLines = ["const {"];
    for (let i = 0; i < 6000; i++) objectLines.push(`  key_${i}: value_${i},`);
    objectLines.push("} = source;");
    await setUp(objectLines.join("\r\n"));

    let tileCaptures = capturesForRows(2998, 3004);
    expect(tileCaptures.length).toBeLessThanOrEqual(100);
    expect(
      tileCaptures
        .filter((capture) => capture.name.includes("assignment.destructuring"))
        .every(
          (capture) =>
            capture.node.startPosition.row >= 2998 && capture.node.startPosition.row < 3004,
        ),
    ).toBe(true);

    const arrayLines = ["const ["];
    for (let i = 0; i < 6000; i++) arrayLines.push(`  value_${i},`);
    arrayLines.push("] = source;");
    await setUp(arrayLines.join("\r\n"));

    tileCaptures = capturesForRows(2998, 3004);
    expect(tileCaptures.length).toBeLessThanOrEqual(64);
    expect(
      tileCaptures
        .filter((capture) => capture.name.includes("assignment.destructuring"))
        .every(
          (capture) =>
            capture.node.startPosition.row >= 2998 && capture.node.startPosition.row < 3004,
        ),
    ).toBe(true);
  });
});
