import { KeyImplementation, KeyManifest, Revision } from 'tweek-client';

export type KeyData = {
  manifest: KeyManifest;
  implementation: KeyImplementation;
};

export type SelectedKey = {
  local: KeyData;
  remote: KeyData;
  revisionHistory?: Revision[];
  key: string;
  isLoaded: boolean;
  validation: {
    isValid: boolean;
    key?: Validation;
    manifest?: {
      valueType?: Validation;
    };
  };
  detailsAdded: boolean;
  usedBy?: string[];
  aliases?: string[];
};

export type Validation = {
  isValid: boolean;
  hint?: string;
  isShowingHint?: boolean;
};

export type StoreState = {
  selectedKey?: SelectedKey;
  tags: Record<string, string>;
};
