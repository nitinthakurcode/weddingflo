-- Analytics helper functions for dashboard

-- Get revenue analytics by time period
CREATE OR REPLACE FUNCTION get_revenue_analytics(
  p_company_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  date date,
  revenue numeric,
  transaction_count bigint,
  currency text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(p.created_at) as date,
    SUM(p.amount) as revenue,
    COUNT(*)::bigint as transaction_count,
    p.currency
  FROM payments p
  WHERE p.company_id = p_company_id
    AND p.status = 'succeeded'
    AND p.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY DATE(p.created_at), p.currency
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Get payment breakdown by status
CREATE OR REPLACE FUNCTION get_payment_status_breakdown(
  p_company_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  status text,
  count bigint,
  total_amount numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.status::text,
    COUNT(*)::bigint,
    SUM(p.amount)
  FROM payments p
  WHERE p.company_id = p_company_id
    AND p.created_at BETWEEN p_start_date AND p_end_date
  GROUP BY p.status
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Get top revenue clients
CREATE OR REPLACE FUNCTION get_top_revenue_clients(
  p_company_id uuid,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  client_id uuid,
  client_name text,
  total_revenue numeric,
  transaction_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.bride_name || ' & ' || c.groom_name as client_name,
    COALESCE(SUM(p.amount), 0) as total_revenue,
    COUNT(p.id)::bigint as transaction_count
  FROM clients c
  LEFT JOIN payments p ON p.client_id = c.id AND p.status = 'succeeded'
  WHERE c.company_id = p_company_id
  GROUP BY c.id, c.bride_name, c.groom_name
  ORDER BY total_revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get email/SMS delivery rates
CREATE OR REPLACE FUNCTION get_notification_stats(
  p_company_id uuid,
  p_start_date timestamptz,
  p_end_date timestamptz
)
RETURNS TABLE (
  notification_type text,
  total_sent bigint,
  delivered bigint,
  failed bigint,
  opened bigint,
  clicked bigint,
  delivery_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'email'::text as notification_type,
    COUNT(*)::bigint as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered')::bigint as delivered,
    COUNT(*) FILTER (WHERE status IN ('failed', 'bounced'))::bigint as failed,
    SUM(opened_count)::bigint as opened,
    SUM(clicked_count)::bigint as clicked,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'delivered')::numeric / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as delivery_rate
  FROM email_logs
  WHERE company_id = p_company_id
    AND created_at BETWEEN p_start_date AND p_end_date

  UNION ALL

  SELECT
    'sms'::text as notification_type,
    COUNT(*)::bigint as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered')::bigint as delivered,
    COUNT(*) FILTER (WHERE status = 'failed')::bigint as failed,
    0::bigint as opened,
    0::bigint as clicked,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'delivered')::numeric / NULLIF(COUNT(*), 0)) * 100,
      2
    ) as delivery_rate
  FROM sms_logs
  WHERE company_id = p_company_id
    AND created_at BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Get monthly revenue trend (last 12 months)
CREATE OR REPLACE FUNCTION get_monthly_revenue_trend(
  p_company_id uuid
)
RETURNS TABLE (
  month text,
  revenue numeric,
  transaction_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', p.created_at), 'YYYY-MM') as month,
    SUM(p.amount) as revenue,
    COUNT(*)::bigint as transaction_count
  FROM payments p
  WHERE p.company_id = p_company_id
    AND p.status = 'succeeded'
    AND p.created_at >= NOW() - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', p.created_at)
  ORDER BY month ASC;
END;
$$ LANGUAGE plpgsql;
