-- Enable pg_net extension for HTTP requests
create extension if not exists pg_net;

-- Function to call the Edge Function
create or replace function public.webhook_send_push()
returns trigger as $$
declare
  payload jsonb;
  url text := 'https://gscjqrejmzsrkghasuos.supabase.co/functions/v1/send-push';
  -- PRECAUCIÓN: Reemplaza esto con tu SERVICE_ROLE_KEY real de Supabase (Project Settings > API)
  apikey text := 'REEMPLAZA_CON_TU_SERVICE_ROLE_KEY'; 
begin
  payload = jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', NEW,
    'old_record', OLD
  );

  -- Send POST request
  perform net.http_post(
    url,
    payload,
    jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || apikey
    )
  );

  return NEW;
end;
$$ language plpgsql;

-- Trigger 1: Reportes (Entrada/Salida)
drop trigger if exists on_reporte_created_push on public.reportes;
create trigger on_reporte_created_push
  after insert on public.reportes
  for each row execute function public.webhook_send_push();

-- Trigger 2: Fuel Logs (Gasolina)
drop trigger if exists on_fuel_log_created_push on public.fuel_logs;
create trigger on_fuel_log_created_push
  after insert on public.fuel_logs
  for each row execute function public.webhook_send_push();

-- Trigger 3: Fallas (Nuevas)
drop trigger if exists on_falla_created_push on public.fallas;
create trigger on_falla_created_push
  after insert on public.fallas
  for each row execute function public.webhook_send_push();
