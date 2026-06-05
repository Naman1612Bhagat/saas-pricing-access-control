import * as migration_20260605_171605 from './20260605_171605';

export const migrations = [
  {
    up: migration_20260605_171605.up,
    down: migration_20260605_171605.down,
    name: '20260605_171605'
  },
];
