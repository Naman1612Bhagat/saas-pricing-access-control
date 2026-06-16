import * as migration_20260605_171605 from './20260605_171605';
import * as migration_20260615_144408 from './20260615_144408';
import * as migration_20260616_150445_add_cashfree_gateway from './20260616_150445_add_cashfree_gateway';

export const migrations = [
  {
    up: migration_20260605_171605.up,
    down: migration_20260605_171605.down,
    name: '20260605_171605',
  },
  {
    up: migration_20260615_144408.up,
    down: migration_20260615_144408.down,
    name: '20260615_144408',
  },
  {
    up: migration_20260616_150445_add_cashfree_gateway.up,
    down: migration_20260616_150445_add_cashfree_gateway.down,
    name: '20260616_150445_add_cashfree_gateway'
  },
];
