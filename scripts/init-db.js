const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon') || process.env.DATABASE_URL?.includes('supabase') 
    ? { rejectUnauthorized: false } 
    : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    console.log('🧠 Initializing Second Brain database...');

    let vectorEnabled = false;
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      vectorEnabled = true;
      console.log('📐 pgvector extension is enabled');
    } catch (err) {
      console.warn('⚠️ pgvector extension is not available. Falling back to lexical retrieval.');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('note', 'link', 'insight', 'article')),
        summary TEXT,
        tags TEXT[] DEFAULT '{}',
        source_url TEXT,
        source_name TEXT,
        captured_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}'::jsonb,
        ai_processed BOOLEAN DEFAULT FALSE,
        embedding_text TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE knowledge_items
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS source_name TEXT,
      ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    `);

    if (vectorEnabled) {
      await client.query(`
        ALTER TABLE knowledge_items
        ADD COLUMN IF NOT EXISTS embedding vector(768);
      `);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS brain_queries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        answer TEXT,
        sources UUID[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE brain_queries
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE chat_sessions
      ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        sources UUID[] DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_items(type);
      CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge_items(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_items USING GIN(tags);
      CREATE INDEX IF NOT EXISTS idx_knowledge_metadata ON knowledge_items USING GIN(metadata);
      CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_items(user_id);
      CREATE INDEX IF NOT EXISTS idx_brain_queries_user ON brain_queries(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated ON chat_sessions(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at);
    `);

    if (vectorEnabled) {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
        ON knowledge_items USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `);
    }

    // Trigger for updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_knowledge_updated_at ON knowledge_items;
      CREATE TRIGGER update_knowledge_updated_at
        BEFORE UPDATE ON knowledge_items
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_chat_session_updated_at ON chat_sessions;
      CREATE TRIGGER update_chat_session_updated_at
        BEFORE UPDATE ON chat_sessions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    `);

    console.log('✅ Database initialized successfully!');
    console.log('📊 Tables created: users, knowledge_items, brain_queries, chat_sessions, chat_messages');
    console.log('🔐 No default account is created. Use Sign Up first, then Sign In.');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDB();
