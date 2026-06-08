// ABOUTME: Landing page for The AI Field Guide
// ABOUTME: Topic grid with cards linking to each subject area
import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const topics = [
  {
    title: 'Model Context Protocol (MCP)',
    description: 'How AI agents connect to tools and data. From the basics to enterprise-grade deployment.',
    href: '/ai-field-guide/docs/mcp',
    level: 'Beginner → Mastery',
    modules: 10,
  },
];

const ComingSoon = [
  'Prompt Engineering',
  'AI Agents & Orchestration',
  'RAG & Retrieval',
  'AI Security',
  'Model Selection & Cost',
];

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="The AI Field Guide"
      description="Practical AI concepts — free, open, and built for practitioners.">
      <header style={{
        padding: '4rem 0 3rem',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a35 100%)',
        borderBottom: '1px solid rgba(129, 140, 248, 0.2)',
      }}>
        <div className="container">
          <Heading as="h1" style={{fontSize: '3rem', marginBottom: '1rem'}}>
            The AI Field Guide
          </Heading>
          <p style={{fontSize: '1.25rem', opacity: 0.8, maxWidth: '600px', margin: '0 auto 2rem'}}>
            {siteConfig.tagline}
          </p>
          <Link
            className="button button--primary button--lg"
            to="/docs/mcp">
            Start with MCP →
          </Link>
        </div>
      </header>

      <main className="container" style={{padding: '3rem 1rem'}}>
        <Heading as="h2">Topics</Heading>
        <p style={{opacity: 0.7}}>Each topic is a self-contained learning path. Start anywhere.</p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginTop: '2rem',
          marginBottom: '3rem',
        }}>
          {topics.map((topic) => (
            <Link key={topic.title} to={topic.href} style={{textDecoration: 'none'}}>
              <div style={{
                border: '1px solid rgba(129, 140, 248, 0.3)',
                borderRadius: '12px',
                padding: '1.75rem',
                height: '100%',
                transition: 'border-color 0.2s, transform 0.2s',
                background: 'rgba(129, 140, 248, 0.05)',
              }}>
                <Heading as="h3" style={{color: 'var(--ifm-color-primary)', marginTop: 0}}>
                  {topic.title}
                </Heading>
                <p style={{opacity: 0.8, marginBottom: '1rem'}}>{topic.description}</p>
                <div style={{fontSize: '0.85rem', opacity: 0.6}}>
                  {topic.modules} modules · {topic.level}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <Heading as="h2">Coming Soon</Heading>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginTop: '1rem',
        }}>
          {ComingSoon.map((topic) => (
            <span key={topic} style={{
              border: '1px solid rgba(129, 140, 248, 0.2)',
              borderRadius: '20px',
              padding: '0.4rem 1rem',
              fontSize: '0.9rem',
              opacity: 0.6,
            }}>
              {topic}
            </span>
          ))}
        </div>
      </main>
    </Layout>
  );
}
