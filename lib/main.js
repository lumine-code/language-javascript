let injectionRegistrations = [];

exports.activate = function () {
  injectionRegistrations.push(
    lumine.grammars.addInjectionPoint("source.js", {
      type: "call_expression",

      language(callExpression) {
        const { firstChild } = callExpression;
        switch (firstChild.type) {
          case "identifier":
            return languageStringForTemplateTag(firstChild.text);
          case "call_expression":
            return languageStringForTemplateTag(firstChild.children[0].text);
          case "member_expression":
            if (firstChild.startPosition.row === firstChild.endPosition.row) {
              return languageStringForTemplateTag(firstChild.text);
            }
        }
      },

      content(callExpression) {
        const { lastChild } = callExpression;
        if (lastChild.type === "template_string") {
          return stringFragmentsOfTemplateString(lastChild);
        }
      },
    }),
  );

  injectionRegistrations.push(
    lumine.grammars.addInjectionPoint("source.js", {
      type: "assignment_expression",

      language(expression) {
        const { firstChild } = expression;
        if (firstChild.type === "member_expression") {
          if (firstChild.lastChild.text === "innerHTML") {
            return "html";
          }
        }
      },

      content(expression) {
        const { lastChild } = expression;
        if (lastChild.type === "template_string") {
          return stringFragmentsOfTemplateString(lastChild);
        }
      },
    }),
  );

  injectionRegistrations.push(
    lumine.grammars.addInjectionPoint("source.js", {
      type: "regex",
      language: () => "regex",
      content: (node) => node.childForFieldName("pattern"),
      combined: canCombineRegex,
      languageScope: null,
    }),
  );

  injectionRegistrations.push(
    lumine.grammars.addInjectionPoint("source.js", {
      type: "comment",
      language(comment) {
        if (comment.text.startsWith("/**")) return "jsdoc";
      },
      content(comment) {
        return comment;
      },
      languageScope: null,
      coverShallowerScopes: true,
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

const CSS_REGEX = /\bstyled\b|\bcss\b/i;
const GQL_REGEX = /\bgraphql\b|\bgql\b/i;
const SQL_REGEX = /\bsql\b/i;

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

function languageStringForTemplateTag(tag) {
  const normalized = tag.trim().toLowerCase();
  if (CSS_REGEX.test(normalized)) {
    return "css";
  } else if (GQL_REGEX.test(normalized)) {
    return "graphql";
  } else if (SQL_REGEX.test(normalized)) {
    return "sql";
  } else {
    return normalized;
  }
}

function stringFragmentsOfTemplateString(templateStringNode) {
  return templateStringNode.children.filter((c) => c.type === "string_fragment");
}

exports.deactivate = function () {
  for (const registration of injectionRegistrations.splice(0)) registration.dispose();
};
