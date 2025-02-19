
const pokeApiBaseUri = "https://pokeapi.co/api/v2/"
let pokemonId = null;
let abortHandler;

//  The main entry point into the function
async function main(pokemon, signal, controller) {
    enableSearchSuggestion();
    if (!pokemon) return;

    // Begin loader display and messages and abort controller
    showLoader();
    let abortButton = document.getElementById('abortButton');
    if (abortButton) {
        const abortHandler = () => {
            controller.abort(); // controller is available in the scope of abortHandler
            console.warn("Fetch aborted by user.");
            updateLoaderText("Fetch aborted.");
        };

        abortButton.removeEventListener('click', abortHandler);
        abortButton.addEventListener('click', abortHandler);
    }

    // Run the data functions
    try {
        let pokemonInfo = await getBasicPokemonInfo(pokemon, signal);
        if (pokemonInfo) pokemonId = pokemonInfo.id
        let pokemonForms = await getPokemonFormData(pokemonInfo, signal);
        let pokemonVarieties = await getPokemonVarietyData(pokemonInfo, signal);

        // Render Output
        renderPokemonDataOutput(pokemonInfo);

    }
    catch (e) {
        console.error(e)
    }
    finally {
        hideLoader();
    }
}

function checkLocalStorage(key) {
    const storedData = localStorage.getItem(key);
    if (storedData) {
        try {
            const data = JSON.parse(storedData);
            return data;
        } catch (error) {
            console.error("Error parsing stored Pokémon data:", error);
        }
    }
    return null;
}

async function getBasicPokemonInfo(pokemon, signal) {
    const localStorageKey = `pokemon-${pokemon}`;

    // Abort if pokemon not provided
    if (!pokemon) return;
    let pokemonInputType = isNumeric(pokemon) ? `Pokémon ID: ${pokemon}` : `Pokémon: '${pokemon}'`

    updateLoaderText(`Retrieving Basic Pokémon Information for ${pokemonInputType}`);

    // Get from LocalStorage First
    storedData = checkLocalStorage(localStorageKey);
    if (storedData) return storedData;

    try {
        response = await fetch(`${pokeApiBaseUri}/pokemon/${pokemon}`, { signal });
        if (!response.ok) throw new Error(`Pokémon not found! Status: ${response.status}`);
        const data = await response.json();
        try {
            localStorage.setItem(localStorageKey, JSON.stringify(data))
        } catch (e) {
            if (e.name == "QuotaExceededError") {
                console.warn("Local Storage Quota Exceeded. Data will not be stored in Local Storage")
            }
        }
        return await data
    }
    catch (error) {
        if (signal.aborted) {
            console.warn("Fetch aborted:", error);
            return null;
        } else {
            console.error("Error fetching Pokémon data:", error);
            updateLoaderText(`Error: ${error.message}`);
            return null;
        }
    }
}

function isNumeric(str) {
    // From https://stackoverflow.com/questions/175739/how-can-i-check-if-a-string-is-a-valid-number
    if (typeof str != "string") return false
    return !isNaN(str) && !isNaN(parseFloat(str))
}

async function getPokemonFormData(pokemonInfo, signal) {
    if (!pokemonInfo) return;
    const pokemonForms = [];

    updateLoaderText("Retrieving Pokémon Form Data");
    let formCount = 0;

    for (const form of pokemonInfo.forms) {
        try {
            const response = await fetch(form.url, { signal });
            if (!response.ok) {
                throw new Error(`Failed to fetch ${form.url}: ${response.status} ${response.statusText}`);
            }
            const formData = await response.json();
            formCount++;
            let formCountText = formCount == 1 ? "Form" : "Forms";
            updateLoaderText(`Retrieving Pokémon Form Data - Retrieved ${formCount} ${formCountText}.`);
            pokemonForms.push(formData);
        } catch (error) {
            if (signal.aborted) {
                console.warn("Fetch aborted:", error);
                return null; // Or appropriate return value for abort
            } else {
                console.error("Error fetching form data:", error);
                return null;
            }
        }
    }
    return pokemonForms;
}

