
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
-- Keep id as UUID PK; signed-up users get id = auth.users.id via trigger.
-- Demo profiles can have any UUID.
