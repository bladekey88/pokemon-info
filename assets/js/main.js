// main.js
import { getBasicPokemonInfo, renderPokemonDataOutput, pokemon, enableSearchSuggestion } from './pokemon.js';
import { capitaliseWords, showLoader, hideLoader } from './utils.js';



async function loadPokemonData(pokemonNameOrId) {
    showLoader()

    const pokemonData = await getBasicPokemonInfo(pokemonNameOrId);

    if (pokemonData) {
        pokemon.data = pokemon.data || {};
        pokemon.data[pokemonNameOrId] = pokemonData;

        // Render the Data
        renderPokemonDataOutput(pokemonData)
        document.getElementById('statForm').style.display = "block";

        // HARDCODE need to change later
        pokemonData.stats.forEach(element => {
            let statName = "base" + capitaliseWords(element.stat.name).replace("-", "");
            document.getElementById(statName).textContent = element.base_stat;
            document.getElementById('pokemon-details')
        });
        const pokemonDetailsDiv = document.getElementById("pokemon-details");
        // Clear anything in the div
        while (pokemonDetailsDiv.hasChildNodes()) {
            pokemonDetailsDiv.removeChild(pokemonDetailsDiv.firstChild);
        }
    } else {
        // Handle error
    }
    hideLoader();
}


enableSearchSuggestion();

// hide form
document.getElementById('statForm').style.display = "none";


document.getElementById("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const pokemonName = document.getElementById("pokemon-input").value.toLowerCase();

    if (pokemonName) {
        const controller = new AbortController();
        const signal = controller.signal;

        // Abort handler 
        const abortHandler = () => {
            controller.abort();
            console.warn("Fetch aborted by user.");
            updateLoaderText("Fetch aborted.");
        };


        loadPokemonData(pokemonName);
    } else {
        displayError("Please enter a Pokémon name!");
    }
});

