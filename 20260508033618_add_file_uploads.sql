/*
  # Add File Uploads Support

  1. New Tables
    - `file_uploads` - Stores metadata for uploaded files
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `filename` (text) - Original filename
      - `file_size` (integer) - Size in bytes
      - `file_type` (text) - MIME type
      - `storage_path` (text) - Path in Supabase storage
      - `uploaded_at` (timestamptz)

  2. Security
    - Enable RLS on file_uploads table
    - Users can only access files from their own conversations
*/

CREATE TABLE IF NOT EXISTS file_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_size integer NOT NULL,
  file_type text NOT NULL,
  storage_path text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view files in own conversations"
  ON file_uploads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = file_uploads.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert files in own conversations"
  ON file_uploads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE INDEX idx_file_uploads_conversation_id ON file_uploads(conversation_id);
