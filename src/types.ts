export type ClipTaggerResult = {
  description: string;
  objects: string[];
  actions: string[];
  environment: string;
  content_type: string;
  specific_style: string;
  production_quality: string;
  summary: string;
  logos: string[];
};

export type SubmitPayload = {
  imageDataUrl: string;
  result: ClipTaggerResult;
  socialUrl?: string | null;
  podiumOptIn?: boolean;
  socialPlatform?: 'twitter' | 'instagram' | 'tiktok';
  socialHandle?: string;
};

export type SubmitResponse = {
  success: true;
  id: number;
  score: number;
  matchedKeywords: string[];
  createdAt: string;
  socialPlatform?: 'twitter' | 'instagram' | 'tiktok' | null;
  socialUrl?: string | null;
  podiumOptIn?: boolean;
};

