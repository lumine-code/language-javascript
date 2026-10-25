((description) @injection.owner @injection.content
  (#set! injection.language "hyperlink")
  (#set! injection.language-scope "none"))
((description) @injection.owner @injection.content
  (#set! injection.language "todo")
  (#set! injection.language-scope "none"))

; Malformed documentation remains a real comment even when JSDoc cannot
; produce description nodes (for example, prose containing TeX commands).
((ERROR) @injection.owner @injection.content
  (#match? @injection.owner "^/\\*\\*")
  (#set! injection.language "hyperlink")
  (#set! injection.language-scope "none")
  (#set! injection.include-children))
