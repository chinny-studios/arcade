// Tidebound: monster types, type colours and the type chart.

const TYPES = ['normal', 'fire', 'water', 'grass', 'electric', 'rock', 'ground', 'flying', 'bug', 'poison'];

const TYPE_COLOR = {
  normal: '#a8a878', fire: '#f08030', water: '#6890f0', grass: '#78c850', electric: '#f8d030',
  rock: '#b8a038', ground: '#e0c068', flying: '#a890f0', bug: '#a8b820', poison: '#a040a0',
};

// typeEff(atkType, defTypes) → product of the multipliers for each defending type (missing pairs are 1).
const typeEff = (() => {
  const CHART = {
    normal: { rock: 0.5 },
    fire: { fire: 0.5, water: 0.5, rock: 0.5, grass: 2, bug: 2 },
    water: { water: 0.5, grass: 0.5, fire: 2, rock: 2, ground: 2 },
    grass: { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, water: 2, rock: 2, ground: 2 },
    electric: { electric: 0.5, grass: 0.5, ground: 0, water: 2, flying: 2 },
    rock: { ground: 0.5, fire: 2, flying: 2, bug: 2 },
    ground: { grass: 0.5, bug: 0.5, flying: 0, fire: 2, electric: 2, rock: 2, poison: 2 },
    flying: { electric: 0.5, rock: 0.5, grass: 2, bug: 2 },
    bug: { fire: 0.5, flying: 0.5, poison: 0.5, grass: 2 },
    poison: { poison: 0.5, ground: 0.5, rock: 0.5, grass: 2 },
  };
  return function typeEff(atkType, defTypes) {
    const defs = Array.isArray(defTypes) ? defTypes : [defTypes];
    let m = 1;
    for (const d of defs) {
      const v = CHART[atkType] && CHART[atkType][d];
      if (v !== undefined) m *= v;
    }
    return m;
  };
})();
