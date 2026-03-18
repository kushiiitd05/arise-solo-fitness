-- Phase 10: Shadow Army Mechanics
-- Section 1: Add extraction_tokens column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "extraction_tokens" INTEGER NOT NULL DEFAULT 0;

-- Section 2: Seed 17 shadow rows with matching UUIDs from SHADOWS_DB
-- Uses INSERT ... ON CONFLICT DO NOTHING for idempotency
-- base_power per rank: E=50, D=100, C=200, B=400, A=800, S=1500
INSERT INTO "shadows" ("id", "name", "rank", "shadow_type", "base_power", "ability", "rarity", "emoji", "is_active")
VALUES
  ('a1b2c3d4-0001-0000-0000-000000000001', 'Igris',          'S'::"HunterRank", 'COMMANDER'::"ShadowType", 1500, '{"name": "Commander Presence"}', 'LEGENDARY'::"ItemRarity", '⚔️',  true),
  ('a1b2c3d4-0002-0000-0000-000000000002', 'Beru',           'S'::"HunterRank", 'COMMANDER'::"ShadowType", 1500, '{"name": "Ant Swarm"}',           'LEGENDARY'::"ItemRarity", '🐜',  true),
  ('a1b2c3d4-0003-0000-0000-000000000003', 'Tank',           'S'::"HunterRank", 'COMMANDER'::"ShadowType", 1500, '{"name": "Iron Body"}',           'LEGENDARY'::"ItemRarity", '🛡️', true),
  ('a1b2c3d4-0004-0000-0000-000000000004', 'Tusk',           'A'::"HunterRank", 'ELITE'::"ShadowType",      800, '{"name": "Orc Berserker"}',       'EPIC'::"ItemRarity",      '🦷',  true),
  ('a1b2c3d4-0005-0000-0000-000000000005', 'Iron',           'B'::"HunterRank", 'KNIGHT'::"ShadowType",     400, '{"name": "High Defense"}',        'RARE'::"ItemRarity",      '⚙️',  true),
  ('a1b2c3d4-0006-0000-0000-000000000006', 'Greed',          'B'::"HunterRank", 'KNIGHT'::"ShadowType",     400, '{"name": "Arcane Drain"}',        'RARE'::"ItemRarity",      '💀',  true),
  ('a1b2c3d4-0007-0000-0000-000000000007', 'Kaisel',         'A'::"HunterRank", 'ELITE'::"ShadowType",      800, '{"name": "Dragon Charge"}',       'EPIC'::"ItemRarity",      '🐉',  true),
  ('a1b2c3d4-0008-0000-0000-000000000008', 'Bellion',        'S'::"HunterRank", 'MONARCH'::"ShadowType",   1500, '{"name": "Grand Marshal"}',       'LEGENDARY'::"ItemRarity", '👁️', true),
  ('a1b2c3d4-0009-0000-0000-000000000009', 'High Orc',       'C'::"HunterRank", 'SOLDIER'::"ShadowType",    200, '{"name": "Warchief Strike"}',     'UNCOMMON'::"ItemRarity",  '🪓',  true),
  ('a1b2c3d4-0010-0000-0000-000000000010', 'Fangs',          'D'::"HunterRank", 'SOLDIER'::"ShadowType",    100, '{"name": "Wolf Instinct"}',       'COMMON'::"ItemRarity",    '🐺',  true),
  ('a1b2c3d4-0011-0000-0000-000000000011', 'Hobgoblin',      'D'::"HunterRank", 'SOLDIER'::"ShadowType",    100, '{"name": "Mob Surge"}',           'COMMON'::"ItemRarity",    '👺',  true),
  ('a1b2c3d4-0012-0000-0000-000000000012', 'Knight Captain', 'B'::"HunterRank", 'KNIGHT'::"ShadowType",     400, '{"name": "Vanguard Rush"}',       'RARE'::"ItemRarity",      '🗡️', true),
  ('a1b2c3d4-0013-0000-0000-000000000013', 'Shadow Mage',    'B'::"HunterRank", 'KNIGHT'::"ShadowType",     400, '{"name": "Arcane Barrage"}',      'RARE'::"ItemRarity",      '🔮',  true),
  ('a1b2c3d4-0014-0000-0000-000000000014', 'Cerberus',       'A'::"HunterRank", 'ELITE'::"ShadowType",      800, '{"name": "Triad Guard"}',         'EPIC'::"ItemRarity",      '🐾',  true),
  ('a1b2c3d4-0015-0000-0000-000000000015', 'Architect',      'S'::"HunterRank", 'MONARCH'::"ShadowType",   1500, '{"name": "System Override"}',     'LEGENDARY'::"ItemRarity", '🏛️', true),
  ('a1b2c3d4-0016-0000-0000-000000000016', 'Shadow Soldier', 'E'::"HunterRank", 'SOLDIER'::"ShadowType",     50, '{"name": "Basic Combat"}',        'COMMON'::"ItemRarity",    '👤',  true),
  ('a1b2c3d4-0017-0000-0000-000000000017', 'Shadow Knight',  'C'::"HunterRank", 'SOLDIER'::"ShadowType",    200, '{"name": "Knight Guard"}',        'UNCOMMON'::"ItemRarity",  '🛡️', true)
ON CONFLICT ("id") DO NOTHING;
