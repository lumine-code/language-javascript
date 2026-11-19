const dedent = require("dedent");

function getDisplayText(editor) {
  return editor.displayLayer.getText();
}

describe("JavaScript folding (Tree-sitter)", () => {
  let editor;
  let languageMode;
  let grammar;

  async function setTextAndWaitForUpdate(text) {
    editor.setText(text);
    await languageMode.atTransactionEnd();
  }

  async function expectToFoldInto(unfoldedText, foldedText, { rowNumberToFold = 0 } = {}) {
    await setTextAndWaitForUpdate(unfoldedText);
    await editor.foldBufferRow(rowNumberToFold);
    expect(getDisplayText(editor)).toBe(foldedText);
  }

  beforeEach(async () => {
    editor = await lumine.workspace.open();
    editor.displayLayer.reset({ foldCharacter: "…" });
    await lumine.packages.activatePackage("language-javascript");
    grammar = lumine.grammars.grammarForScopeName("source.js");
    editor.setGrammar(grammar);
    languageMode = editor.languageMode;
    await languageMode.ready;
  });

  it("folds a callback argument along with the row that closes the call", async () => {
    await expectToFoldInto(
      dedent`
        document.addEventListener("DOMContentLoaded", () => {
          console.log("hello");
        });
      `,
      dedent`
        document.addEventListener("DOMContentLoaded", () => {…});
      `,
    );

    await expectToFoldInto(
      dedent`
        describe("something", function () {
          ok();
        });
      `,
      dedent`
        describe("something", function () {…});
      `,
    );

    // The spanning argument doesn't have to be the last one.
    await expectToFoldInto(
      dedent`
        foo(() => {
          bar();
        }, 1);
      `,
      dedent`
        foo(() => {…}, 1);
      `,
    );
  });

  it("folds an object argument along with the row that closes the call", async () => {
    await expectToFoldInto(
      dedent`
        foo({
          bar: 1,
        });
      `,
      dedent`
        foo({…});
      `,
    );
  });

  it("folds an argument list that breaks after its opening parenthesis", async () => {
    // The fold stops one row short so that the `) {` row keeps the fold for the
    // function body.
    await setTextAndWaitForUpdate(dedent`
      function foo(
        bar,
        baz,
        thud
      ) {
        qux;
      }
    `);

    await editor.foldBufferRow(0);
    expect(getDisplayText(editor)).toBe(dedent`
      function foo(…
      ) {
        qux;
      }
    `);

    await editor.foldBufferRow(4);
    expect(getDisplayText(editor)).toBe(dedent`
      function foo(…
      ) {…}
    `);
  });

  it("folds an argument list whose last argument starts on the closing row", async () => {
    await expectToFoldInto(
      dedent`
        console.log("a",
          "b",
          "c");
      `,
      dedent`
        console.log("a",…);
      `,
    );

    await setTextAndWaitForUpdate(dedent`
      class A {
        getB (c,
              d,
              e) {
          return this.f(g);
        }
      }
    `);

    await editor.foldBufferRow(1);
    expect(getDisplayText(editor)).toBe(dedent`
      class A {
        getB (c,…) {
          return this.f(g);
        }
      }
    `);
  });

  it("keeps `if`/`else` folds out of each other's way", async () => {
    await setTextAndWaitForUpdate(dedent`
      if (a) {
        b;
      } else if (c) {
        d;
      } else {
        e;
      }
    `);

    await editor.foldBufferRow(0);
    await editor.foldBufferRow(2);
    expect(getDisplayText(editor)).toBe(dedent`
      if (a) {…
      } else if (c) {…
      } else {
        e;
      }
    `);
  });
});
