# Component Library Pitfalls — claw-agent

## @base-ui/react

### Button (`@base-ui/react/button`)
- **Default type is "button"**, not "submit"
- Must explicitly pass `type="submit"` for form submission buttons
- The shadcn wrapper at `packages/web/src/components/ui/button.tsx` does NOT override this default
- This is different from plain HTML `<button>` which also defaults to "submit" inside forms in some browsers

### Tooltip (`@base-ui/react/tooltip`)
- `TooltipTrigger` does NOT support `asChild` prop (unlike Radix)
- Renders its own element — cannot wrap a `<Button>` with `asChild`
- Workaround: Apply click handlers and styling directly on `<TooltipTrigger>`

## General Rules
1. **Never assume HTML-standard behavior from component library primitives** — always read the actual component source
2. **When reviewing forms**: trace the submit flow from button → form onSubmit → handler. If any link is broken, the form is dead.
3. **When reviewing tooltips/popovers**: check if the library supports composition patterns (asChild, Slot) before using them
