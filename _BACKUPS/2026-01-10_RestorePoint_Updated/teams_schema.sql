-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL UNIQUE, -- "Equipo A", "Equipo B"
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT teams_pkey PRIMARY KEY (id)
);

-- 2. Add Team ID to Profiles (One Technician belongs to One Team)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'team_id') THEN
        ALTER TABLE public.profiles ADD COLUMN team_id uuid;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);
    END IF;
END $$;

-- 3. RLS - Allow authenticated to read/manage teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated" ON public.teams FOR ALL USING (auth.role() = 'authenticated');
