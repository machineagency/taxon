(machine) => { try { let strategies = machine.metrics.manufacturingStrategies; return strategies.includes('additive'); } catch { return false; } };
