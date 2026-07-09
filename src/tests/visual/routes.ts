export const VISUAL_ROUTES = {
  home: "/",
  all: "/all/",
  podcastIndex: "/podcast/",
  videoDetail: "/video/clarity-2018-recap/",
  podcastDetail: "/podcast/26-dominic-nguyen-storybook-and-chromatic/",
  showDetail: "/show/design-systems-podcast/",
  tagDetail: "/tags/design-tokens/",
  speakerDetail: "/speakers/jina-anne/",
  playlistDetail: "/playlists/ai-and-design-systems-starter/",
  // Phase 6a: a deterministic, hard-coded-props route for VideoCard/
  // PodcastCard/ShowCard - see docs/adr/0007-visual-fixture-route.md.
  // Unlike every other route above, this one has no dependency on live
  // content, so it can't drift as new videos/podcasts get published.
  cardFixtures: "/dev/visual-fixtures/",
} as const;
