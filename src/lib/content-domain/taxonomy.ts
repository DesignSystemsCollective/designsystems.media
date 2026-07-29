// Single source of truth for the three closed taxonomies proposed in
// ADR 0012 (SERIES / TOPICS / TOOLS, replacing the old freeform `tags`
// field). content.config.ts imports these arrays to build the Zod
// enums that gate what can land in content frontmatter; a future sync
// script (see ADR 0012's Maintenance section) should generate
// frontmatter.json's `customTaxonomy` entries from this same source so
// the Front Matter CMS picker and the schema validator never drift
// apart.
//
// These starter lists are the ADR's proposed values, not yet an
// editorial-approved final cut (see ADR 0012's Open questions). Adding
// a new term here is a deliberate PR, not something content authors
// should be able to do by free-typing a value into a field.
//
// "Failure & Lessons Learned" was added post-migration: ADR 0012's own
// merge table names it (Failure/Fail/Fails -> Failure & Lessons
// Learned) but it was missing from the ADR's ~50-term starter list
// enumeration - the migration script flagged the resulting orphaned
// "Failure" tag as unmapped rather than guessing, which is what
// surfaced the gap.
//
// "Web Components" and "CSS" were added after running the migration
// on the full corpus (686 block-list-format entries the first pass
// had silently skipped): both showed up as recurring unmapped tags
// (3 entries each) that were clearly topic-shaped and just missing
// from the starter list, not one-off noise.
//
// "Challenges" was added as its own topic rather than folded into
// "Failure & Lessons Learned": checking the 8 entries tagged with it
// showed a mixed bag - some are genuinely about failure (Broken
// Promises, The Ugly Truth), but others are about succeeding despite
// friction (Secrets to a Successful Design System, Managing design
// systems in the open) or making a business case. Merging all of them
// into a failure-specific topic would have misrepresented the ones
// that aren't about failure at all - "Challenges" as its own broader
// topic (general friction/pitfalls, not necessarily failure) is the
// more honest fit.
//
// SYSTEMS (ADR 0014) is a fourth taxonomy, added later than the
// original three: named design-system *products* (Skapa, Spectrum,
// Encore...), not companies. ADR 0012 originally recommended against
// a company taxonomy (open-ended, mostly one-off tag mentions) - this
// is a narrower, deliberate reversal of that specific call once title
// research showed a real recurring pattern of entries that are
// actually about a specific named system, not just mentioning a
// company. See ADR 0014 for the full reasoning.

export const SERIES = [
  "Design Systems London",
  "Converge",
  "Design Systems WTF",
  "Coding Design Systems",
  "Into Design Systems",
  "Design System Social Club",
  "Beyond The Button",
  "The Future Of Design Systems",
  "Design Systems Field Guide",
  "UnConference",
  "DSW Day",
  "The Product Shipping Forecast",
  "Design Systems Rodeo",
  "Axe-Con",
  "DesignOps Island Discs",
  "Clarity",
  // The show already exists as a proper podcast (src/content/show/
  // back-to-school-with-amy-hupe-and-geri-reid, 6 episodes correctly
  // linked via showSlug). Two of those episodes were also uploaded as
  // standalone YouTube videos (media collection, no showSlug), and
  // picked up inconsistent freeform tags ("Back To School With Amy
  // And Geri" / "back to school with amy hupe & geri reid") instead of
  // a real series link. Canonical name matches the show's own title.
  "Back to School with Amy Hupe and Geri Reid",
] as const;

export const TOPICS = [
  "Clarity",
  "Design Tokens",
  "Accessibility",
  "Documentation",
  "AI",
  "Collaboration",
  "Adoption",
  "Governance",
  "Atomic Design",
  "Consistency",
  "Contribution",
  "Inclusivity",
  "Automation",
  "Best Practices",
  "Career",
  "Theming",
  "Content",
  "Component Libraries",
  "Creativity",
  "Flexibility",
  "Measurement",
  "Workflow",
  "Culture",
  "Color",
  "Principles",
  "Buy-In",
  "Strategy",
  "ROI",
  "Patterns",
  "Communication",
  "Community",
  "Failure & Lessons Learned",
  "Process",
  "Analytics",
  "Burnout",
  "Soft Skills",
  "Typography",
  "Management",
  "Maintenance",
  "Metrics",
  "Cross-functional",
  "Versioning",
  "Impact",
  "Leadership",
  "Performance",
  "Foundations",
  "Scale",
  "DesignOps",
  "Maturity",
  "Change Management",
  "Naming Conventions",
  "User Research",
  "Quality",
  "Advocacy",
  "Diversity",
  "Brand",
  "Developer Experience",
  "Web Components",
  "CSS",
  "Challenges",
] as const;

export const TOOLS = [
  "Figma",
  "Supernova",
  "Zeroheight",
  "Sketch",
  "Figma Tokens",
  "Tokens Studio",
  "Specify",
  "Figma Plugin",
  "Figma Variables",
  "Storybook",
  "Backlight",
  "Leonardo",
  "Omlet",
] as const;

// Named design-system products, not companies (ADR 0014). Where a
// company's system doesn't have its own distinct brand name, the
// company name doubles as the value (Atlassian Design System,
// Airbnb Design System, GOV.UK Design System, WhatsApp).
export const SYSTEMS = [
  "Skapa",
  "Spectrum",
  "Encore",
  "Base",
  "Lightning Design System",
  "Primer",
  "Fluent UI",
  "Carbon",
  "Canvas",
  "Human Interface Guidelines",
  "Atlassian Design System",
  "GOV.UK Design System",
  "Airbnb Design System",
  "WhatsApp",
  "Polaris",
] as const;

export type Series = (typeof SERIES)[number];
export type Topic = (typeof TOPICS)[number];
export type Tool = (typeof TOOLS)[number];
export type System = (typeof SYSTEMS)[number];
