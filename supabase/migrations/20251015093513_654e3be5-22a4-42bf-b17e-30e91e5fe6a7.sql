-- Add UPDATE policy for audio_messages table
CREATE POLICY "Public can update audio messages"
ON public.audio_messages
FOR UPDATE
TO public
USING (true);