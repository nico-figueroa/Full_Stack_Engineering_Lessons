BEGIN;

-- Nomadant is accessed through the trusted backend PostgreSQL role. No Supabase
-- client role has schema access, so enabling RLS without policies intentionally
-- blocks future direct client access while the backend continues via BYPASSRLS.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA nomadant_tech
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA nomadant_tech
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE USAGE ON SCHEMA nomadant_tech
  FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE nomadant_tech.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomadant_tech.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomadant_tech.oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomadant_tech.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomadant_tech.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomadant_tech.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomadant_tech.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomadant_tech.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomadant_tech.users ENABLE ROW LEVEL SECURITY;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA nomadant_tech
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA nomadant_tech
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
