exports.activate = function () {
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
  });

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
  });

  lumine.grammars.addInjectionPoint("source.js", {
    type: "regex_pattern",
    language() {
      return "regex";
    },
    content(regex) {
      return regex;
    },
    languageScope: null,
  });

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
  });
};

exports.consumeHyperlinkInjection = (hyperlink) => {
  hyperlink.addInjectionPoint("source.js", {
    types: ["comment", "template_string", "string_fragment"],
    language(node) {
      if (node.type === "comment" && node.text.startsWith("/**")) return null;
    },
  });
  hyperlink.addInjectionPoint("source.jsdoc", {
    types: ["description", "inline_tag"],
  });
};

exports.consumeTodoInjection = (todo) => {
  todo.addInjectionPoint("source.js", {
    types: ["comment"],
    language(node) {
      if (node.text.startsWith("/**")) return null;
    },
  });
  todo.addInjectionPoint("source.jsdoc", {
    types: ["description"],
  });
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
