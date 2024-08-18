import type { Alternate, Lang } from '../types';

interface AboutData {
    shortTitle: string;
    title: string;
    description: string;
    url: string;
}

export const ABOUT_DATA: Record<'en' | 'fr', AboutData> = {
    en: {
        shortTitle: 'About',
        title: 'About me',
        description: 'Checkout my Curriculum Vitae and my contact infos!',
        url: '/about',
    },
    fr: {
        shortTitle: 'À propos',
        title: 'À propos de moi',
        description: 'Consultez mon curriculum vitae et mes coordonnées !',
        url: '/fr/a-propo',
    },
} as const;

export const thumbnail = '/photo.webp';

export function getAlternates(currentLang: Lang): Alternate[] {
    const alternates: Alternate[] = [];
    for (const lang of Object.keys(ABOUT_DATA)) {
        if (lang !== currentLang) {
            alternates.push({
                hreflang: lang,
                href: ABOUT_DATA[lang as keyof typeof ABOUT_DATA].url,
                title: ABOUT_DATA[lang as keyof typeof ABOUT_DATA].title,
            });
        }
    }
    return alternates;
}

export function getProperty(key: string, lang: Lang): string {
    return ABOUT_DATA[lang as 'en' | 'fr'][key as keyof AboutData];
}
