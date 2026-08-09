export const VISUAL_ROUTES = {
  home: "/",
  all: "/all/",
  podcastIndex: "/podcast/",
  videoDetail: "/video/clarity-2018-recap/",
  podcastDetail: "/podcast/26-dominic-nguyen-storybook-and-chromatic/",
  showDetail: "/show/design-systems-podcast/",
  // Real content chosen specifically because it exercises the multi-word,
  // multi-speaker metadata layout (MetaItem.astro's speakers-container
  // wrap behavior, and Hero.astro's speaker-list comma spacing) - see the
  // fix for the mobile comma/wrapping regression these routes now guard.
  videoDetailMultiSpeaker: "/video/qanda-session-design-systems-london-14/",
  showDetailMultiSpeaker: "/show/design-system-office-hours/",
  tagDetail: "/tags/design-systems/",
  speakerDetail: "/speakers/jina-anne/",
  playlistDetail: "/playlists/ai-and-design-systems-starter/",
  // Taxonomy facets (ADR 0012/0013/0014): /series/ has a genuinely
  // distinct index layout (curated card grid). /tools/ and /systems/
  // share the same A-Z/LabelCount template /tags/ also uses, so /tags/
  // stands in for all three here. Detail pages for series/topics/tools/
  // systems share one template too (see [...slug].astro in each dir -
  // identical body markup, differing only in which taxonomy key they
  // query) - topicsDetail covers it.
  seriesIndex: "/series/",
  tagsIndex: "/tags/",
  topicsDetail: "/topics/accessibility/",
  // Phase 6a: a deterministic, hard-coded-props route for VideoCard/
  // PodcastCard/ShowCard - see docs/adr/0007-visual-fixture-route.md.
  // Unlike every other route above, this one has no dependency on live
  // content, so it can't drift as new videos/podcasts get published.
  cardFixtures: "/dev/visual-fixtures/",
  // Same reasoning, but for TopicCloud.astro: /topics/'s pill sizes are
  // computed from percentiles over the live count distribution, so
  // testing the real page means the baseline needs re-capturing on
  // almost every content batch. Fixed counts here hit every size tier
  // (xs/sm/md/lg/xl) deterministically - see topic-cloud-fixture.astro.
  topicCloudFixture: "/dev/topic-cloud-fixture/",
} as const;
