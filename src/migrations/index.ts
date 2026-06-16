import * as migration_20260605_171605 from './20260605_171605';
import * as migration_20260615_144408 from './20260615_144408';

export const migrations = [
  {
    up: migration_20260605_171605.up,
    down: migration_20260605_171605.down,
    name: '20260605_171605',
  },
  {
    up: migration_20260615_144408.up,
    down: migration_20260615_144408.down,
    name: '20260615_144408'
  },
];
