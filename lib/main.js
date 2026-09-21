let injectionRegistrations = [];

// Keep all regex-pattern ranges in one child layer per JavaScript tree. A
// separate layer per literal is unnecessarily expensive for generated files
// containing thousands of regexes.
const regexPatternsByProgram = new WeakMap();

function regexPatternsIn(program) {
  let patterns = regexPatternsByProgram.get(program);
  if (!patterns) {
    patterns = program.descendantsOfType("regex_pattern");
    regexPatternsByProgram.set(program, patterns);
  }
  return patterns;
}

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
      type: "program",
      language(program) {
        return regexPatternsIn(program).length > 0 ? "regex" : null;
      },
      content(program) {
        return regexPatternsIn(program);
      },
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
