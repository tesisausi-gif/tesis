-- Check relationships between clientes and usuarios
SELECT
  c.id_cliente,
  c.nombre as cliente_nombre,
  c.apellido as cliente_apellido,
  u.id as usuario_id,
  u.nombre as usuario_nombre,
  u.rol,
  u.id_cliente as usuario_id_cliente_ref
FROM clientes c
LEFT JOIN usuarios u ON c.id_cliente = u.id_cliente
ORDER BY c.id_cliente;