async function getPokemonVarietyData(pokemonInfo, signal) {
    function getVarietyId(url) {
        return url.split("/").reverse()[1];
    }

    if (!pokemonInfo) return;
    updateLoaderText("Retrieving Pokémon Variety Data");
    const pokemonVarieties = [];
    try {
        // Variety data is held at the species level
        const speciesResponse = await fetch(pokemonInfo.species.url, { signal });
        if (!speciesResponse.ok) {
            throw new Error(`Failed to fetch species data: ${speciesResponse.status} ${speciesResponse.statusText}`);
        }
        const speciesData = await speciesResponse.json();

        // Now grab all the other varieties from their respective pages, but ignore the current id
        for (variety of speciesData.varieties) {
            varietyPokemonId = getVarietyId(variety.pokemon.url);
            if (varietyPokemonId == pokemonId) continue;

            const varietyData = await (getBasicPokemonInfo(variety.pokemon.name));

            if (varietyData === null && signal.aborted) {
                console.warn("Fetch aborted in getPokemonVarietyData");
                return null;
            }

            if (varietyData) pokemonVarieties.push(varietyData);
        }
        return [pokemonVarieties, speciesData];

    } catch (error) {
        if (signal.aborted) {
            console.warn("Fetch aborted in getPokemonVarietyData:",);
            return null;
        } else {
            console.error("Error fetching variety data:", error);
            updateLoaderText(`Error: ${error.message}`);
            return null;
        }
    }
}



// Function to show the loader
function showLoader() {
    const pokemonDetailsDiv = document.getElementById("pokemon-details");
    const loaderDiv = document.createElement("div");
    loaderDiv.classList = "loader";

    // Loader Test
    const loaderTextParagraph = document.createElement("div");
    loaderTextParagraph.id = "loaderText"
    loaderTextParagraph.textContent = "Loading";

    // Abort Button
    abortButton = document.createElement("button")
    abortButton.id = "abortButton";
    abortButton.classList = "button";
    abortButton.textContent = "Abort Query";

    pokemonDetailsDiv.insertAdjacentElement("beforebegin", abortButton);
    pokemonDetailsDiv.insertAdjacentElement("beforebegin", loaderTextParagraph);
    pokemonDetailsDiv.insertAdjacentElement("beforebegin", loaderDiv);
}

function updateLoaderText(text) {
    const loaderTextParagraph = document.getElementById('loaderText');
    if (loaderTextParagraph) loaderTextParagraph.textContent = text;
}

// Function to hide the loader
function hideLoader() {
    const pokemonDetailsDiv = document.getElementById("pokemon-details");
    const loader = pokemonDetailsDiv.parentElement.querySelector(".loader");
    if (loader) {
        loader.remove();
        document.getElementById('loaderText').remove();
        document.getElementById('abortButton').remove();

    }
}


// Function to enable search suggestions of pokemon names
async function enableSearchSuggestion() {
    const searchInput = document.getElementById('pokemon-input');
    const suggestionsDiv = document.getElementById('suggestions');
    const minSearchTermLength = 2;
    let jsonData = [];
    let pokemonData = []

    // Process json
    const jsonFile = "pokemon-list.json";
    try {
        const response = await fetch("./" + jsonFile);
        jsonData = await (response.json());
        if (jsonData) {
            pokemonData = jsonData["results"];
        }
    }
    catch (error) {
        console.error(error);
        return;
    }

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        suggestionsDiv.innerHTML = '';

        if (searchTerm.length >= minSearchTermLength && jsonData.results.length > 0) {
            const filteredData = jsonData.results.filter(item => {
                return item.name.toLowerCase().includes(searchTerm);
            });

            if (filteredData.length > 0) {
                filteredData.forEach(item => {
                    const suggestionElement = document.createElement('div');

                    // Highlight the search term
                    const suggestionText = item.name;
                    const highlightedText = highlightMatch(suggestionText, searchTerm);

                    suggestionElement.innerHTML = highlightedText;

                    suggestionElement.addEventListener('click', () => {
                        // Use original name for the input field rather than html
                        searchInput.value = item.name;
                        suggestionsDiv.classList.remove('show');
                    });
                    suggestionsDiv.appendChild(suggestionElement);
                });
                suggestionsDiv.classList.add('show');
            } else {
                suggestionsDiv.classList.remove('show');
            }
        } else {
            suggestionsDiv.classList.remove('show');
        }
    });

    document.addEventListener('click', (event) => {
        if (!searchInput.contains(event.target) && !suggestionsDiv.contains(event.target)) {
            suggestionsDiv.classList.remove('show');
        }
    });
}


