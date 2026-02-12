
CREATE OR REPLACE FUNCTION public.get_alliance_stats_by_tag(tag_input text)
RETURNS TABLE(
  name text, tag text, member_count bigint,
  total_pixels bigint, total_pe_staked bigint
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT a.name, a.tag,
    COUNT(DISTINCT am.user_id),
    COALESCE(SUM(u.pixels_painted_total), 0)::bigint,
    COALESCE(
      (SELECT SUM(p.owner_stake_pe) FROM pixels p
       WHERE p.owner_user_id IN
         (SELECT am2.user_id FROM alliance_members am2 WHERE am2.alliance_id = a.id)
      ), 0)::bigint
  FROM alliances a
  JOIN alliance_members am ON am.alliance_id = a.id
  JOIN users u ON u.id = am.user_id
  WHERE a.tag = tag_input
  GROUP BY a.id;
$$;
