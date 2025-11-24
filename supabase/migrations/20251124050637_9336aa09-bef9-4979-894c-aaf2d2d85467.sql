-- Fix 1: Restrict user badge visibility to own badges + publicly visible ones
DROP POLICY IF EXISTS "Users can view all user badges" ON user_badges;

CREATE POLICY "Users can view own badges or public badges" ON user_badges
  FOR SELECT USING (
    auth.uid() = user_id OR visible_after_completion = true
  );

-- Fix 2: Update avaliacoes RLS to handle NULL training_id
DROP POLICY IF EXISTS "Users can insert avaliacoes in trainings they participate in" ON avaliacoes;

CREATE POLICY "Users can insert avaliacoes" ON avaliacoes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND is_session_active(session_id) 
    AND (training_id IS NULL OR is_training_participant(auth.uid(), training_id))
  );