import {defineConfig} from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'Mindwave Documentation',
    description: 'Mindwave',
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
            {text: 'Home', link: '/'},
            {text: 'Docs', link: '/readme'},
        ],

        sidebar: [
            {
                text: 'Introduction',
                items: [
                    {text: 'What is Mindwave', link: '/readme'},
                    {
                        text: 'Concepts',
                        link: '/concepts',
                        items: [
                            {text: 'LLMs', link: '/concepts#llms'},
                            {
                                text: 'Embeddings',
                                link: '/concepts#embeddings',
                            },
                            {text: 'Brains', link: '/concepts#brains'},
                            {text: 'Knowledge', link: '/concepts#knowledge'},
                            {text: 'Agents', link: '/concepts#agents'},
                            {text: 'Tools', link: '/concepts#tools'},
                            {text: 'Chat History', link: '/concepts#history'},
                        ],
                    },
                ],
            },
            {
                text: 'Usage Guide',
                items: [
                    {text: 'Installation', link: '/guide/installation'},
                    {text: 'Configuration', link: '/guide/configuration'},
                    {text: 'Brain', link: '/guide/brain'},
                    {text: 'Chat History', link: '/guide/chat-history'},
                    {text: 'Events', link: '/guide/events'},
                    {text: 'Logging', link: '/guide/logging'},
                    {text: 'Debugging', link: '/guide/debugging'},
                ],
            },
            {
                text: 'Cookbook',
                items: [
                    {
                        text: 'Simple command line chatbot',
                        link: '/cookbook/chatbot-cli',
                    },
                    {
                        text: 'Q&A Chatbot for a PDF',
                        link: '/cookbook/chatbot-pdf',
                    },
                    {
                        text: 'Q&A Chatbot for a website',
                        link: '/cookbook/chatbot-website',
                    },
                    {
                        text: 'Building a meeting scheduling assistant',
                        link: '/cookbook/scheduling-assistant',
                        items: [
                            {
                                text: 'Integrating Google Calendar',
                                link: '/cookbook/scheduling-assistant-google-calendar',
                            },
                            {
                                text: 'Integrating GMail',
                                link: '/cookbook/scheduling-assistant-gmail',
                            },
                        ],
                    },
                    {text: 'Slack Chatbot', link: '/cookbook/slack-chatbot'},
                    {
                        text: 'Using Mindwave with Livewire',
                        link: '/cookbook/integrating-livewire',
                    },
                    {
                        text: 'Using Laravel Echo for Streaming Responses',
                        link: '/cookbook/integrating-laravel-echo',
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
