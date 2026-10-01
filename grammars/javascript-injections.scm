((call_expression
  function: (identifier) @_tag
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#match? @_tag "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#set! injection.language "css"))

((call_expression
  function: (identifier) @_tag
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#not-match? @_tag "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#match? @_tag "\\b[gG][rR][aA][pP][hH][qQ][lL]\\b|\\b[gG][qQ][lL]\\b")
  (#set! injection.language "graphql"))

((call_expression
  function: (identifier) @_tag
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#not-match? @_tag "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#not-match? @_tag "\\b[gG][rR][aA][pP][hH][qQ][lL]\\b|\\b[gG][qQ][lL]\\b")
  (#match? @_tag "\\b[sS][qQ][lL]\\b")
  (#set! injection.language "sql"))

((call_expression
  function: (identifier) @injection.language
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#not-match? @injection.language "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#not-match? @injection.language "\\b[gG][rR][aA][pP][hH][qQ][lL]\\b|\\b[gG][qQ][lL]\\b")
  (#not-match? @injection.language "\\b[sS][qQ][lL]\\b"))

((call_expression
  function: (member_expression) @_tag
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#not-match? @_tag "\n")
  (#match? @_tag "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#set! injection.language "css"))

((call_expression
  function: (member_expression) @_tag
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#not-match? @_tag "\n")
  (#not-match? @_tag "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#match? @_tag "\\b[gG][rR][aA][pP][hH][qQ][lL]\\b|\\b[gG][qQ][lL]\\b")
  (#set! injection.language "graphql"))

((call_expression
  function: (member_expression) @_tag
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#not-match? @_tag "\n")
  (#not-match? @_tag "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#not-match? @_tag "\\b[gG][rR][aA][pP][hH][qQ][lL]\\b|\\b[gG][qQ][lL]\\b")
  (#match? @_tag "\\b[sS][qQ][lL]\\b")
  (#set! injection.language "sql"))

((call_expression
  function: (member_expression) @injection.language
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#not-match? @injection.language "\n")
  (#not-match? @injection.language "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#not-match? @injection.language "\\b[gG][rR][aA][pP][hH][qQ][lL]\\b|\\b[gG][qQ][lL]\\b")
  (#not-match? @injection.language "\\b[sS][qQ][lL]\\b"))

((call_expression
  function: (call_expression . (_) @_tag)
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#match? @_tag "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#set! injection.language "css"))

((call_expression
  function: (call_expression . (_) @_tag)
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#not-match? @_tag "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#match? @_tag "\\b[gG][rR][aA][pP][hH][qQ][lL]\\b|\\b[gG][qQ][lL]\\b")
  (#set! injection.language "graphql"))

((call_expression
  function: (call_expression . (_) @_tag)
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#not-match? @_tag "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#not-match? @_tag "\\b[gG][rR][aA][pP][hH][qQ][lL]\\b|\\b[gG][qQ][lL]\\b")
  (#match? @_tag "\\b[sS][qQ][lL]\\b")
  (#set! injection.language "sql"))

((call_expression
  function: (call_expression . (_) @injection.language)
  arguments: (template_string (string_fragment) @injection.content)) @injection.owner
  (#not-match? @injection.language "\\b[sS][tT][yY][lL][eE][dD]\\b|\\b[cC][sS][sS]\\b")
  (#not-match? @injection.language "\\b[gG][rR][aA][pP][hH][qQ][lL]\\b|\\b[gG][qQ][lL]\\b")
  (#not-match? @injection.language "\\b[sS][qQ][lL]\\b"))

((assignment_expression
  left: (member_expression property: (_) @_property)
  right: (template_string (string_fragment) @injection.content)) @injection.owner
  (#eq? @_property "innerHTML")
  (#set! injection.language "html"))

((comment) @injection.owner @injection.content
  (#match? @injection.content "^/\\*\\*")
  (#set! injection.language "jsdoc")
  (#set! injection.language-scope "none")
  (#set! injection.cover-shallower-scopes))

((comment) @injection.owner @injection.content
  (#not-match? @injection.owner "^/\\*\\*")
  (#set! injection.language "hyperlink")
  (#set! injection.language-scope "none")
  (#set! injection.include-children))
((string_fragment) @injection.owner @injection.content
  (#set! injection.language "hyperlink")
  (#set! injection.language-scope "none"))

((comment) @injection.owner @injection.content
  (#not-match? @injection.owner "^/\\*\\*")
  (#set! injection.language "todo")
  (#set! injection.language-scope "none")
  (#set! injection.include-children))
