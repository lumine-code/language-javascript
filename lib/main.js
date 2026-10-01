let injectionRegistrations = [];

// Regex recovery needs a semantic guard before sharing a parser.
exports.activate = function () {
  injectionRegistrations.push(
    lumine.grammars.addInjectionPoint("source.js", {
      type: "regex",
      language: () => "regex",
      content: (node) => node.childForFieldName("pattern"),
      combined: canCombineRegex,
      combinedMaxMembers: 128,
      languageScope: null,
    }),
  );
};

exports.consumeHyperlinkInjection = (hyperlink) => {
  const registrations = [];
  registrations.push(
    hyperlink.addInjectionPoint("source.js", {
      types: ["comment", "template_string", "string_fragment"],
      language(node) {
        if (node.type === "comment" && node.text.startsWith("/**")) return null;
      },
    }),
  );
  registrations.push(
    hyperlink.addInjectionPoint("source.jsdoc", {
      types: ["description", "inline_tag"],
    }),
  );
  return {
    dispose() {
      for (const registration of registrations.splice(0)) registration.dispose();
    },
  };
};

exports.consumeTodoInjection = (todo) => {
  const registrations = [];
  registrations.push(
    todo.addInjectionPoint("source.js", {
      types: ["comment"],
      language(node) {
        if (node.text.startsWith("/**")) return null;
      },
    }),
  );
  registrations.push(
    todo.addInjectionPoint("source.jsdoc", {
      types: ["description"],
    }),
  );
  return {
    dispose() {
      for (const registration of registrations.splice(0)) registration.dispose();
    },
  };
};

// A partial pattern must recover on its own: concatenating an unfinished
// group with the next literal can scope intervening JavaScript as regex.
function canCombineRegex(node) {
  const pattern = node.childForFieldName("pattern");
  if (!pattern || pattern.endIndex - pattern.startIndex > 16384) return false;
  const flags = node.childForFieldName("flags");
  if (flags && flags.endIndex - flags.startIndex > 32) return false;
  const text = pattern.text;
  const flagText = flags?.text ?? "";
  // The shared Tree-sitter regex grammar predates Unicode sets and restricts
  // named groups to ASCII identifiers; keep those contexts independent.
  if (flagText.includes("v")) return false;
  for (const name of text.matchAll(/\(\?<([^=!][^>]*)>|\\k<([^>]+)>/g)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name[1] ?? name[2])) return false;
  }
  // Legacy incomplete escapes and trailing numeric escapes can consume the
  // next literal even though each pattern alone is accepted by JavaScript.
  if (/\\[0-9]+$/.test(text)) return false;
  try {
    new RegExp(text, flagText);
    if (!/[uv]/.test(flagText)) new RegExp(text, `${flagText}u`);
    return true;
  } catch {
    return false;
  }
}

exports.deactivate = function () {
  for (const registration of injectionRegistrations.splice(0)) registration.dispose();
};