function highlightMatch(text, searchTerm) {
    if (!searchTerm) return text; // Handle empty search term

    const regex = new RegExp(searchTerm, 'gi');
    return text.replace(regex, '<span class="highlight">$&</span>'); // Replace with highlighted span
}

// Function to build pokemon data output
function renderPokemonDataOutput(pokemonData) {
    console.log(pokemonData)
    const gridDiv = document.querySelector('.grid-auto-fill');
    gridDiv.innerHTML = ''; // Clear existing content

    displayBasicDetails();
    displayTypeDetails();
    displayAbilityDetails();
    displayStatsDetails();
    displayCriesData();
    displayHeldItemDetails();

    function displayBasicDetails() {
        const detailsToDisplay = ['name', 'id', 'height', 'weight', 'is_default', 'base_experience'];

        detailsToDisplay.forEach(item => {
            const dataDiv = document.createElement('div');
            dataDiv.classList = 'pokemon-data-item';
            dataDiv.id = `basic-${item}`;

            const heading = document.createElement('h3');
            heading.textContent = capitaliseWords(item);

            const dataDivParagraph = document.createElement('p');
            let rawData = pokemonData[item];
            if (rawData === undefined || rawData === null) rawData = "N/A";
            if (item == "name") rawData = capitaliseWords(rawData, false);
            if (item === "weight") rawData = `${convertWeight(rawData)} kg`;
            if (item === "height") rawData = `${convertHeight(rawData)} m`;
            if (item === "is_default") rawData = rawData ? "Default" : "Not Default";
            dataDivParagraph.textContent = capitaliseWords(String(rawData), false);

            dataDiv.appendChild(heading);
            dataDiv.appendChild(dataDivParagraph);
            gridDiv.appendChild(dataDiv);
        });
    }

    function displayTypeDetails() {
        if (!pokemonData.types || pokemonData.types.length == 0) return;
        const dataDiv = document.createElement('div');
        dataDiv.classList = 'pokemon-data-item';
        dataDiv.id = "types"

        const heading = document.createElement('h3');
        heading.textContent = "Type";
        dataDiv.appendChild(heading);

        // Current Type
        for (var type of pokemonData.types) {
            const typeDiv = document.createElement('div');
            typeDiv.classList = 'entity-item';

            const heading = document.createElement('h4');
            heading.textContent = `Type ${type.slot}`;

            const typeDivParagraph = document.createElement('p');
            typeDivParagraph.textContent = capitaliseWords(type.type.name);

            typeDiv.appendChild(heading);
            typeDiv.appendChild(typeDivParagraph);

            dataDiv.appendChild(typeDiv);
        }

        // Need to check for previous type
        if (pokemonData.past_types.length > 0) {
            const heading = document.createElement('h3');
            heading.textContent = capitaliseWords("Previous Type");
            dataDiv.appendChild(heading);

            for (var pastType of pokemonData.past_types) {
                const typeDiv = document.createElement('div');
                typeDiv.classList = 'entity-item';

                const generationChangeParagraph = document.createElement('p');
                generationChangeParagraph.textContent = `Type was changed after ${extractGenerationNumber(pastType.generation.name)}`
                typeDiv.appendChild(generationChangeParagraph);

                for (let types of pastType.types) {
                    const heading = document.createElement('h4');
                    heading.textContent = `Type ${types.slot}`;

                    const typeDivParagraph = document.createElement('p');
                    typeDivParagraph.textContent = capitaliseWords(types.type.name);

                    typeDiv.appendChild(heading);
                    typeDiv.appendChild(typeDivParagraph);
                }
                dataDiv.appendChild(typeDiv);
            }
        }
        gridDiv.appendChild(dataDiv);
    }

    function displayAbilityDetails() {
        if (!pokemonData.abilities || pokemonData.abilities.length == 0) return;
        const dataDiv = document.createElement('div');
        dataDiv.classList = 'pokemon-data-item';
        dataDiv.id = "abilities"

        const heading = document.createElement('h3');
        heading.textContent = capitaliseWords("Abilities");
        dataDiv.appendChild(heading);

        // Current Abilities
        for (var ability of pokemonData.abilities) {
            const abilityDiv = document.createElement('div');
            abilityDiv.classList = 'entity-item';

            const heading = document.createElement('h4');
            heading.textContent = `Ability`;

            const abilityDivParagraph = document.createElement('p');
            const hiddenAbilityText = ability.is_hidden ? "(Hidden Ability)" : "";
            abilityDivParagraph.textContent = `${capitaliseWords(ability.ability.name.replace("-", "_"))} ${hiddenAbilityText}`;

            abilityDiv.appendChild(heading);
            abilityDiv.appendChild(abilityDivParagraph);

            dataDiv.appendChild(abilityDiv);
        }

        // Need to check for previous abilities
        if (pokemonData.past_abilities.length > 0) {
            const heading = document.createElement('h3');
            heading.textContent = capitaliseWords("Previous Abilities");
            dataDiv.appendChild(heading);

            for (var pastAbility of pokemonData.past_abilities) {
                const abilityDiv = document.createElement('div');
                abilityDiv.classList = 'entity-item';

                const generationChangeParagraph = document.createElement('p');
                generationChangeParagraph.textContent = `Ability was changed after ${extractGenerationNumber(pastAbility.generation.name)}`
                abilityDiv.appendChild(generationChangeParagraph);

                for (let ability of pastAbility.abilities) {
                    const heading = document.createElement('h4');
                    heading.textContent = 'Ability';

                    const abilityDivParagraph = document.createElement('p');
                    const hiddenAbilityText = ability.is_hidden ? "(Hidden Ability)" : "";
                    abilityDivParagraph.textContent = `${capitaliseWords(ability.ability.name.replace("-", "_"))} ${hiddenAbilityText}`;

                    abilityDiv.appendChild(heading);
                    abilityDiv.appendChild(abilityDivParagraph);
                }
                dataDiv.appendChild(abilityDiv);
            }
        }
        gridDiv.appendChild(dataDiv);
    }

    function displayStatsDetails() {
        if (!pokemonData.stats || pokemonData.stats.length == 0) return;
        const dataDiv = document.createElement('div');
        dataDiv.classList = 'pokemon-data-item';
        dataDiv.id = "stats"

        const heading = document.createElement('h3');
        heading.textContent = capitaliseWords("Base Stats");
        dataDiv.appendChild(heading);

        let statTotal = 0;
        const evTrain = [];

        for (let stats of pokemonData.stats) {
            const statDiv = createEntityItem(stats.stat.name, stats.base_stat)
            statTotal += stats.base_stat;

            if (stats.effort > 0) {
                evTrain.push(
                    {
                        name: stats.stat.name,
                        effort: stats.effort
                    }
                )
            }
            dataDiv.appendChild(statDiv);
        }

        const statTotalDiv = createEntityItem("Total", statTotal);
        let evYieldText = ""
        for (let i = 0; i < evTrain.length; i++) {
            evText = `${evTrain[i].effort} ${capitaliseWords(evTrain[i].name)}`;
            evYieldText += evText;
            if (i != evTrain.length - 1) evYieldText += ", "
        }
        const evYieldDiv = createEntityItem("EV Yield", evYieldText);

        dataDiv.appendChild(statTotalDiv);
        dataDiv.appendChild(evYieldDiv);
        gridDiv.appendChild(dataDiv);
    }

    function displayCriesData() {
        if (!pokemonData.cries || pokemonData.cries == 0) return;
        const dataDiv = document.createElement('div');
        dataDiv.classList = 'pokemon-data-item';
        dataDiv.id = "cries"

        const heading = document.createElement('h3');
        heading.textContent = capitaliseWords("Cries");
        dataDiv.appendChild(heading);

        for (let cry in pokemonData.cries) {
            if (!pokemonData.cries[cry]) continue;
            const criesDiv = createEntityItem(cry);
            const criesAudio = document.createElement('audio');
            criesAudio.setAttribute('controls', true);
            criesAudio.setAttribute('crossorigin', 'anonymous');
            criesAudio.src = pokemonData.cries[cry];
            criesDiv.appendChild(criesAudio);
            dataDiv.appendChild(criesDiv)
        }
        gridDiv.appendChild(dataDiv);
    }

    function displayHeldItemDetails() {
        if (!pokemonData.held_items || pokemonData.held_items.length == 0) return;

        const dataDiv = document.createElement('div');
        dataDiv.classList = 'pokemon-data-item';
        dataDiv.id = "held-items"

        const heading = document.createElement('h3');
        heading.textContent = capitaliseWords("Held Items");
        dataDiv.appendChild(heading);

        for (let items of pokemonData.held_items) {
            const itemRarity = items.version_details[items.version_details.length - 1].rarity;
            const itemDiv = createEntityItem(items.item.name, String(itemRarity));

            dataDiv.appendChild(itemDiv);
        }
        gridDiv.appendChild(dataDiv);


    }

    // Utility Functions
    function createEntityItem(headingText, contentText = null) {
        const div = document.createElement('div');
        div.classList = 'entity-item';
        div.appendChild(document.createElement('h4')).textContent = capitaliseWords(headingText);
        if (contentText) div.appendChild(document.createElement('p')).textContent = contentText;
        return div;
    }

    function capitaliseWords(words, replace = true) {
        if (!replace) {
            return words
                .split("_")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
        }
        else {
            return words
                .replace("-", "_")
                .split("_")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
        }
    }

    function convertWeight(weight) {
        return weight / 10;
    }

    function convertHeight(height) {
        return height / 10;
    }

    function extractGenerationNumber(generationName) {
        const romanNumeral = generationName.replace("generation-", "").toUpperCase();
        return `Generation ${romanNumeral}`;
    }
}



// Event listener for the search form
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

        const abortButton = document.getElementById('abortButton');
        if (abortButton) {
            abortButton.removeEventListener('click', abortHandler);
            abortButton.addEventListener('click', abortHandler);
        }

        main(pokemonName, signal, controller);
    } else {
        displayError("Please enter a Pokémon name!");
    }
});


function localStorageSize() {
    let totalSize = 0;

    for (let key in localStorage) {
        // Check if the key is actually owned by localStorage (important!)
        if (localStorage.hasOwnProperty(key)) {
            let value = localStorage.getItem(key);

            // Calculate size: key length + value length (using UTF-16 characters)
            totalSize += (key.length + (value ? value.length : 0)) * 2; // UTF-16 encoding
        }
    }

    // Convert to KB or MB for easier reading (optional)
    const sizeInKB = totalSize / 1024;
    const sizeInMB = sizeInKB / 1024;

    return {
        bytes: totalSize,
        kb: sizeInKB,
        mb: sizeInMB
    };
}

main('cleffa');
