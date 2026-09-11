# UI primitives

The smallest reusable pieces: buttons, links, fields, marks, dividers.

- No layout knowledge (no margins that assume a parent).
- No content.
- Every visual value comes from a token.
- Interactive elements are real `<button>` / `<a>` elements, always.

Empty until the design pass defines the primitives worth having. Resist adding a
`<Card>` before there is a second thing that needs it.
