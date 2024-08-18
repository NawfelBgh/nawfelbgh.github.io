import type { CollectionEntry } from 'astro:content';
import type { Alternate, Lang } from '../types';

export function getThumbnailUrl(post: CollectionEntry<'blog'>): string {
    return `/thumbnails/${post.id}.svg`;
}

type BlogKey = 'title' | 'description';

export function getProperty(
    post: CollectionEntry<'blog'>,
    key: BlogKey,
    lang: Lang
): string {
    if (lang !== 'en' && post.data?.i18n?.[lang]?.[key]) {
        return post.data.i18n[lang][key];
    }
    return post.data[key];
}

export function getUrl(post: CollectionEntry<'blog'>, lang: Lang): string {
    if (post.data.link) {
        return post.data.link;
    }
    if (lang === 'en') {
        return `/blog/${post.id}`;
    }
    return `/${lang}/blog/${post.id}`;
}

export function getAlternates(
    post: CollectionEntry<'blog'>,
    currentLang: Lang
): Alternate[] {
    const alternates: Alternate[] = [];
    for (const lang of ['en', ...Object.keys(post.data.i18n || {})]) {
        if (lang !== currentLang) {
            alternates.push({
                hreflang: lang,
                href: getUrl(post, lang as Lang),
                title: getProperty(post, 'title', lang as Lang),
            });
        }
    }
    return alternates;
}
