// Function to capitalize words (e.g., "meowth" -> "Meowth")
function capitaliseWords(words) {
    return words
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

// Function to show the loader
function showLoader() {
    const evolutionChainDiv = document.getElementById("evolution-chain");
    evolutionChainDiv.innerHTML = `<div class="loader"></div>`;
}

// Function to hide the loader
function hideLoader() {
    const evolutionChainDiv = document.getElementById("evolution-chain");
    const loader = evolutionChainDiv.querySelector(".loader");
    if (loader) {
        loader.remove();
    }
}

// Function to fetch Pokémon data
async function getPokemonData(pokemonName) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        if (!response.ok) throw new Error("Pokémon not found!");
        return await response.json();
    } catch (error) {
        console.error("Error fetching Pokémon data:", error);
        throw error; // Re-throw the error to handle it in the main function
    }
}

// Function to fetch Pokémon species data
async function getPokemonSpecies(pokemonName) {
    try {
        const pokemonData = await getPokemonData(pokemonName);
        const response = await fetch(pokemonData.species.url);
        if (!response.ok) throw new Error("Species data not found!");
        return await response.json();
    } catch (error) {
        console.error("Error fetching species data:", error);
        throw error; // Re-throw the error to handle it in the main function
    }
}

// Function to fetch evolution chain
async function getEvolutionChain(pokemonName) {
    try {
        const speciesData = await getPokemonSpecies(pokemonName);
        const response = await fetch(speciesData.evolution_chain.url);
        if (!response.ok) throw new Error("Evolution chain not found!");
        return await response.json();
    } catch (error) {
        console.error("Error fetching evolution chain:", error);
        throw error; // Re-throw the error to handle it in the main function
    }
}

// Recursive function to build evolution chains
async function buildEvolutionChains(chain, searchedPokemon) {
    let currentStage = chain.species.name;
    let currentStageSpan = `<span class="pokemon">${capitaliseWords(currentStage)}</span>`;
    let evolutions = chain.evolves_to;

    // Highlight the searched Pokémon with a <span> and class
    if (currentStage === searchedPokemon.trim()) {
        currentStageSpan = `<span class='searchedPokemon'>${capitaliseWords(currentStage)}</span>`;
    }

    // If there are no further evolutions, return the current stage as a single chain
    if (evolutions.length === 0) {
        return [currentStageSpan]
    }

    // If there are multiple evolutions, handle branching
    let chains = [];
    for (let evolution of evolutions) {
        let subChains = await buildEvolutionChains(evolution, searchedPokemon);

        // More than 1 evolution method for the same species
        if (evolution.evolution_details) {
            for (let detail of evolution.evolution_details) {
                let evolutionConditions = await getEvolutionConditions(detail);
                for (let subChain of subChains) {
                    chains.push(`${currentStageSpan}<div class="evolutionStep"><span class="evolutionCondition">${evolutionConditions}</span><span class="evolution-arrow">→</span></div>${capitaliseWords(subChain)}`);
                }
            }
        } else { // Handle cases where there are no evolution details
            for (let subChain of subChains) {
                chains.push(`${currentStageSpan}<div class="evolutionStep"><span class="evolution-arrow">→</span></div>${capitaliseWords(subChain)}`); // No conditions
            }
        }
    }
    return chains;
}


