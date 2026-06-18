-- ============================================================
-- Ajrly OS — Seed data
-- Run this AFTER schema.sql (policies.sql optional but recommended).
-- Mirrors the seed data in assets/js/data.js:
--   7 tasks, 6 content posts. Owners start empty (per the sheet).
--
-- NOTE: run this as the service role (Supabase SQL editor runs with
-- elevated privileges and bypasses RLS), so created_by stays NULL.
-- Inserts use gen_random_uuid() for primary keys.
-- ============================================================

-- ---------- Tasks ----------
insert into tasks (title, priority, description, assigned_by, date, due_date, status, delegate_to, duration, notes) values
  ('Write article about how to attract more customers to your link', 'High',   'Highlight the correct way to use the platform/link', 'Asel',  '2026-06-14', '2026-06-16', 'complete', '',        '',      ''),
  ('Offer carpet cleaning service @ 10% OFF',                        'Medium', 'Offer a carpet cleaning service to highlight the importance of cleanliness and high quality services', '', '2026-06-14', null, 'pending', '', '', ''),
  ('Fill Sheet Information',                                         'Medium', 'Add property owner names, phone, email from the ajrly website.', 'Kenda', '2026-06-14', '2026-06-21', 'pending', '',        '',      ''),
  ('Create a Content Plan for WhatsApp Owner Channel/Community',     'High',   'Using the sheet write out posts, pick where the content will be posted and assign posting dates and times.', 'Kenda', '2026-06-14', '2026-06-16', 'overdue', '', '', ''),
  ('Competitor Analysis - Owner Systems',                           'High',   'Compare Top 4 Competitor Owner system, commissions, interface, customer service etc.', 'Kenda', '2026-06-15', '2026-06-21', 'pending', '', '', ''),
  ('Plan Content Pillars',                                          'Low',    'Explain type of content associated with each content pillar.', '', '2026-06-15', '2026-06-15', 'complete', '', '00:30', ''),
  ('Facebook Comments',                                            'Low',    'Reply to all pending facebook comments', '', '2026-06-15', '2026-06-21', 'closed', 'Raneem', '', '');

-- ---------- Content posts ----------
insert into content_posts (day, date, goal, platform, pillar, type, description, hook, caption, time, budget) values
  ('Tuesday',   '2026-06-16', 'Property Discovery & Inspiration', array['Instagram','Facebook'],            'Property Discovery',            'Carousel',       '',                                                                                  '', '',               '',      ''),
  ('Tuesday',   '2026-06-16', 'Community Building',                array['Instagram','Facebook'],            'Ask Ajrly',                     'Story',          'Question Story Box.',                                                                '', 'أسأل أجرلي !',   '',      ''),
  ('Wednesday', '2026-06-17', 'Trust & Credibility',              array['Instagram','Facebook'],            'Brand Story & Trust',           'Single Graphic', 'How deposits work in Ajrly.',                                                       '', '',               '',      ''),
  ('Thursday',  '2026-06-18', 'Community Building',                array['Instagram','Facebook','WhatsApp'], 'Building Community',            'Story',          'Jummah Prayer Reminder',                                                            '', 'بايت في الاستراحة ؟ افتح خريطه قوقل و دور اقرب جامع ليك !', '21:00', ''),
  ('Friday',    '2026-06-19', 'Education & Value',                 array['Facebook','Instagram'],            'Rental Etiquette & Experience', 'Single Graphic', 'Educate renters about small gestures they can do to ensure the property is clean before they leave.', '', '', '', ''),
  ('Sunday',    '2026-06-21', 'Education & Value',                 array['Instagram','Facebook'],            'Education',                     'Carousel',       'Red flags to be aware of in property ads.',                                         '', '',               '',      '');

-- ---------- Owners ----------
-- (intentionally empty — populate via the app or Integrations import)
