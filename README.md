# language-javascript

JavaScript language support.

## Features

- **Grammars**: provides Tree-sitter grammars built from [tree-sitter-javascript](https://github.com/tree-sitter/tree-sitter-javascript) and [tree-sitter-jsdoc](https://github.com/tree-sitter/tree-sitter-jsdoc).
- **Syntax highlighting**: full grammar coverage for JavaScript files.
- **Snippets**: shortcuts for common declarations and control structures.
- **Code folding**: collapse blocks, functions, and comments.
- **Comment toggling**: line and block comment support.
- **Configurable indentation**: options for braces, brackets, parentheses, switch alignment, and hanging indents.

## Installation

To install `language-javascript` search for it in the Install pane of the Lumine settings, or run the command `lumine --install lumine-code/language-javascript`.

## Services

- `hyperlink.injection`: consumed to highlight URLs inside code and comments as clickable links.
- `todo.injection`: consumed to highlight `TODO`-style markers inside comments.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub. Any feedback is welcome!