async function getEvolutionConditions(details) {
    if (!details) return "";

    let conditions = [];

    if (details.trigger) {
        conditions.push(`${capitaliseWords(details.trigger.name)}`);
    }

    if (details.min_level) {
        conditions.push(`Level ${details.min_level}`);
    }
    if (details.item) {
        conditions.push(`Item: ${capitaliseWords(details.item.name)}`);
    }
    if (details.held_item) {
        conditions.push(`Held Item: ${capitaliseWords(details.held_item.name)}`);
    }
    if (details.time_of_day) {
        conditions.push(`Time: ${details.time_of_day}`);
    }
    if (details.known_move) {
        conditions.push(`Move: ${capitaliseWords(details.known_move.name)}`);
    }
    if (details.known_move_type) {
        conditions.push(`Move Type: ${capitaliseWords(details.known_move_type.name)}`);
    }
    if (details.min_happiness) {
        conditions.push(`Happiness: ${details.min_happiness}`);
    }
    if (details.min_beauty) {
        conditions.push(`Beauty: ${details.min_beauty}`);
    }
    if (details.min_affection) {
        conditions.push(`Affection: ${details.min_affection}`);
    }
    if (details.needs_overworld_rain) {
        conditions.push(`Overworld Rain`);
    }
    if (details.gender) {
        conditions.push(`Gender: ${details.gender === 1 ? "Female" : "Male"}`);
    }
    if (details.relative_physical_stats !== null) {
        conditions.push(`Stats: ${details.relative_physical_stats}`);
    }
    if (details.party_species) {
        conditions.push(`Party: ${capitaliseWords(details.party_species.name)}`);
    }
    if (details.party_type) {
        conditions.push(`Party Type: ${capitaliseWords(details.party_type.name)}`);
    }
    if (details.trade_species) {
        conditions.push(`Trade for: ${capitaliseWords(details.trade_species.name)}`);
    }
    if (details.turn_upside_down) {
        conditions.push(`Turn Console Upside Down`);
    }
    if (details.location) {
        try {
            const locationData = await fetchLocationData(details.location.url);
            if (locationData) {
                conditions.push(`At location: ${capitaliseWords(details.location.name)} (${locationData.region}, Gen ${locationData.generation})`);
            } else {
                conditions.push(`At location: ${capitaliseWords(details.location.name)}`); // Fallback if data fetch fails
            }
        } catch (error) {
            console.error("Error fetching location data:", error);
            conditions.push(`At location: ${capitaliseWords(details.location.name)}`); // Fallback on error
        }
    }

    return conditions.join(", ");
}

async function fetchLocationData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Extract region and generation (adapt to your API's structure)
        const regionName = data.region ? capitaliseWords(data.region.name) : "Unknown Region";
        const generationNumber = data.game_indices[0].generation.name ? extractGenerationNumber(data.game_indices[0].generation.name) : "Unknown Generation"; // Helper function below
        return { region: regionName, generation: generationNumber };
    } catch (error) {
        console.error("Error fetching location details:", error);
        return null;
    }
}


function extractGenerationNumber(generationName) {
    // Example: "generation-i" -> "I", "generation-iii" -> "III"
    const romanNumeral = generationName.replace("generation-", "").toUpperCase();
    console.log(romanNumeral)
    return `Generation ${romanNumeral}`;
}

// Function to display evolution chains in HTML
async function displayEvolutionChains(chain, searchedPokemon) {
    const evolutionChainDiv = document.getElementById("evolution-chain");
    evolutionChainDiv.innerHTML = ""; // Clear previous content

    const chains = await buildEvolutionChains(chain, searchedPokemon);

    // Create a box for each chain
    chains.forEach(chain => {
        const chainBox = document.createElement("div");
        chainBox.className = "chain-box";
        chainBox.innerHTML = chain;
        evolutionChainDiv.appendChild(chainBox);
    });
}

// Function to display an error message
function displayError(message) {
    const evolutionChainDiv = document.getElementById("evolution-chain");
    evolutionChainDiv.innerHTML = `<p class="error">${message}</p>`;
}

// Main function to fetch and display the evolution chain
async function main(pokemonName) {
    showLoader(); // Show the loader before fetching data
    try {
        const evolutionChainData = await getEvolutionChain(pokemonName);
        displayEvolutionChains(evolutionChainData.chain, pokemonName);
    } catch (error) {
        displayError("Pokémon not found. Please check the name and try again!");
        console.error(error);
    } finally {
        hideLoader(); // Hide the loader after fetching data (whether successful or not)
    }
}

// Event listener for the search form
document.getElementById("search-form").addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent form submission
    const pokemonName = document.getElementById("pokemon-input").value.toLowerCase();
    if (pokemonName) {
        main(pokemonName);
    } else {
        displayError("Please enter a Pokémon name!");
    }
});

// Optional: Run for a default Pokémon on page load
main("pikachu");