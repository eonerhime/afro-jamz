# Beats API

## Overview
Beat management and discovery endpoints for uploading, searching, and accessing music beats.

---

## Endpoints

### POST /beats
Upload a new beat (producer only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "genre": "string (required)",
  "bpm": "number (required)",
  "key": "string (optional)",
  "price": "number (required)",
  "duration": "number (required in seconds)",
  "tags": "array of strings (optional)",
  "audioFile": "file (required)",
  "coverArt": "file (optional)"
}
```

**Response (201 Created):**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "genre": "string",
  "bpm": "number",
  "key": "string",
  "price": "number",
  "duration": "number",
  "tags": "array of strings",
  "producerId": "string",
  "producerName": "string",
  "audioUrl": "string",
  "coverArtUrl": "string",
  "createdAt": "timestamp",
  "plays": 0
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User is not a producer

---

### GET /beats
List and search beats (public).

**Query Parameters:**
```
search: string (optional) - Search by title or artist
genre: string (optional) - Filter by genre
minBpm: number (optional) - Minimum BPM
maxBpm: number (optional) - Maximum BPM
sortBy: "popular" | "newest" | "sponsored" (optional, default: "newest")
limit: number (optional, default: 20)
offset: number (optional, default: 0)
```

**Response (200 OK):**
```json
{
  "total": "number",
  "beats": [
    {
      "id": "string",
      "title": "string",
      "genre": "string",
      "bpm": "number",
      "price": "number",
      "duration": "number",
      "producerName": "string",
      "coverArtUrl": "string",
      "plays": "number",
      "isSponsored": "boolean",
      "createdAt": "timestamp"
    }
  ]
}
```

**Error Responses:**
- `400 Bad Request` - Invalid query parameters

---

### GET /beats/{beatId}
Fetch beat details and preview metadata.

**Path Parameters:**
```
beatId: string (required) - Unique beat identifier
```

**Response (200 OK):**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "genre": "string",
  "bpm": "number",
  "key": "string",
  "price": "number",
  "duration": "number",
  "tags": "array of strings",
  "producerId": "string",
  "producerName": "string",
  "audioUrl": "string",
  "previewUrl": "string",
  "coverArtUrl": "string",
  "plays": "number",
  "isSponsored": "boolean",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

**Error Responses:**
- `404 Not Found` - Beat does not exist

---

### DELETE /beats/{beatId}
Soft-delete beat (producer only).

**Path Parameters:**
```
beatId: string (required) - Unique beat identifier
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Beat successfully deleted",
  "id": "string"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User is not the beat producer
- `404 Not Found` - Beat does not exist

---

## Rules

### Producer Access
- Only users with `producer` role can upload beats via POST /beats
- Only beat producers can soft-delete their own beats via DELETE /beats/{beatId}
- Non-producers cannot access producer-only operations

### Public Access
- GET /beats and GET /beats/{beatId} are publicly accessible
- No authentication required for read operations

### Search and Filtering
- GET /beats supports multiple filter combinations
- Sponsored beats can be prioritized via sortBy parameter
- Results support pagination via limit and offset

### Soft Deletion
- DELETE /beats/{beatId} performs soft-delete (beat marked as deleted, not removed)
- Soft-deleted beats do not appear in search results or listings
- Historical data is preserved for transaction records
