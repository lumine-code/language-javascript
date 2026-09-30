; Symbol navigation uses names and definitions, not documentation captures.
; Keep declarations independent of preceding sibling comments.
(method_definition
  name: (property_identifier) @name
  (#set! symbol.contextNode "parent.parent.parent.firstNamedChild")) @definition.method

(class_declaration
  name: (_) @name) @definition.class

(class
  name: (_) @name) @definition.class

[
  (function_expression
    name: (identifier) @name)
  (function_declaration
    name: (identifier) @name)
  (generator_function
    name: (identifier) @name)
  (generator_function_declaration
    name: (identifier) @name)
] @definition.function

(lexical_declaration
  (variable_declarator
    name: (identifier) @name
    value: [(arrow_function) (function_expression)]) @definition.function)

(variable_declaration
  (variable_declarator
    name: (identifier) @name
    value: [(arrow_function) (function_expression)]) @definition.function)

(assignment_expression
  left: [
    (identifier) @name
    (member_expression
      property: (property_identifier) @name)
  ]
  right: [(arrow_function) (function_expression)]
) @definition.function

(pair
  key: (property_identifier) @name
  value: [(arrow_function) (function_expression)]) @definition.function

(
  (call_expression
    function: (identifier) @name) @reference.call
  (#not-match? @name "^(require)$")
)

(call_expression
  function: (member_expression
    property: (property_identifier) @name)
  arguments: (_)) @reference.call

(new_expression
  constructor: (_) @name) @reference.class

(export_statement value: (assignment_expression left: (identifier) @name right: ([
 (number)
 (string)
 (identifier)
 (undefined)
 (null)
 (new_expression)
 (binary_expression)
 (call_expression)
]))) @definition.constant


; JASMINE describe/it blocks
; ==========================

(call_expression
  function: (identifier) @_fn
  arguments: (arguments
    (string
      (string_fragment) @name))
      (#match? @_fn "^(f+describe|f+it)$")
      (#set! symbol.prepend "Focused: "))

(call_expression
  function: (identifier) @_fn
  arguments: (arguments
    (string
      (string_fragment) @name))
      (#match? @_fn "^(describe|it)$"))
