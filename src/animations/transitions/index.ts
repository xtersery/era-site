/**
 * Cinematic section / page transitions.
 *
 * Empty on purpose. Transitions are the single easiest place to ship something
 * that looks expensive but feels slow, so nothing goes here until there is a
 * concept to serve.
 *
 * When it is time, the shape is:
 *   - a `<TransitionCurtain />` in `components/layout`, sitting at `--z-transition`,
 *   - a timeline factory here that the curtain plays,
 *   - a reduced-motion path that cross-fades in `--dur-fast` instead.
 *
 * Rules that already apply:
 *   - a transition never delays first paint,
 *   - a transition never blocks the back button,
 *   - total out+in time stays under ~900 ms; past that it reads as a bug.
 */
export {};
