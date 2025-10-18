-- Query to check the actual policy definitions
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('users', 'companies')
  AND policyname LIKE '%authenticated%'
ORDER BY tablename, policyname;
