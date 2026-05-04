import requests
import json
import os

POKEAPI_GQL = "https://graphql.pokeapi.co/v1beta2"
CACHE_FILE = "tmp/cache.json"

QUERY = """
query samplePokeAPIquery {
  typings: pokemon(order_by: {id: asc}) {
    id
    name
    pokemontypes {
      type { name }
    }
  }
}
"""

def fetch_data():
    return requests.post(POKEAPI_GQL, json={"query": QUERY}).json()

def format_pokemon(p):
    types = p["pokemontypes"]
    return {
        "name": p["name"],
        "typing": [types[0]["type"]["name"]] + ([types[1]["type"]["name"]] if len(types) > 1 else [])
    }

def get_pokemon_typings():
    os.makedirs("tmp", exist_ok=True)
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE) as f:
            data = json.load(f)
    else:
        data = fetch_data()
        with open(CACHE_FILE, "w") as f:
            json.dump(data, f)
    return [format_pokemon(p) for p in data["data"]["typings"]]
