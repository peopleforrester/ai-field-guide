// ABOUTME: Docusaurus config for The AI Field Guide
// ABOUTME: GitHub Pages deployment under peopleforrester/ai-field-guide
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'The AI Field Guide',
  tagline: 'Practical AI concepts — free, open, and built for practitioners.',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://peopleforrester.github.io',
  baseUrl: '/ai-field-guide/',

  organizationName: 'peopleforrester',
  projectName: 'ai-field-guide',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/peopleforrester/ai-field-guide/tree/main/',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/ai-field-guide-social.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
    navbar: {
      title: 'The AI Field Guide',
      logo: {
        alt: 'The AI Field Guide',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'fieldGuideSidebar',
          position: 'left',
          label: 'Topics',
        },
        {
          href: 'https://github.com/peopleforrester/ai-field-guide',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Topics',
          items: [
            {
              label: 'MCP: Model Context Protocol',
              to: '/docs/mcp',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/peopleforrester/ai-field-guide',
            },
          ],
        },
      ],
      copyright: `Free forever. Built by practitioners, for practitioners. ${new Date().getFullYear()}`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'python', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
