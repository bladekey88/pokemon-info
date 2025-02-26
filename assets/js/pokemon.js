// pokemon.js
import { POKEAPI } from './constants.js';
import {
    highlightMatch,
    debounce,
    normaliseString,
    isNumeric,
    checkLocalStorage,
    updateLoaderText,
    displayError,
    capitaliseWords,
    convertHeight,
    convertWeight,
    extractGenerationNumber,
    replaceHyphens

} from './utils.js';

// Top Level Variables
let pokemonId = null;
const controller = new AbortController();
const controllerSignal = controller.signal;


/**
 * Enables search suggestions for Pokemon names in an input field.
 * Fetches Pokemon data from a JSON file, applies debouncing to input events,
 * and closes suggestions on click outside or blur.
 *
 * @async
 * @function enableSearchSuggestion
 * @returns {Promise<void>} A Promise that resolves when the function completes.
 *
 * 
 * Call the function to enable search suggestions:
 * enableSearchSuggestion();
 *
 * Assumes the HTML contains:
 * <input type="text" id="pokemon-input">
 *      <div id="suggestions"></div>
 * and a "pokemon-list.json" file.
 *
 * @requires utils.js (for debounce, highlightMatch, and normaliseString)
 * @requires pokemon-list.json (for Pokemon data)
 */
