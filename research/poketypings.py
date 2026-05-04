from enum import IntEnum, Enum

#this is technically a graph implemented as a matrix (can also do linkedlist)
type_chart = (
    # NOR  #FIR #WTR #ELE #GRS #ICE #FIG #PSN #GRN #FLY #PSY #BUG #RCK #GST #DRA #DRK #STL #FRY
    (1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 0.0, 1.0, 1.0, 0.5, 1.0),  # NORMAL
    (1.0, 0.5, 0.5, 1.0, 2.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 0.5, 1.0, 2.0, 1.0),  # FIRE
    (1.0, 2.0, 0.5, 1.0, 0.5, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0, 1.0, 1.0),  # WATER
    (1.0, 1.0, 2.0, 0.5, 0.5, 1.0, 1.0, 1.0, 0.0, 2.0, 1.0, 1.0, 1.0, 1.0, 0.5, 1.0, 1.0, 1.0),  # ELECTRIC
    (1.0, 0.5, 2.0, 1.0, 0.5, 1.0, 1.0, 0.5, 2.0, 0.5, 1.0, 0.5, 2.0, 1.0, 0.5, 1.0, 0.5, 1.0),  # GRASS
    (1.0, 0.5, 0.5, 1.0, 2.0, 0.5, 1.0, 1.0, 2.0, 2.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0),  # ICE
    (2.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0, 0.5, 0.5, 0.5, 2.0, 0.0, 1.0, 2.0, 2.0, 0.5),  # FIGHTING
    (1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 0.5, 0.5, 1.0, 1.0, 1.0, 0.5, 0.5, 1.0, 1.0, 0.0, 2.0),  # POISON
    (1.0, 2.0, 1.0, 2.0, 0.5, 1.0, 1.0, 2.0, 1.0, 0.0, 1.0, 0.5, 2.0, 1.0, 1.0, 1.0, 2.0, 1.0),  # GROUND
    (1.0, 1.0, 1.0, 0.5, 2.0, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 1.0, 1.0, 0.5, 1.0),  # FLYING
    (1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 1.0, 1.0, 0.5, 1.0, 1.0, 1.0, 1.0, 0.0, 0.5, 1.0),  # PSYCHIC
    (1.0, 0.5, 1.0, 1.0, 2.0, 1.0, 0.5, 0.5, 1.0, 0.5, 2.0, 1.0, 1.0, 0.5, 1.0, 2.0, 0.5, 0.5),  # BUG
    (1.0, 2.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 0.5, 2.0, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 0.5, 1.0),  # ROCK
    (0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0, 1.0),  # GHOST
    (1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.5, 0.0),  # DRAGON
    (1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.5, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0, 1.0, 0.5, 1.0, 0.5),  # DARK
    (1.0, 0.5, 0.5, 0.5, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 0.5, 2.0),  # STEEL
    (1.0, 0.5, 1.0, 1.0, 1.0, 1.0, 2.0, 0.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 0.5, 1.0),  # FAIRY
)

class _TypeNameAndValue(Enum):
  NORMAL = 0
  FIRE = 1
  WATER = 2
  ELECTRIC = 3
  GRASS = 4
  ICE = 5
  FIGHTING = 6
  POISON = 7
  GROUND = 8
  FLYING = 9
  PSYCHIC = 10
  BUG = 11
  ROCK = 12
  GHOST = 13
  DRAGON = 14
  DARK = 15
  STEEL = 16
  FAIRY = 17

T = Type = IntEnum('Type', {
    type.name : type.value
    for type
    in _TypeNameAndValue
})

ALL_TYPES = tuple(_ for _ in Type)

# for readability in notebook:
NORMAL = T.NORMAL
FIRE = T.FIRE
WATER = T.WATER
ELECTRIC = T.ELECTRIC
GRASS = T.GRASS
ICE = T.ICE
FIGHTING = T.FIGHTING
POISON = T.POISON
GROUND = T.GROUND
FLYING = T.FLYING
PSYCHIC = T.PSYCHIC
BUG = T.BUG
ROCK = T.ROCK
GHOST = T.GHOST
DRAGON = T.DRAGON
DARK = T.DARK
STEEL = T.STEEL
FAIRY = T.FAIRY

type_to_type_name = (
    'normal',
    'fire',
    'water',
    'electric',
    'grass',
    'ice',
    'fighting',
    'poison',
    'ground',
    'flying',
    'psychic',
    'bug',
    'rock',
    'ghost',
    'dragon',
    'dark',
    'steel',
    'fairy'
)
type_name_to_type = {type_to_type_name[i]:Type(i) for i in range(len(type_to_type_name))}


#return list of single types
def advantages(attacker):
    return tuple(T(i) for (i, multiplier) in enumerate(type_chart[attacker]) if multiplier > 1)

#return list of single types
def disadvantages(*defender):
    
    if len(defender) < 2:
      defender = [defender[0], None]

    type1, type2 = defender

    N = len(type_chart)

    type1_weaknesses = [type_chart[i][type1] for i in range(N)]
    type2_weaknesses = (
        [1] * N
        if type2 is None
        else [type_chart[i][type2] for i in range(N)]
    )
    combined_weaknesses = [1] * N
    
    for attacker in range(N):
      combined_weaknesses[attacker] = (
          type1_weaknesses[attacker]
          * type2_weaknesses[attacker]
      )

    super_effective_filter = filter(
        lambda i: combined_weaknesses[i] > 1,
        range(N)
    )
    
    return list(map(T, super_effective_filter))


class Typing():
    def __init__(self, *typing):
        # user will always just treat typing as a secondary type
        if len(typing) < 1:
            raise Exception('must provide at least one Type when constructing a Typing')
        self.typing = tuple(map(Type, typing))
    
    def __hash__(self):
        return hash(str(sorted(self.typing)))

    def __eq__(self, other):
        return set(self.typing) == set(other.typing)

    def __repr__(self):
        builder = ['(', type_to_type_name[self.typing[0]]]
        for i in range(1, len(self.typing)):
            type = self.typing[i]
            builder.append(', ')
            builder.append(type_to_type_name[type])
        builder.append(')')
        return ''.join(builder)
    
    def __iter__(self):
        return iter(self.typing)

    def __getitem__(self, key):
        return self.typing.__getitem__(key)

def log(*types):
    print(list(map(Typing, *types)))

if __name__ == '__main__':
    log(disadvantages(DRAGON))
    log(disadvantages(DARK, GHOST))
    log(disadvantages(FIRE, WATER))
    log(disadvantages(WATER, FIRE))
    
    hash_tester = {}
    hash_tester[Typing(ROCK,WATER)] = "hi"
    print(hash_tester[Typing(WATER,ROCK)]) #ordering