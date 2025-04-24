import random
from datetime import datetime
from typing import List, Optional, Set


class NameGenerator:
    def __init__(self):
        self.adjectives = [
            # Positive traits
            "happy",
            "swift",
            "clever",
            "brave",
            "gentle",
            "mighty",
            "wise",
            "playful",
            "graceful",
            "fierce",
            "noble",
            "quick",
            "bright",
            "calm",
            "wild",
            "proud",
            "bold",
            "daring",
            "eager",
            "faithful",
            "honest",
            "jolly",
            "kind",
            "lively",
            "merry",
            "nice",
            "polite",
            "quiet",
            "silly",
            "tough",
            "mysterious",
            "magical",
            "loyal",
            "patient",
            "peaceful",
            "powerful",
            "radiant",
            "reliable",
            "resilient",
            "sincere",
            "spirited",
            "strong",
            "thoughtful",
            "trustworthy",
            "unique",
            "vibrant",
            "warm",
            "witty",
            "zealous",
            "adventurous",
            "ambitious",
            # Nature-inspired
            "breezy",
            "crystal",
            "dawn",
            "earth",
            "floral",
            "forest",
            "golden",
            "lunar",
            "misty",
            "mountain",
            "ocean",
            "rainy",
            "river",
            "solar",
            "stormy",
            "sunny",
            "thunder",
            "tidal",
            "windy",
            "wooden",
            # Color-inspired
            "azure",
            "crimson",
            "emerald",
            "golden",
            "ivory",
            "jade",
            "onyx",
            "pearl",
            "ruby",
            "sapphire",
            "silver",
            "topaz",
            "turquoise",
            "violet",
            "amber",
            "aqua",
            "azure",
            "coral",
            "crimson",
            "emerald",
            "golden",
            "ivory",
            "jade",
            "onyx",
            "pearl",
        ]

        self.animals = [
            # Big cats
            "lion",
            "tiger",
            "panther",
            "jaguar",
            "leopard",
            "cheetah",
            "cougar",
            "lynx",
            # Bears
            "bear",
            "panda",
            "polar",
            "grizzly",
            # Canines
            "wolf",
            "fox",
            "coyote",
            "jackal",
            # Birds of prey
            "eagle",
            "hawk",
            "falcon",
            "owl",
            "raven",
            # Marine life
            "dolphin",
            "whale",
            "shark",
            "octopus",
            "seahorse",
            "turtle",
            # Reptiles
            "dragon",
            "crocodile",
            "snake",
            "lizard",
            "chameleon",
            # Primates
            "gorilla",
            "monkey",
            "chimpanzee",
            "orangutan",
            # Other mammals
            "elephant",
            "rhino",
            "hippo",
            "giraffe",
            "zebra",
            "kangaroo",
            "koala",
            # Mythical
            "phoenix",
            "griffin",
            "unicorn",
            "pegasus",
            # Insects
            "butterfly",
            "dragonfly",
            "firefly",
        ]

        self.colors = [
            # Basic colors
            "red",
            "blue",
            "green",
            "yellow",
            "purple",
            "orange",
            "pink",
            "brown",
            "black",
            "white",
            "gray",
            "gold",
            "silver",
            "bronze",
            "maroon",
            "teal",
            # Nature-inspired
            "amber",
            "aqua",
            "azure",
            "coral",
            "crimson",
            "emerald",
            "indigo",
            "ivory",
            "jade",
            "lavender",
            "lime",
            "magenta",
            "navy",
            "olive",
            "pearl",
            "ruby",
            "sapphire",
            "scarlet",
            "turquoise",
            "violet",
        ]

        self.nouns = [
            # Landforms
            "mountain",
            "hill",
            "valley",
            "canyon",
            "plateau",
            "cliff",
            "peak",
            "ridge",
            # Water bodies
            "river",
            "ocean",
            "lake",
            "stream",
            "waterfall",
            "spring",
            "pond",
            "bay",
            # Forests and vegetation
            "forest",
            "jungle",
            "meadow",
            "garden",
            "grove",
            "orchard",
            "thicket",
            "glade",
            # Weather and sky
            "cloud",
            "storm",
            "rain",
            "wind",
            "sun",
            "moon",
            "star",
            "sky",
            # Earth elements
            "stone",
            "crystal",
            "gem",
            "metal",
            "sand",
            "soil",
            "rock",
            "mineral",
            # Time-related
            "dawn",
            "dusk",
            "night",
            "day",
            "season",
            "year",
            "century",
            "age",
        ]

        # Track all used names
        self.used_names: Set[str] = set()
        # Track combinations that have been used
        self.used_combinations: Set[str] = set()

    def _generate_unique_name(
        self,
        first_list: List[str],
        second_list: List[str],
        third_list: List[str],
        separator: str = "-",
        max_attempts: int = 100,
    ) -> str:
        """Generate a unique name that hasn't been used before."""
        attempts = 0
        while attempts < max_attempts:
            first = random.choice(first_list)
            second = random.choice(second_list)
            combination = f"{first}{separator}{second}"

            # Check if this specific combination has been used
            if combination not in self.used_combinations:
                self.used_combinations.add(combination)
                return combination

            attempts += 1

        # If we've tried too many times, add timestamp to ensure uniqueness
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        first = random.choice(first_list)
        second = random.choice(second_list)
        third = random.choice(third_list)
        print(f"Generated name: {first}{separator}{second}{separator}{third}{separator}{timestamp}")
        return f"{first}{separator}{second}{separator}{third}{separator}{timestamp}"

    def generate_animal_name(self, separator: str = "-") -> str:
        """Generate a unique random animal name with an adjective."""
        name = self._generate_unique_name(self.adjectives, self.animals, self.nouns, separator)
        self.used_names.add(name)
        return name

    def generate_color_animal_name(self, separator: str = "-") -> str:
        """Generate a unique random animal name with a color."""
        name = self._generate_unique_name(self.colors, self.animals, self.nouns, separator)
        self.used_names.add(name)
        return name

    def generate_nature_name(self, separator: str = "-") -> str:
        """Generate a unique random nature-themed name."""
        name = self._generate_unique_name(self.adjectives, self.nouns, self.animals, separator)
        self.used_names.add(name)
        return name

    def generate_custom_name(
        self, first_list: Optional[List[str]] = None, second_list: Optional[List[str]] = None, separator: str = "-"
    ) -> str:
        """Generate a unique custom name using provided lists or default lists."""
        if first_list is None:
            first_list = self.adjectives
        if second_list is None:
            second_list = self.animals

        name = self._generate_unique_name(first_list, second_list, self.nouns, separator)
        self.used_names.add(name)
        return name

    def add_adjective(self, adjective: str) -> None:
        """Add a new adjective to the list."""
        if adjective not in self.adjectives:
            self.adjectives.append(adjective)

    def add_animal(self, animal: str) -> None:
        """Add a new animal to the list."""
        if animal not in self.animals:
            self.animals.append(animal)

    def add_color(self, color: str) -> None:
        """Add a new color to the list."""
        if color not in self.colors:
            self.colors.append(color)

    def add_noun(self, noun: str) -> None:
        """Add a new noun to the list."""
        if noun not in self.nouns:
            self.nouns.append(noun)

    def get_used_names(self) -> Set[str]:
        """Get all names that have been generated."""
        return self.used_names.copy()

    def clear_used_names(self) -> None:
        """Clear the history of used names."""
        self.used_names.clear()
        self.used_combinations.clear()


# Example usage:
if __name__ == "__main__":
    generator = NameGenerator()

    print(f"Total adjectives: {len(generator.adjectives)}")
    print(f"Total animals: {len(generator.animals)}")
    print(f"Total colors: {len(generator.colors)}")
    print(f"Total nature nouns: {len(generator.nouns)}")

    # Generate different types of names
    print("\nAnimal names:")
    for _ in range(5):
        print(generator.generate_animal_name())

    print("\nColor animal names:")
    for _ in range(5):
        print(generator.generate_color_animal_name())

    print("\nNature names:")
    for _ in range(5):
        print(generator.generate_nature_name())

    # Print all used names
    print("\nAll used names:")
    for name in generator.get_used_names():
        print(name)