export async function enableSearchSuggestion() {
    const searchInput = document.getElementById('pokemon-input');
    const suggestionsDiv = document.getElementById('suggestions');
    const minSearchTermLength = 2;
    let jsonData = [];

    // Process json
    const jsonFile = "pokemon-list.json";
    try {
        const response = await fetch("./" + jsonFile);
        jsonData = await (response.json());

    }
    catch (error) {
        console.error(error);
        return;
    }

    // Add debounce and create the event listener
    searchInput.addEventListener('input', debounce(handleInput, 250));

    // Close suggestions when clicking outside area
    document.addEventListener('click', (event) => {
        if (!searchInput.contains(event.target) && !suggestionsDiv.contains(event.target)) {
            suggestionsDiv.classList.remove('show');
        }
    });

    // Close suggestions on blur (focus loss)
    searchInput.addEventListener('blur', function () {
        suggestionsDiv.classList.remove('show');
    });

    /**
     * Handles input events in the Pokemon search input field.
     * Filters Pokemon names based on the search term, displays suggestions,
     * and manages the visibility of the suggestions div.
     * Debounce this particular function
     *
     * @function handleInput
     * @returns {void}
     */
    function handleInput() {
        const searchTerm = normaliseString(searchInput.value.toLowerCase().trim());
        suggestionsDiv.innerHTML = '';

        // Create a filtered dataset when there is a search term and results from JSON
        // Lowercase everything to ensure that it matches the json
        if (searchTerm.length >= minSearchTermLength && jsonData.results.length > 0) {
            const filteredData = jsonData.results.filter(item => {
                return item.name.toLowerCase().includes(searchTerm);
            });

            if (filteredData.length > 0) {
                suggestionsDiv.setAttribute('role', 'listbox');

                filteredData.forEach(item => {

                    const suggestionElement = document.createElement('div');
                    suggestionElement.setAttribute('role', 'option');

                    // Highlight the search term
                    const suggestionText = item.name;
                    const highlightedText = highlightMatch(suggestionText, searchTerm);

                    suggestionElement.innerHTML = highlightedText;
                    suggestionElement.addEventListener('mousedown', () => {
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
    };
}

/**
 * Retrieves basic Pokémon information from the PokeAPI, with local storage caching.
 *
 * @async
 * @function getBasicPokemonInfo
 * @param {string|number} pokemon - The Pokémon name or ID to retrieve information for.
 * @param {AbortSignal} [signal] - An optional AbortSignal to allow for request cancellation.
 * @returns {Promise<object|null>} A Promise that resolves with the Pokémon data object if successful,
 * or null if an error occurs or the request is aborted.
 * @throws {Error} Throws an error if the Pokémon is not found or if the API request fails.
 *
 * @example
 * // Example usage:
 * const pikachuData = await getBasicPokemonInfo('pikachu');
 * 
 * // To abort the request:
 * // controller.abort();
 *
 * @description
 * This function fetches basic Pokémon information from the PokeAPI. It first checks local storage for cached data.
 * If the data is not found in local storage, it makes an API request. The data is then cached in local storage
 * (unless a quota error occurs). The function also supports request cancellation using an AbortSignal.
 * Could add an option to clear LocalStorage if its full?
 * 
 * @requires utils.isNumeric
 * @requires utils.checkLocalStorage
 * @requires utils.updateLoaderText
 *
 * @see {@link https://pokeapi.co/|PokeAPI Documentation}
 */
export async function getBasicPokemonInfo(pokemon, signal = controllerSignal) {
    const localStorageKey = `pokemon-${pokemon}`;

    // Abort if pokemon not provided
    if (!pokemon) return;
    let pokemonInputType = isNumeric(pokemon) ? `Pokémon ID: ${pokemon}` : `Pokémon: '${capitaliseWords(pokemon)}'`;

    updateLoaderText(`Retrieving Basic Pokémon Information for ${pokemonInputType}`);

    // Get from LocalStorage first and return early 
    let storedData = checkLocalStorage(localStorageKey);
    if (storedData) return storedData;

    try {
        // Get core Pokémon data from endpoint
        const response = await fetch(`${POKEAPI.POKEMON}/${pokemon}`, { signal });
        if (!response.ok) throw new Error(`Error fetching Pokémon data: Pokémon not found. PokéAPI Reponse Code: ${response.status}`);
        let data = await response.json();

        // Update PokemonId and declare species data
        pokemonId = data.id;
        let speciesData = {};

        // Get species data
        // Usually can use the pokemon ID to get the species data.
        // However, some IDs are different to the species ID (e.g. GMAX, Starter etc)
        // So initially try to load it based on current ID, and if that fails, fallback to provided URI
        try {
            updateLoaderText(`Retrieving Species Data for ${pokemonInputType}`);
            let speciesResponse = await fetch(`${POKEAPI.SPECIES}/${pokemonId}`, { signal });
            if (!speciesResponse.ok) throw new Error(`Error fetching Pokémon Species data for ${pokemonInputType} (ID: ${pokemonId}): Data not found. PokéAPI Reponse Code: ${speciesResponse.status}`);
            speciesData = await speciesResponse.json();
        }
        catch (error) {
            console.warn(error);
            updateLoaderText(`Retrieving Species Data for ${pokemonInputType}`);
            let speciesResponse = await fetch(`${data.species.url}`, { signal });
            if (!speciesResponse.ok) throw new Error(`Error fetching Pokémon Species data for ${pokemonInputType} (ID: ${pokemonId}): Data not found. PokéAPI Reponse Code: ${speciesResponse.status}`);
            speciesData = await speciesResponse.json();
            console.info(`Used base pokemon ID ${data.species.url} to retrieve base species detail`);
        }

        // We assign speciesData first and then override with the specific data from the pokémon
        // This allows the pokemon specific data overrides the species data
        // This is preferable because otherwise variant pokemon will have the species info
        // which doesn't make sense
        data = Object.assign({}, speciesData, data);

        // Now get supplementary form and variety data
        // Get form and variety data
        const formData = await getPokemonFormsVarieties(data);
        data = Object.assign({}, formData, data);

        // Save to local storage (clear it if necessary)
        try {
            localStorage.setItem(localStorageKey, JSON.stringify(data));
        } catch (e) {
            if (e.name == "QuotaExceededError") {
                console.warn("Local Storage Quota Exceeded. Local Storage will be cleared");
                localStorage.clear();
                console.warn("Local Storage has been cleared");
                localStorage.setItem(localStorageKey, JSON.stringify(data));
            }
        }
        return data;
    }
    catch (error) {
        if (signal.aborted) {
            console.warn("Fetch aborted:", error);
            return null;
        } else {
            console.error(error);
            displayError(`${error.message}`);
            return null;
        }
    }
}

async function getPokemonFormsVarieties(pokemonData, signal = controllerSignal) {
    if (!pokemonData || !pokemonData.varieties) return;

    // Get Variation Data
    const { varieties } = pokemonData;
    const varietyCount = varieties.length;

    // Get Form Data
    updateLoaderText("Retrieving Pokémon Form Data");
    let pokemonForms = {};
    const formDescription = pokemonData.form_descriptions;
    let formCount = 0;

    try {
        pokemonForms = await getPokemonFormData(pokemonData, signal);
    }
    catch (error) {
        console.error("Error retrieving Pokémon form data:", error);
        return {
            extra_forms: {},
            extra_description: {},
            extra_varieties: {
                variations: varieties,
                count: varietyCount
            },
            error: error.message || "Failed to retrieve form data."
        };
    }
    return {
        extra_forms: pokemonForms,
        extra_description: formDescription,
        extra_varieties: {
            variations: varieties,
            count: varietyCount
        }
    };

    async function getPokemonFormData(pokemonInfo, signal) {
        const fetchedForms = {};
        const errors = {};

        // Iterate over form Object
        for (const form of pokemonInfo.forms) {
            try {
                const response = await fetch(form.url, { signal });
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${form.url}: ${response.status} ${response.statusText}`);
                }
                const formData = await response.json();
                fetchedForms[form.name] = formData;

                // Update User on progress
                formCount++;
                let formCountText = formCount == 1 ? "Form" : "Forms";
                updateLoaderText(`Retrieving Pokémon Form Data - Retrieved ${formCount} ${formCountText}.`);

            } catch (error) {
                if (signal.aborted) {
                    console.warn("Fetch aborted:", error);
                    return fetchedForms;
                } else {
                    console.error("Error fetching form data:", error);
                    errors[form.name] = error.message;
                }
            }
        }
        if (Object.keys(errors).length > 0) {
            return { fetchedForms, errors }; // Return fetched data and errors
        } else {
            return fetchedForms; // Return fetched data
        }
    }
}



export async function renderPokemonDataOutput(pokemonData) {

    // 0. DEBUG
    console.debug(pokemonData);

    // 1. Check for Grid div. If it doesn't exist abort.
    const gridDiv = document.querySelector('.grid-auto-fill');
    if (!gridDiv) {
        console.error("Grid container not found.");
        return;
    }
    gridDiv.innerHTML = '';

    // 2. Define structure of pokemonData;
    const dataSections = [
        {
            title: 'Basic Details',
            data: [
                'name', 'id', 'height', 'weight', 'is_default', 'is_baby', 'is_legendary',
                'is_mythical', 'base_experience', 'base_happiness', 'capture_rate', 'gender_rate',
                'has_gender_differences', 'hatch_counter'],
            display: displayBasicDetails,
        },
        {
            title: 'Colour',
            data: pokemonData.color,
            display: displayColourDetails,
        },
        {
            title: 'Species',
            data: pokemonData.species,
            display: displaySpeciesDetails,
        },
        {
            title: 'Generation Species Introduced',
            data: pokemonData.generation,
            display: displayGenerationDetails,
        },
        {
            title: 'Type',
            data: pokemonData.types,
            display: displayTypeDetails,
        },
        {
            title: 'Abilities',
            data: pokemonData.abilities,
            display: displayAbilityDetails,
        },
        {
            title: 'Cries',
            data: pokemonData.cries,
            display: displayCriesDetails,
        },
        {
            title: 'Egg Group',
            data: pokemonData.egg_groups,
            display: displayEggGroupDetails,
        },
        {
            title: 'Held Items',
            data: pokemonData.held_items,
            display: displayHeldItemDetails,
        },
        {
            title: 'Base Stats',
            data: pokemonData.stats,
            display: displayStatsDetails,
        },
        {
            title: 'Pokédex Number',
            data: pokemonData.pokedex_numbers,
            display: displayPokedexDetails,
        },
        {
            title: 'Forms',
            data: pokemonData.extra_forms,
            display: displayFormDetails,
        },
        {
            title: 'Variants',
            data: pokemonData.extra_varieties,
            display: displayVarietyDetails,
        }
    ];


    // 3. Display Each Section where it has data using the function
    //  defined in the display property of the object above
    dataSections.forEach((section) => {
        if (section.data && (Array.isArray(section.data) ? section.data.length > 0 : section.data)) {
            section.display(section.title, section.data);
        }
    });

    function displayBasicDetails(title, data) {
        const titleNormalised = title.replace(" ", "");
        data.forEach((item) => {
            const dataDiv = createDataItemDiv(`${titleNormalised}-${item}`);
            const value = pokemonData[item];
            const displayValue = formatBasicDetailValue(item, value);
            const detailDiv = createEntityItem(item, displayValue);
            dataDiv.appendChild(detailDiv);
            gridDiv.appendChild(dataDiv);
        });
    }

    function displayTypeDetails(title, types) {
        const dataDiv = createDataItemDiv(title, "Current Type");
        if (types) {
            types.forEach((type) => {
                const typeDiv = createEntityItem(`Type ${type.slot}`, capitaliseWords(type.type.name), "h4");
                dataDiv.appendChild(typeDiv);
            });
            gridDiv.appendChild(dataDiv);
        }
        if (pokemonData.past_types.length > 0) {
            displayPastTypes(dataDiv);
        }
    }

    function displayPastTypes(dataDiv) {
        const heading = document.createElement('h3');
        heading.textContent = capitaliseWords("Previous Type");
        dataDiv.appendChild(heading);

        for (var pastType of pokemonData.past_types) {
            const generationChangeParagraph = document.createElement('p');
            generationChangeParagraph.textContent = `Type was changed after ${extractGenerationNumber(pastType.generation.name)}`;
            dataDiv.appendChild(generationChangeParagraph);

            for (let types of pastType.types) {
                const typeEntityDiv = createEntityItem(`Type ${types.slot}`, capitaliseWords(types.type.name), "h4");
                dataDiv.appendChild(typeEntityDiv);
            }
        }
    }

    function displayAbilityDetails(title, abilities) {
        const dataDiv = createDataItemDiv(title, true);
        if (abilities) {
            abilities.forEach((ability) => {
                const hidden = ability.is_hidden ? '(Hidden Ability)' : '';
                const abilityName = `${ability.ability.name} ${hidden}`;
                const abilityDiv = createEntityItem('Ability', capitaliseWords(replaceHyphens(abilityName)));
                dataDiv.appendChild(abilityDiv);
            });
            gridDiv.appendChild(dataDiv);
        }

        if (pokemonData.past_abilities.length > 0) {
            displayPastAbilities(dataDiv);
        }
    }

    function displayPastAbilities(dataDiv) {
        const heading = document.createElement('h3');
        heading.textContent = capitaliseWords("Previous Abilities");
        dataDiv.appendChild(heading);

        for (var pastAbility of pokemonData.past_abilities) {
            const abilityDiv = document.createElement('div');
            abilityDiv.classList = 'entity-item';

            const generationChangeParagraph = document.createElement('p');
            generationChangeParagraph.textContent = `Ability was changed after ${extractGenerationNumber(pastAbility.generation.name)}`;
            abilityDiv.appendChild(generationChangeParagraph);

            for (let ability of pastAbility.abilities) {
                const hidden = ability.is_hidden ? '(Hidden Ability)' : '';
                const abilityName = `${ability.ability.name} ${hidden}`;
                const abilityEntityDiv = createEntityItem('Ability', capitaliseWords(replaceHyphens(abilityName)));
                abilityDiv.appendChild(abilityEntityDiv);
            }
            dataDiv.appendChild(abilityDiv);
        }
    }

    function displayStatsDetails(title, stats) {
        const dataDiv = createDataItemDiv(title, true);
        let statTotal = 0;
        const evTrain = [];

        stats.forEach((stat) => {
            const statDiv = createEntityItem(replaceHyphens(stat.stat.name), stat.base_stat);
            statTotal += stat.base_stat;
            if (stat.effort > 0) {
                evTrain.push({ name: stat.stat.name, effort: stat.effort });
            }
            dataDiv.appendChild(statDiv);
        });

        const statTotalDiv = createEntityItem('Total', statTotal);
        const evYieldText = evTrain.map((ev) => `${ev.effort} ${capitaliseWords(replaceHyphens(ev.name))}`).join(', ');
        const evYieldDiv = createEntityItem('EV Yield', evYieldText);

        dataDiv.appendChild(statTotalDiv);
        dataDiv.appendChild(evYieldDiv);
        gridDiv.appendChild(dataDiv);
    }

    function displayCriesDetails(title, cries) {
        const dataDiv = createDataItemDiv(title, true);
        for (const cry in cries) {
            if (cries[cry]) {
                const criesDiv = createEntityItem(cry);
                const criesAudio = document.createElement('audio');
                criesAudio.setAttribute('controls', true);
                criesAudio.setAttribute('crossorigin', 'anonymous');
                criesAudio.src = cries[cry];
                criesDiv.appendChild(criesAudio);
                dataDiv.appendChild(criesDiv);
            }
        }
        gridDiv.appendChild(dataDiv);
    }

    function displayHeldItemDetails(title, items) {
        const dataDiv = createDataItemDiv(title, true);
        items.forEach((item) => {
            const rarity = item.version_details[item.version_details.length - 1].rarity;
            const itemDiv = createEntityItem(capitaliseWords(replaceHyphens(item.item.name)), `${String(rarity)}% Chance`);
            dataDiv.appendChild(itemDiv);
        });
        gridDiv.appendChild(dataDiv);

    }

    // Colour seems to only have one value, so we can grab it and display it flat
    function displayColourDetails(title, items) {
        const dataDiv = createDataItemDiv(title);
        const colourDiv = createEntityItem(title, capitaliseWords(items.name));
        dataDiv.appendChild(colourDiv);
        gridDiv.appendChild(dataDiv);
    }

    function displaySpeciesDetails(title, items) {
        const dataDiv = createDataItemDiv(title);
        const generationDiv = createEntityItem(title, capitaliseWords(items.name));
        dataDiv.appendChild(generationDiv);
        gridDiv.appendChild(dataDiv);
    }

    function displayGenerationDetails(title, items) {
        const dataDiv = createDataItemDiv(title);
        const generationDiv = createEntityItem(title, capitaliseWords(extractGenerationNumber(items.name)));
        dataDiv.appendChild(generationDiv);
        gridDiv.appendChild(dataDiv);
    }

    function displayEggGroupDetails(title, eggGroups) {
        const dataDiv = createDataItemDiv(title, true);
        let counter = 0;
        for (const eggGroup of eggGroups) {
            counter++;
            const eggGroupDiv = createEntityItem(`${title} ${counter}`, capitaliseWords(eggGroup.name));
            dataDiv.appendChild(eggGroupDiv);
        }
        gridDiv.appendChild(dataDiv);
    }

    function displayPokedexDetails(title, pokedexNumbers) {
        const dataDiv = createDataItemDiv(title, true);
        for (const pokedexNumber of pokedexNumbers) {
            const pokedexNumberPadded = '#' + pokedexNumber.entry_number.toString().padStart(4, 0);
            const pokedexDiv = createEntityItem(capitaliseWords(replaceHyphens(pokedexNumber.pokedex.name)), pokedexNumberPadded);
            dataDiv.appendChild(pokedexDiv);
        }
        gridDiv.appendChild(dataDiv);
    }

    function displayFormDetails(title, forms) {
        const dataDiv = createDataItemDiv(title, true);
        const numberOfForms = Object.keys(forms).length;
        const formCountDiv = createEntityItem("Number of Forms", numberOfForms);
        dataDiv.append(formCountDiv);
        if (numberOfForms > 1) {
            for (let [key, value] of Object.entries(forms)) {
                const formDiv = createEntityItem((capitaliseWords(replaceHyphens(key))), value.is_default == true ? "Default Form" : "Not Default");
                dataDiv.appendChild(formDiv);
            }
        }
        gridDiv.append(dataDiv);
    }

    function displayVarietyDetails(title, varieties) {
        const dataDiv = createDataItemDiv(title, true);
        const varietyCountDiv = createEntityItem("Variations of the Species", varieties.count);
        dataDiv.append(varietyCountDiv);
        for (const variant of varieties.variations) {
            const variantInfoDiv = createEntityItem(capitaliseWords(replaceHyphens(variant.pokemon.name)), variant.is_default === true ? "Default Variant" : "Not Default");
            dataDiv.appendChild(variantInfoDiv);
        }
        gridDiv.append(dataDiv);
    }

    // Utility Functions (Scoped to this function)
    function createDataItemDiv(title, createTitle = false) {
        const dataDiv = document.createElement('div');
        dataDiv.classList = 'pokemon-data-item';
        dataDiv.id = title.toLowerCase();
        if (createTitle) {
            let heading = document.createElement('h3');
            heading.textContent = title;
            dataDiv.appendChild(heading);
        }
        return dataDiv;
    }

    function formatBasicDetailValue(item, value) {
        if (value === undefined || value === null) return "N/A";
        if (item === "name") return capitaliseWords(value, false);
        if (item === "weight") return `${convertWeight(value)} kg`;
        if (item === "height") return `${convertHeight(value)} m`;
        if (item === "is_default") return value ? "Default" : "Not Default";
        if (item === "gender_rate") return value === -1 ? "Gender Unknown" : `${(1 - value / 8) * 100}% Male : ${(value / 8) * 100}% Female`;
        if (item === "hatch_counter") return (
            `Generation II, III, and VII: ${value * 256} Steps,
            Generation IV, Brilliant Diamond, Shining Pearl: ${value * 255} Steps,
            Generation V, VI Pearl: ${value * 257} Steps,
            Genearation VIII, IX: ${value * 128} Steps`
        );
        return capitaliseWords(String(value), false);
    }

    function createEntityItem(name, value = "", headingLevel = "h3") {
        const entityDiv = document.createElement('div');
        entityDiv.classList = 'entity-item';

        const heading = document.createElement(headingLevel);
        heading.textContent = capitaliseWords(name.replaceAll("_", " "));

        const valueParagraph = document.createElement('p');
        valueParagraph.textContent = value;

        entityDiv.appendChild(heading);
        entityDiv.appendChild(valueParagraph);

        return entityDiv;
    }
}



// The Base Pokémon Object
export const pokemon = {};

