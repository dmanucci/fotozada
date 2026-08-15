-- Seed kiosk_settings para o evento "Encontro de Carros Antigos de Pontal-SP".
-- print_batches.kiosk_id tem FK pra kiosk_settings — sem essa linha, toda
-- submissão do totem em /carros-pontal falharia com {error: "unknown_kiosk"}.
insert into public.kiosk_settings (kiosk_id, layout_config) values (
  'carros-pontal',
  '{
    "single_10x15_v": {"label": "10x15 Vertical", "photos": 1, "width": 1200, "height": 1800, "aspect": 0.88},
    "single_10x15_h": {"label": "10x15 Horizontal", "photos": 1, "width": 1800, "height": 1200, "aspect": 2.11},
    "strip_3":        {"label": "Tirinha de 3", "photos": 3, "width": 1200, "height": 1800, "frame_aspect": 2.0}
  }'::jsonb
) on conflict (kiosk_id) do nothing;
