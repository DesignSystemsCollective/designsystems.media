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
  // Phase 6a: a deterministic, hard-coded-props route for VideoCard/
  // PodcastCard/ShowCard - see docs/adr/0007-visual-fixture-route.md.
  // Unlike every other route above, this one has no dependency on live
  // content, so it can't drift as new videos/podcasts get published.
  cardFixtures: "/dev/visual-fixtures/",
} as const;
