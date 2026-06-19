import * as migration_20260605_171605 from './20260605_171605';
import * as migration_20260615_144408 from './20260615_144408';
import * as migration_20260616_150445_add_cashfree_gateway from './20260616_150445_add_cashfree_gateway';
import * as migration_20260618_143400_refactor_payments_gateway_neutral from './20260618_143400_refactor_payments_gateway_neutral';
import * as migration_20260619_084723_add_payment_gateway_settings from './20260619_084723_add_payment_gateway_settings';

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
    name: '20260616_150445_add_cashfree_gateway',
  },
  {
    up: migration_20260618_143400_refactor_payments_gateway_neutral.up,
    down: migration_20260618_143400_refactor_payments_gateway_neutral.down,
    name: '20260618_143400_refactor_payments_gateway_neutral',
  },
  {
    up: migration_20260619_084723_add_payment_gateway_settings.up,
    down: migration_20260619_084723_add_payment_gateway_settings.down,
    name: '20260619_084723_add_payment_gateway_settings'
  },
];
