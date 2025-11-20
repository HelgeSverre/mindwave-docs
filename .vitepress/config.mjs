import {defineConfig} from 'vitepress';

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'Mindwave',
    description: 'Production-Ready AI Foundation for Laravel Applications - Build scalable, observable AI applications with Laravel',
    appearance: true,
    ignoreDeadLinks: [
        // Ignore localhost URLs
        /^https?:\/\/localhost/,
    ],
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
            {text: 'Guide', link: '/docs/installation'},
            {text: 'Reference', link: '/docs/configuration'},
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
                text: 'Getting Started',
                items: [
                    { text: 'Installation', link: '/docs/installation' },
                    { text: 'Configuration', link: '/docs/configuration' },
                    { text: 'Upgrade Guide', link: '/docs/upgrade-guide' }
                ]
            },
            {
                text: 'Core Features',
                items: [
                    { text: 'Prompt Composer', link: '/docs/core/prompt-composer' },
                    { text: 'Streaming Responses', link: '/docs/core/streaming' },
                    { text: 'Context Discovery', link: '/docs/core/context-discovery' },
                    { text: 'LLM Integration', link: '/docs/core/llm' }
                ]
            },
            {
                text: 'Observability',
                items: [
                    { text: 'OpenTelemetry Tracing', link: '/docs/observability/tracing' },
                    { text: 'Cost Tracking', link: '/docs/observability/cost-tracking' },
                    { text: 'Querying Traces', link: '/docs/observability/querying' },
                    { text: 'OTLP Integration', link: '/docs/observability/otlp' },
                    { text: 'Events', link: '/docs/observability/events' }
                ]
            },
            {
                text: 'RAG & Context',
                items: [
                    { text: 'Overview', link: '/docs/rag/overview' },
                    { text: 'Brain', link: '/docs/rag/brain' },
                    { text: 'Context Pipeline', link: '/docs/rag/context-pipeline' },
                    { text: 'Documents', link: '/docs/rag/documents' },
                    { text: 'Embeddings', link: '/docs/rag/embeddings' },
                    { text: 'TNTSearch', link: '/docs/rag/tntsearch' },
                    { text: 'TNTSearch Source', link: '/docs/rag/tntsearch-source' },
                    { text: 'Vector Stores', link: '/docs/rag/vectorstores' },
                    { text: 'Vector Store Source', link: '/docs/rag/vector-store-source' },
                    { text: 'Custom Sources', link: '/docs/rag/custom-sources' },
                    { text: 'Evaluation', link: '/docs/rag/evaluation' }
                ]
            },
            {
                text: 'Providers',
                items: [
                    { text: 'OpenAI', link: '/docs/providers/openai' },
                    { text: 'Mistral AI', link: '/docs/providers/mistral' }
                ]
            },
            {
                text: 'Advanced',
                items: [
                    { text: 'Tools', link: '/docs/advanced/tools' },
                    { text: 'Output Parsers', link: '/docs/advanced/output-parsers' },
                    { text: 'Prompt Templates', link: '/docs/advanced/prompt-templates' }
                ]
            },
            {
                text: 'Cookbook',
                items: [
                    { text: 'Customer Support Bot', link: '/docs/cookbook/support-bot' },
                    { text: 'Document Q&A', link: '/docs/cookbook/document-qa' },
                    { text: 'Streaming Chat UI', link: '/docs/cookbook/streaming-chat' },
                    { text: 'Cost-Aware Application', link: '/docs/cookbook/cost-tracking' },
                    { text: 'Multi-Source Context', link: '/docs/cookbook/multi-source' },
                    { text: 'Livewire Integration', link: '/docs/cookbook/livewire' }
                ]
            },
            {
                text: 'Reference',
                items: [
                    { text: 'Artisan Commands', link: '/docs/reference/commands' },
                    { text: 'Model Token Limits', link: '/docs/reference/models' }
                ]
            },
            {
                text: 'Guides',
                items: [
                    { text: 'Troubleshooting', link: '/docs/troubleshooting' },
                    { text: 'Production Deployment', link: '/docs/production' }
                ]
            }
        ],

        socialLinks: [
            {icon: 'github', link: 'https://github.com/helgesverre/mindwave'},
            {icon: 'twitter', link: 'https://twitter.com/helgesverre'},
        ],
    },
});
