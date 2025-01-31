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
function buildEvolutionChains(chain, searchedPokemon) {
    let currentStage = chain.species.name;
    let evolutions = chain.evolves_to;

    // Highlight the searched Pokémon with a <span> and class
    if (currentStage === searchedPokemon) {
        currentStage = `<span class="searched-pokemon">${currentStage}</span>`;
    }

    // If there are no further evolutions, return the current stage as a single chain
    if (evolutions.length === 0) {
        return [currentStage];
    }

    // If there are multiple evolutions, handle branching
    let chains = [];
    for (let evolution of evolutions) {
        let subChains = buildEvolutionChains(evolution, searchedPokemon);
        for (let subChain of subChains) {
            chains.push(`${currentStage} → ${subChain}`);
        }
    }

    return chains;
}

// Function to display evolution chains in HTML
function displayEvolutionChains(chain, searchedPokemon) {
    const evolutionChainDiv = document.getElementById("evolution-chain");
    evolutionChainDiv.innerHTML = ""; // Clear previous content

    const chains = buildEvolutionChains(chain, searchedPokemon);

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