import Head from 'next/head';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const FEATURES = [
  {
    icon: '✦',
    title: 'Intelligent Capture',
    desc: 'Store notes, links, insights, and articles with rich metadata. Every thought finds its home.',
    color: 'var(--color-aurora)',
  },
  {
    icon: '◈',
    title: 'AI Summarization',
    desc: 'Gemini AI distills your content into precise summaries. Never lose the essence of what you captured.',
    color: 'var(--color-ember)',
  },
  {
    icon: '⬡',
    title: 'Auto-Tagging',
    desc: 'AI intelligently categorizes your knowledge. Semantic organization without manual effort.',
    color: 'var(--color-neural)',
  },
  {
    icon: '◎',
    title: 'Conversational Query',
    desc: 'Ask your brain anything. Get answers sourced directly from your accumulated knowledge.',
    color: 'var(--color-aurora)',
  },
];

const FLOATING_WORDS = ['Neural', 'Insight', 'Memory', 'Synthesis', 'Pattern', 'Context'];

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, -150]);
  const y2 = useTransform(scrollY, [0, 500], [0, -80]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIdx(i => (i + 1) % FLOATING_WORDS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>Second Brain — AI Knowledge System</title>
      </Head>

      {/* Mesh background */}
      <div className="mesh-bg">
        <div className="mesh-blob" style={{ width: 600, height: 600, background: 'var(--color-neural)', top: '-100px', left: '-200px', animationDelay: '0s' }} />
        <div className="mesh-blob" style={{ width: 500, height: 500, background: 'var(--color-ember)', top: '30%', right: '-150px', animationDelay: '5s' }} />
        <div className="mesh-blob" style={{ width: 400, height: 400, background: 'var(--color-aurora)', bottom: '10%', left: '20%', animationDelay: '10s' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Nav */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            padding: '20px 40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(5,5,8,0.7)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-neural), var(--color-aurora))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
            }}>🧠</div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>
              Second Brain
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/dashboard">
              <button className="btn-primary" style={{ padding: '8px 18px' }}>
                Open Brain →
              </button>
            </Link>
          </div>
        </motion.nav>

        {/* Hero */}
        <section ref={heroRef} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 40px 80px', textAlign: 'center', overflow: 'hidden' }}>
          <motion.div style={{ opacity }} >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{ marginBottom: 24 }}
            >
              <span style={{
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: 999,
                border: '1px solid rgba(78,205,196,0.3)',
                background: 'rgba(78,205,196,0.08)',
                color: 'var(--color-aurora)',
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 500,
              }}>
                ✦ Powered by Gemini AI
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3 }}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(48px, 8vw, 96px)',
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                marginBottom: 12,
              }}
            >
              Your Mind,{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--color-ember), var(--color-neural))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontStyle: 'italic',
              }}>
                Amplified
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.45 }}
              style={{ 
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(28px, 4vw, 48px)',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 32,
                height: '1.2em',
                overflow: 'hidden',
              }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIdx}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -30, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ display: 'block' }}
                >
                  {FLOATING_WORDS[wordIdx]}
                </motion.span>
              </AnimatePresence>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              style={{
                fontSize: 18,
                color: 'var(--color-muted)',
                maxWidth: 560,
                margin: '0 auto 48px',
                lineHeight: 1.7,
              }}
            >
              An AI-powered knowledge system that captures, organizes, and intelligently surfaces your insights. 
              Think less, know more.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}
            >
              <Link href="/dashboard">
                <button className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
                  Enter Your Brain →
                </button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Floating orbs parallax section */}
        <div style={{ position: 'relative', height: 200, overflow: 'hidden', marginBottom: 80 }}>
          <motion.div style={{ y: y1, position: 'absolute', left: '10%', top: 0 }}>
            <div className="orb-pulse" style={{
              width: 12, height: 12, borderRadius: '50%',
              background: 'var(--color-aurora)',
              boxShadow: '0 0 20px var(--color-aurora)',
            }} />
          </motion.div>
          <motion.div style={{ y: y2, position: 'absolute', left: '30%', top: 40 }}>
            <div className="orb-pulse" style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--color-ember)',
              boxShadow: '0 0 16px var(--color-ember)',
              animationDelay: '1s',
            }} />
          </motion.div>
          <motion.div style={{ y: y1, position: 'absolute', right: '20%', top: 20 }}>
            <div className="orb-pulse" style={{
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--color-neural)',
              boxShadow: '0 0 24px var(--color-neural)',
              animationDelay: '2s',
            }} />
          </motion.div>

          {/* Connecting lines */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.15 }}>
            <line x1="10%" y1="50%" x2="30%" y2="60%" stroke="var(--color-aurora)" strokeWidth="1" strokeDasharray="4,4" />
            <line x1="30%" y1="60%" x2="80%" y2="40%" stroke="var(--color-ember)" strokeWidth="1" strokeDasharray="4,4" />
          </svg>
        </div>

        {/* Features grid */}
        <section style={{ padding: '0 40px 120px', maxWidth: 1100, margin: '0 auto' }}>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 4vw, 52px)',
              textAlign: 'center',
              marginBottom: 64,
              fontWeight: 700,
            }}
          >
            Intelligence at every layer
          </motion.h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="glass glass-hover"
                style={{ padding: 28, borderRadius: 20 }}
              >
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `${f.color}15`,
                  border: `1px solid ${f.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: f.color,
                  marginBottom: 16,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 10, fontWeight: 700 }}>
                  {f.title}
                </h3>
                <p style={{ color: 'var(--color-muted)', fontSize: 14, lineHeight: 1.7 }}>
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* API showcase */}
        <section style={{ padding: '80px 40px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}
            >
              <div>
                <span style={{ color: 'var(--color-ember)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Public API</span>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, marginTop: 12, marginBottom: 20 }}>
                  Your brain is an API
                </h2>
                <p style={{ color: 'var(--color-muted)', lineHeight: 1.8, marginBottom: 20 }}>
                  Query your entire knowledge base from anywhere. Perfect for integrations and automation.
                </p>
              </div>
              <div className="glass" style={{ borderRadius: 16, padding: 24, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                <div style={{ color: 'var(--color-muted)', marginBottom: 8 }}>// Query your brain</div>
                <div style={{ color: 'var(--color-aurora)' }}>GET</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4, wordBreak: 'break-all' }}>
                  /api/public/brain/query
                  <br />?q=what+do+I+know+about+AI
                </div>
                <div style={{ marginTop: 16, padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
                  <div style={{ color: 'var(--color-muted)' }}>{'{'}</div>
                  <div style={{ color: 'var(--color-neural)', paddingLeft: 16 }}>"answer": <span style={{ color: 'rgba(255,255,255,0.6)' }}>"Based on your notes..."</span>,</div>
                  <div style={{ color: 'var(--color-neural)', paddingLeft: 16 }}>"sources": <span style={{ color: 'rgba(255,255,255,0.6)' }}>[...]</span></div>
                  <div style={{ color: 'var(--color-muted)' }}>{'}'}</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '120px 40px', textAlign: 'center' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 64px)', marginBottom: 24, fontWeight: 900 }}>
              Start thinking{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--color-aurora)' }}>bigger</span>
            </h2>
            <p style={{ color: 'var(--color-muted)', fontSize: 18, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
              Your second brain awaits. Add your first thought.
            </p>
            <Link href="/dashboard">
              <button className="btn-primary" style={{ padding: '16px 40px', fontSize: 18 }}>
                Launch Dashboard →
              </button>
            </Link>
          </motion.div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--color-muted)', fontSize: 13 }}>
          <span>🧠 Second Brain — Built for Altibbe/Hedamo</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
