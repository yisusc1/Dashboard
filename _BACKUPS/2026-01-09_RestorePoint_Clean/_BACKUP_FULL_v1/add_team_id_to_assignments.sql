-- Add team_id column to inventory_assignments
ALTER TABLE public.inventory_assignments 
ADD COLUMN team_id uuid REFERENCES public.teams(id);

-- Optional: Create index for performance
CREATE INDEX idx_inventory_assignments_team_id ON public.inventory_assignments(team_id);
