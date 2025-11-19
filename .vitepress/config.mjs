import {defineConfig} from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'Mindwave',
    description: 'Production-Ready AI Foundation for Laravel Applications - Build scalable, observable AI applications with Laravel',
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

        // Umami Analytics
        [
            "script", {
            "async": "",
            "src": "https://analytics.umami.is/script.js",
            "data-website-id": "2bf76d0a-eb86-4f24-9db4-447b0a374afa",
            "data-domains": "mindwave.no"
        }
        ]
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
            {text: 'Guide', link: '/docs/guide/installation'}, // Points to existing page until what-is-mindwave is created
            {text: 'Reference', link: '/reference/config'},
        ],

        // Search configuration
        search: {
            provider: 'local',
            options: {
                placeholder: 'Search docs...',
            }
        },

        sidebar: [
            {
                text: 'Introduction',
                items: [
                    { text: 'What is Mindwave', link: '/guide/what-is-mindwave' }, // TO CREATE - Phase 1
                    { text: 'Quick Start', link: '/guide/quick-start' }, // TO CREATE - Phase 1
                    { text: 'Installation', link: '/docs/guide/installation' }, // EXISTS
                    { text: 'Configuration', link: '/docs/guide/configuration' }, // EXISTS
                    { text: 'Concepts', link: '/concepts' } // BEING CREATED IN STREAM A2
                ]
            },
            {
                text: 'Core Features',
                items: [
                    { text: 'Prompt Composer', link: '/core/prompt-composer' }, // TO CREATE - Phase 2
                    { text: 'Streaming Responses', link: '/core/streaming' }, // TO CREATE - Phase 2
                    { text: 'Context Discovery', link: '/core/context-discovery' }, // TO CREATE - Phase 2
                    { text: 'LLM Integration', link: '/core/llm' } // TO CREATE - Phase 2
                ]
            },
            {
                text: 'Observability',
                items: [
                    { text: 'OpenTelemetry Tracing', link: '/observability/tracing' }, // TO CREATE - Phase 3
                    { text: 'Cost Tracking', link: '/observability/cost-tracking' }, // TO CREATE - Phase 3
                    { text: 'Querying Traces', link: '/observability/querying' }, // TO CREATE - Phase 3
                    { text: 'OTLP Integration', link: '/observability/otlp' }, // TO CREATE - Phase 3
                    { text: 'Events', link: '/observability/events' } // TO CREATE - Phase 3
                ]
            },
            {
                text: 'RAG & Context',
                items: [
                    { text: 'Overview', link: '/rag/overview' }, // TO CREATE - Phase 6
                    { text: 'TNTSearch', link: '/rag/tntsearch' }, // TO CREATE - Phase 6
                    { text: 'Vector Stores', link: '/rag/vectorstores' }, // TO CREATE - Phase 6
                    { text: 'Brain', link: '/rag/brain' }, // TO CREATE - Phase 6
                    { text: 'Documents', link: '/rag/documents' }, // TO CREATE - Phase 6
                    { text: 'Embeddings', link: '/rag/embeddings' } // TO CREATE - Phase 6
                ]
            },
            {
                text: 'Providers',
                items: [
                    { text: 'OpenAI', link: '/providers/openai' }, // TO CREATE - Phase 5
                    { text: 'Mistral AI', link: '/providers/mistral' } // TO CREATE - Phase 5
                ]
            },
            {
                text: 'Advanced',
                items: [
                    { text: 'Tools', link: '/advanced/tools' }, // TO CREATE - Phase 8
                    { text: 'Output Parsers', link: '/advanced/output-parsers' }, // TO CREATE - Phase 8
                    { text: 'Prompt Templates', link: '/advanced/prompt-templates' } // TO CREATE - Phase 8
                ]
            },
            {
                text: 'Cookbook',
                items: [
                    { text: 'Customer Support Bot', link: '/cookbook/support-bot' }, // TO CREATE - Phase 9
                    { text: 'Document Q&A', link: '/cookbook/document-qa' }, // TO CREATE - Phase 9
                    { text: 'Streaming Chat UI', link: '/cookbook/streaming-chat' }, // TO CREATE - Phase 9
                    { text: 'Cost-Aware Application', link: '/cookbook/cost-tracking' }, // TO CREATE - Phase 9
                    { text: 'Multi-Source Context', link: '/cookbook/multi-source' }, // TO CREATE - Phase 9
                    { text: 'Livewire Integration', link: '/cookbook/livewire' } // TO CREATE - Phase 9
                ]
            },
            {
                text: 'Reference',
                items: [
                    { text: 'Artisan Commands', link: '/reference/commands' }, // TO CREATE - Phase 7
                    { text: 'Configuration', link: '/reference/config' }, // TO CREATE - Phase 4
                    { text: 'Model Token Limits', link: '/reference/models' } // TO CREATE - Phase 7
                ]
            },
            {
                text: 'Guides',
                items: [
                    { text: 'Troubleshooting', link: '/guide/troubleshooting' }, // TO CREATE - Phase 10
                    { text: 'Production Deployment', link: '/guide/production' } // TO CREATE - Phase 10
                ]
            }
        ],

        socialLinks: [
            {icon: 'github', link: 'https://github.com/helgesverre/mindwave'},
            {icon: 'twitter', link: 'https://twitter.com/helgesverre'},
        ],
    },
});
