export interface PagefindAttributes {
  'data-pagefind-body'?: boolean;
  'data-pagefind-sort'?: string;
  'data-pagefind-meta'?: string;
  'data-pagefind-filter'?: string;
  'data-pagefind-weight'?: string | number;
}

export interface FluentIcon {
  name: `fluent:${string}`;
  size?: number;
}

export interface MetaDataItem {
  icon: FluentIcon['name'];
  content: string | number | Date;
  link?: string;
  filter?: string;
  weight?: number;
}
