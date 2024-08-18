import type { Alternate, Lang } from '../types';
import { LANGUAGES } from './lang';

export const SITE_TITLE = "Nawfel Bengherbia's Blog";
export const SITE_DESCRIPTION = {
    en: 'I share things that I learned or created.',
    fr: "Je partage des choses que j'ai apprises ou fait.",
};

export function getUrl(lang: Lang): string {
    if (lang === 'en') {
        return '/';
    }
    return `/${lang}/`;
}

export function getAlternates(currentLang: Lang): Alternate[] {
    const alternates: Alternate[] = [];
    for (const lang of LANGUAGES) {
        if (lang !== currentLang) {
            alternates.push({
                hreflang: lang,
                href: getUrl(lang),
                title: SITE_TITLE,
            });
        }
    }
    return alternates;
}
