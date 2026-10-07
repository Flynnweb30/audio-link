import { useEffect } from 'react';
import { MediaItem } from '../types';

interface SeoProps {
  currentTab: 'landing' | 'upload' | 'history' | 'player';
  media?: MediaItem;
}

const BASE_TITLE = 'AudioLink — Direct Media URLs';
const BASE_DESCRIPTION =
  'Turn audio, video, and image files into direct, browser-ready URLs with fast streaming, playback, and sharing.';

function setMeta(name: string, content: string) {
  let node = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!node) {
    node = document.createElement('meta');
    node.name = name;
    document.head.appendChild(node);
  }
  node.content = content;
}

function setProperty(property: string, content: string) {
  let node = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute('property', property);
    document.head.appendChild(node);
  }
  node.content = content;
}

function setCanonical(url: string) {
  let node = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!node) {
    node = document.createElement('link');
    node.rel = 'canonical';
    document.head.appendChild(node);
  }
  node.href = url;
}

export function Seo({ currentTab, media }: SeoProps) {
  useEffect(() => {
    const origin = window.location.origin;
    const isPlayer = currentTab === 'player' && !!media;

    const config = isPlayer
      ? {
          title: `${media!.originalName} — AudioLink`,
          description: `Stream or share ${media!.originalName} with AudioLink's direct media player.`,
          canonical: `${origin}/?view=${encodeURIComponent(media!.id)}`,
          robots: 'noindex, nofollow, noarchive',
          image: media!.mediaType === 'image' ? media!.directUrl : `${origin}/og-image.svg`,
        }
      : currentTab === 'upload'
        ? {
            title: 'Media Studio — AudioLink',
            description: 'Upload audio, video, and image files and generate direct URLs for browser playback and sharing.',
            canonical: `${origin}/`,
            robots: 'noindex, nofollow, noarchive',
            image: `${origin}/og-image.svg`,
          }
        : {
            title: BASE_TITLE,
            description: BASE_DESCRIPTION,
            canonical: `${origin}/`,
            robots: 'index, follow',
            image: `${origin}/og-image.svg`,
          };

    document.title = config.title;
    setMeta('description', config.description);
    setMeta('robots', config.robots);
    setMeta('googlebot', config.robots);
    setProperty('og:title', config.title);
    setProperty('og:description', config.description);
    setProperty('og:type', 'website');
    setProperty('og:url', config.canonical);
    setProperty('og:image', config.image);
    setProperty('og:site_name', 'AudioLink');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', config.title);
    setMeta('twitter:description', config.description);
    setMeta('twitter:image', config.image);
    setCanonical(config.canonical);
  }, [currentTab, media]);

  return null;
}
