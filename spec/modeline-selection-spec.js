const fs = require("fs");
const path = require("path");

describe("JavaScript modeline selection", () => {
  let grammar;

  beforeEach(async () => {
    const pkg = await lumine.packages.activatePackage("language-javascript");
    expect(fs.realpathSync(pkg.path)).toBe(path.resolve(__dirname, ".."));
    grammar = lumine.grammars.grammarForScopeName("source.js");
  });

  it("selects extensionless files from Vim filetype, ft, and syntax modelines", () => {
    for (const key of ["filetype", "ft", "syntax"]) {
      const text = "// vim: set tabstop=4 set " + key + "=javascript:";
      expect(lumine.grammars.selectGrammar("modeline", text).scopeName).toBe("source.js");
    }
  });

  it("preserves token order and modelines on a later supplied prefix line", () => {
    expect(grammar.firstLineRegex.test("vim: ft=javascript")).toBe(false);
    expect(grammar.firstLineRegex.test("ft=javascript // vim: set tabstop=4")).toBe(false);
    expect(grammar.firstLineRegex.test("preceding line\n// vim: set ft=javascript:")).toBe(true);
  });

  it("accepts complete aliases without claiming names that only share their prefix", () => {
    for (const alias of ["js", "javascript"]) {
      for (const key of ["filetype", "ft", "syntax"]) {
        expect(
          lumine.grammars.selectGrammar("modeline", "// vim: set " + key + "=" + alias + ":")
            .scopeName,
        ).toBe("source.js");
        for (const suffix of ["ish", "_extra", "-extra", "2", "/extra"]) {
          const source = "// vim: set " + key + "=" + alias + suffix + ":";
          expect(lumine.grammars.grammarMatchesPrefix(grammar, source))
            .withContext(source)
            .toBe(false);
          expect(lumine.grammars.selectGrammar("modeline", source).scopeName)
            .withContext(source)
            .not.toBe("source.js");
        }
      }
    }
  });

  it("recognizes exact aliases at LF and CRLF boundaries in a multiline prefix", () => {
    for (const newline of ["\n", "\r\n"]) {
      for (const alias of ["js", "javascript"]) {
        for (const key of ["filetype", "ft", "syntax"]) {
          const modeline = "// vim: set " + key + "=" + alias;
          const source = modeline + newline + "content";
          expect(lumine.grammars.selectGrammar("modeline", source).scopeName)
            .withContext(JSON.stringify(source))
            .toBe("source.js");
          for (const suffix of ["ish", "_extra", "-extra", "2", "/extra"]) {
            const invalid = modeline + suffix + newline + "content";
            expect(lumine.grammars.grammarMatchesPrefix(grammar, invalid))
              .withContext(JSON.stringify(invalid))
              .toBe(false);
            expect(lumine.grammars.selectGrammar("modeline", invalid).scopeName)
              .withContext(JSON.stringify(invalid))
              .not.toBe("source.js");
          }
        }
      }
    }
  });

  it("keeps failed modelines from revisiting Vim and set tokens", () => {
    expect(grammar.firstLineRegex.source).toContain("(?:(?!vim\\b).)*vim\\b");
    expect(grammar.firstLineRegex.source).toContain("(?:(?!\\bset\\b).)*\\bset\\b");
    for (const text of ["vim " + " set ".repeat(16000) + "x", "vim ".repeat(16000) + "x"]) {
      expect(grammar.firstLineRegex.test(text)).toBe(false);
      expect(lumine.grammars.selectGrammar("modeline", text).scopeName).not.toBe("source.js");
    }
  });
});
