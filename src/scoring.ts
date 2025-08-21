import { ClipTaggerResult } from './types';

const KEYWORDS: Array<{ word: string; weight: number }> = [
  // Fashion & Style
  { word: 'tote bag', weight: 4 },
  { word: 'tote-bag', weight: 4 },
  { word: 'tote', weight: 1 },
  { word: 'canvas tote', weight: 3 },
  { word: 'graphic tee', weight: 2 },
  { word: 'ironic t-shirt', weight: 2 },
  { word: 'oversized shirt', weight: 2 },
  { word: 'oversized flannel', weight: 3 },
  { word: 'denim jacket', weight: 2 },
  { word: 'baggy pants', weight: 2 },
  { word: 'cargo pants', weight: 3 },
  { word: 'workwear pants', weight: 2 },
  { word: 'cuffed jeans', weight: 2 },
  { word: 'long shorts', weight: 2 },
  { word: 'mesh shorts', weight: 2 },
  { word: 'beanie', weight: 2 },
  { word: 'baseball cap', weight: 2 },
  { word: 'mustache', weight: 3 },
  { word: 'moustache', weight: 3 },
  { word: 'painted nails', weight: 3 },
  { word: 'thrift', weight: 2 },
  { word: 'eyeliner', weight: 2 },
  { word: 'eye shadow', weight: 2 },
  { word: 'lipstick', weight: 2 },
  { word: 'curly hair', weight: 2 },
  { word: 'tattoo', weight: 2 },
  { word: 'balaclava', weight: 3 },
  { word: 'cigarette', weight: 2 },

  // Footwear
  { word: 'birkenstock', weight: 3 },
  { word: 'crocs', weight: 2 },
  { word: 'loafers', weight: 3 },
  { word: 'retro sneakers', weight: 2 },
  { word: 'new balance', weight: 3 },

  // Brands
  { word: 'nike', weight: 2 },
  { word: 'lululemon', weight: 2 },
  { word: "arc'teryx", weight: 3 },
  { word: "trader joe's", weight: 2 },
  { word: 'erewhon', weight: 3 },

  // Accessories
  { word: 'carabiner', weight: 2 },
  { word: 'silver ring', weight: 2 },
  { word: 'chain necklace', weight: 2 },
  { word: 'fanny pack', weight: 2 },
  { word: 'apple watch', weight: 2 },
  { word: 'plushie', weight: 2 },
  { word: 'labubu', weight: 5 },
  { word: 'ring', weight: 1 },
  { word: 'bracelet', weight: 1 },
  { word: 'lanyard', weight: 1 },

  // Tech & Gadgets
  { word: 'wired headphones', weight: 3 },
  { word: 'wired earbuds', weight: 3 },
  { word: 'mp3 player', weight: 2 },
  { word: 'cable', weight: 2 },
  { word: 'usb-c cable', weight: 2 },
  { word: 'earbuds', weight: 2 },
  { word: 'earphones', weight: 2 },
  { word: 'earpiece', weight: 2 },
  { word: 'airpod', weight: 3 },
  { word: 'flip phone', weight: 2 },
  { word: 'film camera', weight: 3 },
  { word: 'disposable camera', weight: 3 },
  { word: 'polaroid', weight: 2 },
  { word: 'lav mic', weight: 3 },

  // Food & Drink
  { word: 'iced coffee', weight: 3 },
  { word: 'cold brew', weight: 3 },
  { word: 'iced matcha', weight: 4 },
  { word: 'matcha latte', weight: 4 },
  { word: 'matcha', weight: 1 },
  { word: 'stanley cup', weight: 3 },
  { word: 'stanley tumbler', weight: 3 },
  { word: 'erewhon smoothie', weight: 4 },
  { word: 'kombucha', weight: 2 },
  { word: 'single-origin coffee', weight: 3 },
  { word: 'avocado toast', weight: 2 },
  { word: 'sourdough', weight: 3 },
  { word: 'baguette', weight: 2 },

  // Hobbies & Props
  { word: 'vinyl', weight: 3 },
  { word: 'picnic blanket', weight: 2 },
  { word: 'selfie', weight: 3 },
  { word: 'mirror selfie', weight: 3 },
  { word: 'vape', weight: 2 },
  { word: 'tampon', weight: 4 },
  { word: 'teacup pig', weight: 7 },

  // Intellectual Props (Books/Authors/Music)
  { word: 'bell hooks', weight: 3 },
  { word: 'joan didion', weight: 3 },
  { word: 'patti smith', weight: 3 },
  { word: 'sylvia plath', weight: 3 },
  { word: 'phoebe bridgers', weight: 2 },
  { word: 'clairo', weight: 2 },
  { word: 'mitski', weight: 2 },
  { word: 'laufey', weight: 2 },
  { word: 'lana del rey', weight: 2 },
  { word: 'booktok', weight: 2 },
  { word: 'book', weight: 3 },
  { word: 'feminist literature', weight: 3 },
];

export function computeScore(result: ClipTaggerResult): { score: number; matched: string[] } {
  const haystacks: string[] = [];
  haystacks.push(result.description);
  haystacks.push(result.environment);
  haystacks.push(result.summary);
  haystacks.push(...(result.objects || []));
  haystacks.push(...(result.actions || []));
  haystacks.push(...(result.logos || []));

  const joined = haystacks.join(' ').toLowerCase();

  const found = new Map<string, number>();
  for (const { word, weight } of KEYWORDS) {
    if (joined.includes(word)) {
      // consolidate variants
      const key = word;
      found.set(key, weight);
    }
  }

  // score normalization: sum weights, cap and scale 0..10
  const raw = Array.from(found.values()).reduce((a, b) => a + b, 0);
  const maxRaw = 12; // tuneable cap
  const normalized = Math.min(raw, maxRaw) / maxRaw;
  const score = Math.round(normalized * 10);
  return { score, matched: Array.from(found.keys()) };
}

