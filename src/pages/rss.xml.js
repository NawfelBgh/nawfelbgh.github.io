import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../utils/home';
import { getUrl } from '../utils/blog';

export async function GET(context) {
    const posts = await getCollection('blog');
    return rss({
        title: SITE_TITLE,
        description: SITE_DESCRIPTION.en,
        site: context.site,
        items: posts.map((post) => ({
            ...post.data,
            link: getUrl(post, 'en'),
        })),
    });
}
