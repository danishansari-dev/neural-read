# Database Schema

NeuralRead uses **Supabase** (PostgreSQL) with the **pgvector** extension for storing and querying vector embeddings.

## Tables

### `highlights`

Stores every sentence highlighted by users across all webpages.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key (auto-generated) |
| `user_id` | `uuid` | References `auth.users` — the user who saved this highlight |
| `sentence` | `text` | The highlighted sentence text |
| `source_url` | `text` | URL of the webpage where the highlight was found |
| `source_title` | `text` | Title of the source webpage |
| `salience_score` | `float` | NLP importance score (0.0 – 1.0) |
| `embedding` | `vector(1536)` | OpenAI `text-embedding-3-small` vector for similarity search |
| `created_at` | `timestamptz` | Timestamp of when the highlight was saved |

### `connections`

Stores computed similarity links between pairs of highlights.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key (auto-generated) |
| `user_id` | `uuid` | References `auth.users` — owner of both connected highlights |
| `highlight_a` | `uuid` | Foreign key → `highlights.id` (first highlight) |
| `highlight_b` | `uuid` | Foreign key → `highlights.id` (second highlight) |
| `similarity_score` | `float` | Cosine similarity between embeddings (0.0 – 1.0) |
| `created_at` | `timestamptz` | Timestamp of when the connection was created |

## Row Level Security (RLS)

Both tables have RLS enabled. Policies enforce that:

- **SELECT:** Users can only read their own rows (`user_id = auth.uid()`)
- **INSERT:** Users can only insert rows with their own `user_id`
- **UPDATE/DELETE:** Users can only modify/delete their own rows

The backend uses the `service_role` key to bypass RLS for server-side operations (e.g., saving highlights on behalf of authenticated users).

## pgvector Setup

### Enable the Extension

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### The `find_similar_highlights` Function

This RPC function performs cosine similarity search using pgvector's `<=>` operator:

```sql
CREATE OR REPLACE FUNCTION find_similar_highlights(
  query_embedding vector(1536),
  match_user_id uuid,
  threshold float DEFAULT 0.82,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  sentence text,
  source_url text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.sentence,
    h.source_url,
    1 - (h.embedding <=> query_embedding) AS similarity
  FROM highlights h
  WHERE h.user_id = match_user_id
    AND 1 - (h.embedding <=> query_embedding) > threshold
  ORDER BY h.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### IVFFlat Index

For performance on larger datasets, create an IVFFlat index:

```sql
CREATE INDEX ON highlights
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

> **Note:** IVFFlat requires the table to have data before creating the index. For small datasets (< 1000 rows), the default sequential scan is fine.

## Similarity Query Example

To manually find highlights similar to a given embedding:

```sql
SELECT
  id,
  sentence,
  1 - (embedding <=> '[0.0123, -0.0456, ...]'::vector) AS similarity
FROM highlights
WHERE user_id = 'your-user-uuid'
  AND 1 - (embedding <=> '[0.0123, -0.0456, ...]'::vector) > 0.82
ORDER BY embedding <=> '[0.0123, -0.0456, ...]'::vector
LIMIT 5;
```

The `<=>` operator computes cosine distance (not similarity). We use `1 - distance` to convert to similarity where 1.0 = identical.