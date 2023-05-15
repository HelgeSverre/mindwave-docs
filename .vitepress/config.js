import {defineConfig} from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "Mindwave Documentation",
    description: "Mindwave",
    appearance: false,
    themeConfig: {
        logo: '/art/logo.svg',
        siteTitle: false,

        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {text: 'Home', link: '/'},
            {text: 'Examples', link: '/markdown-examples'}
        ],

        sidebar: [
            {
                text: 'Introduction',
                items: [
                    {text: 'What is Mindwave', link: '/readme'},
                    {
                        text: 'Concepts', link: '/concepts', items: [
                            {text: 'LLMs', link: '/concepts/llm'},
                            {text: 'Embeddings', link: '/concepts/embeddings'},
                            {text: 'Brains', link: '/concepts/brains'},
                            {text: 'Knowledge', link: '/concepts/knowledge'},
                            {text: 'Agents', link: '/concepts/agents'},
                            {text: 'Tools', link: '/concepts/tools'},
                            {text: 'Chat History', link: '/concepts/history'},
                        ]
                    },
                ]
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
                ]
            },
            {
                text: 'Cookbook',
                items: [
                    {text: 'Q&A Chatbot for a PDF', link: '/cookbook/chatbot-pdf'},
                    {text: 'Q&A Chatbot for a website', link: '/cookbook/chatbot-website'},
                    {text: 'Semantic search for Gmail', link: '/cookbook/searching-gmail'},
                    {
                        text: 'Building a meeting scheduling assistant', link: '/scheduling-assistant', items: [
                            {
                                text: 'Integrating Google Calendar',
                                link: '/scheduling-assistant/google-calendar'
                            },
                            {
                                text: 'Integrating GMail',
                                link: '/scheduling-assistant/gmail'
                            },
                        ]
                    },
                    {text: 'Slack Chatbot', link: '/cookbook/slack-chatbot'},
                    {text: 'Using Mindwave with Livewire', link: '/cookbook/integrating-livewire'},
                    {text: 'Using Laravel Echo for Streaming Responses', link: '/cookbook/integrating-laravel-echo'},
                ]
            },

        ],

        socialLinks: [
            {icon: 'github', link: 'https://github.com/helgesverre/mindwave'},
            {icon: 'twitter', link: 'https://twitter.com/helgesverre'},
        ]
    }
})
