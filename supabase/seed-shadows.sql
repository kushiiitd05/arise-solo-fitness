-- Shadow catalog seed for ARISE. Run once: supabase db push or paste into Supabase SQL editor.
-- UUIDs are stable constants. Re-running is safe: ON CONFLICT (id) DO NOTHING.

INSERT INTO shadows (id, name, rank, shadow_type, base_power, rarity, emoji, ability, is_active) VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001', 'Igris',          'S', 'COMMANDER', 110, 'LEGENDARY', '⚔️', '{"name":"Commander Presence","buff":"strength","multiplier":1.1}',  true),
  ('a1b2c3d4-0002-0000-0000-000000000002', 'Beru',           'S', 'COMMANDER', 112, 'LEGENDARY', '🐜', '{"name":"Ant Swarm","buff":"agility","multiplier":1.12}',            true),
  ('a1b2c3d4-0003-0000-0000-000000000003', 'Tank',           'S', 'ELITE',     108, 'LEGENDARY', '🛡️', '{"name":"Iron Body","buff":"vitality","multiplier":1.08}',           true),
  ('a1b2c3d4-0004-0000-0000-000000000004', 'Tusk',           'A', 'ELITE',     106, 'EPIC',      '🦷', '{"name":"Orc Berserker","buff":"strength","multiplier":1.06}',       true),
  ('a1b2c3d4-0005-0000-0000-000000000005', 'Iron',           'B', 'KNIGHT',    105, 'RARE',      '⚙️', '{"name":"High Defense","buff":"vitality","multiplier":1.05}',        true),
  ('a1b2c3d4-0006-0000-0000-000000000006', 'Greed',          'B', 'KNIGHT',    107, 'RARE',      '💀', '{"name":"Arcane Drain","buff":"intelligence","multiplier":1.07}',    true),
  ('a1b2c3d4-0007-0000-0000-000000000007', 'Kaisel',         'A', 'ELITE',     109, 'EPIC',      '🐉', '{"name":"Dragon Charge","buff":"agility","multiplier":1.09}',        true),
  ('a1b2c3d4-0008-0000-0000-000000000008', 'Bellion',        'S', 'COMMANDER', 111, 'LEGENDARY', '👁️', '{"name":"Grand Marshal","buff":"intelligence","multiplier":1.11}',  true),
  ('a1b2c3d4-0009-0000-0000-000000000009', 'High Orc',       'C', 'SOLDIER',   103, 'UNCOMMON',  '🪓', '{"name":"Warchief Strike","buff":"strength","multiplier":1.03}',     true),
  ('a1b2c3d4-0010-0000-0000-000000000010', 'Fangs',          'D', 'SOLDIER',   102, 'COMMON',    '🐺', '{"name":"Wolf Instinct","buff":"agility","multiplier":1.02}',        true),
  ('a1b2c3d4-0011-0000-0000-000000000011', 'Hobgoblin',      'D', 'SOLDIER',   102, 'COMMON',    '👺', '{"name":"Mob Surge","buff":"strength","multiplier":1.02}',           true),
  ('a1b2c3d4-0012-0000-0000-000000000012', 'Knight Captain', 'B', 'KNIGHT',    106, 'RARE',      '🗡️', '{"name":"Vanguard Rush","buff":"agility","multiplier":1.06}',        true),
  ('a1b2c3d4-0013-0000-0000-000000000013', 'Shadow Mage',    'B', 'KNIGHT',    108, 'RARE',      '🔮', '{"name":"Arcane Barrage","buff":"intelligence","multiplier":1.08}',  true),
  ('a1b2c3d4-0014-0000-0000-000000000014', 'Cerberus',       'A', 'ELITE',     107, 'EPIC',      '🐾', '{"name":"Triad Guard","buff":"vitality","multiplier":1.07}',         true),
  ('a1b2c3d4-0015-0000-0000-000000000015', 'Architect',      'S', 'MONARCH',   115, 'MYTHIC',    '🏛️', '{"name":"System Override","buff":"intelligence","multiplier":1.15}', true),
  ('a1b2c3d4-0016-0000-0000-000000000016', 'Shadow Soldier', 'E', 'SOLDIER',   101, 'COMMON',    '👤', '{"name":"Basic Combat","buff":"strength","multiplier":1.01}',        true),
  ('a1b2c3d4-0017-0000-0000-000000000017', 'Shadow Knight',  'C', 'SOLDIER',   104, 'UNCOMMON',  '🛡️', '{"name":"Knight Guard","buff":"vitality","multiplier":1.04}',        true)
ON CONFLICT (id) DO NOTHING;
