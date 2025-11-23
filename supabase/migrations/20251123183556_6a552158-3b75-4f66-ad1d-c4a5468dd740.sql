-- Add foreign key relationship between avaliacoes and profiles
ALTER TABLE public.avaliacoes
ADD CONSTRAINT avaliacoes_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;