# Lint memory budget — 2026-11-25

The existing 560KB `app/page.tsx` exhausts the default Node heap and a 4GB
heap during ESLint rule execution. Parsing and scope analysis complete in
approximately 1.2 seconds. An isolated diagnostic run identified the expensive
path as the compiler-backed analysis in `eslint-plugin-react-hooks` 7.1.1.
Legacy hooks rules and the remaining rules complete at 1GB when that analysis
is bypassed in a temporary diagnostic process. No bypass is applied to the
project configuration.

The same file completes with **all configured rules enabled** at a 6GB heap.
The full repository run at 6GB also completes analysis and reports actionable
lint findings instead of crashing. `npm run lint` therefore supplies an explicit
6GB maximum heap to ESLint, portably through Node rather than shell environment
syntax. All rule configuration and file coverage remain unchanged.

This is a maximum heap, not a reserved allocation. Run lint separately from
other memory-intensive build jobs on constrained workers. A future extraction
of the large home component should reduce analysis costs, but is a separate
behavior-preserving refactor requiring its own review.
