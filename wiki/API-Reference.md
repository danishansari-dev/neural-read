# API Reference

**Base URL:** `https://neural-read-backend-production.up.railway.app`

**Interactive Docs:** [Swagger UI](https://neural-read-backend-production.up.railway.app/docs)

## Authentication

Protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <supabase_jwt_token>
```

Tokens are obtained via Google OAuth (through the dashboard) or the `/api/v1/auth/login` endpoint.

---

## Health & Status

### `GET /`

**Description:** Root endpoint — confirms the API is running.

**Auth required:** No

**Response:**
```json
{
  "status": "ok",
  "service": "NeuralRead API"
}
```

---

### `GET /health`

**Description:** Health check endpoint for monitoring and load balancers.

**Auth required:** No

**Response:**
```json
{
  "status": "ok",
  "service": "NeuralRead API"
}
```

---

## Authentication Endpoints

### `POST /api/v1/auth/login`

**Description:** Authenticate with email and password via Supabase Auth.

**Auth required:** No

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Success Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Error Response (401):**
```json
{
  "detail": "Invalid credentials"
}
```

---

### `GET /api/v1/auth/me`

**Description:** Verify a JWT token and return the authenticated user's info.

**Auth required:** Yes (Bearer token)

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Error Response (401):**
```json
{
  "detail": "Missing or invalid token"
}
```

---

## NLP & Highlights Endpoints

### `POST /api/v1/extract`

**Description:** Extract the top highlight-worthy sentences from article text using LSA-based NLP.

**Auth required:** No (public endpoint — the extension calls this before login)

**Request Body:**
```json
{
  "text": "Full article text extracted from the webpage...",
  "url": "https://example.com/article",
  "title": "Article Title"
}
```

**Success Response (200):**
```json
{
  "highlights": [
    {
      "sentence": "This is the most important sentence from the article.",
      "score": 0.92
    },
    {
      "sentence": "Another key insight extracted by the NLP pipeline.",
      "score": 0.78
    },
    {
      "sentence": "A third notable sentence with supporting statistics.",
      "score": 0.65
    }
  ]
}
```

**Error Response (500):**
```json
{
  "detail": "Error message"
}
```

**Example cURL:**
```bash
curl -X POST https://neural-read-backend-production.up.railway.app/api/v1/extract \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Artificial intelligence has transformed how we process information. Deep learning models can now understand natural language with human-level accuracy. The transformer architecture, introduced in 2017, revolutionized NLP by enabling parallel processing of text sequences.",
    "url": "https://example.com/ai-article",
    "title": "AI Revolution"
  }'
```

---

### `POST /api/v1/save`

**Description:** Save a highlight sentence, generate its OpenAI embedding, and automatically create connections to similar existing highlights.

**Auth required:** Yes (Bearer token)

**Request Body:**
```json
{
  "sentence": "The highlighted sentence to save.",
  "source_url": "https://example.com/article",
  "source_title": "Article Title",
  "salience_score": 0.85
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "highlight": {
    "id": "uuid",
    "user_id": "uuid",
    "sentence": "The highlighted sentence.",
    "source_url": "https://example.com/article",
    "source_title": "Article Title",
    "salience_score": 0.85,
    "embedding": [0.0123, -0.0456, "..."],
    "created_at": "2024-01-15T10:30:00Z"
  },
  "connections_created": 2
}
```

---

### `GET /api/v1/highlights`

**Description:** Retrieve all saved highlights for the authenticated user, ordered by creation date (newest first).

**Auth required:** Yes (Bearer token)

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "sentence": "A saved highlight sentence.",
    "source_url": "https://example.com",
    "source_title": "Page Title",
    "salience_score": 0.9,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

---

### `GET /api/v1/connections`

**Description:** Retrieve all strong connections (similarity ≥ 0.82) between the user's highlights.

**Auth required:** Yes (Bearer token)

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "highlight_a": "uuid",
    "highlight_b": "uuid",
    "similarity_score": 0.89
  }
]
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "detail": "Description of what went wrong"
}
```

| Status Code | Meaning |
|---|---|
| 200 | Success |
| 401 | Unauthorized — missing or invalid token |
| 500 | Server Error — NLP failure, DB error, etc. |