import {defineConfig} from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'Mindwave',
    description: 'AI Chatbots, Agents & Document Q&A in Laravel Simplified.',
    appearance: true,
    head: [
        [
            'link',
            {
                rel: 'apple-touch-icon',
                sizes: '180x180',
                href: '/favicon/apple-touch-icon.png',
            },
        ],
        [
            'link',
            {
                rel: 'icon',
                type: 'image/png',
                sizes: '32x32',
                href: '/favicon/favicon-32x32.png',
            },
        ],
        [
            'link',
            {
                rel: 'icon',
                type: 'image/png',
                sizes: '16x16',
                href: '/favicon/favicon-16x16.png',
            },
        ],
        ['link', {rel: 'manifest', href: '/favicon/site.webmanifest'}],
        [
            'link',
            {
                rel: 'mask-icon',
                href: '/favicon/safari-pinned-tab.svg',
                color: '#a66bb5',
            },
        ],
        ['link', {rel: 'shortcut icon', href: '/favicon/favicon.ico'}],
        ['meta', {name: 'msapplication-TileColor', content: '#aa6db8'}],
        [
            'meta',
            {
                name: 'msapplication-config',
                content: '/favicon/browserconfig.xml',
            },
        ],
        ['meta', {name: 'theme-color', content: '#ffffff'}],
    ],

    themeConfig: {
        logo: {
            light: 'art/logo.svg',
            dark: 'art/logo-dark.svg'
        },

        siteTitle: false,

        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {text: 'Home', link: '/docs/'},
            {text: 'Docs', link: '/docs/readme'},
        ],

        sidebar: [
            {
                text: 'Introduction',
                items: [
                    {text: 'What is Mindwave', link: '/docs/readme'},
                    {
                        text: 'Concepts',
                        link: '/docs/concepts',
                        items: [
                            {text: 'LLMs', link: '/docs/concepts#llms'},
                            {
                                text: 'Embeddings',
                                link: '/docs/concepts#embeddings',
                            },
                            {text: 'Brains', link: '/docs/concepts#brains'},
                            {text: 'Knowledge', link: '/docs/concepts#knowledge'},
                            {text: 'Agents', link: '/docs/concepts#agents'},
                            {text: 'Tools', link: '/docs/concepts#tools'},
                            {text: 'Chat History', link: '/docs/concepts#history'},
                        ],
                    },
                ],
            },
            {
                text: 'Usage Guide',
                items: [
                    {text: 'Installation', link: '/docs/guide/installation'},
                    {text: 'Configuration', link: '/docs/guide/configuration'},
                    {text: 'Brain', link: '/docs/guide/brain'},
                    {text: 'Chat History', link: '/docs/guide/chat-history'},
                    {text: 'Events', link: '/docs/guide/events'},
                    {text: 'Logging', link: '/docs/guide/logging'},
                    {text: 'Extending', link: '/docs/guide/extending'},
                    {text: 'Debugging', link: '/docs/guide/debugging'},
                ],
            },
            {
                text: 'Cookbook',
                items: [
                    {
                        text: 'Using Weaviate with Laravel Sail',
                        link: '/docs/cookbook/laravel-sail-weaviate',
                    }, {
                        text: 'Simple command line chatbot',
                        link: '/docs/cookbook/chatbot-cli',
                    },
                    {
                        text: 'Q&A Chatbot for a PDF',
                        link: '/docs/cookbook/chatbot-pdf',
                    },
                    {
                        text: 'Q&A Chatbot for a website',
                        link: '/docs/cookbook/chatbot-website',
                    },
                    {
                        text: 'Building a meeting scheduling assistant',
                        link: '/docs/cookbook/scheduling-assistant',
                        items: [
                            {
                                text: 'Integrating Google Calendar',
                                link: '/docs/cookbook/scheduling-assistant-google-calendar',
                            },
                            {
                                text: 'Integrating GMail',
                                link: '/docs/cookbook/scheduling-assistant-gmail',
                            },
                        ],
                    },
                    {text: 'Slack Chatbot', link: '/docs/cookbook/slack-chatbot'},
                    {
                        text: 'Using Mindwave with Livewire',
                        link: '/docs/cookbook/integrating-livewire',
                    },
                    {
                        text: 'Using Laravel Echo for Streaming Responses',
                        link: '/docs/cookbook/integrating-laravel-echo',
                    },
                ],
            },
        ],

        socialLinks: [
            {icon: 'github', link: 'https://github.com/helgesverre/mindwave'},
            {icon: 'twitter', link: 'https://twitter.com/helgesverre'},
        ],
    },
});
