-- Opening financials: 2026 monthly collected revenue (February–September), entered before
-- individual payments were tracked in HQ. Total: $84,578.07.
--
-- DATA ONLY and insert-only: no tables or columns change, and nothing is updated or deleted.
-- If a month already has a historical entry (e.g. typed in by hand), it is left exactly as it is.
-- January is intentionally not entered (not yet established). October is not entered: from October,
-- revenue comes from individually tracked payments.
INSERT INTO "HistoricalRevenue" ("id", "month", "amountCents", "notes", "createdAt", "updatedAt") VALUES
  ('opening_2026_02', DATE '2026-02-01', 1260775, 'Opening financials', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('opening_2026_03', DATE '2026-03-01', 1648746, 'Opening financials', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('opening_2026_04', DATE '2026-04-01', 1345165, 'Opening financials', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('opening_2026_05', DATE '2026-05-01',  413450, 'Opening financials', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('opening_2026_06', DATE '2026-06-01',  322336, 'Opening financials', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('opening_2026_07', DATE '2026-07-01', 1515961, 'Opening financials', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('opening_2026_08', DATE '2026-08-01', 1188290, 'Opening financials', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('opening_2026_09', DATE '2026-09-01',  763084, 'Opening financials', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("month") DO NOTHING;
